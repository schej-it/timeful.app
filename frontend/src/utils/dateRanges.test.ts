import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"

import { UTC } from "../constants"
import {
  dateEq,
  dateGeq,
  dateGt,
  dateLeq,
  dateLt,
  isDateBetween,
  isDateBetweenInclusive,
  isDateInRange,
  isTimeNumBetweenDates,
  rangeContainsInclusive,
  rangesOverlap,
} from "./dateRanges"

describe("dateRanges", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

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
})
