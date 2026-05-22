import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  normalizeOptionalTimezone,
  normalizeTimezone,
} from "./timezone_utils"

describe("timezone_utils normalization", () => {
  it("returns a canonical zero-offset timezone for undefined input", () => {
    expect(normalizeTimezone(undefined)).toEqual({
      value: "+00:00",
      label: "+00:00",
      gmtString: "(GMT+0:00)",
      offset: Temporal.Duration.from("PT0S"),
    })
  })

  it("normalizes fixed-offset-only input into a canonical timezone", () => {
    expect(
      normalizeTimezone({
        offset: Temporal.Duration.from("PT5H45M"),
      })
    ).toEqual({
      value: "+05:45",
      label: "+05:45",
      gmtString: "(GMT+5:45)",
      offset: Temporal.Duration.from("PT5H45M"),
    })
  })

  it("revives serialized persisted offsets through the shared normalizer", () => {
    expect(
      normalizeTimezone({
        value: "",
        offset: "PT5H45M",
      })
    ).toEqual({
      value: "+05:45",
      label: "+05:45",
      gmtString: "(GMT+5:45)",
      offset: Temporal.Duration.from("PT5H45M"),
    })
  })

  it("preserves already-canonical timezone input", () => {
    const timezone: Timezone = {
      value: "Asia/Kathmandu",
      label: "Kathmandu",
      gmtString: "GMT+5:45",
      offset: Temporal.Duration.from("PT5H45M"),
    }

    expect(normalizeTimezone(timezone)).toEqual(timezone)
  })

  it("keeps route and draft boundaries optional when no timezone was provided", () => {
    expect(normalizeOptionalTimezone(undefined)).toBeUndefined()
  })
})
