import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"

import { UTC } from "../constants"
import {
  dateToTimeNum,
  getDateWithTimeNum,
  getWrappedTimeRangeDuration,
  plainTimeToTimeNum,
  splitTimeNum,
  timeNumToPlainTime,
  utcTimeToLocalTime,
  utcTimeToLocalTimeNum,
} from "./timeConversions"

describe("timeConversions", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  it("splits time numbers into hours and minutes", () => {
    expect(splitTimeNum(9.5)).toEqual({ hours: 9, minutes: 30 })
    expect(splitTimeNum(23.75)).toEqual({ hours: 23, minutes: 45 })
  })

  it("round-trips between PlainTime and timeNum", () => {
    const time = Temporal.PlainTime.from("09:30")

    expect(plainTimeToTimeNum(time)).toBe(9.5)
    expect(timeNumToPlainTime(9.5).toString()).toBe("09:30:00")
  })

  it("applies a timeNum to a date", () => {
    const date = zdt("2026-01-01T00:00:00Z")

    expect(getDateWithTimeNum(date, 13.5, true).toString()).toBe(
      "2026-01-01T13:30:00+00:00[UTC]"
    )
  })

  it("reads a PlainTime back from a ZonedDateTime", () => {
    const date = zdt("2026-01-01T13:30:00Z")
    expect(dateToTimeNum(date, true).toString()).toBe("13:30:00")
  })

  it("treats equal create-flow start and end times as a 24-hour duration", () => {
    expect(
      getWrappedTimeRangeDuration(
        Temporal.PlainTime.from("09:00"),
        Temporal.PlainTime.from("09:00")
      ).toString()
    ).toBe("PT24H")
  })

  it("preserves overnight create-flow durations", () => {
    expect(
      getWrappedTimeRangeDuration(
        Temporal.PlainTime.from("23:30"),
        Temporal.PlainTime.from("01:00")
      ).toString()
    ).toBe("PT1H30M")
  })

  it("preserves same-day create-flow durations", () => {
    expect(
      getWrappedTimeRangeDuration(
        Temporal.PlainTime.from("09:15"),
        Temporal.PlainTime.from("10:45")
      ).toString()
    ).toBe("PT1H30M")
  })

  it("converts UTC time numbers using explicit offsets", () => {
    const offset = Temporal.Duration.from({ hours: -8 })
    expect(utcTimeToLocalTimeNum(9, offset)).toBe(17)
  })

  it("converts UTC PlainTime values using explicit offsets", () => {
    const offset = Temporal.Duration.from({ hours: -8 })
    expect(utcTimeToLocalTime(Temporal.PlainTime.from("09:00"), offset).toString()).toBe(
      "17:00:00"
    )
  })
})
