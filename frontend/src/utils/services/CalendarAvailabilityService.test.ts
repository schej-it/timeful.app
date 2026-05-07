import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes, UTC } from "@/constants"
import { Temporal } from "temporal-polyfill"
import { epochMs } from "@/test/regressionHarness"
import { getRenderedWeekStart } from "../scheduleDateRules"
import {
  fetchCalendarAvailabilitiesTransportMap,
  fetchCalendarEventsTransportMap,
  getCalendarAvailabilityQueryWindow,
} from "./CalendarAvailabilityService"

describe("CalendarAvailabilityService", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(epochMs("2026-03-18T12:00:00Z"))
  })

  it("derives the weekly calendar query window from an explicit rendered week", () => {
    const renderedWeekStart = getRenderedWeekStart(
      0,
      false,
      zdt("2026-04-05T12:00:00Z")
    )

    const result = getCalendarAvailabilityQueryWindow(
      {
        type: eventTypes.DOW,
        dates: [Temporal.PlainDate.from("2018-06-17")],
        timeSeed: zdt("2018-06-17T09:00:00Z"),
        startOnMonday: false,
      },
      { weekOffset: 0, renderedWeekStart }
    )

    expect(result?.timeMin.toString()).toBe("2026-04-03T09:00:00+00:00[UTC]")
    expect(result?.timeMax.toString()).toBe("2026-04-07T09:00:00+00:00[UTC]")
  })

  it("fetches weekly calendar events using the derived query window", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", fetchMock)

    const renderedWeekStart = getRenderedWeekStart(
      0,
      false,
      zdt("2026-04-05T12:00:00Z")
    )

    await fetchCalendarEventsTransportMap(
      {
        type: eventTypes.DOW,
        dates: [Temporal.PlainDate.from("2018-06-17")],
        timeSeed: zdt("2018-06-17T09:00:00Z"),
        startOnMonday: false,
      },
      { weekOffset: 0, renderedWeekStart }
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain(
      "/user/calendars?timeMin=2026-04-03T09:00:00+00:00[UTC]&timeMax=2026-04-07T09:00:00+00:00[UTC]"
    )
  })

  it("narrows calendar-event transport payloads inside the service boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            "google:user@example.com": {
              error: true,
              calendarEvents: [
                {
                  calendarId: "primary",
                  startDate: epochMs("2026-04-03T09:00:00Z"),
                  endDate: epochMs("2026-04-03T10:00:00Z"),
                },
              ],
            },
          })
        ),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchCalendarEventsTransportMap(
      {
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-04-03")],
        timeSeed: zdt("2026-04-03T09:00:00Z"),
      },
      {}
    )

    expect(result["google:user@example.com"]?.calendarEvents?.[0]?.calendarId).toBe(
      "primary"
    )
    expect(result["google:user@example.com"]?.error).toBe(true)
  })

  it("narrows calendar-availability transport payloads inside the service boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            "user-1": [
              {
                calendarId: "primary",
                startDate: epochMs("2026-04-03T09:00:00Z"),
                endDate: epochMs("2026-04-03T10:00:00Z"),
              },
            ],
          })
        ),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchCalendarAvailabilitiesTransportMap(
      {
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-04-03")],
        timeSeed: zdt("2026-04-03T09:00:00Z"),
      },
      { eventId: "evt-1" }
    )

    expect(result["user-1"]?.[0]?.calendarId).toBe("primary")
  })
})
