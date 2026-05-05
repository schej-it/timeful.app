import { eventTypes, UTC } from "@/constants"
import type { Event } from "@/types"
import { Temporal } from "temporal-polyfill"
import type { PlainDate, ZonedDateTime } from "./temporalPrimitives"

/**
 * Event date membership should stay stable across viewers and saved timezone
 * changes, so reconstruct civil dates directly from the stored event seeds.
 */
export const getEventMembershipPlainDates = (
  dates?: PlainDate[]
): Temporal.PlainDate[] => (dates ?? []).map((date) => Temporal.PlainDate.from(date))

/**
 * Edit flows should read time-of-day reconstruction from an explicit seed
 * rather than reaching into membership dates directly.
 */
export const getEventTimeSeed = (event: {
  timeSeed?: ZonedDateTime
  dates?: PlainDate[]
}): ZonedDateTime | undefined => event.timeSeed

/**
 * Weekly/group edit flows use the stored seed weekday rather than the current
 * viewer timezone, which could otherwise shift the selected day.
 */
export const getEventMembershipDayOfWeekValues = (
  dates?: PlainDate[]
): number[] => (dates ?? []).map((date) => date.dayOfWeek)

export const getEventDateSeeds = (event: {
  dates?: PlainDate[]
  timeSeed?: ZonedDateTime
}): ZonedDateTime[] => {
  const membershipDates = event.dates ?? []
  if (membershipDates.length === 0) {
    return []
  }

  const timeSeed = event.timeSeed
  if (timeSeed == null) {
    return membershipDates.map((date) =>
      date.toZonedDateTime({ timeZone: UTC, plainTime: "00:00:00" })
    )
  }

  const plainTime = timeSeed.toPlainTime()
  const timeZone = timeSeed.timeZoneId

  return membershipDates.map((date) =>
    date.toZonedDateTime({ timeZone, plainTime })
  )
}

export const getTimezoneReferenceDateForEvent = (
  event: Pick<Event, "dates" | "timeSeed" | "type">,
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

  const eventDateSeeds = getEventDateSeeds(event)
  if (eventDateSeeds.length > 0) {
    return eventDateSeeds[0]
  }

  return Temporal.Now.zonedDateTimeISO(UTC)
}

/** Checks if a slot falls within an event membership date and time range. */
export const isTimeWithinEventRange = (
  dateTime: ZonedDateTime,
  eventDates: PlainDate[],
  eventStartTime: number,
  eventDuration: Temporal.Duration
): boolean => {
  const slotZDT = dateTime.withTimeZone(UTC)
  const slotPlainDate = slotZDT.toPlainDate()

  const matchingEventDate = eventDates.find((eventDate) =>
    slotPlainDate.equals(eventDate)
  )

  if (!matchingEventDate) {
    return false
  }

  const eventStartZDT = matchingEventDate.toZonedDateTime({
    timeZone: UTC,
    plainTime: {
    hour: Math.floor(eventStartTime),
    minute: Math.floor((eventStartTime % 1) * 60),
    },
  })
  const eventEndZDT = eventStartZDT.add(eventDuration)

  return (
    Temporal.Instant.compare(slotZDT.toInstant(), eventStartZDT.toInstant()) >= 0 &&
    Temporal.Instant.compare(slotZDT.toInstant(), eventEndZDT.toInstant()) <= 0
  )
}
