import { Temporal } from "temporal-polyfill"
import { UTC } from "@/constants"

import type { ZonedDateTime } from "./temporalPrimitives"

/** Returns negative if date1 < date2, positive if date1 > date2, and 0 if equal. */
export const dateCompare = (
  date1: ZonedDateTime,
  date2: ZonedDateTime
): number => {
  return Temporal.ZonedDateTime.compare(date1, date2)
}

export const dateLt = (
  date1: ZonedDateTime,
  date2: ZonedDateTime
): boolean => dateCompare(date1, date2) < 0

export const dateLeq = (
  date1: ZonedDateTime,
  date2: ZonedDateTime
): boolean => dateCompare(date1, date2) <= 0

export const dateGt = (
  date1: ZonedDateTime,
  date2: ZonedDateTime
): boolean => dateCompare(date1, date2) > 0

export const dateGeq = (
  date1: ZonedDateTime,
  date2: ZonedDateTime
): boolean => dateCompare(date1, date2) >= 0

export const dateEq = (
  date1: ZonedDateTime,
  date2: ZonedDateTime
): boolean => dateCompare(date1, date2) === 0

/** Returns whether the given date is between startDate and endDate using closed bounds [start, end]. */
export const isDateBetweenInclusive = (
  date: ZonedDateTime,
  startDate: ZonedDateTime,
  endDate: ZonedDateTime
): boolean => dateLeq(startDate, date) && dateLeq(date, endDate)

/** Returns whether the inner range is fully contained within the outer range using closed bounds [start, end]. */
export const rangeContainsInclusive = (
  outerStart: ZonedDateTime,
  outerEnd: ZonedDateTime,
  innerStart: ZonedDateTime,
  innerEnd: ZonedDateTime
): boolean => dateLeq(outerStart, innerStart) && dateLeq(innerEnd, outerEnd)

/** Returns whether two ranges overlap using half-open bounds [start, end). */
export const rangesOverlap = (
  startA: ZonedDateTime,
  endA: ZonedDateTime,
  startB: ZonedDateTime,
  endB: ZonedDateTime
): boolean => dateLt(startA, endB) && dateLt(startB, endA)

/** Returns whether the given date is between startDate and endDate. */
export const isDateBetween = (
  date: ZonedDateTime,
  startDate: ZonedDateTime,
  endDate: ZonedDateTime
): boolean => {
  return isDateBetweenInclusive(date, startDate, endDate)
}

/** Returns -1 if a is before b, 1 if a is after b, and 0 otherwise, comparing only the UTC civil day. */
export const compareDateDay = (a: ZonedDateTime, b: ZonedDateTime): number => {
  const zdtA = a.withTimeZone(UTC)
  const zdtB = b.withTimeZone(UTC)

  if (zdtA.year !== zdtB.year) {
    return zdtA.year - zdtB.year
  }
  if (zdtA.month !== zdtB.month) {
    return zdtA.month - zdtB.month
  }
  return zdtA.day - zdtB.day
}

const plainTimeToMinutes = (time: Temporal.PlainTime): number =>
  time.hour * 60 + time.minute

/**
Returns whether the given time is between date1 and date2
such that date1.getHour() <= time <= date2.getHour(), accounting
for the possibility that date1 and date2 might be on separate days.
*/
export const isTimeNumBetweenDates = (
  time: Temporal.PlainTime,
  date1: ZonedDateTime,
  date2: ZonedDateTime
): boolean => {
  const hour1 = date1.toPlainTime()
  const hour2 = date2.toPlainTime()
  const timeMinutes = plainTimeToMinutes(time)
  const startMinutes = plainTimeToMinutes(hour1)
  const endMinutes = plainTimeToMinutes(hour2)

  if (startMinutes <= endMinutes) {
    return startMinutes <= timeMinutes && timeMinutes <= endMinutes
  }

  return (
    (startMinutes <= timeMinutes && timeMinutes < 24 * 60) ||
    (0 <= timeMinutes && timeMinutes <= endMinutes)
  )
}

/** Returns whether date is in between startDate and startDate + duration. */
export const isDateInRange = (
  date: ZonedDateTime,
  startDate: ZonedDateTime,
  duration: Temporal.Duration
): boolean => {
  const endZDT = startDate.add(duration)
  return isDateBetweenInclusive(date, startDate, endZDT)
}
