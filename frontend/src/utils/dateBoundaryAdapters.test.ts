import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"

import { UTC } from "@/constants"
import {
  convertToUTC,
  convertUTCSlotsToLocalISO,
  dateFromObjectId,
} from "./dateBoundaryAdapters"

describe("dateBoundaryAdapters", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  it("converts MongoDB object ids to UTC Temporal dates", () => {
    const date = dateFromObjectId("000000000000000000000000")

    expect(date.toInstant().toString()).toBe("1970-01-01T00:00:00Z")
    expect(date.timeZoneId).toBe(UTC)
  })

  it("converts timezone-tagged local strings without invalid Temporal bags", () => {
    const result = convertToUTC("2026-01-01T09:30:00", "America/New_York")

    expect(result.timeZoneId).toBe("America/New_York")
    expect(result.toInstant().toString()).toBe("2026-01-01T14:30:00Z")
  })

  it("re-tags UTC slots into the selected display timezone", () => {
    const result = convertUTCSlotsToLocalISO([zdt("2026-01-01T12:00:00Z")], "America/New_York")

    expect(result).toHaveLength(1)
    expect(result[0].timeZoneId).toBe("America/New_York")
    expect(result[0].toInstant().toString()).toBe("2026-01-01T12:00:00Z")
    expect(result[0].hour).toBe(7)
  })
})
