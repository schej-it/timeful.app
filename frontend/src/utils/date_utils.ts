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

import { eventTypes, UTC } from "@/constants"
import { Temporal } from "temporal-polyfill"
import type { ZonedDateTime } from "./temporalPrimitives"
import type { EventLike as EventDateRulesEventLike } from "./eventDateRules"
import { toZDT } from "./timezoneDateRules"

/*
  Date utils
*/

// Use the application Event type which already has Temporal.ZonedDateTime[] dates
export type EventLike = EventDateRulesEventLike

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

// Extracted timezone/date rules.
export type { EventLike as TimezoneEventLike } from "./timezoneDateRules"
export {
  getEventMembershipDayOfWeekValues,
  getEventMembershipPlainDates,
  getEventTimeSeed,
  getTimezoneReferenceDateForEvent,
  isTimeWithinEventRange,
} from "./eventDateRules"

export {
  doesDstExist,
  getCurrentTimezone,
  getDateInTimezone,
  getDateWithTimezone,
  getFixedOffsetTimeZoneId,
  getScheduleTimezoneOffset,
  getTimezoneOffset,
  getTimezoneOffsetForDate,
  isDstObserved,
  stdTimezoneOffset,
  timezoneObservesDST,
  toZDT,
} from "./timezoneDateRules"

// Extracted browser preference boundary helpers.
export { getLocale, getTimeOptions, userPrefers12h } from "./browserDatePreferences"
export type { DOWSlot, DOWValidationResult } from "./dateValidation"
export { validateDOWPayload } from "./dateValidation"
export {
  dateToDowDate,
  getCalendarAccountKey,
  getRenderedWeekStart,
  getSpecificTimesDayStarts,
  getTimeBlock,
  processTimeBlocks,
  splitTimeBlocksByDay,
} from "./scheduleDateRules"
export {
  getCalendarAvailabilityQueryWindow,
  getCalendarEventsMap,
} from "./services/CalendarAvailabilityService"

export interface TimeBlock {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  id?: string
  [key: string]: unknown
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
