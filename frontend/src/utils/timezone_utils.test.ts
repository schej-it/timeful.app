import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  buildTimezonesForReferenceDate,
  normalizeOptionalTimezone,
  normalizeTimezone,
  resolveInitialTimezoneSelection,
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

  it("resolves the saved timezone selection against the canonical timezone list", () => {
    const storage = {
      getItem: (key: string) =>
        key === "timezone"
          ? JSON.stringify({ value: "America/New_York" })
          : null,
    } satisfies Pick<Storage, "getItem">

    const timezone = resolveInitialTimezoneSelection(
      Temporal.ZonedDateTime.from("2026-01-15T12:00:00Z[UTC]"),
      storage,
      "Europe/Moscow"
    )

    expect(timezone).toMatchObject({
      value: "America/New_York",
      label: "Eastern Time",
    })
  })

  it("falls back to the browser timezone selection when no saved timezone exists", () => {
    const storage = {
      getItem: () => null,
    } satisfies Pick<Storage, "getItem">

    const timezone = resolveInitialTimezoneSelection(
      Temporal.ZonedDateTime.from("2026-01-15T12:00:00Z[UTC]"),
      storage,
      "America/New_York"
    )

    expect(timezone).toMatchObject({
      value: "America/New_York",
      label: "Eastern Time",
    })
  })

  it("can build canonical timezone choices for a reference date", () => {
    const timezones = buildTimezonesForReferenceDate(
      Temporal.ZonedDateTime.from("2026-01-15T12:00:00Z[UTC]")
    )

    expect(timezones.some((timezone) => timezone.value === "America/New_York")).toBe(true)
  })
})
