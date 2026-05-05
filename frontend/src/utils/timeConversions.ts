import { Temporal } from "temporal-polyfill"
import { UTC } from "@/constants"

import type { ZonedDateTime } from "./temporalPrimitives"

/** Returns a new ZonedDateTime with the given date and the specified timeNum (e.g. 11.5). */
export const getDateWithTimeNum = (
  date: ZonedDateTime,
  timeNum: number,
  utc = false
): Temporal.ZonedDateTime => {
  const zdt = utc ? date.withTimeZone(UTC) : date
  const hours = Math.floor(timeNum)
  const minutes = Math.floor((timeNum - hours) * 60)

  return zdt.with({ hour: hours, minute: minutes })
}

/** Takes a timeNum (e.g. 9.5) and splits it into hours and minutes. */
export const splitTimeNum = (
  timeNum: number
): { hours: number; minutes: number } => {
  const hours = Math.floor(timeNum)
  const minutes = Math.floor((timeNum - hours) * 60)
  return { hours, minutes }
}

/** Converts a Temporal.PlainTime to a timeNum (e.g. 9.5). */
export const plainTimeToTimeNum = (time: Temporal.PlainTime): number => {
  return time.hour + time.minute / 60
}

/** Converts a timeNum (e.g. 9.5) to a Temporal.PlainTime. */
export const timeNumToPlainTime = (timeNum: number): Temporal.PlainTime => {
  const { hours, minutes } = splitTimeNum(timeNum)
  return Temporal.PlainTime.from({ hour: hours, minute: minutes })
}

/**
 * Create-flow time ranges treat equal start/end selections as a full next-day span.
 * This keeps event, sign-up, and group creation on one explicit duration rule.
 */
export const getWrappedTimeRangeDuration = (
  startTime: Temporal.PlainTime,
  endTime: Temporal.PlainTime
): Temporal.Duration => {
  let duration = endTime.since(startTime, { largestUnit: "hours" })
  if (Temporal.PlainTime.compare(endTime, startTime) <= 0) {
    duration = duration.add({ hours: 24 })
  }
  return duration
}

export const dateToTimeNum = (
  date: ZonedDateTime,
  utc = false
): Temporal.PlainTime => {
  const zdt = utc ? date.withTimeZone(UTC) : date
  return zdt.toPlainTime()
}

const getLocalTimezoneOffset = (): Temporal.Duration => {
  const localTz = Temporal.Now.timeZoneId()
  const now = Temporal.Now.zonedDateTimeISO(localTz)
  return Temporal.Duration.from({ nanoseconds: now.offsetNanoseconds })
}

/** Converts a UTC time number to a local time number based on the timezoneOffset. */
export const utcTimeToLocalTimeNum = (
  timeNum: number,
  timezoneOffset: Temporal.Duration = getLocalTimezoneOffset()
): number => {
  const offsetHours = timezoneOffset.total("hours")
  let localTimeNum = timeNum - offsetHours
  localTimeNum %= 24
  if (localTimeNum < 0) localTimeNum += 24

  return localTimeNum
}

export const utcTimeToLocalTime = (
  time: Temporal.PlainTime,
  timezoneOffset: Temporal.Duration = getLocalTimezoneOffset()
): Temporal.PlainTime => {
  return time.subtract(timezoneOffset)
}
