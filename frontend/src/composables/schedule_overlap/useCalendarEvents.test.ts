// @vitest-environment happy-dom

import { computed, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC } from "@/constants"
import { fetchEventResponses } from "@/composables/event/eventTransportBoundary"
import { useCalendarEvents } from "./useCalendarEvents"

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
    refreshAuthUser: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/composables/event/eventTransportBoundary", () => ({
  fetchEventResponses: vi.fn(),
}))

describe("useCalendarEvents", () => {
  beforeEach(() => {
    vi.mocked(fetchEventResponses).mockReset()
    vi.mocked(fetchEventResponses).mockResolvedValue({})
  })

  it("does not append guestName for whitespace-only guest ownership", async () => {
    const calendarEvents = useCalendarEvents({
      event: ref({
        _id: "evt-1",
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-01-01")],
        timeSeed: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(UTC),
        duration: durations.ONE_HOUR,
      }),
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      calendarEventsMap: ref({}),
      calendarAvailabilities: ref({}),
      addingAvailabilityAsGuest: ref(false),
      calendarOnly: ref(false),
      allDays: computed(() => [
        {
          dayText: "thu",
          dateString: "jan 1",
          dateObject: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(UTC),
          isConsecutive: true,
        },
      ]),
      times: computed(() => [{ hoursOffset: durations.ZERO, text: "9 AM" }]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timezoneOffset: computed(() => durations.ZERO),
      isGroup: computed(() => false),
      guestOwnership: computed(() => ({ name: "   " })),
      getDateFromDayTimeIndex: (dayIndex: number, timeIndex: number) =>
        dayIndex === 0 && timeIndex === 0
          ? Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO(UTC)
          : null,
      fetchedResponses: ref({}),
      loadingResponses: ref({
        loading: false,
        lastFetched: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(UTC),
      }),
    })

    calendarEvents.fetchResponses()
    await Promise.resolve()

    expect(fetchEventResponses).toHaveBeenCalledWith(
      "/events/evt-1/responses?timeMin=2026-01-01T00:00:00Z&timeMax=2026-01-02T00:00:00Z"
    )
  })
})
