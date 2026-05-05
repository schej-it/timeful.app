import "@/test/regressionTestSetup"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, ref } from "vue"
import { Temporal } from "temporal-polyfill"
import { stubRegressionLocalStorage } from "@/test/regressionTestSetup"
import {
  makeAvailabilityData,
  makeCalendarEventsHarness,
  makeEventSchedulingHarness,
  zdt,
} from "@/test/regressionHarness"
import { durations, eventTypes, hoursPlainTime, UTC } from "@/constants"
import { useCalendarEvents } from "@/composables/schedule_overlap/useCalendarEvents"
import { useCalendarGrid } from "@/composables/schedule_overlap/useCalendarGrid"
import { states } from "@/composables/schedule_overlap/types"

describe("schedule-overlap Temporal regressions", () => {
  beforeEach(() => {
    stubRegressionLocalStorage()
  })

  it("keeps invalid 24:00 sentinels out of shared PlainTime constants", () => {
    expect("TWENTY_FOUR" in hoursPlainTime).toBe(false)
    expect(Temporal.PlainTime.from({ hour: 24 }).toString()).toBe("23:00:00")
  })

  it("matches equal Temporal.Duration values when sizing schedule rows", () => {
    const grid = useCalendarGrid({
      event: ref({
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-01-01T00:00:00Z")],
        duration: durations.ONE_HOUR,
        timeIncrement: Temporal.Duration.from({ minutes: 30 }),
      } as never),
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state: ref(states.EDIT_AVAILABILITY),
      isPhone: ref(false),
    })

    expect(grid.timeslotHeight.value).toBe(grid.HOUR_HEIGHT / 2)
  })

  it("finds both min and max local hours from unsorted Temporal event times", () => {
    const grid = useCalendarGrid({
      event: ref({
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-01-01T00:00:00Z")],
        duration: durations.ONE_HOUR,
      } as never),
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state: ref(states.EDIT_AVAILABILITY),
      isPhone: ref(false),
    })

    const { minHours, maxHours } = grid.getMinMaxHoursFromTimes([
      zdt("2026-01-01T11:00:00Z"),
      zdt("2026-01-01T09:00:00Z"),
    ])

    expect(minHours.toString()).toBe("09:00:00")
    expect(maxHours.toString()).toBe("11:00:00")
  })

  it("compares Temporal date ranges without relational operators in availability checks", () => {
    const availabilityData = makeAvailabilityData()
    const slot = zdt("2026-01-01T09:00:00Z")

    expect(availabilityData.isTouched(slot, [slot])).toBe(true)
  })

  it("compares Temporal calendar event bounds without relational operators", () => {
    const calendarEvents = useCalendarEvents({
      event: ref({
        _id: "evt-1",
        type: eventTypes.SPECIFIC_DATES,
        dates: [Temporal.PlainDate.from("2026-01-01")],
        timeSeed: zdt("2026-01-01T00:00:00Z"),
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
          dateObject: zdt("2026-01-01T00:00:00Z"),
          isConsecutive: true,
        },
      ]),
      times: computed(() => [{ hoursOffset: durations.ZERO, text: "9 AM" }]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timezoneOffset: computed(() => durations.ZERO),
      isGroup: computed(() => false),
      guestName: computed(() => undefined),
      getDateFromDayTimeIndex: (dayIndex: number, timeIndex: number) =>
        dayIndex === 0 && timeIndex === 0 ? zdt("2026-01-01T09:00:00Z") : null,
      fetchedResponses: ref({}),
      loadingResponses: ref({
        loading: false,
        lastFetched: zdt("2026-01-01T00:00:00Z"),
      }),
    })

    expect(() =>
      calendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [
          [
            {
              startDate: zdt("2026-01-01T09:30:00Z"),
              endDate: zdt("2026-01-01T10:00:00Z"),
              free: false,
            },
          ],
        ],
      })
    ).not.toThrow()
  })

  it("keeps slots available when busy events only touch the slot boundary", () => {
    const slot = zdt("2026-01-01T08:00:00Z")
    const calendarEvents = makeCalendarEventsHarness({ slotStart: slot })

    const availability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [
        [
          {
            startDate: zdt("2026-01-01T07:00:00Z"),
            endDate: zdt("2026-01-01T08:00:00Z"),
            free: false,
          },
          {
            startDate: zdt("2026-01-01T09:00:00Z"),
            endDate: zdt("2026-01-01T10:00:00Z"),
            free: false,
          },
        ],
      ],
    })

    expect(availability.has(slot)).toBe(true)
  })

  it("keeps buffered boundary-touching slots available", () => {
    const slot = zdt("2026-01-01T08:00:00Z")
    const calendarEvents = makeCalendarEventsHarness({ slotStart: slot })
    calendarEvents.bufferTime.value = { enabled: true, time: 30 }

    const availability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [
        [
          {
            startDate: zdt("2026-01-01T09:30:00Z"),
            endDate: zdt("2026-01-01T10:30:00Z"),
            free: false,
          },
        ],
      ],
    })

    expect(availability.has(slot)).toBe(true)
  })

  it("supports cross-midnight working-hours windows with 30-minute slots", () => {
    const insideSlot = zdt("2026-01-01T23:30:00Z")
    const calendarEvents = makeCalendarEventsHarness({
      slotStart: insideSlot,
      timeslotDuration: durations.THIRTY_MINUTES,
    })

    calendarEvents.workingHours.value = {
      enabled: true,
      startTime: 22.5,
      endTime: 1.5,
    }

    const availability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [[]],
    })

    expect(availability.has(insideSlot)).toBe(true)
  })

  it("applies working-hours boundaries in the selected schedule timezone", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: UTC,
        offset: "PT0S",
        label: "UTC",
        gmtString: "GMT",
      })
    )

    const beforeWorkingHours = zdt("2025-12-31T16:00:00Z")
    const atWorkingHoursStart = zdt("2025-12-31T17:00:00Z")
    const calendarEvents = makeCalendarEventsHarness({
      slotStart: beforeWorkingHours,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "America/Los_Angeles",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const beforeAvailability = calendarEvents.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: [[]],
      calendarOptions: {
        bufferTime: { enabled: false, time: 15 },
        workingHours: {
          enabled: true,
          startTime: 9,
          endTime: 17,
        },
      },
    })

    expect(beforeAvailability.has(beforeWorkingHours)).toBe(false)

    const startBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: atWorkingHoursStart,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "America/Los_Angeles",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const boundaryAvailability =
      startBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions: {
          bufferTime: { enabled: false, time: 15 },
          workingHours: {
            enabled: true,
            startTime: 9,
            endTime: 17,
          },
        },
      })

    expect(boundaryAvailability.has(atWorkingHoursStart)).toBe(true)
  })

  it("applies working-hours boundaries in offset-only schedule timezones", () => {
    const beforeWorkingHours = zdt("2025-12-31T16:30:00Z")
    const atWorkingHoursStart = zdt("2025-12-31T17:00:00Z")
    const calendarOptions = {
      bufferTime: { enabled: false, time: 15 },
      workingHours: {
        enabled: true,
        startTime: 9,
        endTime: 17,
      },
    }

    const beforeBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: beforeWorkingHours,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const beforeAvailability =
      beforeBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions,
      })

    expect(beforeAvailability.has(beforeWorkingHours)).toBe(false)

    const startBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: atWorkingHoursStart,
      timeslotDuration: durations.THIRTY_MINUTES,
      curTimezoneValue: "",
      curTimezoneOffset: Temporal.Duration.from({ hours: -8 }),
    })

    const boundaryAvailability =
      startBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions,
      })

    expect(boundaryAvailability.has(atWorkingHoursStart)).toBe(true)
  })

  it("keeps fractional-offset working-hours boundaries on the intended civil date", () => {
    const beforeWorkingHours = zdt("2026-01-01T03:00:00Z")
    const atWorkingHoursStart = zdt("2026-01-01T03:15:00Z")
    const calendarOptions = {
      bufferTime: { enabled: false, time: 15 },
      workingHours: {
        enabled: true,
        startTime: 9,
        endTime: 17,
      },
    }

    const beforeBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: beforeWorkingHours,
      timeslotDuration: Temporal.Duration.from({ minutes: 15 }),
      curTimezoneValue: "Asia/Kathmandu",
      curTimezoneOffset: Temporal.Duration.from({ hours: 5, minutes: 45 }),
    })

    const beforeAvailability =
      beforeBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions,
      })

    expect(beforeAvailability.has(beforeWorkingHours)).toBe(false)

    const startBoundaryCalendarEvents = makeCalendarEventsHarness({
      slotStart: atWorkingHoursStart,
      timeslotDuration: Temporal.Duration.from({ minutes: 15 }),
      curTimezoneValue: "Asia/Kathmandu",
      curTimezoneOffset: Temporal.Duration.from({ hours: 5, minutes: 45 }),
    })

    const boundaryAvailability =
      startBoundaryCalendarEvents.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: [[]],
        calendarOptions,
      })

    expect(boundaryAvailability.has(atWorkingHoursStart)).toBe(true)
  })

  it("preserves offset-only schedule timezones in calendar export URLs", () => {
    const slot = zdt("2026-01-01T09:00:00Z")
    const scheduleTimezoneOffset = Temporal.Duration.from({
      hours: 5,
      minutes: 45,
    })
    const openMock = vi
      .fn<(url?: string | URL, target?: string) => Window | null>()
      .mockReturnValue(null)
    vi.stubGlobal("window", { open: openMock })

    const googleScheduling = makeEventSchedulingHarness({
      slotStart: slot,
      curTimezoneValue: "",
      curTimezoneOffset: scheduleTimezoneOffset,
    })
    googleScheduling.curScheduledEvent.value = { row: 0, col: 0, numRows: 1 }
    googleScheduling.confirmScheduleEvent(true)

    const googleUrl = openMock.mock.calls[0]?.[0]
    expect(typeof googleUrl).toBe("string")
    expect(new URL(String(googleUrl)).searchParams.get("ctz")).toBe("+05:45")

    const outlookScheduling = makeEventSchedulingHarness({
      slotStart: slot,
      curTimezoneValue: "",
      curTimezoneOffset: scheduleTimezoneOffset,
    })
    outlookScheduling.curScheduledEvent.value = { row: 0, col: 0, numRows: 1 }
    outlookScheduling.confirmScheduleEvent(false)

    const outlookUrl = openMock.mock.calls[1]?.[0]
    expect(typeof outlookUrl).toBe("string")
    expect(new URL(String(outlookUrl)).searchParams.get("timezone")).toBe(
      "+05:45"
    )
  })

  it("exports weekly DOW schedules from the displayed week instead of the seed week", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-11T12:00:00Z"))

    const openMock = vi
      .fn<(url?: string | URL, target?: string) => Window | null>()
      .mockReturnValue(null)
    vi.stubGlobal("window", { open: openMock })

    const scheduling = makeEventSchedulingHarness({
      slotStart: zdt("2026-01-05T09:00:00Z"),
      eventType: eventTypes.DOW,
      dates: [
        Temporal.PlainDate.from("2026-01-05"),
        Temporal.PlainDate.from("2026-01-07"),
      ],
      timeSeed: zdt("2026-01-05T09:00:00Z"),
      weekOffset: 1,
    })
    scheduling.curScheduledEvent.value = { row: 0, col: 0, numRows: 1 }

    scheduling.confirmScheduleEvent(true)

    const url = openMock.mock.calls[0]?.[0]
    expect(typeof url).toBe("string")
    expect(new URL(String(url)).searchParams.get("dates")).toBe(
      "20260119T090000Z/20260119T100000Z"
    )

    vi.useRealTimers()
  })

  it("keeps specific-times day labels on the intended civil date across DST changes", () => {
    const timezone = "America/Los_Angeles"
    const grid = useCalendarGrid({
      event: ref({
        type: eventTypes.SPECIFIC_DATES,
        hasSpecificTimes: true,
        dates: ["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"].map((day) =>
          Temporal.PlainDate.from(day)
        ),
        timeSeed: Temporal.ZonedDateTime.from(`2026-03-07T00:00:00[${timezone}]`),
        duration: durations.ONE_HOUR,
      } as never),
      weekOffset: ref(0),
      curTimezone: ref({
        value: timezone,
        offset: durations.ZERO,
        label: timezone,
        gmtString: timezone,
      }),
      state: ref(states.SET_SPECIFIC_TIMES),
      isPhone: ref(false),
    })

    expect(
      grid.allDays.value.map((day) => `${day.dayText} ${day.dateString}`)
    ).toEqual(["sat mar 7", "sun mar 8", "mon mar 9", "tue mar 10"])
  })
})
