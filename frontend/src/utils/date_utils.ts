/**
 * Date utilities - Using Temporal API exclusively
 *
 * This file uses Temporal API for all date/time operations.
 * The Temporal API provides better timezone support, immutability, and clearer APIs.
 *
 * Key principles:
 * - All internal operations use Temporal.ZonedDateTime or Temporal.ZonedDateTime
 * - No Date | string | number unions - strict Temporal typing throughout
 * - Conversion at boundaries handled by adapter functions from types/index.ts
 */

import {
  eventTypes,
  timeTypes,
  dayIndexToDayString,
  durations,
  UTC,
} from "@/constants"
import { get } from "./fetch_utils"
import { Temporal } from "temporal-polyfill"
import type { Event } from "@/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import { compareDuration, zdtKey } from "./temporalPrimitives"
import type { ZonedDateTime } from "./temporalPrimitives"
import {
  dateCompare,
  dateGt,
  isDateBetweenInclusive,
  rangeContainsInclusive,
} from "./dateRanges"
import { getFixedOffsetTimeZoneId, resolveTimezoneValue } from "./timezone_utils"

/*
  Date utils
*/

// Use the application Event type which already has Temporal.ZonedDateTime[] dates
export type EventLike = Pick<
  Event,
  "type" | "dates" | "daysOnly" | "startOnMonday" | "duration"
>

export type { PlainDate, PlainTime, ZonedDateTime } from "./temporalPrimitives"
export {
  compareDuration,
  durationEquals,
  fromEpochMillisecondsToZDT,
  parseTemporalEpochKey,
  zdtEquals,
  zdtKey,
  zdtMapGet,
  zdtMapGetOrInsert,
  zdtMapHas,
  ZdtMap,
  zdtSetDelete,
  zdtSetHas,
  ZdtSet,
} from "./temporalPrimitives"
export {
  compareDateDay,
  dateCompare,
  dateEq,
  dateGeq,
  dateGt,
  dateLeq,
  dateLt,
  isDateBetween,
  isDateBetweenInclusive,
  isDateInRange,
  isTimeNumBetweenDates,
  rangeContainsInclusive,
  rangesOverlap,
} from "./dateRanges"
export {
  dateToTimeNum,
  getDateWithTimeNum,
  getWrappedTimeRangeDuration,
  plainTimeToTimeNum,
  splitTimeNum,
  timeNumToPlainTime,
  utcTimeToLocalTime,
  utcTimeToLocalTimeNum,
} from "./timeConversions"

export interface TimeBlock {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  id?: string
  [key: string]: unknown
}

/** Helper: Convert Temporal.ZonedDateTime or ZonedDateTime to ZonedDateTime in specified timezone */
export const toZDT = (
  date: ZonedDateTime,
  timezone = UTC
): Temporal.ZonedDateTime => {
  return date.withTimeZone(timezone)
}

/** Returns a string representation of the given date, i.e. May 14th is "5/14" */
export const getDateString = (date: ZonedDateTime, utc = false): string => {
  const zdt = utc ? toZDT(date, UTC) : toZDT(date)
  return `${String(zdt.month)}/${String(zdt.day)}`
}

/** Returns a string in the format "Mon, 9/23, 10 AM - 12 PM PDT" given a start date and end date */
export const getStartEndDateString = (
  startDate: ZonedDateTime,
  endDate: ZonedDateTime
): string => {
  const start = toZDT(startDate)
  const end = toZDT(endDate)

  const startDay = start.toLocaleString("en-US", { weekday: "short" })
  const startMonth = start.toLocaleString("en-US", { month: "short" })
  const startDayOfMonth = start.toLocaleString("en-US", { day: "numeric" })
  const startTime = start.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
  })
  const endTime = end.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  })

  return `${startDay}, ${startMonth} ${startDayOfMonth}, ${startTime} - ${endTime}`
}

/** Returns an ISO formatted date string */
export const getISODateString = (date: ZonedDateTime, utc = false): string => {
  const zdt = utc ? toZDT(date, UTC) : toZDT(date)
  const plainDate = zdt.toPlainDate()
  return plainDate.toString()
}

/** Returns a string representing date range from date1 to date2, i.e. "5/14 - 5/27" */
export const getDateRangeString = (
  date1: ZonedDateTime,
  date2: ZonedDateTime,
  utc = false
): string => {
  const d1 = toZDT(date1, utc ? UTC : undefined)
  let d2 = toZDT(date2, utc ? UTC : undefined)

  // Correct date2 if time is midnight (because ending at midnight doesn't begin the next day)
  if (d2.hour === 0 && d2.minute === 0 && d2.second === 0) {
    d2 = d2.subtract({ days: 1 })
  }

  return getDateString(d1, utc) + " - " + getDateString(d2, utc)
}

/** Returns a string representing the date range for the provided event */
export const getDateRangeStringForEvent = (event: EventLike): string => {
  if (!event.dates || event.dates.length === 0) return ""

  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    let s = ""

    const dayAbbreviations = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (const zdt of event.dates) {
      const abbr = dayAbbreviations[zdt.dayOfWeek % 7] // dayOfWeek is 1-7 (Mon-Sun), convert to 0-6 (Sun-Sat)
      s += abbr + ", "
    }
    s = s.substring(0, s.length - 2)
    return s
  } else if (event.daysOnly) {
    return (
      getDateString(event.dates[0], true) +
      " - " +
      getDateString(event.dates[event.dates.length - 1], true)
    )
  } else if (event.type === eventTypes.SPECIFIC_DATES) {
    const startDate = event.dates[0]
    const endDate = event.dates[event.dates.length - 1]
    return getDateRangeString(startDate, endDate, true)
  }

  return ""
}

/** Returns a a new ZonedDateTime,
 * offset by the timezone in local storage if it exists,
 * offset by local timezone if not
 */
export const getDateWithTimezone = (
  date: ZonedDateTime
): Temporal.ZonedDateTime => {
  const zdt = toZDT(date)
  const storage =
    typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage
  const timezoneValue = resolveTimezoneValue(
    undefined,
    storage,
    Temporal.Now.timeZoneId()
  )

  return zdt.withTimeZone(timezoneValue)
}

/**
 * Event date membership should stay stable across viewers and saved timezone
 * changes, so reconstruct civil dates directly from the stored event seeds.
 */
export const getEventMembershipPlainDates = (
  dates?: ZonedDateTime[]
): Temporal.PlainDate[] => (dates ?? []).map((date) => date.toPlainDate())

/**
 * Edit flows should read time-of-day reconstruction from an explicit seed
 * rather than reaching into membership dates directly.
 */
export const getEventTimeSeed = (event: {
  timeSeed?: ZonedDateTime
  dates?: ZonedDateTime[]
}): ZonedDateTime | undefined => event.timeSeed ?? event.dates?.[0]

/**
 * Weekly/group edit flows use the stored seed weekday rather than the current
 * viewer timezone, which could otherwise shift the selected day.
 */
export const getEventMembershipDayOfWeekValues = (
  dates?: ZonedDateTime[]
): number[] => (dates ?? []).map((date) => date.dayOfWeek)

/** Returns a Temporal.ZonedDateTime from the given mongodb objectId */
export const dateFromObjectId = function (
  objectId: string
): Temporal.ZonedDateTime {
  const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000
  return Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(UTC)
}

// TODO
/** Returns the specified date offset by the given number of days (can be positive or negative) */
export const getDateDayOffset = (
  date: ZonedDateTime,
  offset: number
): Temporal.ZonedDateTime => {
  const zdt = toZDT(date)
  return zdt.add({ days: offset })
}

/** Returns the specified date offset by the given number of hours or duration */
export const getDateHoursOffset = (
  date: ZonedDateTime,
  hoursOffset: Temporal.Duration
): Temporal.ZonedDateTime => {
  const zdt = toZDT(date)
  return zdt.add(hoursOffset)
}

/** Returns the date used to derive timezone offsets for the current event view */
export const getTimezoneReferenceDateForEvent = (
  event: EventLike,
  weekOffset = 0
): Temporal.ZonedDateTime => {
  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    // Get current date in local timezone
    const now = Temporal.Now.plainDateISO()
    const nowWithTime = now.toZonedDateTime({
      timeZone: Temporal.Now.timeZoneId(),
      plainTime: "12:00:00",
    })
    const referenceDate = nowWithTime.add({ weeks: weekOffset })
    return referenceDate
  }

  if (event.dates && event.dates.length > 0) {
    return event.dates[0]
  }

  return Temporal.Now.zonedDateTimeISO(UTC)
}

/** Returns the timezone offset for a timezone at a specific date */
export const getTimezoneOffsetForDate = (
  curTimezone: Timezone,
  referenceDate: ZonedDateTime
): Temporal.Duration => {
  if (!("offset" in curTimezone)) {
    const zdt = toZDT(referenceDate)
    // Convert nanoseconds to Duration
    return Temporal.Duration.from({ nanoseconds: zdt.offsetNanoseconds * -1 })
  }
  if (!curTimezone.value) {
    // curTimezone.offset is already a Duration
    return curTimezone.offset.negated()
  }

  // Use Temporal to get accurate offset for the specific date in the timezone
  const zdt = toZDT(referenceDate, curTimezone.value)
  return Temporal.Duration.from({ nanoseconds: zdt.offsetNanoseconds * -1 })
}

/** Returns the timezone offset used by ScheduleOverlap for the current event view */
export const getScheduleTimezoneOffset = (
  event: EventLike,
  curTimezone: Timezone,
  weekOffset = 0
): Temporal.Duration => {
  return getTimezoneOffsetForDate(
    curTimezone,
    getTimezoneReferenceDateForEvent(event, weekOffset)
  )
}

export const getDateInTimezone = (
  date: ZonedDateTime,
  curTimezone: Timezone
): Temporal.ZonedDateTime => {
  if (curTimezone.value) {
    return toZDT(date, curTimezone.value)
  }

  if ("offset" in curTimezone) {
    const zdt = toZDT(date, UTC)
    const timeZone = getFixedOffsetTimeZoneId(curTimezone.offset)
    return zdt.withTimeZone(timeZone)
  }

  // Fall back to browser's local timezone
  const localTz = Temporal.Now.timeZoneId()
  return toZDT(date, localTz)
}

export { getFixedOffsetTimeZoneId } from "./timezone_utils"

/** Returns the unique day-start datetimes for specific-times events */
export const getSpecificTimesDayStarts = (
  eventDates: ZonedDateTime[],
  curTimezone: Timezone
): { dateObject: Temporal.ZonedDateTime; isConsecutive: boolean }[] => {
  const days: { dateObject: Temporal.ZonedDateTime; isConsecutive: boolean }[] =
    []
  const datesSoFar = new Set<bigint>()
  let prevDay: Temporal.ZonedDateTime | undefined = undefined

  for (const eventDate of eventDates) {
    const localZDT = getDateInTimezone(eventDate, curTimezone)
    // Get start of day in the local timezone
    const startOfDayZDT = localZDT.with({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0,
    })

    const startOfDayKey = zdtKey(startOfDayZDT)
    if (!datesSoFar.has(startOfDayKey)) {
      datesSoFar.add(startOfDayKey)

      let isConsecutive = true
      if (prevDay) {
        const expectedNext = prevDay.add({ days: 1 })
        isConsecutive = expectedNext.equals(startOfDayZDT)
      }

      days.push({
        dateObject: startOfDayZDT,
        isConsecutive,
      })

      prevDay = startOfDayZDT
    }
  }

  return days
}

/**
 * Returns a date, transformed to be in the same week of the dows array.
 * `reverse` determines whether to do the opposite calculation (dow date to date)
 */
export const dateToDowDate = (
  dows: ZonedDateTime[],
  date: ZonedDateTime,
  weekOffset: number,
  reverse = false,
  startOnMonday = false,
  renderedWeekStart?: Temporal.ZonedDateTime
): Temporal.ZonedDateTime => {
  // Sort dows to make sure first date is not Saturday when there are multiple dates
  dows = [...dows].sort((date1, date2) => {
    const zdt1 = toZDT(date1, UTC)
    const zdt2 = toZDT(date2, UTC)
    let day1 = zdt1.dayOfWeek // 1-7 (Mon-Sun)
    let day2 = zdt2.dayOfWeek
    if (startOnMonday) {
      // Already Monday-based in Temporal
    } else {
      // Convert to Sunday-based (0-6)
      day1 = day1 % 7
      day2 = day2 % 7
    }
    return day1 - day2
  })

  // Get Sunday/Monday of the week containing the dows
  const dowZDT = toZDT(dows[0], UTC)
  const dowWeekStart = dowZDT.subtract({
    days: startOnMonday ? dowZDT.dayOfWeek - 1 : dowZDT.dayOfWeek % 7,
  })

  // Weekly rendering should decide which week is being projected before calling
  // this helper, so the projection stays deterministic in tests and boundaries.
  const adjustedCurWeekStart =
    renderedWeekStart ?? getRenderedWeekStart(weekOffset, startOnMonday)

  const alignedWeekStart = adjustedCurWeekStart.with({
    hour: dowWeekStart.hour,
    minute: dowWeekStart.minute,
    second: dowWeekStart.second,
    millisecond: dowWeekStart.millisecond,
  })

  // Get the amount of days between both week starts
  let dayOffset = Math.round(
    alignedWeekStart.since(dowWeekStart, { largestUnit: "days" }).total("days")
  )

  // Reverse calculation if necessary
  if (reverse) {
    dayOffset *= -1
  }

  // Offset date by the amount of days between the two week starts
  const dateZDT = toZDT(date, UTC)
  const adjusted = dateZDT.subtract({ days: dayOffset })

  return adjusted
}

export const getRenderedWeekStart = (
  weekOffset: number,
  startOnMonday = false,
  referenceDate: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(UTC)
): Temporal.ZonedDateTime =>
  referenceDate
    .subtract({
      days: startOnMonday
        ? referenceDate.dayOfWeek - 1
        : referenceDate.dayOfWeek % 7,
    })
    .add({ weeks: weekOffset })

/** Converts a timeNum (e.g. 13) to a timeText (e.g. "1 pm") */
export const timeNumToTimeText = (timeNum: number, hour12 = true): string => {
  const hours = Math.floor(timeNum)
  const minutesDecimal = timeNum - hours
  const minutesString =
    minutesDecimal > 0
      ? `:${String(Math.floor(minutesDecimal * 60)).padStart(2, "0")}`
      : ""

  if (hour12) {
    if (timeNum >= 0 && timeNum < 1) return `12${minutesString} am`
    else if (timeNum < 12) return `${String(hours)}${minutesString} am`
    else if (timeNum >= 12 && timeNum < 13) return `12${minutesString} pm`
    return `${String(hours - 12)}${minutesString} pm`
  }

  return `${String(hours)}:${minutesString.length > 0 ? minutesString : "00"}`
}

// TODO
/** Converts a timeNum (e.g. 9.5) to a timeString (e.g. 09:30:00) */
export const timeNumToTimeString = (timeNum: number): string => {
  const hours = Math.floor(timeNum)
  const minutesDecimal = timeNum - hours
  const paddedHours = String(hours).padStart(2, "0")
  const paddedMinutes = String(Math.floor(minutesDecimal * 60)).padStart(2, "0")

  return `${paddedHours}:${paddedMinutes}:00`
}

/** Returns the number of days in the given month */
export const getDaysInMonth = (month: number, year: number): number => {
  // Create a PlainYearMonth and get days in month
  const yearMonth = Temporal.PlainYearMonth.from({ year, month })
  return yearMonth.daysInMonth
}

/** Converts a timestamp from a specified timezone to UTC Instant */
export const convertToUTC = (
  dateTimeString: string,
  timezoneValue: string
): Temporal.ZonedDateTime => {
  try {
    // Parse the datetime string in the specified timezone
    const zdt = Temporal.ZonedDateTime.from(
      `${dateTimeString}[${timezoneValue}]`,
      { overflow: "constrain" }
    )
    // Convert to UTC instant
    return zdt
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to convert timezone: ${message}. Timezone: ${timezoneValue}`,
      { cause: err }
    )
  }
}

/** Checks if a date/time falls within an event's date and time range */
export const isTimeWithinEventRange = (
  dateTime: ZonedDateTime,
  eventDates: ZonedDateTime[],
  // TODO
  eventStartTime: number,
  // TODO
  eventDuration: Temporal.Duration
): boolean => {
  const slotZDT = toZDT(dateTime, UTC)
  const slotPlainDate = slotZDT.toPlainDate()

  // Check if slot's date matches any event date
  let matchingEventDate: Temporal.ZonedDateTime | null = null
  for (const eventDate of eventDates) {
    const eventZDT = toZDT(eventDate, UTC)
    const eventPlainDate = eventZDT.toPlainDate()
    if (slotPlainDate.equals(eventPlainDate)) {
      matchingEventDate = eventZDT
      break
    }
  }

  if (!matchingEventDate) {
    return false
  }

  // Check if slot's time falls within event's time range for this date
  const eventStartZDT = matchingEventDate.with({
    hour: Math.floor(eventStartTime),
    minute: Math.floor((eventStartTime % 1) * 60),
  })

  const eventEndZDT = eventStartZDT.add(eventDuration)

  const slotInstant = slotZDT.toInstant()
  return (
    slotInstant >= eventStartZDT.toInstant() &&
    slotInstant <= eventEndZDT.toInstant()
  )
}

/** Converts an array of UTC date slots to ISO string format in a specified timezone */
export const convertUTCSlotsToLocalISO = (
  slots: ZonedDateTime[] | undefined,
  timezoneValue?: string
): Temporal.ZonedDateTime[] => {
  if (!slots) return []

  return slots.map((slot) => {
    try {
      // If no timezone provided, return UTC (with Z)
      if (!timezoneValue) {
        return slot
      }

      // Convert to specified timezone and return ISO string
      return slot.withTimeZone(timezoneValue)
    } catch {
      // Fallback: shouldn't happen with proper Temporal usage
      throw new Error(
        "Invalid temporal date provided to convertUTCSlotsToLocalISO"
      )
    }
  })
}

/** Returns a string representing the current timezone */
export const getCurrentTimezone = (): string => {
  const now = Temporal.Now.zonedDateTimeISO()
  return now.timeZoneId
}

/** Returns the preferred locale of the user
 * Source: https://stackoverflow.com/questions/673905/how-can-i-determine-a-users-locale-within-the-browser
 */
export const getLocale = (): string => {
  return navigator.languages[0] ?? navigator.language
}

/** Returns whether the user prefers 12h time */
export const userPrefers12h = (): boolean => {
  return (
    Intl.DateTimeFormat(getLocale(), { hour: "numeric" }).resolvedOptions()
      .hour12 ?? true
  )
}

/** Returns an array of time options based on whether user prefers 12h or 24h */
export const getTimeOptions = (): {
  text: string
  // TODO
  time: number
  value: number
}[] => {
  const prefers12h = !localStorage.timeType
    ? userPrefers12h()
    : localStorage.timeType === timeTypes.HOUR12

  const times: { text: string; time: number; value: number }[] = []
  if (prefers12h) {
    times.push({ text: "12 am", time: 0, value: 0 })
    for (let h = 1; h < 12; ++h) {
      times.push({ text: `${String(h)} am`, time: h, value: h })
    }
    for (let h = 0; h < 12; ++h) {
      times.push({
        text: `${String(h == 0 ? 12 : h)} pm`,
        time: h + 12,
        value: h + 12,
      })
    }
    times.push({ text: "12 am", time: 0, value: 24 })

    return times
  }

  for (let h = 0; h < 24; ++h) {
    times.push({ text: `${String(h)}:00`, time: h, value: h })
  }
  times.push({ text: "0:00", time: 0, value: 24 })
  return times
}

/**
  Returns an object of the users' calendar events for each calendar account for the given event, filtering for events
  only between the time ranges of the event and clamping calendar events that extend beyond the time
  ranges
  weekOffset specifies the amount of weeks forward or backward to display events for (only used for weekly Timefuls)
*/
export const getCalendarEventsMap = async (
  event: EventLike,
  {
    weekOffset = 0,
    eventId = "",
    renderedWeekStart,
  }: {
    weekOffset?: number
    eventId?: string
    renderedWeekStart?: Temporal.ZonedDateTime
  }
): Promise<unknown> => {
  let timeMin: Temporal.ZonedDateTime | undefined
  let timeMax: Temporal.ZonedDateTime | undefined

  if (!event.dates || event.dates.length === 0) {
    return Promise.resolve([])
  }

  if (event.type === eventTypes.SPECIFIC_DATES) {
    // Get all calendar events between the first date and the last date in dates
    timeMin = event.dates[0]
    timeMax = event.dates[event.dates.length - 1].add({ days: 2 })
  } else if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    // Get all calendar events for the current week offsetted by weekOffset
    const projectedWeekStart =
      renderedWeekStart ?? getRenderedWeekStart(weekOffset, event.startOnMonday)
    const firstDate = dateToDowDate(
      event.dates,
      event.dates[0],
      weekOffset,
      true,
      event.startOnMonday,
      projectedWeekStart
    )
    const lastDate = dateToDowDate(
      event.dates,
      event.dates[event.dates.length - 1],
      weekOffset,
      true,
      event.startOnMonday,
      projectedWeekStart
    )
    timeMin = firstDate.subtract({ days: 2 })
    timeMax = lastDate.add({ days: 2 })
  }

  // Fetch calendar events from Google Calendar
  let calendarEventsMap
  if (eventId.length === 0) {
    calendarEventsMap = await get(
      `/user/calendars?timeMin=${timeMin?.toString() ?? ""}&timeMax=${
        timeMax?.toString() ?? ""
      }`
    )
  } else {
    calendarEventsMap = await get(
      `/events/${eventId}/calendar-availabilities?timeMin=${
        timeMin?.toString() ?? ""
      }&timeMax=${timeMax?.toString() ?? ""}`
    )
  }

  return calendarEventsMap
}

/**
 * Returns a time block object based on the date object and the hours offset and length
 */
export const getTimeBlock = (
  date: ZonedDateTime,
  hoursOffset: Temporal.Duration,
  hoursLength: Temporal.Duration
): { startDate: Temporal.ZonedDateTime; endDate: Temporal.ZonedDateTime } => {
  const zdt = toZDT(date)
  const startZDT = zdt.add(hoursOffset)
  const endZDT = startZDT.add(hoursLength)

  return {
    startDate: startZDT,
    endDate: endZDT,
  }
}

/**
  Returns an array of a user's calendar events split by date for a given event
*/
export const splitTimeBlocksByDay = <
  T extends {
    id?: string | number
    startDate: Temporal.ZonedDateTime
    endDate: Temporal.ZonedDateTime
  }
>(
  event: EventLike,
  timeBlocks: T[],
  weekOffset = 0,
  timezoneOffset?: Temporal.Duration,
  renderedWeekStart?: Temporal.ZonedDateTime
): T[][] => {
  return processTimeBlocks(
    event.dates ?? [],
    event.duration ?? durations.ZERO,
    timeBlocks,
    event.type,
    weekOffset,
    event.startOnMonday,
    timezoneOffset,
    renderedWeekStart
  )
}

/** Takes an array of time blocks and returns a new array separated by day and with hoursOffset and hoursLength properties */
export const processTimeBlocks = <
  T extends {
    id?: string | number
    startDate: Temporal.ZonedDateTime
    endDate: Temporal.ZonedDateTime
  }
>(
  dates: ZonedDateTime[],
  duration: Temporal.Duration,
  timeBlocks: T[],
  eventType: string = eventTypes.SPECIFIC_DATES,
  weekOffset = 0,
  startOnMonday = false,
  timezoneOffset: Temporal.Duration = durations.ZERO,
  renderedWeekStart?: Temporal.ZonedDateTime
): T[][] => {
  const tzOffset = timezoneOffset
  // Convert duration to Temporal.Duration if it's a number

  // Put timeBlocks into the correct format
  const projectedWeekStart =
    eventType === eventTypes.DOW || eventType === eventTypes.GROUP
      ? renderedWeekStart ?? getRenderedWeekStart(weekOffset, startOnMonday)
      : undefined
  let blocks: T[] = timeBlocks.map((timeBlock) => ({ ...timeBlock }))
  blocks = blocks.map((e) => {
    if (eventType === eventTypes.DOW || eventType === eventTypes.GROUP) {
      const startDate = dateToDowDate(
        dates,
        e.startDate,
        weekOffset,
        false,
        startOnMonday,
        projectedWeekStart
      )
      const endDate = dateToDowDate(
        dates,
        e.endDate,
        weekOffset,
        false,
        startOnMonday,
        projectedWeekStart
      )
      e.startDate = startDate
      e.endDate = endDate
    }
    return e
  })
  blocks.sort((a, b) => dateCompare(a.startDate, b.startDate))

  // Format array of calendar events by day
  const datesSoFar = new Set<bigint>()
  const timeBlocksByDay: T[][] = []
  for (let i = 0; i < dates.length; ++i) {
    timeBlocksByDay[i] = []
    datesSoFar.add(zdtKey(dates[i]))
  }

  // Iterate through all dates and add calendar events to array
  let i = 0
  for (const date of dates) {
    if (blocks.length == 0) break

    const start = toZDT(date)
    const end = start.add(duration)

    const localDayStart = start.subtract(tzOffset)
    const localDayEnd = end.subtract(tzOffset)

    // Keep iterating through calendar events until it's empty or there are no more events for the current date
    while (
      blocks.length > 0 &&
      dateGt(end, blocks[0].startDate)
    ) {
      let [calendarEvent] = blocks.splice(0, 1)

      // Check if calendar event overlaps with event time ranges
      const calStart = calendarEvent.startDate
      const calEnd = calendarEvent.endDate

      const startDateWithinRange = isDateBetweenInclusive(calStart, start, end)
      const endDateWithinRange = isDateBetweenInclusive(calEnd, start, end)
      const rangeWithinCalendarEvent =
        rangeContainsInclusive(calStart, calEnd, start, end)

      if (
        startDateWithinRange ||
        endDateWithinRange ||
        rangeWithinCalendarEvent
      ) {
        const rangeStartWithinCalendarEvent =
          isDateBetweenInclusive(start, calStart, calEnd)
        const rangeEndWithinCalendarEvent =
          isDateBetweenInclusive(end, calStart, calEnd)

        if (rangeStartWithinCalendarEvent) {
          // Clamp calendarEvent start
          calendarEvent = {
            ...calendarEvent,
            startDate: start,
          }
        }
        if (rangeEndWithinCalendarEvent) {
          // If the calendar event potentially goes to the next day, we need to add a new time block for it
          const calendarEventToAdd = {
            ...calendarEvent,
            startDate: end,
          }
          blocks.splice(0, 0, calendarEventToAdd)
          blocks.sort((a, b) => dateCompare(a.startDate, b.startDate))
          // Clamp calendarEvent end
          calendarEvent = {
            ...calendarEvent,
            endDate: end,
          }
        }

        // Recalculate after clamping
        const updatedCalStartInstant = calendarEvent.startDate
        const updatedCalEndInstant = calendarEvent.endDate

        // The number of hours since start time
        const hoursOffset =
          (updatedCalStartInstant.epochMilliseconds - start.epochMilliseconds) /
          (1000 * 60 * 60)

        // The length of the event in hours
        const hoursLength =
          (updatedCalEndInstant.epochMilliseconds -
            updatedCalStartInstant.epochMilliseconds) /
          (1000 * 60 * 60)

        // Don't display event if the event is 0 hours long
        if (hoursLength == 0) continue

        // Check if the event goes into the next day
        // Format the UTC date to be in the selected timezone
        const localStartZDT = updatedCalStartInstant
          .withTimeZone(UTC)
          .subtract(tzOffset)
        const localEndZDT = updatedCalEndInstant
          .withTimeZone(UTC)
          .subtract(tzOffset)

        const localStartDate = localStartZDT.toPlainDate()
        const localEndDate = localEndZDT.toPlainDate()

        if (
          localStartDate.day !== localEndDate.day ||
          localStartDate.month !== localEndDate.month ||
          localStartDate.year !== localEndDate.year
        ) {
          // The event goes into the next day. Split the event into two time blocks
          const splitZDT = localStartZDT
            .with({
              hour: 0,
              minute: 0,
              second: 0,
              millisecond: 0,
            })
            .add({ days: 1 })
          const splitInstant = splitZDT

          const firstTimeBlock = {
            ...calendarEvent,
            id:
              (typeof calendarEvent.id === "string" ? calendarEvent.id : "") +
              "-1",
            endDate: splitInstant,
            hoursOffset: hoursOffset,
            hoursLength: hoursLength,
          }
          const firstHoursLength =
            (splitInstant.epochMilliseconds -
              updatedCalStartInstant.epochMilliseconds) /
            (1000 * 60 * 60)
          const secondTimeBlock = {
            ...calendarEvent,
            id:
              (typeof calendarEvent.id === "string" ? calendarEvent.id : "") +
              "-2",
            startDate: splitInstant,
            hoursOffset: hoursOffset + firstHoursLength,
            hoursLength: hoursLength - firstHoursLength,
          }
          const secondHoursLength =
            (updatedCalEndInstant.epochMilliseconds -
              splitInstant.epochMilliseconds) /
            (1000 * 60 * 60)
          timeBlocksByDay[i].push({
            ...firstTimeBlock,
            hoursOffset: hoursOffset,
            hoursLength: firstHoursLength,
          })
          if (i + 1 >= timeBlocksByDay.length) {
            timeBlocksByDay.push([])
          }
          timeBlocksByDay[i + 1].push({
            ...secondTimeBlock,
            hoursOffset: hoursOffset + firstHoursLength,
            hoursLength: secondHoursLength,
          })
          continue
        } else {
          const localStartPlain = localStartZDT.toPlainDate()
          if (
            localDayStart.day !== localStartPlain.day ||
            localDayStart.month !== localStartPlain.month ||
            localDayStart.year !== localStartPlain.year
          ) {
            // The event starts on the next day. move the event to the next day
            if (i + 1 >= timeBlocksByDay.length) {
              timeBlocksByDay.push([])
            }
            timeBlocksByDay[i + 1].push({
              ...calendarEvent,
              hoursOffset,
              hoursLength,
            })
            continue
          }
        }

        timeBlocksByDay[i].push({
          ...calendarEvent,
          hoursOffset,
          hoursLength,
        })
      }
    }

    // Check if the start and end of the current day are on different days in this timezone
    const localDayStartUTCPlain = localDayStart
      .withTimeZone(UTC)
      .toPlainDate()
    const localDayEndUTCPlain = localDayEnd
      .withTimeZone(UTC)
      .toPlainDate()
    if (!localDayStartUTCPlain.equals(localDayEndUTCPlain)) {
      const nextDate = start.add({ days: 1 })
      if (!datesSoFar.has(zdtKey(nextDate))) {
        // The start and end of the current day are on different days in this timezone, append a new index to the timeBlocksByDay array
        timeBlocksByDay.push([])
        i++
      }
    }
    i++
  }

  return timeBlocksByDay
}

export const getCalendarAccountKey = (
  email: string,
  calendarType: string
): string => {
  return `${email}_${calendarType}`
}

export const getTimezoneOffset = (
  time: Temporal.ZonedDateTime
): Temporal.Duration => {
  return Temporal.Duration.from({
    nanoseconds: time.offsetNanoseconds,
  }).negated()
}

export const stdTimezoneOffset = (date: ZonedDateTime): Temporal.Duration => {
  const zdt = date
  const jan = Temporal.ZonedDateTime.from({
    year: zdt.year,
    month: 1,
    day: 1,
    hour: 12,
    timeZone: zdt.timeZoneId,
  })
  const jul = Temporal.ZonedDateTime.from({
    year: zdt.year,
    month: 7,
    day: 1,
    hour: 12,
    timeZone: zdt.timeZoneId,
  })
  return Temporal.Duration.from({
    nanoseconds: Math.max(
      jan.offsetNanoseconds * -1,
      jul.offsetNanoseconds * -1
    ),
  })
}

export const doesDstExist = (date: ZonedDateTime): boolean => {
  const zdt = date
  const jan = Temporal.ZonedDateTime.from({
    year: zdt.year,
    month: 1,
    day: 1,
    hour: 12,
    timeZone: zdt.timeZoneId,
  })
  const jul = Temporal.ZonedDateTime.from({
    year: zdt.year,
    month: 7,
    day: 1,
    hour: 12,
    timeZone: zdt.timeZoneId,
  })
  return jan.offsetNanoseconds !== jul.offsetNanoseconds
}

export const isDstObserved = (date: ZonedDateTime): boolean => {
  const zdt = date
  return compareDuration(getTimezoneOffset(zdt), stdTimezoneOffset(zdt)) < 0
}

/** Returns true if the given IANA timezone observes daylight saving time */
export const timezoneObservesDST = (ianaTimezone: string): boolean => {
  if (!ianaTimezone) return false

  const jan = Temporal.ZonedDateTime.from({
    year: 2024,
    month: 1,
    day: 15,
    hour: 12,
    timeZone: ianaTimezone,
  })
  const jul = Temporal.ZonedDateTime.from({
    year: 2024,
    month: 7,
    day: 15,
    hour: 12,
    timeZone: ianaTimezone,
  })
  return jan.offsetNanoseconds !== jul.offsetNanoseconds
}

interface DOWSlot {
  start: string
  end: string
  status?: string
}

type DOWValidationResult = { valid: false; error: string } | null

/** Validates a DOW (Days of Week) event payload */
export const validateDOWPayload = (
  slots: DOWSlot[],
  skipSameDayCheck = false
): DOWValidationResult => {
  if (!Array.isArray(slots)) {
    return { valid: false, error: "Slots must be an array" }
  }

  // Empty array is valid (clears all availability)
  if (slots.length === 0) {
    return null
  }

  // Create a Set of valid DOW dates for fast lookup
  const validDOWDates = new Set<string>(dayIndexToDayString)

  // Time format regex: YYYY-MM-DDTHH:mm:ss
  const timeFormatRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]

    const iStr = String(i)

    // Validate slot has required fields
    if (!slot.start || !slot.end) {
      return {
        valid: false,
        error: `Slot at index ${iStr} is missing required 'start' or 'end' field`,
      }
    }

    if (typeof slot.start !== "string" || typeof slot.end !== "string") {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid 'start' or 'end' type (must be strings)`,
      }
    }

    // Validate time format
    if (!timeFormatRegex.test(slot.start) || !timeFormatRegex.test(slot.end)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid time format. Expected format: YYYY-MM-DDTHH:mm:ss (e.g., "2018-06-18T09:00:00")`,
      }
    }

    // Parse the date/time strings
    const startMatch = timeFormatRegex.exec(slot.start)
    const endMatch = timeFormatRegex.exec(slot.end)

    if (!startMatch || !endMatch) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid time format`,
      }
    }

    // Extract date and time components
    const startYear = parseInt(startMatch[1], 10)
    const startMonth = parseInt(startMatch[2], 10)
    const startDay = parseInt(startMatch[3], 10)
    const startHour = parseInt(startMatch[4], 10)
    const startMinute = parseInt(startMatch[5], 10)
    const startSecond = parseInt(startMatch[6], 10)

    const endYear = parseInt(endMatch[1], 10)
    const endMonth = parseInt(endMatch[2], 10)
    const endDay = parseInt(endMatch[3], 10)
    const endHour = parseInt(endMatch[4], 10)
    const endMinute = parseInt(endMatch[5], 10)
    const endSecond = parseInt(endMatch[6], 10)

    // Validate time components are within valid ranges
    if (
      startHour < 0 ||
      startHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      startSecond < 0 ||
      startSecond > 59
    ) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid start time: hours must be 0-23, minutes and seconds must be 0-59`,
      }
    }

    // Validate end time: hours 0-24, but if hour is 24, minutes and seconds must be 00:00
    if (endHour < 0 || endHour > 24) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid end time: hours must be 0-24`,
      }
    }

    if (endHour === 24) {
      if (endMinute !== 0 || endSecond !== 0) {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid end time: if hour is 24, minutes and seconds must be 00:00`,
        }
      }
    } else {
      if (endMinute < 0 || endMinute > 59 || endSecond < 0 || endSecond > 59) {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid end time: minutes and seconds must be 0-59`,
        }
      }
    }

    // Format date part (YYYY-MM-DD) for validation
    const startDateStr = `${String(startYear)}-${String(startMonth).padStart(
      2,
      "0"
    )}-${String(startDay).padStart(2, "0")}`
    const endDateStr = `${String(endYear)}-${String(endMonth).padStart(
      2,
      "0"
    )}-${String(endDay).padStart(2, "0")}`

    // Validate dates belong to hardcoded DOW dates
    if (!validDOWDates.has(startDateStr)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid start date: ${startDateStr}. Must be one of the hardcoded DOW dates: ${Array.from(
          validDOWDates
        ).join(", ")}`,
      }
    }

    if (!validDOWDates.has(endDateStr)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid end date: ${endDateStr}. Must be one of the hardcoded DOW dates: ${Array.from(
          validDOWDates
        ).join(", ")}`,
      }
    }

    // Validate that start and end are on the same day
    // Skip this check if skipSameDayCheck is true (e.g., when timezone conversion may cause day boundary crossing)
    if (!skipSameDayCheck && startDateStr !== endDateStr) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has start and end times on different days (${startDateStr} vs ${endDateStr}). Start and end must be on the same day of the week.`,
      }
    }

    // Validate that start time is before end time
    // Handle 24:00:00 as end of day (convert to next day 00:00:00 for comparison)
    let endTimeString = slot.end
    if (endHour === 24) {
      // Convert 24:00:00 to next day 00:00:00 for proper comparison
      const endDate = Temporal.PlainDate.from({
        year: endYear,
        month: endMonth,
        day: endDay,
      })
      const nextDay = endDate.add({ days: 1 })
      endTimeString = `${nextDay.toString()}T00:00:00`
    }

    const startZDT = Temporal.ZonedDateTime.from(`${slot.start}[UTC]`)
    const endZDT = Temporal.ZonedDateTime.from(`${endTimeString}[UTC]`)

    if (
      Temporal.Instant.compare(endZDT.toInstant(), startZDT.toInstant()) <= 0
    ) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has end time that is before or equal to start time`,
      }
    }

    // Validate status field if present
    if (slot.status !== undefined) {
      if (slot.status !== "available" && slot.status !== "if-needed") {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid status '${slot.status}'. Must be 'available' or 'if-needed'`,
        }
      }
    }
  }

  // All validations passed
  return null
}
