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
    expect(firstRenderedTime).toBeDefined()
    expect(secondRenderedTime).toBeDefined()

    const firstSlotBaseline = grid.getDateFromDayHoursOffset(
      0,
      firstRenderedTime.hoursOffset
    )
    const firstIncludedSlot = grid.getDateFromDayTimeIndex(0, 1)

    expect(renderedLabels[0]).toBe("9 am")
    expect(renderedLabels).not.toContain("9:15 am")
    expect(firstSlotBaseline?.withTimeZone("Europe/Moscow").toPlainTime().toString()).toBe(
      "09:00:00"
    )
    expect(secondRenderedTime.hoursOffset.total("minutes")).toBe(0)
    expect(firstIncludedSlot?.withTimeZone("Europe/Moscow").toPlainTime().toString()).toBe(
      "09:15:00"
    )
  })

  it("builds split times for half-hour-offset timezones without fractional-hour Duration errors", () => {
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-2",
      shortId: "grid-half-hour",
      name: "Half-hour timezone",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-19")],
      timeSeed: zdt("2026-05-19T06:00:00Z"),
      startTime: Temporal.PlainTime.from("06:00"),
      duration: Temporal.Duration.from({ hours: 2 }),
      hasSpecificTimes: false,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.THIRTY_MINUTES,
      creatorPosthogId: "creator-2",
      remindees: [],
    })

    const grid = useCalendarGrid({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: "Asia/Kolkata",
        offset: Temporal.Duration.from({ minutes: -330 }),
        label: "Asia/Kolkata",
        gmtString: "GMT+5:30",
      }),
      state: ref(states.HEATMAP),
      isPhone: ref(false),
    })

    expect(grid.splitTimes.value[0]).not.toHaveLength(0)
    expect(grid.times.value).not.toHaveLength(0)
    expect(grid.splitTimes.value.flat().some((time) => time.hoursOffset.total("minutes") === -30)).toBe(true)
  })

  it("rounds weird-offset timed grids to whole local hours", () => {
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-3",
      shortId: "grid-quarter-hour",
      name: "Quarter-hour timezone",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-19")],
      timeSeed: zdt("2026-05-19T05:30:00Z"),
      startTime: Temporal.PlainTime.from("05:30"),
      duration: Temporal.Duration.from({ hours: 8 }),
      hasSpecificTimes: false,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-3",
      remindees: [],
    })

    const grid = useCalendarGrid({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: "Asia/Kathmandu",
        offset: Temporal.Duration.from({ minutes: -345 }),
        label: "Asia/Kathmandu",
        gmtString: "GMT+5:45",
      }),
      state: ref(states.HEATMAP),
      isPhone: ref(false),
    })

    const firstRenderedTime = grid.splitTimes.value[0][0]
    const secondRenderedTime = grid.splitTimes.value[0][1]
    const lastRenderedTime =
      grid.splitTimes.value[0][grid.splitTimes.value[0].length - 1]

    expect(firstRenderedTime.text).toBe("11 am")
    expect(firstRenderedTime.hoursOffset.total("minutes")).toBe(-15)
    expect(secondRenderedTime.hoursOffset.total("minutes")).toBe(0)
    expect(
      grid
        .getDateFromDayHoursOffset(0, firstRenderedTime.hoursOffset)
        ?.withTimeZone("Asia/Kathmandu")
        .toPlainTime()
        .toString()
    ).toBe("11:00:00")
    expect(
      grid
        .getDateFromDayTimeIndex(0, 1)
        ?.withTimeZone("Asia/Kathmandu")
        .toPlainTime()
        .toString()
    ).toBe("11:15:00")
    expect(lastRenderedTime.hoursOffset.total("minutes")).toBe(510)
    expect(
      grid
        .getDateFromDayHoursOffset(
          0,
          lastRenderedTime.hoursOffset.add(durations.FIFTEEN_MINUTES)
        )
        ?.withTimeZone("Asia/Kathmandu")
        .toPlainTime()
        .toString()
    ).toBe("20:00:00")
  })

  it("keeps the full event-constrained window for specific-time events with broader duration", () => {
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-4",
      shortId: "grid-specific-window",
      name: "Specific times in a broader window",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-19")],
      timeSeed: zdt("2026-05-19T09:00:00Z"),
      startTime: Temporal.PlainTime.from("09:00"),
      duration: Temporal.Duration.from({ hours: 12 }),
      hasSpecificTimes: true,
      times: [zdt("2026-05-19T09:00:00Z"), zdt("2026-05-19T17:00:00Z")],
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-4",
      remindees: [],
    })

    const grid = useCalendarGrid({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: Temporal.Duration.from({ hours: 0 }),
        label: "UTC",
        gmtString: "GMT+0",
      }),
      state: ref(states.HEATMAP),
      isPhone: ref(false),
    })

    expect(grid.splitTimes.value[0]).toHaveLength(48)
    expect(grid.splitTimes.value[0][0]?.text).toBe("9 am")
    expect(grid.splitTimes.value[0][44]?.text).toBe("8 pm")
    expect(grid.splitTimes.value[0][47]?.absoluteMinutes).toBe(20 * 60 + 45)
  })
})
