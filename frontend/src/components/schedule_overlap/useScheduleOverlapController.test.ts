// @vitest-environment happy-dom

import { computed, defineComponent, nextTick, ref, shallowRef } from "vue"
import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { UTC, eventTypes } from "@/constants"
import { ZdtSet } from "@/utils"
import {
  states,
  type ScheduleOverlapEvent,
  type ScheduledEvent,
} from "@/composables/schedule_overlap/types"
import { useScheduleOverlapController } from "./useScheduleOverlapController"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

const baseEvent = (): ScheduleOverlapEvent => ({
  _id: "evt-1",
  ownerId: "owner-1",
  name: "Controller test event",
  type: eventTypes.SPECIFIC_DATES,
  dates: [Temporal.PlainDate.from("2026-01-01")],
  timeSeed: zdt("2026-01-01T09:00:00Z"),
  daysOnly: false,
  hasSpecificTimes: false,
})

class ResizeObserverStub {
  observe = vi.fn()
  disconnect = vi.fn()
}

interface ControllerHarnessOptions {
  event?: ScheduleOverlapEvent
  fromEditEvent?: boolean
  showBestTimes?: boolean
  respondents?: { _id?: string }[]
}

const mountControllerHarness = (options: ControllerHarnessOptions = {}) => {
  const event = ref<ScheduleOverlapEvent>(options.event ?? baseEvent())
  const fromEditEvent = ref(options.fromEditEvent ?? false)
  const showBestTimes = ref(options.showBestTimes ?? false)
  const state = ref(states.BEST_TIMES)
  const availability = shallowRef(new ZdtSet())
  const parsedResponses = computed(() => ({}))
  const respondents = ref(options.respondents ?? [])
  const curTimeslotAvailability = ref<Record<string, boolean>>({})
  const unsavedChanges = ref(false)
  const hideIfNeeded = ref(false)
  const page = ref(0)
  const allDays = ref([event.value.dates?.[0]])
  const mobileNumDays = ref(3)
  const tempTimes = shallowRef(new ZdtSet())
  const calendarEventsByDay = computed(() => [])
  const bufferTime = ref({ enabled: false, time: 15 })
  const workingHours = ref({ enabled: false, startTime: 9, endTime: 17 })
  const curScheduledEvent = ref<ScheduledEvent | null>(null)
  const delayedShowStickyRespondents = ref(false)
  const delayedShowStickyRespondentsTimeout =
    ref<ReturnType<typeof setTimeout> | null>(null)
  const showStickyRespondents = computed(() => false)
  const authUser = ref<{
    _id?: string
    calendarOptions?: { bufferTime?: { enabled?: boolean; time?: number } }
  } | null>(null)

  const spies = {
    setTimeslotSize: vi.fn(),
    onResize: vi.fn(),
    onScroll: vi.fn(),
    startDrag: vi.fn(),
    moveDrag: vi.fn(),
    endDrag: vi.fn(),
    deselectRespondents: vi.fn(),
    resetSignUpForm: vi.fn(),
    resetCurUserAvailability: vi.fn(),
    initSharedCalendarAccounts: vi.fn(),
    fetchResponses: vi.fn(),
    reanimateAvailability: vi.fn(),
    getResponsesFormatted: vi.fn(),
    populateUserAvailability: vi.fn(),
    checkElementsVisible: vi.fn(),
    onShowBestTimesChange: vi.fn(),
  }

  const Harness = defineComponent({
    setup() {
      useScheduleOverlapController({
        event: computed(() => event.value),
        fromEditEvent: computed(() => fromEditEvent.value),
        calendarOnly: computed(() => false),
        weekOffset: computed(() => 0),
        isGroup: computed(() => event.value.type === eventTypes.GROUP),
        isSpecificTimes: computed(() => event.value.hasSpecificTimes === true),
        showBestTimes,
        state,
        availability,
        parsedResponses,
        respondents: computed(() => respondents.value),
        curTimeslotAvailability,
        unsavedChanges,
        hideIfNeeded,
        page,
        allDays: computed(() => allDays.value),
        mobileNumDays,
        tempTimes,
        calendarEventsByDay,
        bufferTime,
        workingHours,
        curScheduledEvent,
        delayedShowStickyRespondents,
        delayedShowStickyRespondentsTimeout,
        showStickyRespondents,
        authUser: computed(() => authUser.value),
        setTimeslotSize: spies.setTimeslotSize,
        onResize: spies.onResize,
        onScroll: spies.onScroll,
        startDrag: spies.startDrag,
        moveDrag: spies.moveDrag,
        endDrag: spies.endDrag,
        deselectRespondents: spies.deselectRespondents,
        resetSignUpForm: spies.resetSignUpForm,
        resetCurUserAvailability: spies.resetCurUserAvailability,
        initSharedCalendarAccounts: spies.initSharedCalendarAccounts,
        fetchResponses: spies.fetchResponses,
        reanimateAvailability: spies.reanimateAvailability,
        getResponsesFormatted: spies.getResponsesFormatted,
        populateUserAvailability: spies.populateUserAvailability,
        checkElementsVisible: spies.checkElementsVisible,
        onShowBestTimesChange: spies.onShowBestTimesChange,
      })

      return {
        state,
        fromEditEvent,
        tempTimes,
        curScheduledEvent,
        curTimeslotAvailability,
        respondents,
      }
    },
    template: `
      <div>
        <div id="drag-section"></div>
        <div id="time-9"></div>
      </div>
    `,
  })

  const wrapper = mount(Harness, {
    attachTo: document.body,
  })

  return {
    wrapper,
    state,
    fromEditEvent,
    tempTimes,
    curScheduledEvent,
    curTimeslotAvailability,
    respondents,
    spies,
  }
}

describe("useScheduleOverlapController", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub)
    vi.stubGlobal("scrollTo", vi.fn())
  })

  afterEach(() => {
    document.body.innerHTML = ""
    window.history.replaceState({}, "", "http://localhost:3000/")
    vi.unstubAllGlobals()
  })

  it("moves scheduled-event URL initialization into the controller and consumes the query param", () => {
    const scheduledEvent: ScheduledEvent = {
      row: 2,
      col: 3,
      numRows: 4,
    }
    const scheduledEventParam = encodeURIComponent(JSON.stringify(scheduledEvent))
    window.history.replaceState(
      {},
      "",
      `http://localhost:3000/?scheduled_event=${scheduledEventParam}`
    )

    const { wrapper, state, curScheduledEvent, spies } = mountControllerHarness()

    expect(state.value).toBe(states.SCHEDULE_EVENT)
    expect(curScheduledEvent.value).toEqual(scheduledEvent)
    expect(window.location.search).toBe("")
    expect(spies.resetCurUserAvailability).toHaveBeenCalledTimes(1)
    expect(spies.fetchResponses).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it("seeds current-timeslot availability from respondents immediately and on respondent changes", async () => {
    const { wrapper, respondents, curTimeslotAvailability } = mountControllerHarness({
      respondents: [{ _id: "a" }, { _id: "b" }],
    })

    expect(curTimeslotAvailability.value).toEqual({
      a: true,
      b: true,
    })

    respondents.value = [{ _id: "solo" }]
    await nextTick()

    expect(curTimeslotAvailability.value).toEqual({
      solo: true,
    })

    wrapper.unmount()
  })

  it("moves fromEditEvent-specific-times sync into the controller watcher", async () => {
    const event = baseEvent()
    event.hasSpecificTimes = true
    event.times = [zdt("2026-01-01T09:00:00Z"), zdt("2026-01-01T10:00:00Z")]

    const { wrapper, state, fromEditEvent, tempTimes } = mountControllerHarness({
      event,
      fromEditEvent: false,
    })

    expect(state.value).toBe(states.HEATMAP)

    fromEditEvent.value = true
    await nextTick()

    expect(state.value).toBe(states.SET_SPECIFIC_TIMES)
    expect([...tempTimes.value]).toEqual(event.times)

    wrapper.unmount()
  })
})
