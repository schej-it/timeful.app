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
        dates: [Temporal.PlainDate.from("2026-05-03"), Temporal.PlainDate.from("2026-05-04")],
      })
    ).toBe("Sun, Mon")

    expect(
      getDateRangeStringForEvent({
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-05-01"), Temporal.PlainDate.from("2026-05-03")],
        timeSeed: zdt("2026-05-01T00:00:00Z"),
      })
    ).toBe("5/1 - 5/2")
  })

  it("derives timed specific-date summaries from projected enabled-slot days", () => {
    expect(
      getDateRangeStringForEvent({
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-05-28")],
        timeSeed: zdt("2026-05-28T00:00:00Z"),
        enabledSlots: [
          zdt("2026-05-28T00:00:00Z"),
          zdt("2026-05-28T01:00:00Z"),
          zdt("2026-05-29T00:00:00Z"),
        ],
        eventTimezone: UTC,
        slotGeneration: {
          startTimeLocal: Temporal.PlainTime.from("00:00:00"),
          endTimeLocal: Temporal.PlainTime.from("02:00:00"),
          timeIncrement: Temporal.Duration.from({ minutes: 60 }),
        },
      })
    ).toBe("5/28 - 5/29")
  })

  it("projects timed specific-date summaries in the persisted event timezone", () => {
    expect(
      getDateRangeStringForEvent({
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-01-05")],
        enabledSlots: [
          zdt("2026-01-05T07:30:00Z"),
          zdt("2026-01-05T08:00:00Z"),
          zdt("2026-01-06T07:30:00Z"),
        ],
        eventTimezone: "America/Los_Angeles",
        slotGeneration: {
          startTimeLocal: Temporal.PlainTime.from("23:30:00"),
          endTimeLocal: Temporal.PlainTime.from("01:30:00"),
          timeIncrement: Temporal.Duration.from({ minutes: 30 }),
        },
      })
    ).toBe("1/4 - 1/5")
  })

  it("can format timed specific-date summaries in the viewer timezone", () => {
    expect(
      getDateRangeStringForEvent(
        {
          type: eventTypes.SPECIFIC_DATES,
          dates: [Temporal.PlainDate.from("2026-06-11"), Temporal.PlainDate.from("2026-06-12")],
          enabledSlots: [
            zdt("2026-06-11T00:00:00Z"),
            zdt("2026-06-11T07:45:00Z"),
            zdt("2026-06-12T00:00:00Z"),
            zdt("2026-06-12T07:45:00Z"),
          ],
          eventTimezone: "Asia/Seoul",
          slotGeneration: {
            startTimeLocal: Temporal.PlainTime.from("09:00:00"),
            endTimeLocal: Temporal.PlainTime.from("17:00:00"),
            timeIncrement: Temporal.Duration.from({ minutes: 15 }),
          },
        },
        {
          value: "America/Los_Angeles",
          offset: Temporal.Duration.from({ hours: 7 }),
          label: "America/Los_Angeles",
          gmtString: "GMT-7",
        }
      )
    ).toBe("6/10 - 6/11")
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
