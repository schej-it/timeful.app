import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { eventTypes, UTC } from "@/constants"
import {
  getEventMembershipDayOfWeekValues,
  getEventMembershipPlainDates,
  getEventTimeSeed,
  getTimezoneReferenceDateForEvent,
  isTimeWithinEventRange,
} from "./eventDateRules"

describe("eventDateRules", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it("reconstructs civil-date membership directly from the stored event seeds", () => {
    const dates = [
      Temporal.PlainDate.from("2026-03-08"),
      Temporal.PlainDate.from("2026-03-09"),
    ]

    expect(getEventMembershipPlainDates(dates).map((date) => date.toString())).toEqual([
      "2026-03-08",
      "2026-03-09",
    ])
  })

  it("prefers an explicit time seed over event membership dates", () => {
    const timeSeed = Temporal.Instant.from("2026-06-15T15:30:00Z").toZonedDateTimeISO(UTC)
    const membershipDate = Temporal.Instant.from("2026-06-16T09:00:00Z").toZonedDateTimeISO(
      UTC
    )

    expect(
      getEventTimeSeed({
        timeSeed,
        dates: [membershipDate.toPlainDate()],
      })
    ).toBe(timeSeed)
  })

  it("keeps weekly edit selections on the stored weekday values", () => {
    const dates = [
      Temporal.PlainDate.from("2018-06-17"),
      Temporal.PlainDate.from("2018-06-18"),
    ]

    expect(getEventMembershipDayOfWeekValues(dates)).toEqual([7, 1])
  })

  it("uses the viewed week as the reference date for weekly events", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))

    const referenceZDT = getTimezoneReferenceDateForEvent(
      {
        type: eventTypes.DOW,
        dates: [Temporal.PlainDate.from("2018-06-17")],
        timeSeed: Temporal.Instant.from("2018-06-17T09:00:00Z").toZonedDateTimeISO(UTC),
      },
      3
    ).withTimeZone(UTC)

    expect(referenceZDT.year).toBe(2026)
    expect(referenceZDT.month).toBe(4)
    expect(referenceZDT.day).toBe(8)
    expect(referenceZDT.hour).toBe(9)
  })

  it("uses the first event date as the reference date for specific dates", () => {
    const referenceInstant = getTimezoneReferenceDateForEvent({
      type: eventTypes.SPECIFIC_DATES,
      dates: [
        Temporal.PlainDate.from("2026-11-02"),
        Temporal.PlainDate.from("2026-11-03"),
      ],
      timeSeed: Temporal.Instant.from("2026-11-02T09:00:00Z").toZonedDateTimeISO(UTC),
    })

    expect(referenceInstant.toInstant().toString()).toBe("2026-11-02T09:00:00Z")
  })

  it("matches slots against the event membership day and includes the end boundary", () => {
    const eventDates = [Temporal.PlainDate.from("2026-06-15")]

    expect(
      isTimeWithinEventRange(
        Temporal.Instant.from("2026-06-15T09:30:00Z").toZonedDateTimeISO(UTC),
        eventDates,
        9,
        Temporal.Duration.from({ minutes: 30 })
      )
    ).toBe(true)

    expect(
      isTimeWithinEventRange(
        Temporal.Instant.from("2026-06-15T09:00:00Z").toZonedDateTimeISO(UTC),
        eventDates,
        9,
        Temporal.Duration.from({ minutes: 30 })
      )
    ).toBe(true)
  })

  it("normalizes slots and event seeds to UTC before checking event range membership", () => {
    const eventDates = [
      Temporal.PlainDate.from("2026-06-15"),
    ]

    expect(
      isTimeWithinEventRange(
        Temporal.ZonedDateTime.from("2026-06-15T13:15:00Z[UTC]"),
        eventDates,
        13,
        Temporal.Duration.from({ hours: 1 })
      )
    ).toBe(true)

    expect(
      isTimeWithinEventRange(
        Temporal.ZonedDateTime.from("2026-06-16T13:15:00Z[UTC]"),
        eventDates,
        8,
        Temporal.Duration.from({ hours: 1 })
      )
    ).toBe(false)
  })
})
