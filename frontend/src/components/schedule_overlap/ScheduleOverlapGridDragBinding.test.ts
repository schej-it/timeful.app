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

const buttonStub = {
  inheritAttrs: false,
  template: "<button v-bind=\"$attrs\"><slot /></button>",
}

const iconStub = {
  template: "<span><slot /></span>",
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
    toggleCollapsedSpan: vi.fn(),
  }

  const timedGrid: ScheduleOverlapTimeGridViewModel = {
    event: baseEvent,
    actions,
    calendarOnly: false,
    hasPrevPage: false,
    hasNextPage: false,
    splitTimes: [[{ hoursOffset: Temporal.Duration.from({ hours: 9 }), text: "9am", id: "time-9" }], []],
    times: [{ hoursOffset: Temporal.Duration.from({ hours: 9 }), text: "9am", id: "time-9" }],
    renderedRows: [],
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
        resetCurTimezone: vi.fn(),
        updateTimeType: vi.fn(),
        updateMobileNumDays: vi.fn(),
        updateShowBestTimes: vi.fn(),
        updateHideIfNeeded: vi.fn(),
        updateShowAllHours: vi.fn(),
        updateStartCalendarOnMonday: vi.fn(),
        updateWeekOffset: vi.fn(),
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
      timezoneModified: false,
      startCalendarOnMonday: false,
      showBestTimes: false,
      hideIfNeeded: false,
      showAllHours: false,
      isWeekly: false,
      calendarPermissionGranted: false,
      weekOffset: 0,
      timezoneReferenceDate: Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO("UTC"),
      numResponses: 0,
      mobileNumDays: 1,
      allowScheduleEvent: true,
      timeType: "12h",
    },
    getRenderedTimeBlockStyle: vi.fn(() => ({})),
    getSignUpBlockStyle: vi.fn(() => ({})),
  }

  return { actions, timedGrid }
}

function createNonConsecutiveTimeGridViewModel() {
  const { actions, timedGrid } = createTimeGridViewModel()

  timedGrid.days = [
    {
      dayText: "thu",
      dateString: "jan 1",
      dateObject: Temporal.Instant.from("2026-01-01T09:00:00Z").toZonedDateTimeISO("UTC"),
      isConsecutive: true,
    },
    {
      dayText: "sat",
      dateString: "jan 3",
      dateObject: Temporal.Instant.from("2026-01-03T09:00:00Z").toZonedDateTimeISO("UTC"),
      isConsecutive: false,
    },
  ]
  timedGrid.calendarEventsByDay = [[], []]
  timedGrid.signUpBlocksByDay = [[], []]
  timedGrid.signUpBlocksToAddByDay = [[], []]
  timedGrid.overlaidAvailability = [[], []]
  timedGrid.timeslotClassStyle = [
    { class: "", style: {} },
    { class: "", style: {} },
  ]
  timedGrid.timeslotVon = [{}, {}]

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
        resetCurTimezone: vi.fn(),
        updateTimeType: vi.fn(),
        updateMobileNumDays: vi.fn(),
        updateShowBestTimes: vi.fn(),
        updateHideIfNeeded: vi.fn(),
        updateShowAllHours: vi.fn(),
        updateStartCalendarOnMonday: vi.fn(),
        updateWeekOffset: vi.fn(),
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
      timezoneModified: false,
      startCalendarOnMonday: false,
      showBestTimes: false,
      hideIfNeeded: false,
      showAllHours: false,
      isWeekly: false,
      calendarPermissionGranted: false,
      weekOffset: 0,
      timezoneReferenceDate: Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO("UTC"),
      numResponses: 0,
      mobileNumDays: 1,
      allowScheduleEvent: false,
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

  it("renders non-consecutive day gaps as wide blank spacing", () => {
    const { timedGrid } = createNonConsecutiveTimeGridViewModel()
    const wrapper = mount(ScheduleOverlapTimeGrid, {
      props: { timedGrid },
      global,
    })

    const gaps = wrapper.findAll('div[style="width: 20px;"]')

    expect(gaps).toHaveLength(2)
    for (const gap of gaps) {
      expect(gap.attributes("style")).toContain("width: 20px;")
    }
  })

  it("renders timed-grid navigation buttons at a 36px box size", () => {
    const { timedGrid } = createTimeGridViewModel()
    timedGrid.hasPrevPage = true
    timedGrid.hasNextPage = true

    const wrapper = mount(ScheduleOverlapTimeGrid, {
      props: { timedGrid },
      global: {
        ...global,
        stubs: {
          ...global.stubs,
          "v-btn": buttonStub,
          "v-icon": iconStub,
        },
      },
    })

    const navButtons = wrapper.findAll("button")

    expect(navButtons).toHaveLength(2)
    for (const button of navButtons) {
      expect(button.classes()).toContain("tw-h-[36px]")
      expect(button.classes()).toContain("tw-w-[36px]")
      expect(button.classes()).toContain("tw-min-w-[36px]")
    }
  })

  it("renders owned overlay availability frame classes for available and if-needed blocks", () => {
    const { timedGrid } = createTimeGridViewModel()
    timedGrid.overlayAvailability = true
    timedGrid.overlaidAvailability = [
      [
        {
          hoursOffset: Temporal.Duration.from({ hours: 9 }),
          hoursLength: Temporal.Duration.from({ minutes: 30 }),
          type: "available",
        },
        {
          hoursOffset: Temporal.Duration.from({ hours: 10 }),
          hoursLength: Temporal.Duration.from({ minutes: 30 }),
          type: "if_needed",
        },
      ],
    ]

    const wrapper = mount(ScheduleOverlapTimeGrid, {
      props: { timedGrid },
      global,
    })

    const availableBlock = wrapper.get(".time-grid-overlay-block--available")
    const ifNeededBlock = wrapper.get(".time-grid-overlay-block--if-needed")

    expect(availableBlock.classes()).toContain("time-grid-overlay-block")
    expect(availableBlock.classes()).toContain("overlay-avail-shadow-green")
    expect(ifNeededBlock.classes()).toContain("time-grid-overlay-block")
    expect(ifNeededBlock.classes()).toContain("overlay-avail-shadow-yellow")
  })

  it("renders one structural collapsed-hours row and forwards expansion clicks", async () => {
    const { timedGrid, actions } = createNonConsecutiveTimeGridViewModel()
    timedGrid.state = states.HEATMAP
    timedGrid.renderedRows = [
      {
        id: "collapsed-0-8",
        kind: "collapsed",
        height: 44,
        rowTop: 0,
        startLabel: "00:00",
        endLabel: "04:00",
      },
      {
        id: "time-8",
        kind: "timeslot",
        height: 60,
        rowTop: 44,
        timeText: "04:00",
        baseRowIndex: 0,
        cells: [
          { class: "day-0", style: {}, von: {} },
          { class: "day-1", style: {}, von: {} },
        ],
      },
    ]

    const wrapper = mount(ScheduleOverlapTimeGrid, {
      props: { timedGrid },
      global: {
        ...global,
        stubs: {
          ...global.stubs,
          "v-icon": iconStub,
        },
      },
    })

    const collapsedRows = wrapper.findAll("button.schedule-overlap-collapsed-row")

    expect(collapsedRows).toHaveLength(1)
    expect(collapsedRows[0].text()).toContain("00:00-04:00")

    await collapsedRows[0].trigger("click")

    expect(actions.toggleCollapsedSpan).toHaveBeenCalledWith("collapsed-0-8")
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
