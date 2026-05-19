import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import { states, type ScheduleOverlapEvent } from "./types"
import { useCalendarGrid } from "./useCalendarGrid"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

describe("useCalendarGrid", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
  })

  it("renders specific-time grids from integer local hours for existing events", () => {
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-1",
      shortId: "grid123",
      name: "Specific times",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-19")],
      timeSeed: zdt("2026-05-19T06:15:00Z"),
      startTime: Temporal.PlainTime.from("06:15"),
      duration: durations.ONE_HOUR,
      hasSpecificTimes: true,
      times: [zdt("2026-05-19T06:15:00Z"), zdt("2026-05-19T06:30:00Z")],
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-1",
      remindees: [],
    })

    const grid = useCalendarGrid({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: "Europe/Moscow",
        offset: Temporal.Duration.from({ hours: -3 }),
        label: "Europe/Moscow",
        gmtString: "GMT+3",
      }),
      state: ref(states.HEATMAP),
      isPhone: ref(false),
    })

    const renderedLabels = grid.splitTimes.value[0].map((time) => time.text).filter(Boolean)
    const firstRenderedTime = grid.splitTimes.value[0][0]
    const secondRenderedTime = grid.splitTimes.value[0][1]
    const firstSlotBaseline =
      firstRenderedTime && grid.getDateFromDayHoursOffset(0, firstRenderedTime.hoursOffset)
    const firstIncludedSlot = grid.getDateFromDayTimeIndex(0, 1)

    expect(renderedLabels[0]).toBe("9 am")
    expect(renderedLabels).not.toContain("9:15 am")
    expect(firstSlotBaseline?.withTimeZone("Europe/Moscow").toPlainTime().toString()).toBe(
      "09:00:00"
    )
    expect(secondRenderedTime?.hoursOffset.total("minutes")).toBe(15)
    expect(firstIncludedSlot?.withTimeZone("Europe/Moscow").toPlainTime().toString()).toBe(
      "09:15:00"
    )
  })
})
