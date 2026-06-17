import { afterEach, describe, expect, it, vi } from "vitest"
import { dateOptions, durations, eventTypes } from "@/constants"
import { buildEventEditorSchedule } from "./eventEditorSchedule"
import { Temporal } from "temporal-polyfill"

describe("buildEventEditorSchedule", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("builds full canonical timed output for specific-date events", () => {
    const result = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "unused",
      selectedDateOption: dateOptions.SPECIFIC,
      selectedDays: [
        Temporal.PlainDate.from("2026-05-18"),
        Temporal.PlainDate.from("2026-05-15"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: false,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("10:30"),
      timezoneValue: "UTC",
    })

    expect(result.type).toBe(eventTypes.SPECIFIC_DATES)
    expect(result.duration.total("minutes")).toBe(90)
    expect(result.normalizedSelectedDays.map(day => day.toString())).toEqual([
      "2026-05-15",
      "2026-05-18",
    ])
    expect(result.eventTimezone).toBe("UTC")
    expect(result.slotGeneration).toEqual({
      startTimeLocal: Temporal.PlainTime.from("09:00"),
      endTimeLocal: Temporal.PlainTime.from("10:30"),
      timeIncrement: Temporal.Duration.from({ minutes: 15 }),
    })
    expect(result.timedRecurrence).toEqual({
      kind: "specific_dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-15"),
        Temporal.PlainDate.from("2026-05-18"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: false,
    })
    expect(result.enabledSlots).toEqual(result.activeSlots)
    expect(result.enabledSlots.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-05-15T09:00:00Z",
      "2026-05-15T09:15:00Z",
      "2026-05-15T09:30:00Z",
      "2026-05-15T09:45:00Z",
      "2026-05-15T10:00:00Z",
      "2026-05-15T10:15:00Z",
      "2026-05-18T09:00:00Z",
      "2026-05-18T09:15:00Z",
      "2026-05-18T09:30:00Z",
      "2026-05-18T09:45:00Z",
      "2026-05-18T10:00:00Z",
      "2026-05-18T10:15:00Z",
    ])
  })

  it("filters the sunday sentinel from DOW selections based on startOnMonday", () => {
    const result = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "unused",
      selectedDateOption: dateOptions.DOW,
      selectedDays: [],
      selectedDaysOfWeek: [7, 2, 1],
      startOnMonday: false,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("10:00"),
      timezoneValue: "UTC",
    })

    expect(result.type).toBe(eventTypes.DOW)
    expect(result.duration.total("minutes")).toBe(
      durations.ONE_HOUR.total("minutes")
    )
    expect(result.normalizedSelectedDaysOfWeek).toEqual([1, 2])
    expect(result.dates).toHaveLength(2)
  })

  it("uses the days-only type and zero duration for all-day flows", () => {
    const result = buildEventEditorSchedule({
      daysOnly: true,
      daysOnlyType: "signup",
      selectedDateOption: dateOptions.SPECIFIC,
      selectedDays: [Temporal.PlainDate.from("2026-05-15")],
      selectedDaysOfWeek: [1, 2],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("17:00"),
      timezoneValue: "UTC",
    })

    expect(result.type).toBe("signup")
    expect(result.duration).toEqual(durations.ZERO)
    expect(result.normalizedSelectedDaysOfWeek).toEqual([])
    expect(result.dates[0]?.toString()).toContain("2026-05-15T00:00:00+00:00[UTC]")
  })

  it("builds wrapped cross-midnight specific-date slots into the next local day", () => {
    const result = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "unused",
      selectedDateOption: dateOptions.SPECIFIC,
      selectedDays: [Temporal.PlainDate.from("2026-01-05")],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("23:00"),
      endTime: Temporal.PlainTime.from("01:00"),
      timezoneValue: "UTC",
      timeIncrementMinutes: 30,
    })

    expect(result.duration.total("hours")).toBe(2)
    expect(result.dates.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-01-05T23:00:00Z",
    ])
    expect(result.enabledSlots.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-01-05T23:00:00Z",
      "2026-01-05T23:30:00Z",
      "2026-01-06T00:00:00Z",
      "2026-01-06T00:30:00Z",
    ])
  })

  it("builds weekly canonical recurrence output from current-week anchors", () => {
    vi.useFakeTimers()
    vi.setSystemTime(Temporal.Instant.from("2026-01-05T12:00:00Z").epochMilliseconds)

    const result = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "unused",
      selectedDateOption: dateOptions.DOW,
      selectedDays: [],
      selectedDaysOfWeek: [3, 1],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("10:00"),
      timezoneValue: "UTC",
      timeIncrementMinutes: 30,
    })

    expect(result.type).toBe(eventTypes.DOW)
    expect(result.normalizedSelectedDaysOfWeek).toEqual([1, 3])
    expect(result.timedRecurrence).toEqual({
      kind: "weekly",
      selectedDays: [],
      selectedDaysOfWeek: [1, 3],
      startOnMonday: true,
    })
    expect(result.dates.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-01-05T09:00:00Z",
      "2026-01-07T09:00:00Z",
    ])
    expect(result.enabledSlots.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-01-05T09:00:00Z",
      "2026-01-05T09:30:00Z",
      "2026-01-07T09:00:00Z",
      "2026-01-07T09:30:00Z",
    ])
    expect(result.activeSlots).toEqual(result.enabledSlots)
  })
})
