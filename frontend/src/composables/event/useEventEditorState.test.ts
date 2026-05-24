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
})
