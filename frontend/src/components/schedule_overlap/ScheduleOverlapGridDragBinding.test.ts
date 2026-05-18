// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { eventTypes } from "@/constants"
import { states } from "@/composables/schedule_overlap/types"
import ScheduleOverlapDaysOnlyGrid from "./ScheduleOverlapDaysOnlyGrid.vue"
import ScheduleOverlapTimeGrid from "./ScheduleOverlapTimeGrid.vue"
import type {
  ScheduleOverlapDaysOnlyGridViewModel,
  ScheduleOverlapTimeGridViewModel,
} from "./scheduleOverlapViewModels"

const baseEvent = {
  _id: "evt-1",
  ownerId: "owner-1",
  name: "Grid drag test",
  type: eventTypes.SPECIFIC_DATES,
  dates: [Temporal.PlainDate.from("2026-01-01")],
  timeSeed: Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO("UTC"),
  daysOnly: false,
  hasSpecificTimes: false,
}

function createTimeGridViewModel() {
  const actions = {
    prevPage: vi.fn(),
    nextPage: vi.fn(),
    calendarScroll: vi.fn(),
    startDrag: vi.fn(),
    moveDrag: vi.fn(),
    endDrag: vi.fn(),
    resetCurTimeslot: vi.fn(),
    closeHint: vi.fn(),
    signUpForBlock: vi.fn(),
  }

  const timedGrid: ScheduleOverlapTimeGridViewModel = {
    event: baseEvent,
    actions,
    calendarOnly: false,
    hasPrevPage: false,
    hasNextPage: false,
    splitTimes: [[{ hoursOffset: Temporal.Duration.from({ hours: 9 }), text: "9am", id: "time-9" }], []],
    times: [{ hoursOffset: Temporal.Duration.from({ hours: 9 }), text: "9am", id: "time-9" }],
    timeslotHeight: 60,
    days: [{
      dayText: "thu",
      dateString: "jan 1",
      dateObject: Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO("UTC"),
    }],
    isSpecificDates: true,
    isGroup: false,
    sampleCalendarEventsByDay: null,
    showLoader: false,
    loadingCalendarEvents: false,
    editing: false,
    alwaysShowCalendarEvents: false,
    showCalendarEvents: false,
    calendarEventsByDay: [[]],
    state: states.SCHEDULE_EVENT,
    states,
    page: 0,
    maxDaysPerPage: 1,
    dragStart: null,
    curScheduledEvent: null,
    scheduledEventStyle: {},
    signUpBlockBeingDraggedStyle: {},
    newSignUpBlockName: "Slot #1",
    isSignUp: false,
    signUpBlocksByDay: [[]],
    signUpBlocksToAddByDay: [[]],
    overlayAvailability: false,
    overlaidAvailability: [[]],
    timeslotClassStyle: [{ class: "", style: {} }],
    timeslotVon: [{}],
    noEventNames: false,
    hintTextShown: false,
    hintText: "",
    isPhone: false,
    max: 0,
    respondentsLength: 0,
    fetchedResponses: {},
    loadingResponsesLoading: false,
    toolRow: {
      event: baseEvent,
      state: states.SCHEDULE_EVENT,
      states,
      actions: {
        updateCurTimezone: vi.fn(),
        updateTimeType: vi.fn(),
        updateMobileNumDays: vi.fn(),
        updateShowBestTimes: vi.fn(),
        updateHideIfNeeded: vi.fn(),
        updateStartCalendarOnMonday: vi.fn(),
        updateWeekOffset: vi.fn(),
        toggleShowEventOptions: vi.fn(),
        scheduleEvent: vi.fn(),
        cancelScheduleEvent: vi.fn(),
        confirmScheduleEvent: vi.fn(),
      },
      curTimezone: {
        value: "UTC",
        offset: Temporal.Duration.from({ hours: 0 }),
        label: "UTC",
        gmtString: "GMT+0",
      },
      startCalendarOnMonday: false,
      showBestTimes: false,
      hideIfNeeded: false,
      isWeekly: false,
      calendarPermissionGranted: false,
      weekOffset: 0,
      timezoneReferenceDate: Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO("UTC"),
      numResponses: 0,
      mobileNumDays: 1,
      allowScheduleEvent: true,
      showEventOptions: false,
      timeType: "12h",
    },
    getRenderedTimeBlockStyle: vi.fn(() => ({})),
    getSignUpBlockStyle: vi.fn(() => ({})),
  }

  return { actions, timedGrid }
}

function createDaysOnlyGridViewModel() {
  const actions = {
    prevPage: vi.fn(),
    nextPage: vi.fn(),
    startDrag: vi.fn(),
    moveDrag: vi.fn(),
    endDrag: vi.fn(),
    resetCurTimeslot: vi.fn(),
    closeHint: vi.fn(),
  }

  const daysOnlyGrid: ScheduleOverlapDaysOnlyGridViewModel = {
    event: {
      ...baseEvent,
      daysOnly: true,
    },
    actions,
    curMonthText: "jan",
    hasPrevPage: false,
    hasNextPage: false,
    daysOfWeek: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    monthDays: [{
      date: 1,
      time: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO("UTC"),
      dateObject: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO("UTC"),
      included: true,
    }],
    dayTimeslotClassStyle: [{ class: "", style: {} }],
    dayTimeslotVon: [{}],
    isPhone: false,
    hintTextShown: false,
    hintText: "",
    calendarOnly: false,
    toolRow: {
      event: {
        ...baseEvent,
        daysOnly: true,
      },
      state: states.EDIT_AVAILABILITY,
      states,
      actions: {
        updateCurTimezone: vi.fn(),
        updateTimeType: vi.fn(),
        updateMobileNumDays: vi.fn(),
        updateShowBestTimes: vi.fn(),
        updateHideIfNeeded: vi.fn(),
        updateStartCalendarOnMonday: vi.fn(),
        updateWeekOffset: vi.fn(),
        toggleShowEventOptions: vi.fn(),
        scheduleEvent: vi.fn(),
        cancelScheduleEvent: vi.fn(),
        confirmScheduleEvent: vi.fn(),
      },
      curTimezone: {
        value: "UTC",
        offset: Temporal.Duration.from({ hours: 0 }),
        label: "UTC",
        gmtString: "GMT+0",
      },
      startCalendarOnMonday: false,
      showBestTimes: false,
      hideIfNeeded: false,
      isWeekly: false,
      calendarPermissionGranted: false,
      weekOffset: 0,
      timezoneReferenceDate: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO("UTC"),
      numResponses: 0,
      mobileNumDays: 1,
      allowScheduleEvent: false,
      showEventOptions: false,
      timeType: "12h",
    },
  }

  return { actions, daysOnlyGrid }
}

const global = {
  stubs: {
    ToolRow: true,
    ZigZag: true,
    "v-btn": true,
    "v-icon": true,
    "v-expand-transition": true,
    "v-progress-circular": true,
    CalendarEventBlock: true,
    SignUpCalendarBlock: true,
  },
}

describe("ScheduleOverlap grid drag bindings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("forwards timed-grid drag events through the rendered drag surface", async () => {
    const { timedGrid, actions } = createTimeGridViewModel()
    const wrapper = mount(ScheduleOverlapTimeGrid, {
      props: { timedGrid },
      global,
    })

    const dragSection = wrapper.get("#drag-section")
    await dragSection.trigger("pointerdown")
    await dragSection.trigger("pointermove")
    await dragSection.trigger("pointerup")
    await dragSection.trigger("pointercancel")
    await dragSection.trigger("lostpointercapture")

    expect(actions.startDrag).toHaveBeenCalledTimes(1)
    expect(actions.moveDrag).toHaveBeenCalledTimes(1)
    expect(actions.endDrag).toHaveBeenCalledTimes(3)
  })

  it("forwards timed-grid mouse drag events through the rendered drag surface", async () => {
    const { timedGrid, actions } = createTimeGridViewModel()
    const wrapper = mount(ScheduleOverlapTimeGrid, {
      props: { timedGrid },
      global,
    })

    const dragSection = wrapper.get("#drag-section")
    await dragSection.trigger("mousedown")
    await dragSection.trigger("mousemove")
    await dragSection.trigger("mouseup")

    expect(actions.startDrag).toHaveBeenCalledTimes(1)
    expect(actions.moveDrag).toHaveBeenCalledTimes(1)
    expect(actions.endDrag).toHaveBeenCalledTimes(1)
  })

  it("forwards days-only drag events through the rendered drag surface", async () => {
    const { daysOnlyGrid, actions } = createDaysOnlyGridViewModel()
    const wrapper = mount(ScheduleOverlapDaysOnlyGrid, {
      props: { daysOnlyGrid },
      global,
    })

    const dragSection = wrapper.get("#drag-section")
    await dragSection.trigger("pointerdown")
    await dragSection.trigger("pointermove")
    await dragSection.trigger("pointerup")
    await dragSection.trigger("pointercancel")
    await dragSection.trigger("lostpointercapture")

    expect(actions.startDrag).toHaveBeenCalledTimes(1)
    expect(actions.moveDrag).toHaveBeenCalledTimes(1)
    expect(actions.endDrag).toHaveBeenCalledTimes(3)
  })

  it("forwards days-only mouse drag events through the rendered drag surface", async () => {
    const { daysOnlyGrid, actions } = createDaysOnlyGridViewModel()
    const wrapper = mount(ScheduleOverlapDaysOnlyGrid, {
      props: { daysOnlyGrid },
      global,
    })

    const dragSection = wrapper.get("#drag-section")
    await dragSection.trigger("mousedown")
    await dragSection.trigger("mousemove")
    await dragSection.trigger("mouseup")

    expect(actions.startDrag).toHaveBeenCalledTimes(1)
    expect(actions.moveDrag).toHaveBeenCalledTimes(1)
    expect(actions.endDrag).toHaveBeenCalledTimes(1)
  })
})
