import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  convertUTCSlotsToLocalISO,
  dateEq,
  dateFromObjectId,
  dateGeq,
  dateGt,
  dateLeq,
  dateLt,
  doesDstExist,
  getCalendarEventsMap,
  getWrappedTimeRangeDuration,
  getRenderedWeekStart,
  getScheduleTimezoneOffset,
  getSpecificTimesDayStarts,
  isDstObserved,
  getTimezoneOffsetForDate,
  getTimezoneReferenceDateForEvent,
  isDateBetween,
  isDateBetweenInclusive,
  isDateInRange,
  isTimeNumBetweenDates,
  processTimeBlocks,
  rangeContainsInclusive,
  rangesOverlap,
  validateDOWPayload,
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

  it("deduplicates multiple instants that belong to the same civil day", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      Temporal.ZonedDateTime.from("2026-03-08T00:00:00[America/Los_Angeles]"),
      Temporal.ZonedDateTime.from("2026-03-08T12:00:00[America/Los_Angeles]"),
      Temporal.ZonedDateTime.from("2026-03-09T00:00:00[America/Los_Angeles]"),
    ]

    const result = getSpecificTimesDayStarts(eventDates, {
      value: timezone,
      offset: durations.ZERO,
      gmtString: "",
      label: "",
    })

    expect(result).toHaveLength(2)
    expect(result.map((day) => day.dateObject.toInstant().toString())).toEqual([
      "2026-03-08T08:00:00Z",
      "2026-03-09T07:00:00Z",
    ])
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

  it("compares ZonedDateTime ranges without using valueOf coercion", () => {
    const start = zdt("2026-01-01T09:00:00Z")
    const middle = zdt("2026-01-01T10:00:00Z")
    const end = zdt("2026-01-01T11:00:00Z")
    const after = zdt("2026-01-01T12:00:00Z")

    expect(isDateBetween(middle, start, end)).toBe(true)
    expect(isDateBetween(start, start, end)).toBe(true)
    expect(isDateBetween(end, start, end)).toBe(true)
    expect(isDateBetween(after, start, end)).toBe(false)
  })

  it("exposes named range helpers for Temporal boundary comparisons", () => {
    const start = zdt("2026-01-01T09:00:00Z")
    const middle = zdt("2026-01-01T10:00:00Z")
    const end = zdt("2026-01-01T11:00:00Z")
    const adjacent = zdt("2026-01-01T12:00:00Z")

    expect(dateLt(start, middle)).toBe(true)
    expect(dateLeq(start, start)).toBe(true)
    expect(dateGt(end, middle)).toBe(true)
    expect(dateGeq(end, end)).toBe(true)
    expect(dateEq(start, start)).toBe(true)
    expect(isDateBetweenInclusive(end, start, end)).toBe(true)
    expect(rangeContainsInclusive(start, adjacent, middle, end)).toBe(true)
    expect(rangesOverlap(start, middle, middle, end)).toBe(false)
    expect(rangesOverlap(start, end, middle, adjacent)).toBe(true)
  })

  it("checks date ranges from Temporal durations", () => {
    const start = zdt("2026-01-01T09:00:00Z")
    const middle = zdt("2026-01-01T10:00:00Z")
    const end = zdt("2026-01-01T11:00:00Z")
    const after = zdt("2026-01-01T12:00:00Z")

    expect(isDateInRange(middle, start, Temporal.Duration.from({ hours: 2 }))).toBe(true)
    expect(isDateInRange(end, start, Temporal.Duration.from({ hours: 2 }))).toBe(true)
    expect(isDateInRange(after, start, Temporal.Duration.from({ hours: 2 }))).toBe(false)
  })

  it("compares PlainTime values without using valueOf coercion", () => {
    const start = zdt("2026-01-01T09:00:00Z")
    const end = zdt("2026-01-01T11:00:00Z")

    expect(isTimeNumBetweenDates(Temporal.PlainTime.from("10:00"), start, end)).toBe(true)
    expect(isTimeNumBetweenDates(Temporal.PlainTime.from("08:59"), start, end)).toBe(false)
    expect(isTimeNumBetweenDates(Temporal.PlainTime.from("11:01"), start, end)).toBe(false)
  })

  it("handles time ranges that cross midnight", () => {
    const start = zdt("2026-01-01T22:00:00Z")
    const end = zdt("2026-01-02T02:00:00Z")

    expect(isTimeNumBetweenDates(Temporal.PlainTime.from("23:00"), start, end)).toBe(true)
    expect(isTimeNumBetweenDates(Temporal.PlainTime.from("01:00"), start, end)).toBe(true)
    expect(isTimeNumBetweenDates(Temporal.PlainTime.from("12:00"), start, end)).toBe(false)
  })

  it("treats equal create-flow start and end times as a 24-hour duration", () => {
    expect(
      getWrappedTimeRangeDuration(
        Temporal.PlainTime.from("09:00"),
        Temporal.PlainTime.from("09:00")
      ).toString()
    ).toBe("PT24H")
  })

  it("preserves overnight create-flow durations", () => {
    expect(
      getWrappedTimeRangeDuration(
        Temporal.PlainTime.from("23:30"),
        Temporal.PlainTime.from("01:00")
      ).toString()
    ).toBe("PT1H30M")
  })

  it("preserves same-day create-flow durations", () => {
    expect(
      getWrappedTimeRangeDuration(
        Temporal.PlainTime.from("09:15"),
        Temporal.PlainTime.from("10:45")
      ).toString()
    ).toBe("PT1H30M")
  })

  it("processes Temporal time blocks without JSON-cloning them into strings", () => {
    interface TestBlock {
      id: string
      startDate: Temporal.ZonedDateTime
      endDate: Temporal.ZonedDateTime
      hoursOffset?: number
      hoursLength?: number
      [key: string]: unknown
    }

    const timeBlocks: TestBlock[] = [
      {
        id: "busy-1",
        startDate: zdt("2026-01-01T10:00:00Z"),
        endDate: zdt("2026-01-01T11:30:00Z"),
      },
    ]

    const result = processTimeBlocks(
      [zdt("2026-01-01T09:00:00Z")],
      Temporal.Duration.from({ hours: 8 }),
      timeBlocks,
      eventTypes.SPECIFIC_DATES
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
    expect(result[0][0].startDate.toInstant().toString()).toBe("2026-01-01T10:00:00Z")
    expect(result[0][0].endDate.toInstant().toString()).toBe("2026-01-01T11:30:00Z")
    expect(result[0][0].hoursOffset).toBe(1)
    expect(result[0][0].hoursLength).toBe(1.5)
  })

  it("ignores time blocks that only touch the visible range boundary", () => {
    interface TestBlock {
      id: string
      startDate: Temporal.ZonedDateTime
      endDate: Temporal.ZonedDateTime
      hoursOffset?: number
      hoursLength?: number
      [key: string]: unknown
    }

    const timeBlocks: TestBlock[] = [
      {
        id: "before",
        startDate: zdt("2026-01-01T08:00:00Z"),
        endDate: zdt("2026-01-01T09:00:00Z"),
      },
      {
        id: "after",
        startDate: zdt("2026-01-01T17:00:00Z"),
        endDate: zdt("2026-01-01T18:00:00Z"),
      },
    ]

    const result = processTimeBlocks(
      [zdt("2026-01-01T09:00:00Z")],
      Temporal.Duration.from({ hours: 8 }),
      timeBlocks,
      eventTypes.SPECIFIC_DATES
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(0)
  })

  it("clamps containing time blocks to the visible range", () => {
    interface TestBlock {
      id: string
      startDate: Temporal.ZonedDateTime
      endDate: Temporal.ZonedDateTime
      hoursOffset?: number
      hoursLength?: number
      [key: string]: unknown
    }

    const timeBlocks: TestBlock[] = [
      {
        id: "spans-day",
        startDate: zdt("2026-01-01T08:00:00Z"),
        endDate: zdt("2026-01-01T18:00:00Z"),
      },
    ]

    const result = processTimeBlocks(
      [zdt("2026-01-01T09:00:00Z")],
      Temporal.Duration.from({ hours: 8 }),
      timeBlocks,
      eventTypes.SPECIFIC_DATES
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
    expect(result[0][0].startDate.toInstant().toString()).toBe("2026-01-01T09:00:00Z")
    expect(result[0][0].endDate.toInstant().toString()).toBe("2026-01-01T17:00:00Z")
    expect(result[0][0].hoursOffset).toBe(0)
    expect(result[0][0].hoursLength).toBe(8)
  })

  it("projects weekly time blocks from an explicit rendered week instead of the ambient clock", () => {
    interface TestBlock {
      id: string
      startDate: Temporal.ZonedDateTime
      endDate: Temporal.ZonedDateTime
      hoursOffset?: number
      hoursLength?: number
      [key: string]: unknown
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))

    const weeklyDates = [zdt("2018-06-17T09:00:00Z")]
    const renderedWeekStart = getRenderedWeekStart(
      0,
      false,
      zdt("2026-04-05T12:00:00Z")
    )
    const timeBlocks: TestBlock[] = [
      {
        id: "visible-week",
        startDate: zdt("2026-04-05T10:00:00Z"),
        endDate: zdt("2026-04-05T11:00:00Z"),
      },
    ]

    const result = processTimeBlocks(
      weeklyDates,
      Temporal.Duration.from({ hours: 8 }),
      timeBlocks,
      eventTypes.DOW,
      0,
      false,
      durations.ZERO,
      renderedWeekStart
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
    expect(result[0][0].startDate.toInstant().toString()).toBe("2018-06-17T10:00:00Z")
    expect(result[0][0].endDate.toInstant().toString()).toBe("2018-06-17T11:00:00Z")
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
