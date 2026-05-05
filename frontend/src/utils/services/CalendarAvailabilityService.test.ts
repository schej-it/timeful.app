import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes, UTC } from "@/constants"
import { Temporal } from "temporal-polyfill"
import { getRenderedWeekStart } from "../scheduleDateRules"
import {
  getCalendarAvailabilityQueryWindow,
  getCalendarEventsMap,
} from "./CalendarAvailabilityService"

describe("CalendarAvailabilityService", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:00:00Z"))
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

    await getCalendarEventsMap(
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
})
