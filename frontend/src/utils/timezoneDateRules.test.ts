import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { eventTypes, UTC } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  doesDstExist,
  getDateInTimezone,
  getDateWithTimezone,
  getScheduleTimezoneOffset,
  getTimezoneOffsetForDate,
  isDstObserved,
  timezoneObservesDST,
} from "./timezoneDateRules"

describe("timezoneDateRules", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("reconstructs edit-flow dates from the saved named timezone boundary", () => {
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        timezone: JSON.stringify({
          value: "America/New_York",
          offset: "-PT5H",
        }),
      })
    )

    const reconstructed = getDateWithTimezone(
      Temporal.Instant.from("2026-06-15T12:00:00Z").toZonedDateTimeISO(UTC)
    )

    expect(reconstructed.timeZoneId).toBe("America/New_York")
    expect(reconstructed.toPlainTime().toString()).toBe("08:00:00")
  })

  it("converts dates through fixed-offset schedule selections", () => {
    const converted = getDateInTimezone(
      Temporal.Instant.from("2026-06-15T12:00:00Z").toZonedDateTimeISO(UTC),
      {
        value: "",
        offset: Temporal.Duration.from({ hours: 5, minutes: 45 }),
        label: "",
        gmtString: "",
      }
    )

    expect(converted.timeZoneId).toBe("+05:45")
    expect(converted.toPlainTime().toString()).toBe("17:45:00")
  })

  it("uses the rendered week when deriving weekly schedule offsets", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))

    const result = getScheduleTimezoneOffset(
      {
        type: eventTypes.DOW,
        dates: [Temporal.PlainDate.from("2018-06-17")],
        timeSeed: Temporal.Instant.from("2018-06-17T09:00:00Z").toZonedDateTimeISO(UTC),
      },
      {
        value: "Europe/Vienna",
        offset: Temporal.Duration.from({ minutes: 60 }),
        label: "",
        gmtString: "",
      },
      3
    )

    expect(result.total("minutes")).toBe(-120)
  })

  it("preserves the stored numeric offset when no timezone name exists", () => {
    const result = getTimezoneOffsetForDate(
      {
        value: "",
        offset: Temporal.Duration.from({ minutes: 90 }),
        label: "",
        gmtString: "",
      },
      Temporal.Instant.from("2026-04-08T12:00:00Z").toZonedDateTimeISO(UTC)
    )

    expect(result.total("minutes")).toBe(-90)
  })

  it("detects DST capabilities and current observation state without Temporal coercion", () => {
    const losAngelesWinter = Temporal.ZonedDateTime.from(
      "2026-01-15T12:00:00[America/Los_Angeles]"
    )
    const losAngelesSummer = Temporal.ZonedDateTime.from(
      "2026-07-15T12:00:00[America/Los_Angeles]"
    )
    const tokyoWinter = Temporal.ZonedDateTime.from("2026-01-15T12:00:00[Asia/Tokyo]")

    expect(doesDstExist(losAngelesWinter)).toBe(true)
    expect(doesDstExist(tokyoWinter)).toBe(false)
    expect(isDstObserved(losAngelesWinter)).toBe(false)
    expect(isDstObserved(losAngelesSummer)).toBe(true)
    expect(timezoneObservesDST("America/Los_Angeles")).toBe(true)
    expect(timezoneObservesDST("Asia/Tokyo")).toBe(false)
    expect(timezoneObservesDST("")).toBe(false)
  })
})
