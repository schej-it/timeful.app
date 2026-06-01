import { computed, ref } from "vue"
import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import type { ScheduleOverlapEvent } from "./types"
import { useSignUpForm } from "./useSignUpForm"

const { putMock, showErrorMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  showErrorMock: vi.fn(),
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
    authUser: null,
  }),
}))

describe("useSignUpForm", () => {
  beforeEach(() => {
    putMock.mockReset()
    showErrorMock.mockReset()
    putMock.mockResolvedValue(undefined)
  })

  it("preserves canonical timed fields when saving edited sign-up blocks", async () => {
    const event = ref<ScheduleOverlapEvent>({
      _id: "evt-1",
      name: "Timed sign up",
      type: "specific_dates",
      duration: Temporal.Duration.from({ hours: 1 }),
      dates: [Temporal.PlainDate.from("2026-05-28")],
      timeSeed: Temporal.ZonedDateTime.from("2026-05-28T09:00:00+00:00[UTC]"),
      enabledSlots: [
        Temporal.ZonedDateTime.from("2026-05-28T09:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-05-28T09:15:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-05-28T09:30:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-05-28T09:45:00+00:00[UTC]"),
      ],
      activeSlots: [
        Temporal.ZonedDateTime.from("2026-05-28T09:15:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-05-28T09:30:00+00:00[UTC]"),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("09:00"),
        endTimeLocal: Temporal.PlainTime.from("10:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 15 }),
      },
      timedRecurrence: {
        kind: "specific_dates" as const,
        selectedDays: [Temporal.PlainDate.from("2026-05-28")],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
      signUpBlocks: [],
    })

    const form = useSignUpForm({
      event,
      isSignUp: computed(() => true),
      days: computed(() => []),
      isOwner: computed(() => true),
      dragStart: ref(null),
    })

    form.signUpBlocksByDay.value = [[
      {
        _id: "block-1",
        name: "Slot 1",
        capacity: 2,
        startDate: Temporal.ZonedDateTime.from("2026-05-28T09:15:00+00:00[UTC]"),
        endDate: Temporal.ZonedDateTime.from("2026-05-28T09:45:00+00:00[UTC]"),
        hoursOffset: Temporal.Duration.from({ minutes: 15 }),
        hoursLength: Temporal.Duration.from({ minutes: 30 }),
      },
    ]]
    form.signUpBlocksToAddByDay.value = [[]]

    await expect(form.submitNewSignUpBlocks()).resolves.toBe(true)

    expect(putMock).toHaveBeenCalledWith("/events/evt-1", {
      enabledSlots: [
        "2026-05-28T09:00:00Z",
        "2026-05-28T09:15:00Z",
        "2026-05-28T09:30:00Z",
        "2026-05-28T09:45:00Z",
      ],
      activeSlots: ["2026-05-28T09:15:00Z", "2026-05-28T09:30:00Z"],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: "09:00:00",
        endTimeLocal: "10:00:00",
        timeIncrementMinutes: 15,
      },
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: ["2026-05-28"],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
      name: "Timed sign up",
      duration: 1,
      dates: ["2026-05-28T09:00:00Z"],
      hasSpecificTimes: undefined,
      notificationsEnabled: undefined,
      blindAvailabilityEnabled: undefined,
      daysOnly: undefined,
      type: "specific_dates",
      sendEmailAfterXResponses: undefined,
      collectEmails: undefined,
      startOnMonday: undefined,
      timeIncrement: undefined,
      creatorPosthogId: undefined,
      description: undefined,
      signUpBlocks: [
        {
          _id: "block-1",
          name: "Slot 1",
          capacity: 2,
          startDate: Temporal.Instant.from("2026-05-28T09:15:00Z").epochMilliseconds,
          endDate: Temporal.Instant.from("2026-05-28T09:45:00Z").epochMilliseconds,
        },
      ],
      times: undefined,
      remindees: undefined,
      attendees: undefined,
    })
  })
})
