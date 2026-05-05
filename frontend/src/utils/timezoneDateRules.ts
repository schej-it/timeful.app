import { UTC } from "@/constants"
import type { Timezone } from "@/composables/schedule_overlap/types"
import type { Event } from "@/types"
import { Temporal } from "temporal-polyfill"
import { compareDuration, type ZonedDateTime } from "./temporalPrimitives"
import { getTimezoneReferenceDateForEvent } from "./eventDateRules"
import { getFixedOffsetTimeZoneId, resolveTimezoneValue } from "./timezone_utils"

export const toZDT = (
  date: ZonedDateTime,
  timezone = UTC
): Temporal.ZonedDateTime => {
  return date.withTimeZone(timezone)
}

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

export const getTimezoneOffsetForDate = (
  curTimezone: Timezone,
  referenceDate: ZonedDateTime
): Temporal.Duration => {
  if (!("offset" in curTimezone)) {
    const zdt = toZDT(referenceDate)
    return Temporal.Duration.from({ nanoseconds: zdt.offsetNanoseconds * -1 })
  }
  if (!curTimezone.value) {
    return curTimezone.offset.negated()
  }

  const zdt = toZDT(referenceDate, curTimezone.value)
  return Temporal.Duration.from({ nanoseconds: zdt.offsetNanoseconds * -1 })
}

export const getScheduleTimezoneOffset = (
  event: Pick<Event, "dates" | "timeSeed" | "type">,
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

  return toZDT(date, Temporal.Now.timeZoneId())
}

export const getCurrentTimezone = (): string => {
  return Temporal.Now.timeZoneId()
}

export const getTimezoneOffset = (
  time: Temporal.ZonedDateTime
): Temporal.Duration => {
  return Temporal.Duration.from({
    nanoseconds: time.offsetNanoseconds,
  }).negated()
}

export const stdTimezoneOffset = (date: ZonedDateTime): Temporal.Duration => {
  const jan = Temporal.ZonedDateTime.from({
    year: date.year,
    month: 1,
    day: 1,
    hour: 12,
    timeZone: date.timeZoneId,
  })
  const jul = Temporal.ZonedDateTime.from({
    year: date.year,
    month: 7,
    day: 1,
    hour: 12,
    timeZone: date.timeZoneId,
  })
  return Temporal.Duration.from({
    nanoseconds: Math.max(
      jan.offsetNanoseconds * -1,
      jul.offsetNanoseconds * -1
    ),
  })
}

export const doesDstExist = (date: ZonedDateTime): boolean => {
  const jan = Temporal.ZonedDateTime.from({
    year: date.year,
    month: 1,
    day: 1,
    hour: 12,
    timeZone: date.timeZoneId,
  })
  const jul = Temporal.ZonedDateTime.from({
    year: date.year,
    month: 7,
    day: 1,
    hour: 12,
    timeZone: date.timeZoneId,
  })
  return jan.offsetNanoseconds !== jul.offsetNanoseconds
}

export const isDstObserved = (date: ZonedDateTime): boolean => {
  return compareDuration(getTimezoneOffset(date), stdTimezoneOffset(date)) < 0
}

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

export { getFixedOffsetTimeZoneId }
export { getTimezoneReferenceDateForEvent }
