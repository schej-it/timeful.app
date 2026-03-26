import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getScheduleTimezoneOffset,
  getTimezoneOffsetForDate,
  getTimezoneReferenceDateForEvent,
} from "./date_utils"
import { eventTypes } from "../constants"

describe("DST timezone regression", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))
  })

  it("uses the viewed week as the reference date for weekly events", () => {
    const weeklyEvent = {
      type: eventTypes.DOW,
      dates: ["2018-06-17T09:00:00.000Z"],
    }
    const referenceDate = getTimezoneReferenceDateForEvent(weeklyEvent, 3)

    expect(referenceDate.getFullYear()).toBe(2026)
    expect(referenceDate.getMonth()).toBe(3)
    expect(referenceDate.getDate()).toBe(8)
    expect(referenceDate.getHours()).toBe(12)
  })

  it("uses the first event date as the reference date for specific dates", () => {
    const datedEvent = {
      type: eventTypes.SPECIFIC_DATES,
      dates: ["2026-11-02T09:00:00.000Z", "2026-11-03T09:00:00.000Z"],
    }

    expect(
      getTimezoneReferenceDateForEvent(datedEvent).toISOString()
    ).toBe("2026-11-02T09:00:00.000Z")
  })

  it("calculates timezone offsets from the provided reference date", () => {
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: 60,
    }

    expect(
      getTimezoneOffsetForDate(
        selectedTimezone,
        new Date("2026-04-08T12:00:00Z")
      )
    ).toBe(-120)
  })

  it("keeps the standard offset during non-DST viewed weeks", () => {
    const weeklyEvent = {
      type: eventTypes.DOW,
      startOnMonday: false,
      dates: ["2018-06-17T09:00:00.000Z"],
    }
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: 60,
    }

    expect(
      getScheduleTimezoneOffset(weeklyEvent, selectedTimezone, -10)
    ).toBe(-60)
  })

  it("falls back to the stored numeric offset when no timezone name exists", () => {
    const selectedTimezone = {
      offset: 90,
    }

    expect(
      getTimezoneOffsetForDate(
        selectedTimezone,
        new Date("2026-04-08T12:00:00Z")
      )
    ).toBe(-90)
  })

  it("shows the viewed event week using that week's timezone offset", () => {
    const weeklyEvent = {
      type: eventTypes.DOW,
      startOnMonday: false,
      dates: ["2018-06-17T09:00:00.000Z"],
    }
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: 60,
    }

    expect(
      getScheduleTimezoneOffset(weeklyEvent, selectedTimezone, 3)
    ).toBe(-120)
  })

  it("shows the viewed event week using the new offset after fall-back DST changes", () => {
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"))

    const weeklyEvent = {
      type: eventTypes.DOW,
      startOnMonday: false,
      dates: ["2018-06-17T09:00:00.000Z"],
    }
    const selectedTimezone = {
      value: "Europe/Vienna",
      offset: 120,
    }

    expect(
      getScheduleTimezoneOffset(weeklyEvent, selectedTimezone, 2)
    ).toBe(-60)
  })
})
