import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  convertUTCSlotsToLocalISO,
  dateFromObjectId,
  doesDstExist,
  getCalendarEventsMap,
  getScheduleTimezoneOffset,
  isDstObserved,
  getTimezoneOffsetForDate,
  getTimezoneReferenceDateForEvent,
  validateDOWPayload,
} from "./date_utils"
import { eventTypes, UTC } from "../constants"
import { Temporal } from "temporal-polyfill"
import { getRenderedWeekStart } from "./scheduleDateRules"

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

describe("findings-5 DOW payload validation", () => {
  it("accepts valid DOW slots without throwing on Temporal comparisons", () => {
    expect(() =>
      validateDOWPayload([
        {
          start: "2018-06-18T09:00:00",
          end: "2018-06-18T10:00:00",
          status: "available",
        },
      ])
    ).not.toThrow()

    expect(
      validateDOWPayload([
        {
          start: "2018-06-18T09:00:00",
          end: "2018-06-18T10:00:00",
          status: "available",
        },
      ])
    ).toBeNull()
  })

  it("keeps the existing reversed-range validation error", () => {
    expect(
      validateDOWPayload([
        {
          start: "2018-06-18T10:00:00",
          end: "2018-06-18T09:00:00",
          status: "available",
        },
      ])
    ).toEqual({
      valid: false,
      error: "Slot at index 0 has end time that is before or equal to start time",
    })
  })
})

describe("Temporal migration regression", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  it("converts MongoDB object ids to UTC Temporal dates", () => {
    const date = dateFromObjectId("000000000000000000000000")

    expect(date.toInstant().toString()).toBe("1970-01-01T00:00:00Z")
    expect(date.timeZoneId).toBe(UTC)
  })

  it("fetches weekly calendar events using an explicit rendered week", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", fetchMock)

    const renderedWeekStart = getRenderedWeekStart(
      0,
      false,
      zdt("2026-04-05T12:00:00Z")
    )

    await getCalendarEventsMap(
      {
        type: eventTypes.DOW,
        dates: [zdt("2018-06-17T09:00:00Z")],
        startOnMonday: false,
      },
      { weekOffset: 0, renderedWeekStart }
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain(
      "/user/calendars?timeMin=2026-04-03T09:00:00+00:00[UTC]&timeMax=2026-04-07T09:00:00+00:00[UTC]"
    )
  })

  it("converts UTC slots into another timezone without using invalid Temporal bags", () => {
    const result = convertUTCSlotsToLocalISO(
      [zdt("2026-01-01T12:00:00Z")],
      "America/New_York"
    )

    expect(result).toHaveLength(1)
    expect(result[0].timeZoneId).toBe("America/New_York")
    expect(result[0].toInstant().toString()).toBe("2026-01-01T12:00:00Z")
    expect(result[0].hour).toBe(7)
  })

  it("detects whether a timezone observes DST without Duration identity comparison", () => {
    const losAngelesWinter = Temporal.ZonedDateTime.from(
      "2026-01-15T12:00:00[America/Los_Angeles]"
    )
    const tokyoWinter = Temporal.ZonedDateTime.from(
      "2026-01-15T12:00:00[Asia/Tokyo]"
    )

    expect(doesDstExist(losAngelesWinter)).toBe(true)
    expect(doesDstExist(tokyoWinter)).toBe(false)
  })

  it("detects whether DST is currently observed without Duration ordering coercion", () => {
    const losAngelesWinter = Temporal.ZonedDateTime.from(
      "2026-01-15T12:00:00[America/Los_Angeles]"
    )
    const losAngelesSummer = Temporal.ZonedDateTime.from(
      "2026-07-15T12:00:00[America/Los_Angeles]"
    )

    expect(isDstObserved(losAngelesWinter)).toBe(false)
    expect(isDstObserved(losAngelesSummer)).toBe(true)
  })
})
