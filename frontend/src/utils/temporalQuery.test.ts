import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { toQueryInstantString } from "./temporalQuery"

describe("toQueryInstantString", () => {
  it("serializes ZonedDateTime values as plain instant strings without zone annotations", () => {
    const value = Temporal.ZonedDateTime.from("2026-05-15T06:00:00+00:00[UTC]")

    expect(toQueryInstantString(value)).toBe("2026-05-15T06:00:00Z")
  })

  it("preserves Instant strings unchanged", () => {
    const value = Temporal.Instant.from("2026-05-15T06:00:00Z")

    expect(toQueryInstantString(value)).toBe("2026-05-15T06:00:00Z")
  })
})
