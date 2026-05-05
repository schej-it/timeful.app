import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { stubRegressionLocalStorage } from "@/test/regressionTestSetup"
import { zdt } from "@/test/regressionHarness"
import {
  fromRawCalendarEvent,
  fromRawEvent,
  fromRawResponse,
  fromRawSignUpBlock,
  fromRawUser,
  toRawUser,
} from "@/types/transport"
import { getDateWithTimezone } from "@/utils"
import { eventTypes } from "@/constants"
import {
  fromCalendarAvailabilitiesTransportMap,
  fromCalendarEventsTransportMap,
} from "@/composables/event/calendarEventsBoundary"
import { toScheduleOverlapEvent } from "@/composables/schedule_overlap/types"

describe("transport and timezone regression boundaries", () => {
  beforeEach(() => {
    stubRegressionLocalStorage()
  })

  it("reconstructs epoch-millisecond API fields without invalid ZonedDateTime bags", () => {
    expect(() => fromRawEvent({
      dates: [0],
      times: [60 * 60 * 1000],
      duration: 1,
    })).not.toThrow()

    expect(() =>
      fromRawResponse({
        availability: [0],
        ifNeeded: [60 * 60 * 1000],
        manualAvailability: { "2026-01-01": [2 * 60 * 60 * 1000] },
      })
    ).not.toThrow()

    expect(() =>
      fromRawSignUpBlock({
        startDate: 0,
        endDate: 60 * 60 * 1000,
      })
    ).not.toThrow()

    expect(() =>
      fromRawCalendarEvent({
        startDate: 0,
        endDate: 60 * 60 * 1000,
      })
    ).not.toThrow()
  })

  it("exposes an explicit time seed alongside decoded event dates", () => {
    const event = fromRawEvent({
      dates: [Date.parse("2026-01-02T09:30:00Z")],
      duration: 1,
    })

    expect(event.timeSeed?.toString()).toBe("2026-01-02T09:30:00+00:00[UTC]")
    expect(event.dates?.[0].toString()).toBe("2026-01-02")
  })

  it("keeps user transport decoding at an explicit boundary", () => {
    const rawUser = {
      _id: "user-1",
      email: "ada@example.com",
      calendarAccounts: {
        "ada@example.com_google": {
          email: "ada@example.com",
          enabled: true,
          subCalendars: {
            primary: {
              enabled: true,
              name: "Primary",
            },
          },
        },
      },
      calendarOptions: {
        bufferTime: { enabled: true, time: 30 },
        workingHours: { enabled: true, startTime: 8, endTime: 18 },
      },
    }

    const user = fromRawUser(rawUser)
    const roundTrip = toRawUser(user)

    expect(user).not.toBe(rawUser)
    expect(user.calendarAccounts).not.toBe(rawUser.calendarAccounts)
    expect(user.calendarOptions).not.toBe(rawUser.calendarOptions)
    expect(roundTrip).toEqual(rawUser)
  })

  it("revives a saved timezone whose Temporal.Duration was serialized through JSON", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "Europe/Vienna",
        offset: "PT60M",
        label: "Vienna",
        gmtString: "GMT+1",
      })
    )

    expect(() => getDateWithTimezone(zdt("2026-01-01T00:00:00Z"))).not.toThrow()
  })

  it("reconstructs edit-flow times with the saved timezone rules instead of a stale offset", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "America/New_York",
        offset: "-PT5H",
        label: "Eastern Time",
        gmtString: "GMT-5",
      })
    )

    const reconstructed = getDateWithTimezone(zdt("2026-06-15T12:00:00Z"))

    expect(reconstructed.timeZoneId).toBe("America/New_York")
    expect(reconstructed.toPlainTime().toString()).toBe("08:00:00")
    expect(reconstructed.toPlainDate().toString()).toBe("2026-06-15")
  })

  it("reconstructs edit-flow times for offset-only saved timezones through the shared boundary", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: "PT5H45M",
        label: "Nepal Time",
        gmtString: "GMT+5:45",
      })
    )

    const reconstructed = getDateWithTimezone(zdt("2026-06-15T12:00:00Z"))

    expect(reconstructed.timeZoneId).toBe("+05:45")
    expect(reconstructed.toPlainTime().toString()).toBe("17:45:00")
    expect(reconstructed.toPlainDate().toString()).toBe("2026-06-15")
  })

  it("normalizes raw event extras before schedule-overlap consumes them", () => {
    const event = fromRawEvent({
      _id: "evt-1",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Date.parse("2026-01-01T00:00:00Z")],
      duration: 1,
      scheduledEvent: {
        calendarId: "primary",
        startDate: Date.parse("2026-01-01T11:00:00Z"),
        endDate: Date.parse("2026-01-01T12:00:00Z"),
      },
      responses: {
        "user-1": {
          calendarOptions: {
            bufferTime: { enabled: true, time: 15 },
            workingHours: { enabled: true, startTime: 9, endTime: 17 },
          },
        },
      },
      signUpBlocks: [
        {
          _id: "block-1",
          capacity: 2,
          name: "Slot 1",
          startDate: Date.parse("2026-01-01T09:00:00Z"),
          endDate: Date.parse("2026-01-01T10:00:00Z"),
        },
      ],
      signUpResponses: {
        "user-1": {
          userId: "user-1",
          signUpBlockIds: ["block-1"],
          user: {
            _id: "user-1",
            email: "ada@example.com",
            calendarOptions: {
              bufferTime: { enabled: true, time: 30 },
              workingHours: { enabled: true, startTime: 8, endTime: 18 },
            },
          },
        },
      },
    })

    const normalized = toScheduleOverlapEvent(event)

    expect(event.scheduledEvent?.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.scheduledEvent?.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpBlocks?.[0].startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpBlocks?.[0].endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(event.signUpResponses?.["user-1"]?.user).toBeDefined()
    expect(
      event.signUpResponses?.["user-1"]?.user?.calendarOptions?.bufferTime?.time
    ).toBe(30)
    expect(
      normalized.signUpResponses?.["user-1"]?.user?.calendarOptions?.workingHours?.endTime
    ).toBe(18)
    expect(normalized.responses?.["user-1"]?.calendarOptions?.bufferTime?.time).toBe(15)
    expect(normalized.signUpBlocks?.[0].startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalized.signUpBlocks?.[0].endDate).toBeInstanceOf(Temporal.ZonedDateTime)
  })

  it("normalizes fetched calendar-event transport payloads before storing internal state", () => {
    const calendarEventsMap = fromCalendarEventsTransportMap({
      "google:user@example.com": {
        error: true,
        calendarEvents: [
          {
            calendarId: "primary",
            startDate: Date.parse("2026-01-01T09:00:00Z"),
            endDate: Date.parse("2026-01-01T10:00:00Z"),
          },
        ],
      },
    })
    const calendarAvailabilities = fromCalendarAvailabilitiesTransportMap({
      "user-1": [
        {
          calendarId: "primary",
          startDate: Date.parse("2026-01-02T09:00:00Z"),
          endDate: Date.parse("2026-01-02T10:00:00Z"),
        },
      ],
    })
    const calendarEntry = calendarEventsMap["google:user@example.com"]
    const normalizedCalendarEvent = calendarEntry.calendarEvents?.[0]
    const normalizedAvailabilityEvent = calendarAvailabilities["user-1"][0]

    expect(calendarEntry).toBeDefined()
    expect(calendarEntry.error).toBe("true")
    expect(normalizedCalendarEvent).toBeDefined()
    expect(normalizedAvailabilityEvent).toBeDefined()
    expect(normalizedCalendarEvent?.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalizedCalendarEvent?.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalizedAvailabilityEvent.startDate).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(normalizedAvailabilityEvent.endDate).toBeInstanceOf(Temporal.ZonedDateTime)
  })
})
