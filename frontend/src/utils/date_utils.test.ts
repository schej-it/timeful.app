import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getScheduleTimezoneOffset,
  getSpecificTimesDayStarts,
  getTimezoneOffsetForDate,
  getTimezoneReferenceDateForEvent,
} from "./date_utils"
import { eventTypes, durations, UTC } from "../constants"
import { Temporal } from "temporal-polyfill"

describe("DST timezone regression", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set system time using Temporal-compatible format
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))
  })

  it("uses the viewed week as the reference date for weekly events", () => {
    const weeklyEvent = {
      type: eventTypes.DOW,
      dates: [Temporal.Instant.from("2018-06-17T09:00:00Z").toZonedDateTimeISO(UTC)],
    }
    const referenceZDT = getTimezoneReferenceDateForEvent(weeklyEvent, 3).withTimeZone(UTC)

    // Use Temporal to check the date components
    expect(referenceZDT.year).toBe(2026)
    expect(referenceZDT.month).toBe(4) // April (1-indexed in Temporal)
    expect(referenceZDT.day).toBe(8)
    // The function preserves the time from the original DOW date (09:00)
    expect(referenceZDT.hour).toBe(9)
  })

  it("uses the first event date as the reference date for specific dates", () => {
    const datedEvent = {
      type: eventTypes.SPECIFIC_DATES,
      dates: [
        Temporal.Instant.from("2026-11-02T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-11-03T09:00:00Z").toZonedDateTimeISO(UTC),
      ],
    }

    const referenceInstant = getTimezoneReferenceDateForEvent(datedEvent)
    expect(referenceInstant.toInstant().toString()).toBe("2026-11-02T09:00:00Z")
  })

  it("calculates timezone offsets from the provided reference date", () => {
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: Temporal.Duration.from({ minutes: 60 }),
      label: "",
      gmtString: "",
    }

    const result = getTimezoneOffsetForDate(
      selectedTimezone,
      Temporal.Instant.from("2026-04-08T12:00:00Z").toZonedDateTimeISO(UTC)
    )
    // Result is now a Duration, convert to minutes for comparison
    expect(result.total("minutes")).toBe(-120)
  })

  it("keeps the standard offset during non-DST viewed weeks", () => {
    const weeklyEvent = {
      type: eventTypes.DOW,
      startOnMonday: false,
      dates: [Temporal.Instant.from("2018-06-17T09:00:00Z").toZonedDateTimeISO(UTC)],
    }
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: Temporal.Duration.from({ minutes: 60 }),
      label: "",
      gmtString: "",
    }

    const result = getScheduleTimezoneOffset(weeklyEvent, selectedTimezone, -10)
    expect(result.total("minutes")).toBe(-60)
  })

  it("falls back to the stored numeric offset when no timezone name exists", () => {
    const selectedTimezone = {
      offset: Temporal.Duration.from({ minutes: 90 }),
      value: "",
      label: "",
      gmtString: "",
    }

    const result = getTimezoneOffsetForDate(
      selectedTimezone,
      Temporal.Instant.from("2026-04-08T12:00:00Z").toZonedDateTimeISO(UTC)
    )
    expect(result.total("minutes")).toBe(-90)
  })

  it("shows the viewed event week using that week's timezone offset", () => {
    const weeklyEvent = {
      type: eventTypes.DOW,
      startOnMonday: false,
      dates: [Temporal.Instant.from("2018-06-17T09:00:00Z").toZonedDateTimeISO(UTC)],
    }
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: Temporal.Duration.from({ minutes: 60 }),
      label: "",
      gmtString: "",
    }

    const result = getScheduleTimezoneOffset(weeklyEvent, selectedTimezone, 3)
    expect(result.total("minutes")).toBe(-120)
  })

  it("shows the viewed event week using the new offset after fall-back DST changes", () => {
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"))

    const weeklyEvent = {
      type: eventTypes.DOW,
      startOnMonday: false,
      dates: [Temporal.Instant.from("2018-06-17T09:00:00Z").toZonedDateTimeISO(UTC)],
    }
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: Temporal.Duration.from({ minutes: 120 }),
      label: "",
      gmtString: "",
    }

    const result = getScheduleTimezoneOffset(weeklyEvent, selectedTimezone, 2)
    expect(result.total("minutes")).toBe(-60)
  })
})

describe("specific-times DST regression", () => {
  it("falls back to the browser timezone when curTimezone is empty", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-01-12",
      "2026-01-13",
      "2026-01-14",
      "2026-01-15",
    ].map((day) => {
      return Temporal.ZonedDateTime.from(`${day}T00:00:00[${timezone}]`)
    })

    // When curTimezone is empty, getSpecificTimesDayStarts uses the browser's local timezone
    const result = getSpecificTimesDayStarts(eventDates, {
      value: "",
      offset: durations.ZERO,
      gmtString: "",
      label: "",
    })

    // Convert results to Temporal for comparison
    const resultInstants = result.map((day) => day.dateObject)

    // The actual output depends on the system timezone in the test environment
    // Just verify we get 4 unique days
    expect(resultInstants.length).toBe(4)
    // Verify they are consecutive days
    for (let i = 1; i < resultInstants.length; i++) {
      const prevDay = resultInstants[i - 1]
      const currDay = resultInstants[i]
      const expectedNext = prevDay.add({ days: 1 })
      expect(currDay.equals(expectedNext)).toBe(true)
    }
  })

  it("keeps one civil day per selected date during non-DST periods", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-01-12",
      "2026-01-13",
      "2026-01-14",
      "2026-01-15",
    ].map((day) => {
      return Temporal.ZonedDateTime.from(`${day}T00:00:00[${timezone}]`)
    })

    const result = getSpecificTimesDayStarts(eventDates, {
      value: timezone,
      offset: durations.ZERO,
      gmtString: "",
      label: "",
    })
    const resultInstants = result.map((day) => day.dateObject.toInstant())

    expect(resultInstants.map((instant) => instant.toString())).toEqual([
      "2026-01-12T08:00:00Z",
      "2026-01-13T08:00:00Z",
      "2026-01-14T08:00:00Z",
      "2026-01-15T08:00:00Z",
    ])
  })

  it("keeps one civil day per selected date across spring-forward DST changes", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ].map((day) => {
      return Temporal.ZonedDateTime.from(`${day}T00:00:00[${timezone}]`)
    })

    const result = getSpecificTimesDayStarts(eventDates, {
      value: timezone,
      offset: durations.ZERO,
      gmtString: "",
      label: "",
    })
    const resultInstants = result.map((day) => day.dateObject.toInstant())

    expect(resultInstants.map((instant) => instant.toString())).toEqual([
      "2026-03-07T08:00:00Z",
      "2026-03-08T08:00:00Z",
      "2026-03-09T07:00:00Z", // After spring forward (UTC-7)
      "2026-03-10T07:00:00Z",
    ])
  })

  it("keeps one civil day per selected date across fall-back DST changes", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ].map((day) => {
      return Temporal.ZonedDateTime.from(`${day}T00:00:00[${timezone}]`)
    })

    const result = getSpecificTimesDayStarts(eventDates, {
      value: timezone,
      offset: durations.ZERO,
      gmtString: "",
      label: "",
    })
    const results = result.map((day) => day.dateObject.withTimeZone(UTC).toInstant())

    expect(results.map(result => result.toString())).toEqual([
      "2026-10-31T07:00:00Z", // Before fall back (UTC-7)
      "2026-11-01T07:00:00Z",
      "2026-11-02T08:00:00Z", // After fall back (UTC-8)
      "2026-11-03T08:00:00Z",
    ])
  })
})
