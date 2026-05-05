import { describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC } from "@/constants"
import {
  getRenderedWeekStart,
  getSpecificTimesDayStarts,
  processTimeBlocks,
} from "./scheduleDateRules"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

interface TestBlock {
  id: string
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  hoursOffset?: number
  hoursLength?: number
}

describe("scheduleDateRules", () => {
  it("keeps one civil day per selected date across spring-forward DST changes", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = ["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"].map(
      (day) => Temporal.ZonedDateTime.from(`${day}T00:00:00[${timezone}]`)
    )

    const result = getSpecificTimesDayStarts(eventDates, {
      value: timezone,
      offset: durations.ZERO,
      gmtString: "",
      label: "",
    })

    expect(result.map((day) => day.dateObject.toInstant().toString())).toEqual([
      "2026-03-07T08:00:00Z",
      "2026-03-08T08:00:00Z",
      "2026-03-09T07:00:00Z",
      "2026-03-10T07:00:00Z",
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

  it("projects weekly time blocks from an explicit rendered week instead of the ambient clock", () => {
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

    const result = processTimeBlocks<TestBlock>(
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

  it("splits overnight blocks across day buckets", () => {
    const result = processTimeBlocks<TestBlock>(
      [zdt("2026-01-01T09:00:00Z")],
      Temporal.Duration.from({ hours: 8 }),
      [
        {
          id: "overnight",
          startDate: zdt("2026-01-01T12:00:00Z"),
          endDate: zdt("2026-01-01T15:30:00Z"),
        },
      ] satisfies TestBlock[],
      eventTypes.SPECIFIC_DATES,
      0,
      false,
      Temporal.Duration.from({ hours: -10 })
    )

    expect(result).toHaveLength(3)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(1)
    expect(result[2]).toEqual([])
    expect(result[0][0].id).toBe("overnight-1")
    expect(result[1][0].id).toBe("overnight-2")
    expect(result[0][0].endDate.toInstant().toString()).toBe("2026-01-02T00:00:00Z")
    expect(result[1][0].startDate.toInstant().toString()).toBe("2026-01-02T00:00:00Z")
    expect(result[1][0].endDate.toInstant().toString()).toBe("2026-01-01T15:30:00Z")
  })

  it("renders offset-only timezone blocks against the selected local day", () => {
    const result = processTimeBlocks<TestBlock>(
      [zdt("2026-01-01T09:00:00Z"), zdt("2026-01-02T09:00:00Z")],
      Temporal.Duration.from({ hours: 8 }),
      [
        {
          id: "offset-only",
          startDate: zdt("2026-01-01T10:30:00Z"),
          endDate: zdt("2026-01-01T11:30:00Z"),
        },
      ] satisfies TestBlock[],
      eventTypes.SPECIFIC_DATES,
      0,
      false,
      Temporal.Duration.from({ hours: 10 })
    )

    expect(result[0]).toHaveLength(0)
    expect(result[1]).toHaveLength(1)
    expect(result[1][0].id).toBe("offset-only")
    expect(result[1][0].hoursOffset).toBe(1.5)
    expect(result[1][0].hoursLength).toBe(1)
  })

  it("appends an extra rendered day bucket when the selected timezone rolls the visible day over", () => {
    const result = processTimeBlocks<TestBlock>(
      [zdt("2026-01-01T09:00:00Z")],
      Temporal.Duration.from({ hours: 8 }),
      [
        {
          id: "same-local-day",
          startDate: zdt("2026-01-01T10:00:00Z"),
          endDate: zdt("2026-01-01T11:00:00Z"),
        },
      ] satisfies TestBlock[],
      eventTypes.SPECIFIC_DATES,
      0,
      false,
      Temporal.Duration.from({ hours: -10 })
    )

    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toEqual([])
  })
})
