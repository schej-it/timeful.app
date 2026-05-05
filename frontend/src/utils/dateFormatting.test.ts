import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"

import { eventTypes, UTC } from "@/constants"
import {
  getDateRangeString,
  getDateRangeStringForEvent,
  getDaysInMonth,
  getISODateString,
  getStartEndDateString,
  timeNumToTimeString,
  timeNumToTimeText,
} from "./dateFormatting"

describe("dateFormatting", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  it("formats midnight-ended ranges as inclusive of the prior day", () => {
    expect(
      getDateRangeString(zdt("2026-05-01T00:00:00Z"), zdt("2026-05-03T00:00:00Z"), true)
    ).toBe("5/1 - 5/2")
  })

  it("formats event date ranges for weekly and specific-date events", () => {
    expect(
      getDateRangeStringForEvent({
        type: eventTypes.DOW,
        dates: [zdt("2026-05-03T09:00:00Z"), zdt("2026-05-04T09:00:00Z")],
      })
    ).toBe("Sun, Mon")

    expect(
      getDateRangeStringForEvent({
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-05-01T00:00:00Z"), zdt("2026-05-03T00:00:00Z")],
      })
    ).toBe("5/1 - 5/2")
  })

  it("formats time numbers for display and transport", () => {
    expect(timeNumToTimeText(0)).toBe("12 am")
    expect(timeNumToTimeText(13.5)).toBe("1:30 pm")
    expect(timeNumToTimeText(13.5, false)).toBe("13:30")
    expect(timeNumToTimeString(9.5)).toBe("09:30:00")
  })

  it("keeps calendar formatting helpers on Temporal-native values", () => {
    expect(getISODateString(zdt("2026-05-01T12:00:00Z"), true)).toBe("2026-05-01")
    expect(getStartEndDateString(zdt("2026-05-01T09:00:00Z"), zdt("2026-05-01T10:30:00Z"))).toContain(
      "Fri, May 1"
    )
    expect(getDaysInMonth(2, 2028)).toBe(29)
  })
})
