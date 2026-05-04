import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { UTC } from "@/constants"
import {
  compareDuration,
  durationEquals,
  fromEpochMillisecondsToZDT,
  parseTemporalEpochKey,
  zdtEquals,
} from "./temporalPrimitives"

describe("temporalPrimitives", () => {
  it("compares equal durations by value instead of identity", () => {
    const first = Temporal.Duration.from({ minutes: 30 })
    const second = Temporal.Duration.from({ minutes: 30 })
    const longer = Temporal.Duration.from({ minutes: 45 })

    expect(compareDuration(first, second)).toBe(0)
    expect(durationEquals(first, second)).toBe(true)
    expect(compareDuration(first, longer)).toBeLessThan(0)
  })

  it("reconstructs UTC ZonedDateTime values from epoch milliseconds", () => {
    const zdt = fromEpochMillisecondsToZDT(0)

    expect(zdt.toInstant().toString()).toBe("1970-01-01T00:00:00Z")
    expect(zdt.timeZoneId).toBe(UTC)
  })

  it("parses both millisecond keys and instant strings through one UTC boundary", () => {
    const fromMs = parseTemporalEpochKey("0")
    const fromIso = parseTemporalEpochKey("1970-01-01T00:00:00Z")

    expect(fromMs.timeZoneId).toBe(UTC)
    expect(fromIso.timeZoneId).toBe(UTC)
    expect(zdtEquals(fromMs, fromIso)).toBe(true)
  })
})
