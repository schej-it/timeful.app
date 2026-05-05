import { eventTypes } from "@/constants"
import { Temporal } from "temporal-polyfill"

import type { EventLike as EventDateRulesEventLike } from "./eventDateRules"
import type { ZonedDateTime } from "./temporalPrimitives"
import { toZDT } from "./timezoneDateRules"

export type EventLike = EventDateRulesEventLike

/** Returns a string representation of the given date, i.e. May 14th is "5/14". */
export const getDateString = (date: ZonedDateTime, utc = false): string => {
  const zdt = utc ? toZDT(date, "UTC") : toZDT(date)
  return `${String(zdt.month)}/${String(zdt.day)}`
}

/** Returns a string in the format "Mon, Sep 23, 10:00 AM - 12:00 PM PDT". */
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

/** Returns an ISO formatted date string. */
export const getISODateString = (date: ZonedDateTime, utc = false): string => {
  const zdt = utc ? toZDT(date, "UTC") : toZDT(date)
  return zdt.toPlainDate().toString()
}

/** Returns a string representing date range from date1 to date2, i.e. "5/14 - 5/27". */
export const getDateRangeString = (
  date1: ZonedDateTime,
  date2: ZonedDateTime,
  utc = false
): string => {
  const d1 = toZDT(date1, utc ? "UTC" : undefined)
  let d2 = toZDT(date2, utc ? "UTC" : undefined)

  if (d2.hour === 0 && d2.minute === 0 && d2.second === 0) {
    d2 = d2.subtract({ days: 1 })
  }

  return `${getDateString(d1, utc)} - ${getDateString(d2, utc)}`
}

/** Returns a string representing the date range for the provided event. */
export const getDateRangeStringForEvent = (event: EventLike): string => {
  if (!event.dates || event.dates.length === 0) return ""

  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    const dayAbbreviations = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return event.dates
      .map((zdt) => dayAbbreviations[zdt.dayOfWeek % 7])
      .join(", ")
  }

  if (event.daysOnly) {
    return (
      `${getDateString(event.dates[0], true)} - ` +
      getDateString(event.dates[event.dates.length - 1], true)
    )
  }

  if (event.type === eventTypes.SPECIFIC_DATES) {
    return getDateRangeString(event.dates[0], event.dates[event.dates.length - 1], true)
  }

  return ""
}

/** Converts a timeNum (e.g. 13) to a timeText (e.g. "1 pm"). */
export const timeNumToTimeText = (timeNum: number, hour12 = true): string => {
  const hours = Math.floor(timeNum)
  const minutesDecimal = timeNum - hours
  const minutesString =
    minutesDecimal > 0
      ? `:${String(Math.floor(minutesDecimal * 60)).padStart(2, "0")}`
      : ""

  if (hour12) {
    if (timeNum >= 0 && timeNum < 1) return `12${minutesString} am`
    if (timeNum < 12) return `${String(hours)}${minutesString} am`
    if (timeNum >= 12 && timeNum < 13) return `12${minutesString} pm`
    return `${String(hours - 12)}${minutesString} pm`
  }

  return `${String(hours)}${minutesString.length > 0 ? minutesString : ":00"}`
}

/** Converts a timeNum (e.g. 9.5) to a timeString (e.g. 09:30:00). */
export const timeNumToTimeString = (timeNum: number): string => {
  const hours = Math.floor(timeNum)
  const minutesDecimal = timeNum - hours
  const paddedHours = String(hours).padStart(2, "0")
  const paddedMinutes = String(Math.floor(minutesDecimal * 60)).padStart(2, "0")

  return `${paddedHours}:${paddedMinutes}:00`
}

/** Returns the number of days in the given month. */
export const getDaysInMonth = (month: number, year: number): number => {
  return Temporal.PlainYearMonth.from({ year, month }).daysInMonth
}
