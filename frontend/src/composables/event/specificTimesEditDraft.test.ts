import { describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC } from "@/constants"
import type * as UtilsModule from "@/utils"
import type { Event } from "@/types"
import { buildEventEditorSchedule } from "./eventEditorSchedule"
import {
  applySpecificTimesEditDraft,
  buildSpecificTimesEditDraft,
} from "./specificTimesEditDraft"

const { processEventMock } = vi.hoisted(() => ({
  processEventMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")
  return {
    ...actual,
    processEvent: processEventMock,
  }
})

const buildEvent = (): Event => ({
  _id: "evt-1",
  name: "Specific-times event",
  type: "specific_dates",
  dates: [
    Temporal.PlainDate.from("2026-05-30"),
    Temporal.PlainDate.from("2026-05-31"),
  ],
  timeSeed: Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
  duration: durations.ONE_HOUR,
  hasSpecificTimes: true,
  timeIncrement: durations.FIFTEEN_MINUTES,
  eventTimezone: UTC,
  slotGeneration: {
    startTimeLocal: Temporal.PlainTime.from("09:00"),
    endTimeLocal: Temporal.PlainTime.from("09:30"),
    timeIncrement: durations.FIFTEEN_MINUTES,
  },
  timedRecurrence: {
    kind: "specific_dates",
    selectedDays: [
      Temporal.PlainDate.from("2026-05-30"),
      Temporal.PlainDate.from("2026-05-31"),
    ],
    selectedDaysOfWeek: [],
    startOnMonday: true,
  },
  times: [
    Temporal.Instant.from("2026-05-30T00:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-05-31T00:00:00Z").toZonedDateTimeISO(UTC),
  ],
  enabledSlots: [
    Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
  ],
  activeSlots: [
    Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
  ],
})

const buildWeeklyEvent = (): Event => ({
  _id: "evt-weekly",
  name: "Weekly specific-times event",
  type: eventTypes.DOW,
  dates: [
    Temporal.PlainDate.from("2026-01-05"),
    Temporal.PlainDate.from("2026-01-07"),
  ],
  timeSeed: Temporal.Instant.from("2026-01-05T17:00:00Z").toZonedDateTimeISO(UTC),
  duration: durations.ONE_HOUR,
  hasSpecificTimes: false,
  timeIncrement: Temporal.Duration.from({ minutes: 30 }),
  eventTimezone: "America/Los_Angeles",
  slotGeneration: {
    startTimeLocal: Temporal.PlainTime.from("09:00"),
    endTimeLocal: Temporal.PlainTime.from("10:00"),
    timeIncrement: Temporal.Duration.from({ minutes: 30 }),
  },
  timedRecurrence: {
    kind: "weekly",
    selectedDays: [
      Temporal.PlainDate.from("2026-01-05"),
      Temporal.PlainDate.from("2026-01-07"),
    ],
    selectedDaysOfWeek: [1, 3],
    startOnMonday: true,
  },
  times: [
    Temporal.Instant.from("2026-01-05T17:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-05T17:30:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-07T17:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-07T17:30:00Z").toZonedDateTimeISO(UTC),
  ],
  enabledSlots: [
    Temporal.Instant.from("2026-01-05T17:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-05T17:30:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-07T17:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-07T17:30:00Z").toZonedDateTimeISO(UTC),
  ],
  activeSlots: [
    Temporal.Instant.from("2026-01-05T17:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-05T17:30:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-07T17:00:00Z").toZonedDateTimeISO(UTC),
    Temporal.Instant.from("2026-01-07T17:30:00Z").toZonedDateTimeISO(UTC),
  ],
})

describe("specificTimesEditDraft", () => {
  it("marks specific-time edits for reset when the slot window changes", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("17:00"),
      timezoneValue: UTC,
    })

    expect(
      buildSpecificTimesEditDraft({
        event: buildEvent(),
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: true,
      })
    ).toMatchObject({
      dates: schedule.normalizedSelectedDays,
      timeIncrementMinutes: 15,
      resetExistingTimes: true,
    })
  })

  it("preserves the prior subset on unchanged dates and defaults added dates to fully active", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
        Temporal.PlainDate.from("2026-06-01"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    expect(
      buildSpecificTimesEditDraft({
        event: buildEvent(),
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: true,
      })
    ).toMatchObject({
      resetExistingTimes: false,
      activeSlots: [
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-06-01T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-06-01T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
    })
  })

  it("filters the active subset down to remaining picked dates when membership shrinks", () => {
    const event = buildEvent()
    event.dates = [
      Temporal.PlainDate.from("2026-05-28"),
      Temporal.PlainDate.from("2026-05-29"),
      Temporal.PlainDate.from("2026-05-30"),
    ]
    event.timedRecurrence = {
      kind: "specific_dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-28"),
        Temporal.PlainDate.from("2026-05-29"),
        Temporal.PlainDate.from("2026-05-30"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
    }
    event.enabledSlots = [
      Temporal.Instant.from("2026-05-28T09:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-28T09:15:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-29T09:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-29T09:15:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
    ]
    event.activeSlots = [
      Temporal.Instant.from("2026-05-29T09:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-29T09:15:00Z").toZonedDateTimeISO(UTC),
    ]

    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-29"),
        Temporal.PlainDate.from("2026-05-30"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    expect(
      buildSpecificTimesEditDraft({
        event,
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: true,
      })
    ).toMatchObject({
      resetExistingTimes: false,
      activeSlots: [
        Temporal.Instant.from("2026-05-29T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-29T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
    })
  })

  it("preserves saved specific times when membership dates and increment stay unchanged", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    expect(
      buildSpecificTimesEditDraft({
        event: buildEvent(),
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: true,
      })
    ).toMatchObject({
      resetExistingTimes: false,
      activeSlots: [
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
    })
  })

  it("keeps the saved active subset when canonical fields still match stale legacy dates", () => {
    const event = buildEvent()
    event.dates = [
      Temporal.PlainDate.from("2026-05-01"),
      Temporal.PlainDate.from("2026-05-02"),
    ]

    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    expect(
      buildSpecificTimesEditDraft({
        event,
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: true,
      })
    ).toMatchObject({
      resetExistingTimes: false,
      activeSlots: [
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
    })
  })

  it("keeps picked dates stable and filters the active subset when only the canonical timezone changes", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: "America/Los_Angeles",
      timeIncrementMinutes: 15,
    })

    expect(
      buildSpecificTimesEditDraft({
        event: buildEvent(),
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: true,
      })
    ).toMatchObject({
      resetExistingTimes: false,
      enabledSlots: [
        Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
      activeSlots: [],
    })
  })

  it("collapses active slots back to the enabled domain when specific-times editing is disabled", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    expect(
      buildSpecificTimesEditDraft({
        event: buildEvent(),
        schedule,
        timeIncrementMinutes: 15,
        specificTimesEnabled: false,
      })
    ).toMatchObject({
      resetExistingTimes: false,
      enabledSlots: [
        Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
      activeSlots: [
        Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
    })
  })

  it("rewrites non-specific timed edits to the schedule canonical slots instead of preserving stale out-of-window slots", () => {
    const event = buildEvent()
    event.hasSpecificTimes = false
    event.duration = Temporal.Duration.from({ hours: 8 })
    event.slotGeneration = {
      startTimeLocal: Temporal.PlainTime.from("09:00"),
      endTimeLocal: Temporal.PlainTime.from("17:00"),
      timeIncrement: durations.FIFTEEN_MINUTES,
    }
    event.enabledSlots = [
      Temporal.Instant.from("2026-05-30T08:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-30T08:15:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-31T08:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-31T16:45:00Z").toZonedDateTimeISO(UTC),
    ]
    event.activeSlots = [...event.enabledSlots]
    event.times = [
      Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
      Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
    ]

    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("17:00"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    const draft = buildSpecificTimesEditDraft({
      event,
      schedule,
      timeIncrementMinutes: 15,
      specificTimesEnabled: false,
    })

    expect(draft?.enabledSlots?.map((slot) => slot.toInstant().toString())).toEqual(
      schedule.enabledSlots.map((slot) => slot.toInstant().toString())
    )
    expect(draft?.activeSlots?.map((slot) => slot.toInstant().toString())).toEqual(
      schedule.enabledSlots.map((slot) => slot.toInstant().toString())
    )
    expect(draft?.enabledSlots?.some((slot) => slot.toInstant().toString().includes("T08:"))).toBe(
      false
    )
    expect(draft?.activeSlots?.some((slot) => slot.toInstant().toString().includes("T08:"))).toBe(
      false
    )
  })

  it("applies a reset draft by clearing stale times and updating local event seeds", () => {
    const event = buildEvent()
    const nextEvent = applySpecificTimesEditDraft({
      event,
      draft: {
        dates: [
          Temporal.PlainDate.from("2026-05-28"),
          Temporal.PlainDate.from("2026-05-29"),
        ],
        timeSeed: Temporal.Instant.from("2026-05-28T09:00:00Z").toZonedDateTimeISO(
          UTC
        ),
        duration: Temporal.Duration.from({ hours: 8 }),
        timeIncrementMinutes: 30,
        resetExistingTimes: true,
      },
    })

    expect(nextEvent.dates?.map((date) => date.toString())).toEqual([
      "2026-05-28",
      "2026-05-29",
    ])
    expect(nextEvent.timeSeed?.toString()).toBe("2026-05-28T09:00:00+00:00[UTC]")
    expect(nextEvent.timeIncrement?.total("minutes")).toBe(30)
    expect(nextEvent.times).toEqual([])
    expect(processEventMock).toHaveBeenCalledWith(nextEvent)
  })

  it("applies weekly timed drafts without relabeling them as specific_dates", () => {
    const event = buildWeeklyEvent()
    const nextEvent = applySpecificTimesEditDraft({
      event,
      draft: {
        dates: [...(event.dates ?? [])],
        timeSeed: event.timeSeed,
        duration: event.duration,
        enabledSlots: [...(event.enabledSlots ?? [])],
        activeSlots: [...(event.activeSlots ?? [])],
        eventTimezone: event.eventTimezone,
        timedRecurrence: event.timedRecurrence,
        slotGeneration: event.slotGeneration,
        timeIncrementMinutes: 30,
        resetExistingTimes: false,
      },
    })

    expect(nextEvent.type).toBe(eventTypes.DOW)
    expect(nextEvent.timedRecurrence?.kind).toBe("weekly")
  })

  it("applies specific-date timed drafts with the canonical specific_dates type", () => {
    const nextEvent = applySpecificTimesEditDraft({
      event: buildWeeklyEvent(),
      draft: {
        dates: [
          Temporal.PlainDate.from("2026-05-30"),
          Temporal.PlainDate.from("2026-05-31"),
        ],
        timeSeed: Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(
          UTC
        ),
        duration: durations.ONE_HOUR,
        enabledSlots: [
          Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
          Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
          Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
          Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
        ],
        activeSlots: [
          Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
          Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
        ],
        eventTimezone: UTC,
        timedRecurrence: {
          kind: "specific_dates",
          selectedDays: [
            Temporal.PlainDate.from("2026-05-30"),
            Temporal.PlainDate.from("2026-05-31"),
          ],
          selectedDaysOfWeek: [],
          startOnMonday: true,
        },
        slotGeneration: {
          startTimeLocal: Temporal.PlainTime.from("09:00"),
          endTimeLocal: Temporal.PlainTime.from("09:30"),
          timeIncrement: durations.FIFTEEN_MINUTES,
        },
        timeIncrementMinutes: 15,
        resetExistingTimes: false,
      },
    })

    expect(nextEvent.type).toBe(eventTypes.SPECIFIC_DATES)
    expect(nextEvent.timedRecurrence?.kind).toBe("specific_dates")
  })

  it("keeps type and timed recurrence aligned after draft application", () => {
    const weeklyEvent = applySpecificTimesEditDraft({
      event: buildWeeklyEvent(),
      draft: {
        dates: [...(buildWeeklyEvent().dates ?? [])],
        timeSeed: buildWeeklyEvent().timeSeed,
        duration: buildWeeklyEvent().duration,
        enabledSlots: [...(buildWeeklyEvent().enabledSlots ?? [])],
        activeSlots: [...(buildWeeklyEvent().activeSlots ?? [])],
        eventTimezone: buildWeeklyEvent().eventTimezone,
        timedRecurrence: buildWeeklyEvent().timedRecurrence,
        slotGeneration: buildWeeklyEvent().slotGeneration,
        timeIncrementMinutes: 30,
        resetExistingTimes: false,
      },
    })
    const specificDatesEvent = applySpecificTimesEditDraft({
      event: buildEvent(),
      draft: {
        dates: [...(buildEvent().dates ?? [])],
        timeSeed: buildEvent().timeSeed,
        duration: buildEvent().duration,
        enabledSlots: [...(buildEvent().enabledSlots ?? [])],
        activeSlots: [...(buildEvent().activeSlots ?? [])],
        eventTimezone: buildEvent().eventTimezone,
        timedRecurrence: buildEvent().timedRecurrence,
        slotGeneration: buildEvent().slotGeneration,
        timeIncrementMinutes: 15,
        resetExistingTimes: false,
      },
    })

    expect(weeklyEvent.type).toBe(eventTypes.DOW)
    expect(weeklyEvent.timedRecurrence?.kind).toBe("weekly")
    expect(specificDatesEvent.type).toBe(eventTypes.SPECIFIC_DATES)
    expect(specificDatesEvent.timedRecurrence?.kind).toBe("specific_dates")
  })

  it("keeps only the saved active subset when rebuilding a specific-times draft", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    const draft = buildSpecificTimesEditDraft({
      event: buildEvent(),
      schedule,
      timeIncrementMinutes: 15,
      specificTimesEnabled: true,
    })

    expect(draft?.enabledSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-30T09:00:00+00:00[UTC]",
      "2026-05-30T09:15:00+00:00[UTC]",
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
    expect(draft?.activeSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
  })

  it("filters out enabledSlots for removed dates when dates changed", () => {
    const eventWithThreeDates: Event = {
      ...buildEvent(),
      dates: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
        Temporal.PlainDate.from("2026-06-01"),
      ],
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: [
          Temporal.PlainDate.from("2026-05-30"),
          Temporal.PlainDate.from("2026-05-31"),
          Temporal.PlainDate.from("2026-06-01"),
        ],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
      enabledSlots: [
        Temporal.Instant.from("2026-05-30T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-30T09:15:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T09:15:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-06-01T09:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-06-01T09:15:00Z").toZonedDateTimeISO(UTC),
      ],
      times: [
        Temporal.Instant.from("2026-05-30T00:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-05-31T00:00:00Z").toZonedDateTimeISO(UTC),
        Temporal.Instant.from("2026-06-01T00:00:00Z").toZonedDateTimeISO(UTC),
      ],
    }

    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Specific dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      selectedDaysOfWeek: [],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("09:30"),
      timezoneValue: UTC,
      timeIncrementMinutes: 15,
    })

    const draft = buildSpecificTimesEditDraft({
      event: eventWithThreeDates,
      schedule,
      timeIncrementMinutes: 15,
      specificTimesEnabled: true,
    })

    expect(draft?.dates?.map((d) => d.toString())).toEqual([
      "2026-05-30",
      "2026-05-31",
    ])
    expect(draft?.timedRecurrence).toMatchObject({
      kind: "specific_dates",
      selectedDays: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
    })
    // enabledSlots must NOT contain June 1 slots
    expect(draft?.enabledSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-30T09:00:00+00:00[UTC]",
      "2026-05-30T09:15:00+00:00[UTC]",
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
    // activeSlots keep the prior subset after removed-date filtering
    expect(draft?.activeSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
  })

  it("preserves canonical weekly selectedDays on edit drafts even when the schedule builder emits an empty weekly list", () => {
    const schedule = buildEventEditorSchedule({
      daysOnly: false,
      daysOnlyType: "specific_dates",
      selectedDateOption: "Days of the week",
      selectedDays: [],
      selectedDaysOfWeek: [1, 3],
      startOnMonday: true,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("10:00"),
      timezoneValue: "America/Los_Angeles",
      timeIncrementMinutes: 30,
    })

    const draft = buildSpecificTimesEditDraft({
      event: buildWeeklyEvent(),
      schedule,
      timeIncrementMinutes: 30,
      specificTimesEnabled: false,
    })

    expect(draft?.timedRecurrence).toMatchObject({
      kind: "weekly",
      selectedDays: [
        Temporal.PlainDate.from("2026-01-05"),
        Temporal.PlainDate.from("2026-01-07"),
      ],
      selectedDaysOfWeek: [1, 3],
      startOnMonday: true,
    })
  })
})
