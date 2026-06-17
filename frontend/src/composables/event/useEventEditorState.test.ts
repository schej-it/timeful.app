// @vitest-environment happy-dom

import { computed, nextTick, ref } from "vue"
import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { dateOptions, durations } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import type { Event } from "@/types"
import type { EventDraft } from "./types"
import { useEventEditorState, type EventEditorState } from "./useEventEditorState"
import { Temporal } from "temporal-polyfill"

describe("useEventEditorState", () => {
  it("restores configured defaults on reset and clears opposite date selections", async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock())

    const event = ref<Event | undefined>(undefined)
    const edit = ref(false)
    const contactsPayload = ref<EventDraft | undefined>(undefined)
    const formRef = ref<{ resetValidation: () => void } | null>(null)
    let state!: EventEditorState

    mount({
      setup() {
        state = useEventEditorState({
          event: computed(() => event.value),
          edit: computed(() => edit.value),
          contactsPayload: computed(() => contactsPayload.value),
          formRef,
          initialNotificationsEnabled: true,
          initialStartOnMonday: true,
        })

        return () => null
      },
    })

    expect(state.notificationsEnabled.value).toBe(true)
    expect(state.startOnMonday.value).toBe(true)

    state.selectedDays.value = [Temporal.PlainDate.from("2026-05-15")]
    state.selectedDateOption.value = dateOptions.DOW
    await nextTick()
    expect(state.selectedDays.value).toEqual([])

    state.selectedDaysOfWeek.value = [1, 3]
    state.selectedDateOption.value = dateOptions.SPECIFIC
    await nextTick()
    expect(state.selectedDaysOfWeek.value).toEqual([])

    state.notificationsEnabled.value = false
    state.startOnMonday.value = false
    state.reset()

    expect(state.notificationsEnabled.value).toBe(true)
    expect(state.startOnMonday.value).toBe(true)
  })

  it("remaps Sunday selections when the week start preference changes", async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock())

    const event = ref<Event | undefined>(undefined)
    const edit = ref(false)
    const contactsPayload = ref<EventDraft | undefined>(undefined)
    const formRef = ref<{ resetValidation: () => void } | null>(null)
    let state!: EventEditorState

    mount({
      setup() {
        state = useEventEditorState({
          event: computed(() => event.value),
          edit: computed(() => edit.value),
          contactsPayload: computed(() => contactsPayload.value),
          formRef,
          initialNotificationsEnabled: true,
          initialStartOnMonday: true,
        })

        return () => null
      },
    })

    state.selectedDateOption.value = dateOptions.DOW
    state.selectedDaysOfWeek.value = [1, 7]
    state.startOnMonday.value = false
    await nextTick()

    expect(state.selectedDaysOfWeek.value).toEqual([1, 0])

    state.startOnMonday.value = true
    await nextTick()

    expect(state.selectedDaysOfWeek.value).toEqual([1, 7])
  })

  it("hydrates event data and includes extra state in edit tracking", async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock())

    const event = ref<Event>({
      _id: "evt-1",
      name: "DOW event",
      type: "dow",
      dates: [Temporal.PlainDate.from("2026-05-18")],
      duration: durations.ONE_HOUR,
      startOnMonday: true,
      hasSpecificTimes: true,
      collectEmails: true,
      timeIncrement: Temporal.Duration.from({ minutes: 30 }),
    })
    const edit = ref(true)
    const contactsPayload = ref<EventDraft | undefined>(undefined)
    const formRef = ref<{ resetValidation: () => void } | null>(null)
    let state!: EventEditorState

    mount({
      setup() {
        state = useEventEditorState({
          event: computed(() => event.value),
          edit: computed(() => edit.value),
          contactsPayload: computed(() => contactsPayload.value),
          formRef,
          onEventHydrate: (
            { specificTimesEnabled, collectEmails, timeIncrement, startOnMonday },
            currentEvent
          ) => {
            specificTimesEnabled.value = currentEvent.hasSpecificTimes ?? false
            collectEmails.value = currentEvent.collectEmails ?? false
            timeIncrement.value =
              currentEvent.timeIncrement instanceof Temporal.Duration
                ? currentEvent.timeIncrement.total("minutes")
                : 15
            startOnMonday.value = currentEvent.startOnMonday ?? false
          },
          captureExtraInitialState: ({
            specificTimesEnabled,
            collectEmails,
            timeIncrement,
            startOnMonday,
          }) => ({
            specificTimesEnabled: specificTimesEnabled.value,
            collectEmails: collectEmails.value,
            timeIncrement: timeIncrement.value,
            startOnMonday: startOnMonday.value,
          }),
          isExtraEdited: (
            { specificTimesEnabled, collectEmails, timeIncrement, startOnMonday },
            initial
          ) =>
            specificTimesEnabled.value !== initial.specificTimesEnabled ||
            collectEmails.value !== initial.collectEmails ||
            timeIncrement.value !== initial.timeIncrement ||
            startOnMonday.value !== initial.startOnMonday,
        })

        return () => null
      },
    })

    await nextTick()

    expect(state.selectedDateOption.value).toBe(dateOptions.DOW)
    expect(state.startOnMonday.value).toBe(true)
    expect(state.hasEventBeenEdited()).toBe(false)

    state.timeIncrement.value = 60

    expect(state.hasEventBeenEdited()).toBe(true)
  })

  it("hydrates canonical timed fields with midnight start time (00:00-01:00)", async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock())

    const event = ref<Event>({
      _id: "evt-midnight",
      name: "Midnight event",
      type: "specific_dates",
      dates: [Temporal.PlainDate.from("2026-06-03")],
      timeSeed: Temporal.ZonedDateTime.from("2026-06-03T00:00:00+00:00[UTC]"),
      duration: Temporal.Duration.from({ hours: 1 }),
      enabledSlots: [
        Temporal.ZonedDateTime.from("2026-06-03T00:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-06-03T00:15:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-06-03T00:30:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-06-03T00:45:00+00:00[UTC]"),
      ],
      activeSlots: [
        Temporal.ZonedDateTime.from("2026-06-03T00:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-06-03T00:15:00+00:00[UTC]"),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("00:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 15 }),
      },
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: [Temporal.PlainDate.from("2026-06-03")],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
    })
    const edit = ref(true)
    const contactsPayload = ref<EventDraft | undefined>(undefined)
    const formRef = ref<{ resetValidation: () => void } | null>(null)
    let state!: EventEditorState

    mount({
      setup() {
        state = useEventEditorState({
          event: computed(() => event.value),
          edit: computed(() => edit.value),
          contactsPayload: computed(() => contactsPayload.value),
          formRef,
        })
        return () => null
      },
    })

    await nextTick()

    expect(state.startTime.value.toString()).toBe("00:00:00")
    expect(state.endTime.value.toString()).toBe("01:00:00")
    expect(state.selectedDateOption.value).toBe(dateOptions.SPECIFIC)
    expect(state.selectedDays.value.map((day) => day.toString())).toEqual([
      "2026-06-03",
    ])
    expect(state.timezone.value.value).toBe("UTC")
  })

  it("hydrates canonical timed fields ahead of stale legacy seeds", async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock())

    const event = ref<Event>({
      _id: "evt-2",
      name: "Canonical timed event",
      type: "specific_dates",
      dates: [Temporal.PlainDate.from("2026-01-09")],
      timeSeed: Temporal.ZonedDateTime.from("2026-01-09T09:00:00+00:00[UTC]"),
      duration: durations.ONE_HOUR,
      enabledSlots: [
        Temporal.ZonedDateTime.from("2026-01-10T23:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-10T23:30:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-11T00:00:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-11T00:30:00+00:00[UTC]"),
      ],
      activeSlots: [
        Temporal.ZonedDateTime.from("2026-01-10T23:30:00+00:00[UTC]"),
        Temporal.ZonedDateTime.from("2026-01-11T00:00:00+00:00[UTC]"),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: Temporal.PlainTime.from("23:00"),
        endTimeLocal: Temporal.PlainTime.from("01:00"),
        timeIncrement: Temporal.Duration.from({ minutes: 30 }),
      },
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: [Temporal.PlainDate.from("2026-01-10")],
        selectedDaysOfWeek: [],
        startOnMonday: true,
      },
    })
    const edit = ref(true)
    const contactsPayload = ref<EventDraft | undefined>(undefined)
    const formRef = ref<{ resetValidation: () => void } | null>(null)
    let state!: EventEditorState

    mount({
      setup() {
        state = useEventEditorState({
          event: computed(() => event.value),
          edit: computed(() => edit.value),
          contactsPayload: computed(() => contactsPayload.value),
          formRef,
        })

        return () => null
      },
    })

    await nextTick()

    expect(state.startTime.value.toString()).toBe("23:00:00")
    expect(state.endTime.value.toString()).toBe("01:00:00")
    expect(state.selectedDateOption.value).toBe(dateOptions.SPECIFIC)
    expect(state.selectedDays.value.map((day) => day.toString())).toEqual([
      "2026-01-10",
    ])
    expect(state.timezone.value.value).toBe("UTC")
  })
})
