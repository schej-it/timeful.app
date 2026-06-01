import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { UTC } from "@/constants"
import {
  buildTimedDateSeeds,
  generateTimedSlotsForDay,
  getTimedSlotForMembershipDay,
  getTimedSlotCoverage,
  getTimedSlotGeneration,
  normalizeActiveSlots,
  projectSlotsToLocalDays,
} from "./timedEventSlots"

describe("timedEventSlots", () => {
  it("getTimedSlotGeneration returns correct values for midnight start (00:00-01:00)", () => {
    const result = getTimedSlotGeneration({
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("00:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 15 }),
      },
      enabledSlots: [],
    })

    expect(result.startTimeLocal.toString()).toBe("00:00:00")
    expect(result.endTimeLocal.toString()).toBe("01:00:00")
    expect(result.timeIncrement.total("minutes")).toBe(15)
  })

  it("getTimedSlotGeneration falls back to enabledSlots when slotGeneration is missing", () => {
    const result = getTimedSlotGeneration({
      enabledSlots: [
        Temporal.ZonedDateTime.from("2026-01-05T10:00:00+00:00[UTC]"),
      ],
    })

    // Falls back to enabledSlots[0] time + increment = 10:00 + 15min = 10:15
    expect(result.startTimeLocal.toString()).toBe("10:00:00")
    expect(result.endTimeLocal.toString()).toBe("10:15:00")
  })

  it("getTimedSlotGeneration falls back to defaults when both slotGeneration and enabledSlots are missing", () => {
    const result = getTimedSlotGeneration({})

    expect(result.startTimeLocal.toString()).toBe("09:00:00")
    expect(result.endTimeLocal.toString()).toBe("17:00:00")
  })
  it("drops out-of-domain active slots during normalization", () => {
    const enabledSlots = [
      Temporal.ZonedDateTime.from("2026-01-05T09:00:00+00:00[UTC]"),
      Temporal.ZonedDateTime.from("2026-01-05T09:15:00+00:00[UTC]"),
    ]
    const activeSlots = [
      Temporal.ZonedDateTime.from("2026-01-05T09:15:00+00:00[UTC]"),
      Temporal.ZonedDateTime.from("2026-01-05T10:00:00+00:00[UTC]"),
    ]

    expect(
      normalizeActiveSlots({ enabledSlots, activeSlots }).activeSlots.map((slot) =>
        slot.toString()
      )
    ).toEqual(["2026-01-05T09:15:00+00:00[UTC]"])
  })

  it("projects slots to shifted local membership days", () => {
    const slots = [
      Temporal.ZonedDateTime.from("2026-01-05T00:30:00+00:00[UTC]"),
      Temporal.ZonedDateTime.from("2026-01-06T00:30:00+00:00[UTC]"),
    ]

    expect(
      projectSlotsToLocalDays(slots, "America/Los_Angeles").map((day) =>
        day.toString()
      )
    ).toEqual(["2026-01-04", "2026-01-05"])
  })

  it("generates slots across DST spring-forward gaps", () => {
    const slots = generateTimedSlotsForDay({
      day: Temporal.PlainDate.from("2026-03-08"),
      timeZone: "America/Los_Angeles",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("01:30:00"),
        endTimeLocal: Temporal.PlainTime.from("03:30:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 15 }),
      },
    })

    expect(slots.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-03-08T09:30:00Z",
      "2026-03-08T09:45:00Z",
      "2026-03-08T10:00:00Z",
      "2026-03-08T10:15:00Z",
    ])
  })

  it("generates slots across DST fall-back overlaps", () => {
    const slots = generateTimedSlotsForDay({
      day: Temporal.PlainDate.from("2026-11-01"),
      timeZone: "America/Los_Angeles",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("01:00:00"),
        endTimeLocal: Temporal.PlainTime.from("02:00:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 30 }),
      },
    })

    expect(slots.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-11-01T08:00:00Z",
      "2026-11-01T08:30:00Z",
      "2026-11-01T09:00:00Z",
      "2026-11-01T09:30:00Z",
    ])
  })

  it("generates wrapped cross-midnight slots into the next local day", () => {
    const slots = generateTimedSlotsForDay({
      day: Temporal.PlainDate.from("2026-01-05"),
      timeZone: UTC,
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("23:00:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 30 }),
      },
    })

    expect(slots.map((slot) => slot.toInstant().toString())).toEqual([
      "2026-01-05T23:00:00Z",
      "2026-01-05T23:30:00Z",
      "2026-01-06T00:00:00Z",
      "2026-01-06T00:30:00Z",
    ])
  })

  it("maps membership-day grid rows to canonical UTC instants in the event timezone", () => {
    expect(
      getTimedSlotForMembershipDay({
        day: Temporal.PlainDate.from("2026-05-28"),
        timeZone: UTC,
        absoluteMinutes: 9 * 60,
      }).toInstant().toString()
    ).toBe("2026-05-28T09:00:00Z")

    expect(
      getTimedSlotForMembershipDay({
        day: Temporal.PlainDate.from("2026-01-05"),
        timeZone: "America/Los_Angeles",
        absoluteMinutes: 23 * 60 + 30,
      }).toInstant().toString()
    ).toBe("2026-01-06T07:30:00Z")
  })

  it("builds canonical membership seeds from wrapped enabled domains", () => {
    const seeds = buildTimedDateSeeds({
      daysOnly: false,
      enabledSlots: [
        Temporal.ZonedDateTime.from("2026-01-05T23:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-05T23:30:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-06T00:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-06T00:30:00+00:00[UTC]"),
      ],
      eventTimezone: UTC,
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("23:00:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 30 }),
      },
    })

    expect(seeds.map((slot) => slot.toString())).toEqual([
      "2026-01-05T23:00:00+00:00[UTC]",
    ])
  })

  it("computes monotonic slot coverage for sparse and wrapped domains", () => {
    expect(
      getTimedSlotCoverage({
        enabledSlots: [
          Temporal.ZonedDateTime.from("2026-01-05T09:30:00+00:00[UTC]"),
          Temporal.ZonedDateTime.from("2026-01-05T12:00:00+00:00[UTC]"),
        ],
        eventTimezone: UTC,
        slotGeneration: {
          startTimeLocal: Temporal.PlainTime.from("09:00:00"),
          endTimeLocal: Temporal.PlainTime.from("13:00:00"),
          timeIncrement: Temporal.Duration.from({ minutes: 30 }),
        },
      })
    ).toEqual({
      minTime: Temporal.PlainTime.from("09:30:00"),
      maxTime: Temporal.PlainTime.from("12:30:00"),
    })

    expect(
      getTimedSlotCoverage({
        enabledSlots: [
          Temporal.ZonedDateTime.from("2026-01-05T23:30:00+00:00[UTC]"),
          Temporal.ZonedDateTime.from("2026-01-06T00:00:00+00:00[UTC]"),
        ],
        eventTimezone: UTC,
        slotGeneration: {
          startTimeLocal: Temporal.PlainTime.from("23:00:00"),
          endTimeLocal: Temporal.PlainTime.from("01:00:00"),
          timeIncrement: Temporal.Duration.from({ minutes: 30 }),
        },
      })
    ).toEqual({
      minTime: Temporal.PlainTime.from("23:30:00"),
      maxTime: Temporal.PlainTime.from("00:30:00"),
    })
  })
})
