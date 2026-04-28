import { computed, ref, watch, type Ref } from "vue"
import {
  dateToDowDate,
  getDateHoursOffset,
  getScheduleTimezoneOffset,
  getSpecificTimesDayStarts,
  getTimezoneReferenceDateForEvent,
  prefersStartOnMonday,
  timeNumToTimeText,
  utcTimeToLocalTime,
  userPrefers12h,
  type EventLike as DateUtilsEventLike,
} from "@/utils"
import {
  eventTypes,
  timeTypes,
  timeslotDurations,
  type TimeType,
} from "@/constants"
import {
  HOUR_HEIGHT,
  SPLIT_GAP_HEIGHT,
  SPLIT_GAP_WIDTH,
  states,
  type DayItem,
  type EventLike,
  type MonthDayItem,
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
  event: Ref<EventLike>
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
  const isSpecificTimes = computed(
    () => Boolean((event.value as Record<string, unknown>).hasSpecificTimes)
  )

  const daysOfWeek = computed<string[]>(() => {
    if (!event.value.daysOnly) {
      return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    }
    return !startCalendarOnMonday.value
      ? ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
      : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  })

  const timezoneOffset = computed<number>(() =>
    getScheduleTimezoneOffset(event.value, curTimezone.value, weekOffset.value)
  )

  const timezoneReferenceDate = computed(() =>
    getTimezoneReferenceDateForEvent(event.value as DateUtilsEventLike, weekOffset.value)
  )

  const dayOffset = computed(() =>
    Math.floor(
      (((event.value as Record<string, unknown>).startTime as number) - timezoneOffset.value / 60) / 24
    )
  )

  const timeslotDuration = computed<number>(
    () =>
      (event.value as { timeIncrement?: number }).timeIncrement ??
      timeslotDurations.FIFTEEN_MINUTES
  )

  const timeslotHeight = computed(() => {
    const dur = timeslotDuration.value
    if (dur === timeslotDurations.FIFTEEN_MINUTES) return Math.floor(HOUR_HEIGHT / 4)
    if (dur === timeslotDurations.THIRTY_MINUTES) return Math.floor(HOUR_HEIGHT / 2)
    if (dur === timeslotDurations.ONE_HOUR) return HOUR_HEIGHT
    return Math.floor(HOUR_HEIGHT / 4)
  })

  const specificTimesSet = computed<Set<number>>(() => {
    const times = (event.value as { times?: (string | Date | number)[] }).times
    return new Set(times?.map((t) => new Date(t).getTime()) ?? [])
  })

  const splitTimes = computed<TimeItem[][]>(() => {
    const split: TimeItem[][] = [[], []]
    const utcStartTime = event.value.startTime ?? 0
    const utcEndTime = utcStartTime + (event.value.duration ?? 0)
    const localStartTime = utcTimeToLocalTime(utcStartTime, timezoneOffset.value)
    const localEndTime = utcTimeToLocalTime(utcEndTime, timezoneOffset.value)

    const isWeirdTimezone = timezoneOffset.value % 60 !== 0
    const startTimeIsWeird = utcStartTime % 1 !== 0
    let timeOffset = 0
    if (isWeirdTimezone !== startTimeIsWeird) timeOffset = -0.5

    const getExtraTimes = (hoursOffset: number): TimeItem[] => {
      if (timeslotDuration.value === timeslotDurations.FIFTEEN_MINUTES) {
        return [
          { hoursOffset: hoursOffset + 0.25 },
          { hoursOffset: hoursOffset + 0.5 },
          { hoursOffset: hoursOffset + 0.75 },
        ]
      }
      if (timeslotDuration.value === timeslotDurations.THIRTY_MINUTES) {
        return [{ hoursOffset: hoursOffset + 0.5 }]
      }
      return []
    }

    if (state.value === states.SET_SPECIFIC_TIMES) {
      for (let i = 0; i <= 23; ++i) {
        const hoursOffset = i
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

    const duration = event.value.duration ?? 0
    if (localEndTime <= localStartTime && localEndTime !== 0) {
      for (let i = 0; i < localEndTime; ++i) {
        split[0].push({
          hoursOffset: duration - (localEndTime - i),
          text: timeNumToTimeText(i, timeType.value === timeTypes.HOUR12),
        })
        split[0].push(...getExtraTimes(duration - (localEndTime - i)))
      }
      for (let i = 0; i < 24 - localStartTime; ++i) {
        const adjustedI = i + timeOffset
        split[1].push({
          hoursOffset: adjustedI,
          text: timeNumToTimeText(
            localStartTime + adjustedI,
            timeType.value === timeTypes.HOUR12
          ),
        })
        split[1].push(...getExtraTimes(adjustedI))
      }
    } else {
      for (let i = 0; i < duration; ++i) {
        const adjustedI = i + timeOffset
        const utcTimeNum = utcStartTime + adjustedI
        const localTimeNum = utcTimeToLocalTime(utcTimeNum, timezoneOffset.value)
        split[0].push({
          hoursOffset: adjustedI,
          text: timeNumToTimeText(
            localTimeNum,
            timeType.value === timeTypes.HOUR12
          ),
        })
        split[0].push(...getExtraTimes(adjustedI))
      }
      if (timeOffset !== 0) {
        const localTimeNum = utcTimeToLocalTime(
          utcStartTime + duration - 0.5,
          timezoneOffset.value
        )
        split[0].push({
          hoursOffset: duration - 0.5,
          text: timeNumToTimeText(
            localTimeNum,
            timeType.value === timeTypes.HOUR12
          ),
        })
        split[0].push(...getExtraTimes(duration - 0.5))
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
    const datesSoFar = new Set<number>()

    const getDateString = (date: Date) => {
      let dateString = ""
      let dayString = ""
      const offsetDate = new Date(date)
      if (isSpecificTimes.value) {
        offsetDate.setTime(
          offsetDate.getTime() - timezoneOffset.value * 60 * 1000
        )
      } else {
        offsetDate.setDate(offsetDate.getDate() + dayOffset.value)
      }
      if (isSpecificDates.value) {
        dateString = `${months[offsetDate.getUTCMonth()]} ${String(offsetDate.getUTCDate())}`
        dayString = daysOfWeek.value[offsetDate.getUTCDay()]
      } else if (isGroup.value || isWeekly.value) {
        const tmpDate = dateToDowDate(
          (event.value.dates ?? []),
          offsetDate,
          weekOffset.value,
          true
        )
        dateString = `${months[tmpDate.getUTCMonth()]} ${String(tmpDate.getUTCDate())}`
        dayString = daysOfWeek.value[tmpDate.getUTCDay()]
      }
      return { dateString, dayString }
    }

    const eventDates = (event.value.dates ?? []).map((d) => new Date(d))
    const eventTimes = (event.value as { times?: (string | Date)[] }).times

    if (
      isSpecificTimes.value &&
      (state.value === states.SET_SPECIFIC_TIMES || eventTimes?.length === 0)
    ) {
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

    for (const dateStr of eventDates) {
      const date = new Date(dateStr)
      datesSoFar.add(date.getTime())
      const { dayString, dateString } = getDateString(date)
      days.push({ dayText: dayString, dateString, dateObject: date })
    }

    let dayIndex = 0
    for (const dateStr of eventDates) {
      const date = new Date(dateStr)
      const localStart = new Date(
        date.getTime() - timezoneOffset.value * 60 * 1000
      )
      const localEnd = new Date(
        date.getTime() +
          (event.value.duration ?? 0) * 60 * 60 * 1000 -
          timezoneOffset.value * 60 * 1000
      )
      const localEndIsMidnight =
        localEnd.getUTCHours() === 0 && localEnd.getUTCMinutes() === 0
      if (
        localStart.getUTCDate() !== localEnd.getUTCDate() &&
        !localEndIsMidnight
      ) {
        const nextDate = new Date(date)
        nextDate.setUTCDate(nextDate.getUTCDate() + 1)
        if (!datesSoFar.has(nextDate.getTime())) {
          datesSoFar.add(nextDate.getTime())
          const { dayString, dateString } = getDateString(nextDate)
          days.splice(dayIndex + 1, 0, {
            dayText: dayString,
            dateString,
            dateObject: nextDate,
            excludeTimes: true,
          })
          dayIndex++
        }
      }
      dayIndex++
    }

    let prevDate: Date | null = null
    for (const day of days) {
      let isConsecutive = true
      if (prevDate) {
        isConsecutive =
          prevDate.getTime() === day.dateObject.getTime() - 24 * 60 * 60 * 1000
      }
      day.isConsecutive = isConsecutive
      prevDate = new Date(day.dateObject)
    }

    return days
  })

  const maxDaysPerPage = computed(() => (isPhone.value ? mobileNumDays.value : 7))

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
    const allDaysSet = new Set(
      allDays.value.map((d) => d.dateObject.getTime())
    )
    const eventDates = (event.value.dates ?? []).map((d) => new Date(d))
    if (eventDates.length === 0) return monthDays

    const date = new Date(eventDates[0])
    const monthIndex = date.getUTCMonth() + page.value
    const year = date.getUTCFullYear()
    const lastDayOfPrevMonth = new Date(Date.UTC(year, monthIndex, 0))
    const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))

    const curDate = new Date(lastDayOfPrevMonth)
    let numDaysFromPrevMonth = 0
    const numDaysInCurMonth = lastDayOfCurMonth.getUTCDate()
    const numDaysFromNextMonth = 6 - lastDayOfCurMonth.getUTCDay()
    const hasDaysFromPrevMonth = !startCalendarOnMonday.value
      ? lastDayOfPrevMonth.getUTCDay() < 6
      : lastDayOfPrevMonth.getUTCDay() != 0
    if (hasDaysFromPrevMonth) {
      curDate.setUTCDate(
        curDate.getUTCDate() -
          (lastDayOfPrevMonth.getUTCDay() -
            (startCalendarOnMonday.value ? 1 : 0))
      )
      numDaysFromPrevMonth = lastDayOfPrevMonth.getUTCDay() + 1
    } else {
      curDate.setUTCDate(curDate.getUTCDate() + 1)
    }
    curDate.setUTCHours(event.value.startTime ?? 0)

    const totalDays =
      numDaysFromPrevMonth + numDaysInCurMonth + numDaysFromNextMonth
    for (let i = 0; i < totalDays; ++i) {
      if (curDate.getUTCMonth() === lastDayOfCurMonth.getUTCMonth()) {
        monthDays.push({
          date: curDate.getUTCDate(),
          time: curDate.getTime(),
          dateObject: new Date(curDate),
          included: allDaysSet.has(curDate.getTime()),
        })
      } else {
        monthDays.push({
          date: "",
          time: curDate.getTime(),
          dateObject: new Date(curDate),
          included: false,
        })
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1)
    }
    return monthDays
  })

  const monthDayIncluded = computed<Map<number, boolean>>(() => {
    const map = new Map<number, boolean>()
    for (const md of monthDays.value) {
      map.set(md.dateObject.getTime(), md.included)
    }
    return map
  })

  const curMonthText = computed(() => {
    const eventDates = (event.value.dates ?? []).map((d) => new Date(d))
    if (eventDates.length === 0) return ""
    const date = new Date(eventDates[0])
    const monthIndex = date.getUTCMonth() + page.value
    const year = date.getUTCFullYear()
    const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))
    const monthText = months[lastDayOfCurMonth.getUTCMonth()]
    const yearText = lastDayOfCurMonth.getUTCFullYear()
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
      const eventDates = (event.value.dates ?? []).map((d) => new Date(d))
      if (eventDates.length === 0) return false
      const lastDay = new Date(eventDates[eventDates.length - 1])
      const curDate = new Date(eventDates[0])
      const monthIndex = curDate.getUTCMonth() + page.value
      const year = curDate.getUTCFullYear()
      const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))
      return lastDayOfCurMonth.getTime() < lastDay.getTime()
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
    hoursOffset: number
  ): Date | null => {
    const day = (days.value as (DayItem | undefined)[])[dayIndex]
    if (!day) return null
    return getDateHoursOffset(day.dateObject, hoursOffset)
  }

  const getDateFromDayTimeIndex = (
    dayIndex: number,
    timeIndex: number
  ): Date | null => {
    const hasSecondSplit = splitTimes.value[1].length > 0
    const isFirstSplit = timeIndex < splitTimes.value[0].length
    const time = isFirstSplit
      ? (splitTimes.value[0] as (TimeItem | undefined)[])[timeIndex]
      : (splitTimes.value[1] as (TimeItem | undefined)[])[timeIndex - splitTimes.value[0].length]
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
      const eventTimes = (event.value as { times?: (string | Date)[] }).times
      if (
        state.value !== states.SET_SPECIFIC_TIMES &&
        (eventTimes?.length ?? 0) > 0
      ) {
        if (!specificTimesSet.value.has(date.getTime())) return null
      }
    } else {
      if (
        time.hoursOffset < 0 ||
        time.hoursOffset >= (event.value.duration ?? 0)
      )
        return null
    }
    return date
  }

  const getDateFromRowCol = (row: number, col: number): Date | null => {
    if (event.value.daysOnly) {
      const monthDay = (monthDays.value as (MonthDayItem | undefined)[])[row * 7 + col]
      if (!monthDay) return null
      return new Date(monthDay.dateObject)
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

  const onResize = () => { setTimeslotSize(); }

  const onCalendarScroll = (e: Event) => {
    const target = e.target as HTMLElement
    calendarMaxScroll.value = target.scrollWidth - target.offsetWidth
    calendarScrollLeft.value = target.scrollLeft
  }

  const nextPage = (e: globalThis.Event, onWeekOffsetChange?: (n: number) => void) => {
    e.stopImmediatePropagation()
    if (event.value.type === eventTypes.GROUP) {
      if (
        (page.value + 1) * maxDaysPerPage.value < allDays.value.length
      ) {
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

  const prevPage = (e: globalThis.Event, onWeekOffsetChange?: (n: number) => void) => {
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
    const eventDates = (event.value.dates ?? []).map((d) => new Date(d))
    if (eventDates.length === 0) return ""
    const split = new Date(eventDates[0])
      .toLocaleTimeString("en-us", { timeZoneName: "short" })
      .split(" ")
    return split[split.length - 1]
  }

  const getMinMaxHoursFromTimes = (
    timesArr: (string | Date)[]
  ): { minHours: number; maxHours: number } => {
    let minHours = 24
    let maxHours = 0
    for (const time of timesArr) {
      const timeDate = new Date(time)
      const date = new Date(
        timeDate.getTime() - timezoneOffset.value * 60 * 1000
      )
      const localHours = date.getUTCHours()
      if (localHours < minHours) minHours = localHours
      else if (localHours > maxHours) maxHours = localHours
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
