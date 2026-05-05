import { computed, ref, watch, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import type { EventScheduleFields } from "@/types"
import {
  compareDuration,
  dateToDowDate,
  getDateInTimezone,
  getDateHoursOffset,
  getRenderedWeekStart,
  getScheduleTimezoneOffset,
  getSpecificTimesDayStarts,
  getTimezoneReferenceDateForEvent,
  plainTimeToTimeNum,
  prefersStartOnMonday,
  timeNumToTimeText,
  utcTimeToLocalTime,
  utcTimeToLocalTimeNum,
  userPrefers12h,
  ZdtMap,
  ZdtSet,
  zdtSetHas,
} from "@/utils"
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
  const isSpecificTimes = computed(() =>
    Boolean((event.value as Record<string, unknown>).hasSpecificTimes)
  )

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
      event.value as EventScheduleFields,
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

  /**
   * Returns a two dimensional array of times
   * IF endTime < startTime:
   * the first element is an array of times between 12am and end time and the second element is an array of times between start time and 12am
   * ELSE:
   * the first element is an array of times between start time and end time. the second element is an empty array
   * */
  const splitTimes = computed<TimeItem[][]>(() => {
    const split: TimeItem[][] = [[], []]
    const utcStartTime =
      event.value.startTime ?? Temporal.PlainTime.from({ hour: 0 })
    const durationHours = event.value.duration ?? durations.ZERO
    const utcEndTime = utcStartTime.add(durationHours)
    const localStartTime = utcTimeToLocalTime(
      utcStartTime,
      timezoneOffset.value
    )
    const localEndTime = utcTimeToLocalTime(utcEndTime, timezoneOffset.value)

    const isWeirdTimezone = timezoneOffset.value.total("hours") % 1 !== 0
    const startTimeIsWeird = utcStartTime.second !== 0
    let timeOffset = durations.ZERO
    if (isWeirdTimezone !== startTimeIsWeird) {
      timeOffset = durations.THIRTY_MINUTES.negated()
    }

    const getExtraTimes = (hoursOffset: Temporal.Duration): TimeItem[] => {
      if (compareDuration(timeslotDuration.value, durations.FIFTEEN_MINUTES) === 0) {
        return [
          { hoursOffset: hoursOffset.add(durations.FIFTEEN_MINUTES) },
          { hoursOffset: hoursOffset.add(durations.THIRTY_MINUTES) },
          { hoursOffset: hoursOffset.add(durations.FORTY_FIVE_MINUTES) },
        ]
      }
      if (compareDuration(timeslotDuration.value, durations.THIRTY_MINUTES) === 0) {
        return [{ hoursOffset: hoursOffset.add(durations.THIRTY_MINUTES) }]
      }
      return []
    }

    if (state.value === states.SET_SPECIFIC_TIMES) {
      for (let i = 0; i <= 23; ++i) {
        const hoursOffset = Temporal.Duration.from({ hours: i })
        const text = timeNumToTimeText(i, timeType.value === timeTypes.HOUR12)
        if (i === 9) {
          split[0].push({ id: "time-9", hoursOffset, text })
        } else {
          split[0].push({ hoursOffset, text })
        }
        split[0].push(...getExtraTimes(hoursOffset))
      }
      return split
    }

    if (
      Temporal.PlainTime.compare(localEndTime, localStartTime) <= 0 &&
      // TODO
      !localEndTime.equals(Temporal.PlainTime.from({ hour: 0 }))
    ) {
      // Convert PlainTime to hours for iteration
      const localEndHour = localEndTime.hour
      for (let i = 0; i < localEndHour; ++i) {
        // TODO
        // Calculate hoursOffsetValue as a number
        const localEndHoursNum = localEndTime.hour + localEndTime.minute / 60
        const hoursOffsetValue =
          durationHours.total("hours") - (localEndHoursNum - i)
        split[0].push({
          hoursOffset: Temporal.Duration.from({ hours: hoursOffsetValue }),
          text: timeNumToTimeText(i, timeType.value === timeTypes.HOUR12),
        })
        split[0].push(
          ...getExtraTimes(Temporal.Duration.from({ hours: hoursOffsetValue }))
        )
      }

      // Convert localStartTime to hours for iteration
      const localStartHoursNum =
        localStartTime.hour + localStartTime.minute / 60
      for (let i = 0; i < 24 - localStartHoursNum; ++i) {
        const adjustedI = i + timeOffset.total("hours")
        const localTimeNum = localStartHoursNum + adjustedI
        split[1].push({
          hoursOffset: Temporal.Duration.from({ hours: adjustedI }),
          text: timeNumToTimeText(
            localTimeNum,
            timeType.value === timeTypes.HOUR12
          ),
        })
        split[1].push(
          ...getExtraTimes(Temporal.Duration.from({ hours: adjustedI }))
        )
      }
    } else {
      // Convert duration to number of hours for iteration
      const durationHoursNum = durationHours.total("hours")
      const utcStartTimeNum = utcStartTime.hour + utcStartTime.minute / 60

      for (let i = 0; i < durationHoursNum; ++i) {
        const adjustedI = i + timeOffset.total("hours")
        const utcTimeNum = utcStartTimeNum + adjustedI
        const localTimeNum = utcTimeToLocalTimeNum(
          utcTimeNum,
          timezoneOffset.value
        )
        split[0].push({
          hoursOffset: Temporal.Duration.from({ hours: adjustedI }),
          text: timeNumToTimeText(
            localTimeNum,
            timeType.value === timeTypes.HOUR12
          ),
        })
        split[0].push(
          ...getExtraTimes(Temporal.Duration.from({ hours: adjustedI }))
        )
      }
      if (timeOffset.total("hours") !== 0) {
        const localTimeNum = utcTimeToLocalTimeNum(
          utcStartTimeNum + durationHoursNum - 0.5,
          timezoneOffset.value
        )
        split[0].push({
          hoursOffset: Temporal.Duration.from({
            hours: durationHoursNum - 0.5,
          }),
          text: timeNumToTimeText(
            localTimeNum,
            timeType.value === timeTypes.HOUR12
          ),
        })
        split[0].push(
          ...getExtraTimes(
            Temporal.Duration.from({ hours: durationHoursNum - 0.5 })
          )
        )
      }
      split[1] = []
    }

    return split
  })

  const times = computed<TimeItem[]>(() => [
    ...splitTimes.value[1],
    ...splitTimes.value[0],
  ])

  const allDays = computed<DayItem[]>(() => {
    const days: DayItem[] = []
    const datesSoFar = new ZdtSet()

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
        dateString = `${months[offsetZDT.month - 1]} ${String(offsetZDT.day)}`
        dayString = daysOfWeek.value[offsetZDT.dayOfWeek % 7] // Convert 1-7 (Mon-Sun) to 0-6 (Sun-Sat)
      } else if (isGroup.value || isWeekly.value) {
        const renderedWeekStart = getRenderedWeekStart(
          weekOffset.value,
          event.value.startOnMonday
        )
        const tmpDate = dateToDowDate(
          event.value.dates ?? [],
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

    const eventDates = event.value.dates ?? []
    const eventTimes = (event.value as { times?: Temporal.ZonedDateTime[] })
      .times

    if (
      isSpecificTimes.value &&
      (state.value === states.SET_SPECIFIC_TIMES || eventTimes?.length === 0)
    ) {
      for (const day of getSpecificTimesDayStarts(
        eventDates,
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

    for (const date of eventDates) {
      const zdt = date
      datesSoFar.add(date)
      const { dayString, dateString } = getDateString(zdt)
      days.push({ dayText: dayString, dateString, dateObject: zdt })
    }

    let dayIndex = 0
    for (const date of eventDates) {
      const zdt = date
      // Convert Duration to minutes for subtraction
      const offsetMinutes = timezoneOffset.value.total("minutes")
      const localStart = zdt.subtract({ minutes: offsetMinutes })
      const localEnd = localStart.add(event.value.duration ?? durations.ZERO)
      const localEndIsMidnight = localEnd.hour === 0 && localEnd.minute === 0
      if (localStart.day !== localEnd.day && !localEndIsMidnight) {
        // Convert to ZonedDateTime to add days, then back to Instant
        const nextDate = date
          .add({ days: 1 })
          
        if (!zdtSetHas(datesSoFar, nextDate)) {
          datesSoFar.add(nextDate)
          const nextZDT = nextDate
          const { dayString, dateString } = getDateString(nextZDT)
          days.splice(dayIndex + 1, 0, {
            dayText: dayString,
            dateString,
            dateObject: nextZDT,
            excludeTimes: true,
          })
          dayIndex++
        }
      }
      dayIndex++
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
    const eventDates = event.value.dates ?? []
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
    const startTime = event.value.startTime ?? hoursPlainTime.ZERO
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
    const eventDates = event.value.dates ?? []
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
      const eventDates = event.value.dates ?? []
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

  const getDateFromDayTimeIndex = (
    dayIndex: number,
    timeIndex: number
  ): Temporal.ZonedDateTime | null => {
    const hasSecondSplit = splitTimes.value[1].length > 0
    const isFirstSplit = timeIndex < splitTimes.value[0].length
    const time = isFirstSplit
      ? (splitTimes.value[0] as (TimeItem | undefined)[])[timeIndex]
      : (splitTimes.value[1] as (TimeItem | undefined)[])[
          timeIndex - splitTimes.value[0].length
        ]
    let adjustedDayIndex = dayIndex
    if (hasSecondSplit) {
      if (isFirstSplit) adjustedDayIndex = dayIndex - 1
      else if (dayIndex === allDays.value.length - 1) return null
    }
    const day = (allDays.value as (DayItem | undefined)[])[adjustedDayIndex]
    if (!day || !time) return null
    if (day.excludeTimes) return null

    const date = getDateHoursOffset(day.dateObject, time.hoursOffset)
    if (isSpecificTimes.value) {
      const eventTimes = (event.value as { times?: Temporal.ZonedDateTime[] })
        .times
      if (
        state.value !== states.SET_SPECIFIC_TIMES &&
        (eventTimes?.length ?? 0) > 0
      ) {
        if (!zdtSetHas(specificTimesSet.value, date)) return null
      }
    } else {
      const durationHours = event.value.duration?.total("hours") ?? 0
      if (
        time.hoursOffset.total("hours") < 0 ||
        time.hoursOffset.total("hours") >= durationHours
      )
        return null
    }
    return date
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
    const eventDates = event.value.dates ?? []
    if (eventDates.length === 0) return ""
    // Use Temporal to get timezone information
    return eventDates[0].timeZoneId
  }

  const getMinMaxHoursFromTimes = (
    timesArr: Temporal.ZonedDateTime[]
    // TODO
  ): { minHours: Temporal.PlainTime; maxHours: Temporal.PlainTime } => {
    if (timesArr.length === 0) {
      const zeroHours = Temporal.PlainTime.from({ hour: 0 })
      return { minHours: zeroHours, maxHours: zeroHours }
    }

    let minHours = timesArr[0].toPlainTime()
    let maxHours = minHours
    for (const time of timesArr.slice(1)) {
      const localHours = time.toPlainTime()
      if (Temporal.PlainTime.compare(localHours, minHours) < 0) minHours = localHours
      if (Temporal.PlainTime.compare(localHours, maxHours) > 0) maxHours = localHours
    }
    return { minHours, maxHours }
  }

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
