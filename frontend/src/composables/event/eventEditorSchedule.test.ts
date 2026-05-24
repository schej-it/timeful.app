import { describe, expect, it } from "vitest"
import { dateOptions, durations, eventTypes } from "@/constants"
import { buildEventEditorSchedule } from "./eventEditorSchedule"
import { Temporal } from "temporal-polyfill"

describe("buildEventEditorSchedule", () => {
  it("sorts specific dates and keeps specific-date event typing", () => {
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
})
