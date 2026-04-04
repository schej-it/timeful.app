import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getScheduleTimezoneOffset,
  getSpecificTimesDayStarts,
  getTimezoneOffsetForDate,
  getTimezoneReferenceDateForEvent,
} from "./date_utils"
import { eventTypes } from "../constants"
import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"

dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

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

describe("specific-times DST regression", () => {
  it("falls back to the browser timezone when curTimezone is empty", () => {
    const eventDates = [
      "2026-01-12",
      "2026-01-13",
      "2026-01-14",
      "2026-01-15",
    ].map((day) => dayjs.tz(`${day} 00:00`, "America/Los_Angeles").toDate())

    const expectedDates = [
      ...new Set(
        eventDates.map((eventDate) =>
          dayjs(eventDate).startOf("day").toDate().toISOString()
        )
      ),
    ]

    expect(
      getSpecificTimesDayStarts(eventDates, {}).map((day) =>
        day.dateObject.toISOString()
      )
    ).toEqual(expectedDates)
  })
  it("keeps one civil day per selected date during non-DST periods", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-01-12",
      "2026-01-13",
      "2026-01-14",
      "2026-01-15",
    ].map((day) => dayjs.tz(`${day} 00:00`, timezone).toDate())

    expect(
      getSpecificTimesDayStarts(eventDates, { value: timezone }).map((day) =>
        day.dateObject.toISOString()
      )
    ).toEqual([
      "2026-01-12T08:00:00.000Z",
      "2026-01-13T08:00:00.000Z",
      "2026-01-14T08:00:00.000Z",
      "2026-01-15T08:00:00.000Z",
    ])
  })

  it("keeps one civil day per selected date across spring-forward DST changes", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ].map((day) => dayjs.tz(`${day} 00:00`, timezone).toDate())

    expect(
      getSpecificTimesDayStarts(eventDates, { value: timezone }).map((day) =>
        day.dateObject.toISOString()
      )
    ).toEqual([
      "2026-03-07T08:00:00.000Z",
      "2026-03-08T08:00:00.000Z",
      "2026-03-09T07:00:00.000Z",
      "2026-03-10T07:00:00.000Z",
    ])
  })

  it("keeps one civil day per selected date across fall-back DST changes", () => {
    const timezone = "America/Los_Angeles"
    const eventDates = [
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ].map((day) => dayjs.tz(`${day} 00:00`, timezone).toDate())

    expect(
      getSpecificTimesDayStarts(eventDates, { value: timezone }).map((day) =>
        day.dateObject.toISOString()
      )
    ).toEqual([
      "2026-10-31T07:00:00.000Z",
      "2026-11-01T07:00:00.000Z",
      "2026-11-02T08:00:00.000Z",
      "2026-11-03T08:00:00.000Z",
    ])
  })
})
