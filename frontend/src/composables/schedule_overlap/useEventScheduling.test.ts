import { computed, ref, shallowRef } from "vue"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Temporal } from "temporal-polyfill"
import type * as UtilsModule from "@/utils"

import { durations, eventTypes, UTC } from "@/constants"
import { ZdtSet } from "@/utils"
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

    scheduling.saveTempTimes()
    await Promise.resolve()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[0]).toBe("/events/evt-1")
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-18T00:00:00Z"],
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
    expect(event.value.times?.map((time: Temporal.ZonedDateTime) => time.toString())).toEqual([
      "2026-05-18T00:00:00+00:00[UTC]",
    ])
    expect(event.value.dates?.map((date) => date.toString())).toEqual([
      "2026-05-18",
    ])
    expect(event.value.timeSeed?.toString()).toBe("2026-05-18T00:00:00+00:00[UTC]")
    expect(event.value.duration?.toString()).toBe("PT1H")
    expect(event.value.startTime?.toString()).toBe("00:00:00")
    expect(event.value.endTime?.toString()).toBe("01:00:00")
    expect(event.value).not.toBe(originalEvent)
    expect(state.value).toBe(states.HEATMAP)
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it("rebuilds specific-time event seeds from the schedule timezone using integer local hours", async () => {
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
      timeIncrement: durations.ONE_HOUR,
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
      timeslotDuration: computed(() => durations.ONE_HOUR),
      timeslotHeight: computed(() => 16),
      timezoneOffset: computed(() => Temporal.Duration.from({ hours: -3 })),
      isWeekly: computed(() => false),
      isGroup: computed(() => false),
      isSpecificTimes: computed(() => true),
      getDateFromRowCol: () => null,
      getMinMaxHoursFromTimes: (times) => {
        const plainTimes = times.map((time) =>
          Temporal.PlainTime.from({ hour: time.withTimeZone("Europe/Moscow").hour })
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

    scheduling.saveTempTimes()
    await Promise.resolve()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-19T06:00:00Z"],
      times: ["2026-05-19T06:15:00Z", "2026-05-19T06:30:00Z"],
    })
    expect(event.value.timeSeed?.toString()).toBe("2026-05-19T06:00:00+00:00[UTC]")
    expect(event.value.startTime?.toString()).toBe("06:00:00")
    expect(event.value.duration?.toString()).toBe("PT1H")
    expect(showErrorMock).not.toHaveBeenCalled()
  })
})
