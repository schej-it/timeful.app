import { describe, expect, it } from "vitest"
import { validateDOWPayload } from "./dateValidation"

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
