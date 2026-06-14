import { computed, ref, watch, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import {
  compareDuration,
  dateToDowDate,
  getEventDateSeeds,
  getDateInTimezone,
  getDateHoursOffset,
  getRenderedWeekStart,
  getScheduleTimezoneOffset,
  getSpecificTimesDayStarts,
  getTimezoneReferenceDateForEvent,
  getWrappedTimeRangeDuration,
  plainTimeToTimeNum,
  prefersStartOnMonday,
  timeNumToTimeText,
  utcTimeToLocalTime,
  userPrefers12h,
  ZdtMap,
  ZdtSet,
  zdtSetHas,
} from "@/utils"
import {
  getTimedEventTimezone,
  getTimedSlotGeneration,
  getTimedSlotForMembershipDay,
  hasCanonicalTimedSlots,
} from "@/utils/timedEventSlots"
import {
  eventTypes,
  timeTypes,
  durations,
  type TimeType,
  hoursPlainTime,
  UTC,
} from "@/constants"
import {
  HOUR_HEIGHT,
  SPLIT_GAP_HEIGHT,
  SPLIT_GAP_WIDTH,
  states,
  type DayItem,
  type MonthDayItem,
  type ScheduleOverlapEvent,
  type ScheduleOverlapState,
  type TimeItem,
  type Timezone,
} from "./types"

const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const

export interface UseCalendarGridOptions {
  event: Ref<ScheduleOverlapEvent>
  weekOffset: Ref<number>
  curTimezone: Ref<Timezone>
  state: Ref<ScheduleOverlapState>
  isPhone: Ref<boolean>
}

export function useCalendarGrid(opts: UseCalendarGridOptions) {
  const { event, weekOffset, curTimezone, state, isPhone } = opts

  const durationFromMinutesNumber = (minutes: number): Temporal.Duration =>
    Temporal.Duration.from({ minutes: Math.round(minutes) })

  const timeType = ref<TimeType>(
    (localStorage.getItem("timeType") as TimeType | null) ??
      (userPrefers12h() ? timeTypes.HOUR12 : timeTypes.HOUR24)
  )
  watch(timeType, (val) => {
    localStorage.timeType = val
  })

  const startCalendarOnMonday = ref<boolean>(prefersStartOnMonday())
  watch(startCalendarOnMonday, (val) => {
    localStorage.startCalendarOnMonday = String(val)
  })

  const page = ref(0)
  const savedMobileNumDays = localStorage.getItem("mobileNumDays")
  const mobileNumDays = ref<number>(
    savedMobileNumDays ? parseInt(savedMobileNumDays) : 3
  )
  watch(mobileNumDays, (val) => {
    localStorage.mobileNumDays = String(val)
  })
  const pageHasChanged = ref(false)

  const timeslot = ref<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  const calendarScrollLeft = ref(0)
  const calendarMaxScroll = ref(0)

  const isSpecificDates = computed(
    () => event.value.type === eventTypes.SPECIFIC_DATES || !event.value.type
  )
  const isWeekly = computed(() => event.value.type === eventTypes.DOW)
  const isGroup = computed(() => event.value.type === eventTypes.GROUP)
  const isSpecificTimes = computed(() => Boolean(event.value.hasSpecificTimes))

  const daysOfWeek = computed<string[]>(() => {
    if (!event.value.daysOnly) {
      return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    }
    return !startCalendarOnMonday.value
      ? ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
      : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  })

  const timezoneOffset = computed<Temporal.Duration>(() =>
    getScheduleTimezoneOffset(event.value, curTimezone.value, weekOffset.value)
  )

  const timezoneReferenceDate = computed(() =>
    getTimezoneReferenceDateForEvent(
      event.value,
      weekOffset.value
    )
  )

  const dayOffset = computed(() => {
    const startTimeNum = event.value.startTime
      ? plainTimeToTimeNum(event.value.startTime)
      : 0
    // Convert Duration to minutes, then to hours for division
    return Temporal.Duration.from({
      days: Math.floor(
        (startTimeNum - timezoneOffset.value.total("hours")) / 24
      ),
    })
  })

  const timeslotDuration = computed<Temporal.Duration>(
    () =>
      (event.value as { timeIncrement?: Temporal.Duration }).timeIncrement ??
      durations.FIFTEEN_MINUTES
  )

  const timeslotHeight = computed(() => {
    const dur = timeslotDuration.value
    if (compareDuration(dur, durations.FIFTEEN_MINUTES) === 0) return Math.floor(HOUR_HEIGHT / 4)
    if (compareDuration(dur, durations.THIRTY_MINUTES) === 0) return Math.floor(HOUR_HEIGHT / 2)
    if (compareDuration(dur, durations.ONE_HOUR) === 0) return HOUR_HEIGHT
    return Math.floor(HOUR_HEIGHT / 4)
  })

  /** Returns a set containing the times for the event if it has specific times */
  const specificTimesSet = computed<ZdtSet>(() => {
    const times = (event.value as { times?: Temporal.ZonedDateTime[] }).times
    return new ZdtSet(times ?? [])
  })

  const savedSpecificTimesWindow = computed<{
    startTime: Temporal.PlainTime
    duration: Temporal.Duration
    localStartMinutes: number
    localEndMinutes: number
  } | null>(() => {
    if (!isSpecificTimes.value || state.value === states.SET_SPECIFIC_TIMES) {
      return null
    }

    const eventTimes = (event.value as { times?: Temporal.ZonedDateTime[] }).times ?? []
    if (eventTimes.length === 0) {
      return null
    }

    const { minHours, maxHours } = computeMinMaxHoursFromTimes(eventTimes)
    const slotDuration = event.value.timeIncrement ?? timeslotDuration.value
    const localStartMinutes = minHours.hour * 60 + minHours.minute
    const localEndMinutes =
      maxHours.hour * 60 + maxHours.minute + Math.round(slotDuration.total("minutes"))

    return {
      startTime: minHours,
      duration: durationFromMinutesNumber(localEndMinutes - localStartMinutes),
      localStartMinutes,
      localEndMinutes,
    }
  })

  const specificTimesDisplaySeedTime = computed<Temporal.PlainTime | null>(() => {
    if (!isSpecificTimes.value || state.value === states.SET_SPECIFIC_TIMES) {
      return null
    }

    return savedSpecificTimesWindow.value?.startTime ?? null
  })

  const canonicalTimedDuration = computed<Temporal.Duration | null>(() => {
    if (isSpecificTimes.value || !hasCanonicalTimedSlots(event.value)) {
      return null
    }

    const slotGeneration = getTimedSlotGeneration(event.value)
    return getWrappedTimeRangeDuration(
      slotGeneration.startTimeLocal,
      slotGeneration.endTimeLocal
    )
  })

  const computeMinMaxHoursFromTimes = (
    timesArr: Temporal.ZonedDateTime[]
  ): { minHours: Temporal.PlainTime; maxHours: Temporal.PlainTime } => {
    if (timesArr.length === 0) {
      const zeroHours = Temporal.PlainTime.from({ hour: 0 })
      return { minHours: zeroHours, maxHours: zeroHours }
    }

    const firstLocalTime = getDateInTimezone(timesArr[0], curTimezone.value)
      .toPlainTime()
    let minHours = firstLocalTime
    let maxHours = minHours
    for (const time of timesArr.slice(1)) {
      const localTime = getDateInTimezone(time, curTimezone.value).toPlainTime()
      if (Temporal.PlainTime.compare(localTime, minHours) < 0) minHours = localTime
      if (Temporal.PlainTime.compare(localTime, maxHours) > 0) maxHours = localTime
    }
    return { minHours, maxHours }
  }

  const splitTimes = computed<TimeItem[][]>(() => {
    const split: TimeItem[][] = [[], []]
    const preferredSpecificTimesWindow = savedSpecificTimesWindow.value
    const utcStartTime =
      preferredSpecificTimesWindow == null
        ? (event.value.startTime ?? Temporal.PlainTime.from({ hour: 0 }))
        : null
    const durationHours =
      preferredSpecificTimesWindow?.duration ??
      canonicalTimedDuration.value ??
      (event.value.duration ?? durations.ZERO)
    const localStartMinutes =
      preferredSpecificTimesWindow?.localStartMinutes ??
      (() => {
        const localStartTime = utcTimeToLocalTime(
          utcStartTime ?? Temporal.PlainTime.from({ hour: 0 }),
          timezoneOffset.value
        )
        return localStartTime.hour * 60 + localStartTime.minute
      })()
    const localEndMinutes =
      preferredSpecificTimesWindow?.localEndMinutes ??
      (localStartMinutes + Math.round(durationHours.total("minutes")))
    const timeslotDurationMinutes = Math.round(
      timeslotDuration.value.total("minutes")
    )

    const getExtraTimes = (
      hoursOffset: Temporal.Duration,
      baseAbsoluteMinutes = localStartMinutes
    ): TimeItem[] => {
      const absoluteMinutes = baseAbsoluteMinutes + hoursOffset.total("minutes")
      const displayedMinutes =
        ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
      if (compareDuration(timeslotDuration.value, durations.FIFTEEN_MINUTES) === 0) {
        return [
          {
            hoursOffset: hoursOffset.add(durations.FIFTEEN_MINUTES),
            absoluteMinutes: absoluteMinutes + 15,
            displayedMinutes: (displayedMinutes + 15) % (24 * 60),
          },
          {
            hoursOffset: hoursOffset.add(durations.THIRTY_MINUTES),
            absoluteMinutes: absoluteMinutes + 30,
            displayedMinutes: (displayedMinutes + 30) % (24 * 60),
          },
          {
            hoursOffset: hoursOffset.add(durations.FORTY_FIVE_MINUTES),
            absoluteMinutes: absoluteMinutes + 45,
            displayedMinutes: (displayedMinutes + 45) % (24 * 60),
          },
        ]
      }
      if (compareDuration(timeslotDuration.value, durations.THIRTY_MINUTES) === 0) {
        return [
          {
            hoursOffset: hoursOffset.add(durations.THIRTY_MINUTES),
            absoluteMinutes: absoluteMinutes + 30,
            displayedMinutes: (displayedMinutes + 30) % (24 * 60),
          },
        ]
      }
      return []
    }

    const toLocalHourLabel = (absoluteMinutes: number): string | undefined => {
      const normalizedMinutes = ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
      if (normalizedMinutes % 60 !== 0) return undefined
      return timeNumToTimeText(
        normalizedMinutes / 60,
        timeType.value === timeTypes.HOUR12
      )
    }

    const buildTimeRange = (
      startMinutes: number,
      endMinutes: number
    ): TimeItem[] => {
      const items: TimeItem[] = []
      for (
        let absoluteMinutes = startMinutes;
        absoluteMinutes < endMinutes;
        absoluteMinutes += timeslotDurationMinutes
      ) {
        const hoursOffset = durationFromMinutesNumber(
          absoluteMinutes - localStartMinutes
        )
        items.push({
          hoursOffset,
          text: toLocalHourLabel(absoluteMinutes),
          absoluteMinutes,
          displayedMinutes:
            ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60),
        })
      }
      return items
    }

    if (state.value === states.SET_SPECIFIC_TIMES) {
      for (let i = 0; i <= 23; ++i) {
        const hoursOffset = Temporal.Duration.from({ hours: i })
        const text = timeNumToTimeText(i, timeType.value === timeTypes.HOUR12)
        const absoluteMinutes = i * 60
        if (i === 9) {
          split[0].push({
            id: "time-9",
            hoursOffset,
            text,
            absoluteMinutes,
            displayedMinutes: absoluteMinutes,
          })
        } else {
          split[0].push({
            hoursOffset,
            text,
            absoluteMinutes,
            displayedMinutes: absoluteMinutes,
          })
        }
        split[0].push(...getExtraTimes(hoursOffset, 0))
      }
      return split
    }

    const displayStartMinutes = Math.floor(localStartMinutes / 60) * 60
    const displayEndMinutes = Math.ceil(localEndMinutes / 60) * 60

    if (displayEndMinutes > 24 * 60) {
      const wrappedEndMinutes = displayEndMinutes - 24 * 60
      const overlapsOrTouchesInDisplayedLocalDay =
        displayStartMinutes <= wrappedEndMinutes

      if (overlapsOrTouchesInDisplayedLocalDay) {
        split[0] = buildTimeRange(24 * 60, 48 * 60)
      } else {
        split[0] = buildTimeRange(24 * 60, displayEndMinutes)
        split[1] = buildTimeRange(displayStartMinutes, 24 * 60)
      }
    } else {
      split[0] = buildTimeRange(displayStartMinutes, displayEndMinutes)
    }

    return split
  })

  const displayedTimes = computed<TimeItem[]>(() => [
    ...splitTimes.value[0],
    ...splitTimes.value[1],
  ])

  const times = computed<TimeItem[]>(() =>
    splitTimes.value[1].length > 0
      ? [...splitTimes.value[1], ...splitTimes.value[0]]
      : displayedTimes.value
  )

  const allDays = computed<DayItem[]>(() => {
    const days: DayItem[] = []
    const datesSoFar = new ZdtSet()
    const displayTimezoneId = curTimezone.value.value

    const getSpecificTimesEditDays = (
      eventDates: Temporal.ZonedDateTime[],
      eventTimes: Temporal.ZonedDateTime[]
    ) => {
      if (eventTimes.length === 0) {
        let previousDay: Temporal.ZonedDateTime | null = null
        return eventDates.map((eventDate) => {
          const dateObject = getDateInTimezone(eventDate, curTimezone.value).with({
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
            microsecond: 0,
            nanosecond: 0,
          })
          const isConsecutive =
            previousDay == null || previousDay.add({ days: 1 }).equals(dateObject)

          previousDay = dateObject
          return {
            dateObject,
            membershipDate: eventDate.toPlainDate(),
            isConsecutive,
          }
        })
      }

      const colsByViewerKey = new Map<string, Temporal.ZonedDateTime[]>()
      const allTimes = [...eventTimes].sort((a, b) => Temporal.ZonedDateTime.compare(a, b))
      for (const time of allTimes) {
        const viewerDate = getDateInTimezone(time, curTimezone.value).toPlainDate()
        const key = viewerDate.toString()
        const group = colsByViewerKey.get(key) ?? []
        group.push(time)
        colsByViewerKey.set(key, group)
      }

      const eventTimezone = getTimedEventTimezone(event.value)
      for (const eventDate of eventDates) {
        const membershipKey = eventDate.toPlainDate().toString()
        const hasOwnTimes = eventTimes.some((time) =>
          time.withTimeZone(eventTimezone).toPlainDate().toString() === membershipKey
        )
        if (!hasOwnTimes) {
          const viewerDate = getDateInTimezone(eventDate, curTimezone.value).toPlainDate()
          const key = viewerDate.toString()
          if (!colsByViewerKey.has(key)) {
            colsByViewerKey.set(key, [])
          }
        }
      }

      let previousDay: Temporal.ZonedDateTime | null = null
      return [...colsByViewerKey.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([viewerKey]) => {
          const plainDate = Temporal.PlainDate.from(viewerKey)
          const dateObject = plainDate.toZonedDateTime({
            timeZone: curTimezone.value.value,
            plainTime: "00:00",
          })
          const isConsecutive =
            previousDay == null || previousDay.add({ days: 1 }).equals(dateObject)

          previousDay = dateObject
          return {
            dateObject,
            membershipDate: plainDate,
            isConsecutive,
          }
        })
    }

    const getDateString = (date: Temporal.ZonedDateTime) => {
      let dateString = ""
      let dayString = ""
      let offsetZDT: Temporal.ZonedDateTime
      if (isSpecificTimes.value) {
        offsetZDT = getDateInTimezone(date, curTimezone.value)
      } else {
        offsetZDT = date.add(dayOffset.value)
      }
      if (isSpecificDates.value) {
        dateString =
          isSpecificTimes.value && event.value.timedRecurrence?.kind === "weekly"
            ? `${String(offsetZDT.month)}/${String(offsetZDT.day)}`
            : `${months[offsetZDT.month - 1]} ${String(offsetZDT.day)}`
        dayString = daysOfWeek.value[offsetZDT.dayOfWeek % 7] // Convert 1-7 (Mon-Sun) to 0-6 (Sun-Sat)
      } else if (isGroup.value || isWeekly.value) {
        const renderedWeekStart = getRenderedWeekStart(
          weekOffset.value,
          event.value.startOnMonday
        )
        const tmpDate = dateToDowDate(
          getEventDateSeeds(event.value),
          offsetZDT,
          weekOffset.value,
          true,
          event.value.startOnMonday,
          renderedWeekStart
        )
        dateString = `${months[tmpDate.month - 1]} ${String(tmpDate.day)}`
        dayString = daysOfWeek.value[tmpDate.dayOfWeek % 7]
      }
      return { dateString, dayString }
    }

    const eventDates = getEventDateSeeds(event.value)
    const eventTimes = (event.value as { times?: Temporal.ZonedDateTime[] })
      .times

    if (
      isSpecificTimes.value &&
      (state.value === states.SET_SPECIFIC_TIMES || eventTimes?.length === 0)
    ) {
      for (const day of getSpecificTimesEditDays(eventDates, eventTimes ?? [])) {
        const { dayString, dateString } = getDateString(day.dateObject)
        days.push({
          dayText: dayString,
          dateString,
          dateObject: day.dateObject,
          membershipDate: day.membershipDate,
          isConsecutive: day.isConsecutive,
        })
      }
      return days
    }

    if (isSpecificTimes.value && eventTimes && eventTimes.length > 0) {
      for (const day of getSpecificTimesDayStarts(
        eventTimes,
        curTimezone.value
      )) {
        const { dayString, dateString } = getDateString(day.dateObject)
        days.push({
          dayText: dayString,
          dateString,
          dateObject: day.dateObject,
          isConsecutive: day.isConsecutive,
        })
      }
      return days
    }

    if (!isSpecificTimes.value && hasCanonicalTimedSlots(event.value)) {
      for (const day of getSpecificTimesDayStarts(eventDates, curTimezone.value)) {
        const { dayString, dateString } = getDateString(day.dateObject)
        days.push({
          dayText: dayString,
          dateString,
          dateObject: day.dateObject,
          isConsecutive: day.isConsecutive,
        })
      }
      return days
    }

    for (const date of eventDates) {
      const zdt =
        isSpecificTimes.value && specificTimesDisplaySeedTime.value
          ? getDateInTimezone(date, curTimezone.value)
              .toPlainDate()
              .toZonedDateTime({
                timeZone: displayTimezoneId,
                plainTime: specificTimesDisplaySeedTime.value,
              })
          : date
      datesSoFar.add(date)
      const { dayString, dateString } = getDateString(zdt)
      days.push({ dayText: dayString, dateString, dateObject: zdt })
    }

    let prevDate: Temporal.ZonedDateTime | null = null
    for (const day of days) {
      let isConsecutive = true
      if (prevDate) {
        const prevInstant = prevDate
        const dayInstant = day.dateObject
        const oneDayMs = 24 * 60 * 60 * 1000
        isConsecutive =
          prevInstant.epochMilliseconds ===
          dayInstant.epochMilliseconds - oneDayMs
      }
      day.isConsecutive = isConsecutive
      prevDate = day.dateObject
    }

    return days
  })

  const maxDaysPerPage = computed(() =>
    isPhone.value ? mobileNumDays.value : 7
  )

  const days = computed<DayItem[]>(() => {
    const slice = allDays.value.slice(
      page.value * maxDaysPerPage.value,
      (page.value + 1) * maxDaysPerPage.value
    )
    if (slice.length > 0) {
      slice[0] = { ...slice[0], isConsecutive: true }
    }
    return slice
  })

  const monthDays = computed<MonthDayItem[]>(() => {
    const monthDays: MonthDayItem[] = []
    const allDaysSet = new ZdtSet(
      allDays.value.map((d) => d.dateObject)
    )
    const eventDates = getEventDateSeeds(event.value)
    if (eventDates.length === 0) return monthDays

    const date = eventDates[0]
    const firstDayOfCurMonthPlain = date.toPlainDate().with({ day: 1 }).add({
      months: page.value,
    })
    const lastDayOfPrevMonth = firstDayOfCurMonthPlain.subtract({ days: 1 })
    const lastDayOfCurMonthPlain = firstDayOfCurMonthPlain
      .add({ months: 1 })
      .subtract({ days: 1 })

    let curDate = lastDayOfPrevMonth.add({ days: 1 })
    let numDaysFromPrevMonth = 0
    const numDaysInCurMonth = lastDayOfCurMonthPlain.day
    const numDaysFromNextMonth =
      6 -
      (lastDayOfCurMonthPlain.toZonedDateTime({ timeZone: UTC }).dayOfWeek % 7)
    const hasDaysFromPrevMonth = !startCalendarOnMonday.value
      ? lastDayOfPrevMonth.toZonedDateTime({ timeZone: UTC }).dayOfWeek % 7 < 6
      : lastDayOfPrevMonth.toZonedDateTime({ timeZone: UTC }).dayOfWeek % 7 != 0

    if (hasDaysFromPrevMonth) {
      const prevMonthEndDow =
        lastDayOfPrevMonth.toZonedDateTime({ timeZone: UTC }).dayOfWeek % 7
      const daysToSubtract =
        prevMonthEndDow - (startCalendarOnMonday.value ? 1 : 0)
      curDate = curDate.subtract({ days: daysToSubtract })
      numDaysFromPrevMonth = prevMonthEndDow + 1
    } else {
      curDate = curDate.add({ days: 1 })
    }

    // Add start time to curDate
    const startTime =
      specificTimesDisplaySeedTime.value ??
      event.value.startTime ??
      hoursPlainTime.ZERO
    let curZDT = curDate.toZonedDateTime({
      timeZone: UTC,
      plainTime: `${String(startTime.hour).padStart(2, "0")}:${String(
        startTime.minute
      ).padStart(2, "0")}:00`,
    })

    const totalDays =
      numDaysFromPrevMonth + numDaysInCurMonth + numDaysFromNextMonth
    for (let i = 0; i < totalDays; ++i) {
      const curPlainDate = curZDT.toPlainDate()
      if (curPlainDate.month === lastDayOfCurMonthPlain.month) {
        monthDays.push({
          date: curPlainDate.day,
          time: curZDT,
          dateObject: curZDT,
          included: zdtSetHas(allDaysSet, curZDT),
        })
      } else {
        monthDays.push({
          date: "",
          time: curZDT,
          dateObject: curZDT,
          included: false,
        })
      }
      curZDT = curZDT.add({ days: 1 })
    }
    return monthDays
  })

  const monthDayIncluded = computed<ZdtMap<boolean>>(
    () => {
      const map = new ZdtMap<boolean>()
      for (const md of monthDays.value) {
        map.set(md.dateObject, md.included)
      }
      return map
    }
  )

  const curMonthText = computed(() => {
    const eventDates = getEventDateSeeds(event.value)
    if (eventDates.length === 0) return ""
    const date = eventDates[0]
    const curMonthPlainDate = date.toPlainDate().with({ day: 1 }).add({
      months: page.value,
    })
    const monthText = months[curMonthPlainDate.month - 1]
    const yearText = curMonthPlainDate.year
    return `${monthText} ${String(yearText)}`
  })

  const columnOffsets = computed<number[]>(() => {
    const offsets: number[] = []
    let accumulatedOffset = 0
    for (const day of days.value) {
      offsets.push(accumulatedOffset)
      if (!day.isConsecutive) accumulatedOffset += SPLIT_GAP_WIDTH
      accumulatedOffset += timeslot.value.width
    }
    return offsets
  })

  const showLeftZigZag = computed(() => calendarScrollLeft.value > 0)
  const showRightZigZag = computed(
    () => Math.ceil(calendarScrollLeft.value) < calendarMaxScroll.value
  )

  const hasNextPage = computed(() => {
    if (event.value.daysOnly) {
      const eventDates = getEventDateSeeds(event.value)
      if (eventDates.length === 0) return false
      const lastDay = eventDates[eventDates.length - 1]
      const curDate = eventDates[0]
      const lastDayOfCurMonthPlain = curDate
        .toPlainDate()
        .with({ day: 1 })
        .add({ months: page.value + 1 })
        .subtract({ days: 1 })
      const lastDayOfCurMonth = lastDayOfCurMonthPlain
        .toZonedDateTime({ timeZone: UTC })
      return (
        Temporal.ZonedDateTime.compare(lastDayOfCurMonth, lastDay) < 0
      )
    }
    return (
      allDays.value.length - (page.value + 1) * maxDaysPerPage.value > 0 ||
      event.value.type === eventTypes.GROUP
    )
  })
  const hasPrevPage = computed(
    () => page.value > 0 || event.value.type === eventTypes.GROUP
  )
  const hasPages = computed(() => hasNextPage.value || hasPrevPage.value)

  const isColConsecutive = (col: number): boolean =>
    Boolean(days.value[col]?.isConsecutive)

  const getDateFromDayHoursOffset = (
    dayIndex: number,
    hoursOffset: Temporal.Duration
  ): Temporal.ZonedDateTime | null => {
    const day = days.value[dayIndex]
    // Convert number to Duration for getDateHoursOffset
    return getDateHoursOffset(day.dateObject, hoursOffset)
  }

  const getLocalDayKey = (date: Temporal.ZonedDateTime): string =>
    getDateInTimezone(date, curTimezone.value).toPlainDate().toString()

  const timedGridIntervalsByLocalDay = computed<
    Map<string, { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }[]>
  >(() => {
    const intervalsByDay = new Map<
      string,
      { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }[]
    >()

    if (event.value.daysOnly || isSpecificTimes.value) {
      return intervalsByDay
    }

    const duration =
      canonicalTimedDuration.value ?? event.value.duration ?? durations.ZERO
    if (compareDuration(duration, durations.ZERO) <= 0) {
      return intervalsByDay
    }

    for (const eventDate of getEventDateSeeds(event.value)) {
      let segmentStart = getDateInTimezone(eventDate, curTimezone.value)
      const localEnd = segmentStart.add(duration)

      while (Temporal.ZonedDateTime.compare(segmentStart, localEnd) < 0) {
        const key = segmentStart.toPlainDate().toString()
        const nextDayStart = segmentStart.toPlainDate().add({ days: 1 }).toZonedDateTime({
          timeZone: curTimezone.value.value,
          plainTime: hoursPlainTime.ZERO,
        })
        const segmentEnd =
          Temporal.ZonedDateTime.compare(localEnd, nextDayStart) < 0
            ? localEnd
            : nextDayStart
        const existing = intervalsByDay.get(key) ?? []
        existing.push({ start: segmentStart, end: segmentEnd })
        intervalsByDay.set(key, existing)
        segmentStart = segmentEnd
      }
    }

    return intervalsByDay
  })

  const getDateFromDisplayedAbsoluteMinutes = (
    day: DayItem,
    absoluteMinutes: number
  ): Temporal.ZonedDateTime => {
    if (
      isSpecificTimes.value &&
      state.value === states.SET_SPECIFIC_TIMES &&
      ((event.value as { times?: Temporal.ZonedDateTime[] }).times?.length ?? 0) === 0 &&
      day.membershipDate != null
    ) {
      return getTimedSlotForMembershipDay({
        day: day.membershipDate,
        timeZone: getTimedEventTimezone(event.value),
        absoluteMinutes,
      })
    }

    const localPlainDate = getDateInTimezone(
      day.dateObject,
      curTimezone.value
    ).toPlainDate()
    const normalizedMinutes =
      ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
    const plainTime = Temporal.PlainTime.from({
      hour: Math.floor(normalizedMinutes / 60),
      minute: normalizedMinutes % 60,
    })

    return localPlainDate
      .toZonedDateTime({
        timeZone: curTimezone.value.value,
        plainTime,
      })
      .withTimeZone(day.dateObject.timeZoneId)
  }

  const getDateFromDayTimeIndexInternal = (
    dayIndex: number,
    timeIndex: number,
    includeSpecificTimesGaps = false
  ): Temporal.ZonedDateTime | null => {
    const time = (displayedTimes.value as (TimeItem | undefined)[])[timeIndex]
    const day = (allDays.value as (DayItem | undefined)[])[dayIndex]
    if (!day || !time) return null

    const date =
      typeof time.absoluteMinutes === "number"
        ? getDateFromDisplayedAbsoluteMinutes(day, time.absoluteMinutes)
        : getDateHoursOffset(day.dateObject, time.hoursOffset)
    if (isSpecificTimes.value) {
      const eventTimes = (event.value as { times?: Temporal.ZonedDateTime[] })
        .times
      if (
        !includeSpecificTimesGaps &&
        state.value !== states.SET_SPECIFIC_TIMES &&
        (eventTimes?.length ?? 0) > 0
      ) {
        if (!zdtSetHas(specificTimesSet.value, date)) return null
      }
    } else {
      const intervals = timedGridIntervalsByLocalDay.value.get(
        getLocalDayKey(day.dateObject)
      )
      const isInInterval = intervals?.some(
        ({ start, end }) =>
          Temporal.ZonedDateTime.compare(date, start) >= 0 &&
          Temporal.ZonedDateTime.compare(date, end) < 0
      )
      if (!isInInterval) {
        return null
      }
    }
    return date
  }

  const getDateFromDayTimeIndex = (
    dayIndex: number,
    timeIndex: number
  ): Temporal.ZonedDateTime | null =>
    getDateFromDayTimeIndexInternal(dayIndex, timeIndex)

  const getDisplayDateFromRowCol = (
    row: number,
    col: number
  ): Temporal.ZonedDateTime | null => {
    if (event.value.daysOnly) {
      return getDateFromRowCol(row, col)
    }

    return getDateFromDayTimeIndexInternal(
      maxDaysPerPage.value * page.value + col,
      row,
      true
    )
  }

  const getDateFromRowCol = (
    row: number,
    col: number
  ): Temporal.ZonedDateTime | null => {
    if (event.value.daysOnly) {
      const monthDay = (monthDays.value as (MonthDayItem | undefined)[])[
        row * 7 + col
      ]
      if (!monthDay) return null
      return monthDay.dateObject
    }
    return getDateFromDayTimeIndex(maxDaysPerPage.value * page.value + col, row)
  }

  const setTimeslotSize = () => {
    const timeslotEl = document.querySelector(".timeslot")
    if (timeslotEl) {
      const rect = timeslotEl.getBoundingClientRect()
      timeslot.value = { width: rect.width, height: rect.height }
    }
  }

  const onResize = () => {
    setTimeslotSize()
  }

  const onCalendarScroll = (e: Event) => {
    const target = e.target as HTMLElement
    calendarMaxScroll.value = target.scrollWidth - target.offsetWidth
    calendarScrollLeft.value = target.scrollLeft
  }

  const nextPage = (
    e: globalThis.Event,
    onWeekOffsetChange?: (n: number) => void
  ) => {
    e.stopImmediatePropagation()
    if (event.value.type === eventTypes.GROUP) {
      if ((page.value + 1) * maxDaysPerPage.value < allDays.value.length) {
        page.value++
      } else {
        page.value = 0
        onWeekOffsetChange?.(weekOffset.value + 1)
      }
    } else {
      page.value++
    }
    pageHasChanged.value = true
  }

  const prevPage = (
    e: globalThis.Event,
    onWeekOffsetChange?: (n: number) => void
  ) => {
    e.stopImmediatePropagation()
    if (event.value.type === eventTypes.GROUP) {
      if (page.value > 0) {
        page.value--
      } else {
        page.value = Math.ceil(allDays.value.length / maxDaysPerPage.value) - 1
        onWeekOffsetChange?.(weekOffset.value - 1)
      }
    } else {
      page.value--
    }
    pageHasChanged.value = true
  }

  const getLocalTimezone = (): string => {
    const eventDates = getEventDateSeeds(event.value)
    if (eventDates.length === 0) return ""
    // Use Temporal to get timezone information
    return eventDates[0].timeZoneId
  }

  const getMinMaxHoursFromTimes = (
    timesArr: Temporal.ZonedDateTime[]
    // TODO
  ): { minHours: Temporal.PlainTime; maxHours: Temporal.PlainTime } =>
    computeMinMaxHoursFromTimes(timesArr)

  watch(maxDaysPerPage, () => {
    if (page.value * maxDaysPerPage.value >= allDays.value.length) {
      page.value = 0
    }
  })

  return {
    // refs
    page,
    mobileNumDays,
    pageHasChanged,
    timeslot,
    calendarScrollLeft,
    calendarMaxScroll,
    timeType,
    startCalendarOnMonday,
    // computed
    isSpecificDates,
    isWeekly,
    isGroup,
    isSpecificTimes,
    daysOfWeek,
    timezoneOffset,
    timezoneReferenceDate,
    dayOffset,
    timeslotDuration,
    timeslotHeight,
    specificTimesSet,
    splitTimes,
    times,
    allDays,
    days,
    monthDays,
    monthDayIncluded,
    curMonthText,
    columnOffsets,
    showLeftZigZag,
    showRightZigZag,
    hasNextPage,
    hasPrevPage,
    hasPages,
    maxDaysPerPage,
    // helpers
    isColConsecutive,
    getDateFromDayHoursOffset,
    getDateFromDayTimeIndex,
    getDisplayDateFromRowCol,
    getDateFromRowCol,
    setTimeslotSize,
    onResize,
    onCalendarScroll,
    nextPage,
    prevPage,
    getLocalTimezone,
    getMinMaxHoursFromTimes,
    // constants exposed for templates
    SPLIT_GAP_HEIGHT,
    SPLIT_GAP_WIDTH,
    HOUR_HEIGHT,
  }
}

export type UseCalendarGridReturn = ReturnType<typeof useCalendarGrid>
