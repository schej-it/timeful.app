import { eventTypes, UTC } from "@/constants"
import type { Event } from "@/types"
import { Temporal } from "temporal-polyfill"
import type { ZonedDateTime } from "./temporalPrimitives"

export type EventLike = Pick<
  Event,
  "type" | "dates" | "daysOnly" | "startOnMonday" | "duration"
>

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

export const getTimezoneReferenceDateForEvent = (
  event: EventLike,
  weekOffset = 0
): Temporal.ZonedDateTime => {
  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    const now = Temporal.Now.plainDateISO()
    const nowWithTime = now.toZonedDateTime({
      timeZone: Temporal.Now.timeZoneId(),
      plainTime: "12:00:00",
    })
    return nowWithTime.add({ weeks: weekOffset })
  }

  if (event.dates && event.dates.length > 0) {
    return event.dates[0]
  }

  return Temporal.Now.zonedDateTimeISO(UTC)
}
