import { computed, ref, shallowRef } from "vue"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Temporal } from "temporal-polyfill"
import type * as UtilsModule from "@/utils"

import { durations, eventTypes, UTC } from "@/constants"
import { ZdtSet } from "@/utils"
import { applySpecificTimesEditDraft } from "@/composables/event/specificTimesEditDraft"
import { states, type ScheduleOverlapEvent } from "./types"
import { useEventScheduling } from "./useEventScheduling"

const { putMock, showErrorMock, captureMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  showErrorMock: vi.fn(),
  captureMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")
  return {
    ...actual,
    put: putMock,
  }
})

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: showErrorMock,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)
const plainTimeInZone = (time: Temporal.ZonedDateTime, timeZone: string) =>
  time.withTimeZone(timeZone).toPlainTime()

describe("useEventScheduling", () => {
  beforeEach(() => {
    putMock.mockReset()
    showErrorMock.mockReset()
    captureMock.mockReset()
    putMock.mockResolvedValue(undefined)
  })

  it("saves specific-time selections that start at midnight without building an invalid time string", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-1",
      shortId: "abc123",
      name: "Planning Session",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-18")],
      timeSeed: zdt("2026-05-18T06:00:00Z"),
      duration: durations.ONE_HOUR,
      hasSpecificTimes: true,
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
    const originalEvent = event.value
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: () => ({
        minHours: Temporal.PlainTime.from("00:00"),
        maxHours: Temporal.PlainTime.from("00:00"),
      }),
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(new ZdtSet([zdt("2026-05-18T00:00:00Z")])),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[0]).toBe("/events/evt-1")
    const putPayload = putMock.mock.calls[0]?.[1] as Record<string, unknown>
    expect(putPayload).toMatchObject({
      dates: ["2026-05-18T06:00:00Z"],
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: 15,
      creatorPosthogId: "creator-1",
      times: ["2026-05-18T00:00:00Z"],
    })
    // Event has no slotGeneration, so falls back to enabledSlots[0] (00:00)
    const slotGen = putPayload.slotGeneration as Record<string, unknown>
    expect(slotGen).toBeDefined()
    expect(slotGen.startTimeLocal).toBe("00:00:00")
    expect(slotGen.endTimeLocal).toBe("00:15:00")
    expect(event.value.times?.map((time: Temporal.ZonedDateTime) => time.toString())).toEqual([
      "2026-05-18T00:00:00+00:00[UTC]",
    ])
    expect(event.value.dates?.map((date) => date.toString())).toEqual([
      "2026-05-18",
    ])
    expect(event.value.timeSeed?.toString()).toBe("2026-05-18T06:00:00+00:00[UTC]")
    expect(event.value.duration?.toString()).toBe("PT60M")
    expect(event.value.startTime?.toString()).toBe("00:00:00")
    expect(event.value.endTime?.toString()).toBe("00:15:00")
    expect(event.value).not.toBe(originalEvent)
    expect(state.value).toBe(states.HEATMAP)
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("keeps specific-time membership seeds stable while normalizing the saved instants", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-2",
      shortId: "seed123",
      name: "Timezone-normalized specific times",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-19")],
      timeSeed: zdt("2026-05-19T06:30:00Z"),
      duration: durations.ONE_HOUR,
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-2",
      remindees: [],
    })
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: "Europe/Moscow",
        offset: Temporal.Duration.from({ hours: -3 }),
        label: "Europe/Moscow",
        gmtString: "GMT+3",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.FIFTEEN_MINUTES),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => Temporal.Duration.from({ hours: -3 })),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) =>
          plainTimeInZone(time, "Europe/Moscow")
        )
        return {
          minHours: plainTimes.reduce((min, time) =>
            Temporal.PlainTime.compare(time, min) < 0 ? time : min
          ),
          maxHours: plainTimes.reduce((max, time) =>
            Temporal.PlainTime.compare(time, max) > 0 ? time : max
          ),
        }
      },
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(
        new ZdtSet([
          zdt("2026-05-19T06:30:00Z"),
          Temporal.ZonedDateTime.from("2026-05-19T09:15:00+03:00[Europe/Moscow]"),
        ])
      ),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-19T06:30:00Z"],
      times: ["2026-05-19T06:15:00Z", "2026-05-19T06:30:00Z"],
    })
    expect(event.value.timeSeed?.toString()).toBe("2026-05-19T06:30:00+00:00[UTC]")
    expect(event.value.startTime?.toString()).toBe("06:15:00")
    expect(event.value.duration?.toString()).toBe("PT30M")
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("keeps two-day membership dates in the save payload when specific times are selected on only one day", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-3",
      shortId: "seed456",
      name: "Specific times local day rebuild",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-28"), Temporal.PlainDate.from("2026-05-29")],
      timeSeed: zdt("2026-05-28T00:00:00Z"),
      duration: Temporal.Duration.from({ hours: 24 }),
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.ONE_HOUR,
      creatorPosthogId: "creator-3",
      remindees: [],
    })
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: "Europe/Belgrade",
        offset: Temporal.Duration.from({ hours: -2 }),
        label: "Europe/Belgrade",
        gmtString: "GMT+2",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => Temporal.Duration.from({ hours: -2 })),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) =>
          plainTimeInZone(time, "Europe/Belgrade")
        )
        return {
          minHours: plainTimes.reduce((min, time) =>
            Temporal.PlainTime.compare(time, min) < 0 ? time : min
          ),
          maxHours: plainTimes.reduce((max, time) =>
            Temporal.PlainTime.compare(time, max) > 0 ? time : max
          ),
        }
      },
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(
        new ZdtSet([
          zdt("2026-05-29T22:00:00Z"),
          zdt("2026-05-29T23:00:00Z"),
        ])
      ),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-28T00:00:00Z", "2026-05-29T00:00:00Z"],
      times: [
        "2026-05-29T22:00:00Z",
        "2026-05-29T23:00:00Z",
      ],
    })
    expect(event.value.timeSeed?.toString()).toBe("2026-05-28T00:00:00+00:00[UTC]")
    expect(event.value.dates?.map((date) => date.toString())).toEqual([
      "2026-05-28",
      "2026-05-29",
    ])
    expect(event.value.startTime?.toString()).toBe("22:00:00")
    expect(event.value.endTime?.toString()).toBe("00:00:00")
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("uses draft-updated membership dates when specific times are saved after a metadata edit", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const originalEvent: ScheduleOverlapEvent = {
      _id: "evt-3b",
      shortId: "seed789",
      name: "Specific times metadata edit",
      type: eventTypes.SPECIFIC_DATES,
      dates: [
        Temporal.PlainDate.from("2026-05-28"),
        Temporal.PlainDate.from("2026-05-29"),
      ],
      timeSeed: zdt("2026-05-28T09:00:00Z"),
      duration: Temporal.Duration.from({ hours: 8 }),
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.ONE_HOUR,
      creatorPosthogId: "creator-3b",
      remindees: [],
      times: [
        zdt("2026-05-28T09:00:00Z"),
        zdt("2026-05-29T09:00:00Z"),
      ],
    }
    const event = ref<ScheduleOverlapEvent>(
      applySpecificTimesEditDraft({
        event: originalEvent,
        draft: {
          dates: [
            Temporal.PlainDate.from("2026-05-29"),
            Temporal.PlainDate.from("2026-05-30"),
          ],
          timeSeed: zdt("2026-05-29T09:00:00Z"),
          duration: Temporal.Duration.from({ hours: 8 }),
          timeIncrementMinutes: 60,
          resetExistingTimes: true,
        },
      }) as ScheduleOverlapEvent
    )
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) => plainTimeInZone(time, UTC))
        return {
          minHours: plainTimes.reduce((min, time) =>
            Temporal.PlainTime.compare(time, min) < 0 ? time : min
          ),
          maxHours: plainTimes.reduce((max, time) =>
            Temporal.PlainTime.compare(time, max) > 0 ? time : max
          ),
        }
      },
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(
        new ZdtSet([
          zdt("2026-05-30T10:00:00Z"),
          zdt("2026-05-30T11:00:00Z"),
        ])
      ),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-29T09:00:00Z", "2026-05-30T09:00:00Z"],
      times: ["2026-05-30T10:00:00Z", "2026-05-30T11:00:00Z"],
    })
    expect(event.value.dates?.map((date) => date.toString())).toEqual([
      "2026-05-29",
      "2026-05-30",
    ])
    expect(event.value.timeSeed?.toString()).toBe("2026-05-29T09:00:00+00:00[UTC]")
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("saves the exact UTC quarter-hour payload for a two-day specific-times drag selection", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-4",
      shortId: "drag789",
      name: "Specific times drag save",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-29"), Temporal.PlainDate.from("2026-05-30")],
      timeSeed: zdt("2026-05-29T00:00:00Z"),
      duration: Temporal.Duration.from({ hours: 24 }),
      hasSpecificTimes: true,
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
    const selectedTimes = new ZdtSet(
      ["2026-05-29", "2026-05-30"].flatMap((date) =>
        [
          "01:00:00",
          "01:15:00",
          "01:30:00",
          "01:45:00",
          "02:00:00",
          "02:15:00",
          "02:30:00",
          "02:45:00",
          "03:00:00",
          "03:15:00",
          "03:30:00",
          "03:45:00",
          "04:00:00",
        ].map((time) => zdt(`${date}T${time}Z`))
      )
    )
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.FIFTEEN_MINUTES),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) => plainTimeInZone(time, UTC))
        return {
          minHours: plainTimes.reduce((min, time) =>
            Temporal.PlainTime.compare(time, min) < 0 ? time : min
          ),
          maxHours: plainTimes.reduce((max, time) =>
            Temporal.PlainTime.compare(time, max) > 0 ? time : max
          ),
        }
      },
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(selectedTimes),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-29T00:00:00Z", "2026-05-30T00:00:00Z"],
      duration: 3.25,
      times: [
        "2026-05-29T01:00:00Z",
        "2026-05-29T01:15:00Z",
        "2026-05-29T01:30:00Z",
        "2026-05-29T01:45:00Z",
        "2026-05-29T02:00:00Z",
        "2026-05-29T02:15:00Z",
        "2026-05-29T02:30:00Z",
        "2026-05-29T02:45:00Z",
        "2026-05-29T03:00:00Z",
        "2026-05-29T03:15:00Z",
        "2026-05-29T03:30:00Z",
        "2026-05-29T03:45:00Z",
        "2026-05-29T04:00:00Z",
        "2026-05-30T01:00:00Z",
        "2026-05-30T01:15:00Z",
        "2026-05-30T01:30:00Z",
        "2026-05-30T01:45:00Z",
        "2026-05-30T02:00:00Z",
        "2026-05-30T02:15:00Z",
        "2026-05-30T02:30:00Z",
        "2026-05-30T02:45:00Z",
        "2026-05-30T03:00:00Z",
        "2026-05-30T03:15:00Z",
        "2026-05-30T03:30:00Z",
        "2026-05-30T03:45:00Z",
        "2026-05-30T04:00:00Z",
      ],
    })
    expect(
      event.value.times?.map((time: Temporal.ZonedDateTime) => time.toString())
    ).toEqual(
      ["2026-05-29", "2026-05-30"].flatMap((date) =>
        [
          "01:00:00",
          "01:15:00",
          "01:30:00",
          "01:45:00",
          "02:00:00",
          "02:15:00",
          "02:30:00",
          "02:45:00",
          "03:00:00",
          "03:15:00",
          "03:30:00",
          "03:45:00",
          "04:00:00",
        ].map((time) => `${date}T${time}+00:00[UTC]`)
      )
    )
    expect(event.value.dates?.map((date) => date.toString())).toEqual([
      "2026-05-29",
      "2026-05-30",
    ])
    expect(event.value.timeSeed?.toString()).toBe("2026-05-29T00:00:00+00:00[UTC]")
    expect(event.value.duration?.toString()).toBe("PT3H15M")
    expect(event.value.startTime?.toString()).toBe("01:00:00")
    expect(event.value.endTime?.toString()).toBe("04:15:00")
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("preserves a saved active-slot subset when saving an edited specific-times event", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-4b",
      shortId: "subset123",
      name: "Specific times subset preserve",
      type: eventTypes.SPECIFIC_DATES,
      dates: [
        Temporal.PlainDate.from("2026-05-30"),
        Temporal.PlainDate.from("2026-05-31"),
      ],
      timeSeed: zdt("2026-05-30T09:00:00Z"),
      duration: Temporal.Duration.from({ minutes: 30 }),
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-4b",
      remindees: [],
      enabledSlots: [
        zdt("2026-05-30T09:00:00Z"),
        zdt("2026-05-30T09:15:00Z"),
        zdt("2026-05-31T09:00:00Z"),
        zdt("2026-05-31T09:15:00Z"),
      ],
      activeSlots: [zdt("2026-05-31T09:00:00Z"), zdt("2026-05-31T09:15:00Z")],
      times: [zdt("2026-05-31T09:00:00Z"), zdt("2026-05-31T09:15:00Z")],
    })
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.FIFTEEN_MINUTES),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) => plainTimeInZone(time, UTC))
        return {
          minHours: plainTimes.reduce((min, time) =>
            Temporal.PlainTime.compare(time, min) < 0 ? time : min
          ),
          maxHours: plainTimes.reduce((max, time) =>
            Temporal.PlainTime.compare(time, max) > 0 ? time : max
          ),
        }
      },
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(
        new ZdtSet([zdt("2026-05-31T09:00:00Z"), zdt("2026-05-31T09:15:00Z")])
      ),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      enabledSlots: [
        "2026-05-30T09:00:00Z",
        "2026-05-30T09:15:00Z",
        "2026-05-31T09:00:00Z",
        "2026-05-31T09:15:00Z",
      ],
      activeSlots: ["2026-05-31T09:00:00Z", "2026-05-31T09:15:00Z"],
      times: ["2026-05-31T09:00:00Z", "2026-05-31T09:15:00Z"],
    })
    expect(event.value.enabledSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-30T09:00:00+00:00[UTC]",
      "2026-05-30T09:15:00+00:00[UTC]",
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
    expect(event.value.activeSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
    expect(event.value.times?.map((slot) => slot.toString())).toEqual([
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
    ])
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("expands the enabled domain when a saved specific-times edit selects a newly added slot", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-4c",
      shortId: "subset-expand123",
      name: "Specific times subset expand",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-31")],
      timeSeed: zdt("2026-05-31T09:00:00Z"),
      duration: Temporal.Duration.from({ minutes: 30 }),
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-4c",
      remindees: [],
      enabledSlots: [
        zdt("2026-05-31T09:00:00Z"),
        zdt("2026-05-31T09:15:00Z"),
      ],
      activeSlots: [zdt("2026-05-31T09:00:00Z")],
      times: [zdt("2026-05-31T09:00:00Z")],
    })
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.FIFTEEN_MINUTES),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) => plainTimeInZone(time, UTC))
        return {
          minHours: plainTimes.reduce((min, time) =>
            Temporal.PlainTime.compare(time, min) < 0 ? time : min
          ),
          maxHours: plainTimes.reduce((max, time) =>
            Temporal.PlainTime.compare(time, max) > 0 ? time : max
          ),
        }
      },
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(
        new ZdtSet([zdt("2026-05-31T09:00:00Z"), zdt("2026-05-31T09:30:00Z")])
      ),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      enabledSlots: [
        "2026-05-31T09:00:00Z",
        "2026-05-31T09:15:00Z",
        "2026-05-31T09:30:00Z",
      ],
      activeSlots: ["2026-05-31T09:00:00Z", "2026-05-31T09:30:00Z"],
      times: ["2026-05-31T09:00:00Z", "2026-05-31T09:30:00Z"],
    })
    expect(event.value.enabledSlots?.map((slot) => slot.toString())).toEqual([
      "2026-05-31T09:00:00+00:00[UTC]",
      "2026-05-31T09:15:00+00:00[UTC]",
      "2026-05-31T09:30:00+00:00[UTC]",
    ])
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("calls refreshEvent callback after successful save", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-refresh",
      shortId: "refresh1",
      name: "Refresh test",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-06-01")],
      timeSeed: zdt("2026-06-01T06:00:00Z"),
      duration: durations.ONE_HOUR,
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-refresh",
      remindees: [],
    })
    const refreshEvent = vi.fn()
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: () => ({
        minHours: Temporal.PlainTime.from("00:00"),
        maxHours: Temporal.PlainTime.from("00:00"),
      }),
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(new ZdtSet([zdt("2026-06-01T06:00:00Z")])),
      respondents: computed(() => []),
      refreshEvent,
    })

    await scheduling.saveTempTimes()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(refreshEvent).toHaveBeenCalledTimes(1)
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("shows an error instead of saving when no specific times are selected", async () => {
    const state = ref(states.SET_SPECIFIC_TIMES)
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-5",
      shortId: "empty123",
      name: "Empty specific times",
      type: eventTypes.SPECIFIC_DATES,
      dates: [Temporal.PlainDate.from("2026-05-31")],
      timeSeed: zdt("2026-05-31T00:00:00Z"),
      duration: durations.ONE_HOUR,
      hasSpecificTimes: true,
      notificationsEnabled: false,
      blindAvailabilityEnabled: false,
      daysOnly: false,
      sendEmailAfterXResponses: -1,
      collectEmails: false,
      startOnMonday: true,
      timeIncrement: durations.FIFTEEN_MINUTES,
      creatorPosthogId: "creator-5",
      remindees: [],
    })
    const scheduling = useEventScheduling({
      event,
      weekOffset: ref(0),
      curTimezone: ref({
        value: UTC,
        offset: durations.ZERO,
        label: "UTC",
        gmtString: "GMT",
      }),
      state,
      defaultState: computed(() => states.HEATMAP),
      splitTimes: computed(() => [[{ hoursOffset: durations.ZERO, text: "slot" }], []]),
      timeslotDuration: computed(() => durations.FIFTEEN_MINUTES),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => durations.ZERO),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: vi.fn(() => ({
        minHours: Temporal.PlainTime.from("00:00"),
        maxHours: Temporal.PlainTime.from("00:15"),
      })),
      dragging: ref(false),
      dragStart: ref(null),
      dragCur: ref(null),
      tempTimes: shallowRef(new ZdtSet()),
      respondents: computed(() => []),
    })

    await scheduling.saveTempTimes()

    expect(putMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith("Select at least one time before saving.")
    expect(state.value).toBe(states.SET_SPECIFIC_TIMES)
  })
})
