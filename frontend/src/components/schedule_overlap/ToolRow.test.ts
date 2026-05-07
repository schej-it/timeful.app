// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { eventTypes, timeTypes, UTC } from "@/constants"
import { states } from "@/composables/schedule_overlap/types"
import { Temporal } from "temporal-polyfill"
import ToolRow from "./ToolRow.vue"

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: ref({ _id: "owner-1" }),
  }),
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: false,
  }),
}))

const passThroughStub = {
  template: "<div><slot /><slot name='activator' :props='{}' /></div>",
}

const VBtnStub = {
  props: ["variant"],
  template: '<button :data-variant="variant"><slot /></button>',
}

const baseToolRow = {
  event: {
    _id: "evt-1",
    ownerId: "owner-1",
    name: "Planning",
    type: eventTypes.SPECIFIC_DATES,
    dates: [Temporal.PlainDate.from("2026-01-01")],
    timeSeed: Temporal.Instant.from("2026-01-01T12:00:00Z").toZonedDateTimeISO(UTC),
    duration: Temporal.Duration.from({ hours: 1 }),
    daysOnly: false,
  },
  state: states.HEATMAP,
  states,
  actions: {
    updateCurTimezone: vi.fn(),
    updateTimeType: vi.fn(),
    updateMobileNumDays: vi.fn(),
    scheduleEvent: vi.fn(),
    cancelScheduleEvent: vi.fn(),
    confirmScheduleEvent: vi.fn(),
    updateWeekOffset: vi.fn(),
    updateShowBestTimes: vi.fn(),
    updateHideIfNeeded: vi.fn(),
    toggleShowEventOptions: vi.fn(),
    updateStartCalendarOnMonday: vi.fn(),
  },
  curTimezone: {
    value: UTC,
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
  timezoneReferenceDate: Temporal.Instant.from("2026-01-01T12:00:00Z").toZonedDateTimeISO(UTC),
  numResponses: 2,
  mobileNumDays: 3,
  allowScheduleEvent: true,
  showEventOptions: false,
  timeType: timeTypes.HOUR12,
}

describe("ToolRow", () => {
  it("uses explicit outlined variants for desktop schedule actions", () => {
    const scheduleWrapper = shallowMount(ToolRow, {
      props: {
        toolRow: baseToolRow,
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
          "v-img": true,
          "v-list": passThroughStub,
          "v-list-item": passThroughStub,
          "v-list-item-content": passThroughStub,
          "v-list-item-title": passThroughStub,
          "v-menu": passThroughStub,
          "v-select": true,
          "v-spacer": true,
          EventOptions: true,
          GCalWeekSelector: true,
          TimezoneSelector: true,
        },
      },
    })

    expect(scheduleWrapper.find("button").attributes("data-variant")).toBe("outlined")

    const cancelWrapper = shallowMount(ToolRow, {
      props: {
        toolRow: {
          ...baseToolRow,
          state: states.SCHEDULE_EVENT,
        },
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
          "v-img": true,
          "v-list": passThroughStub,
          "v-list-item": passThroughStub,
          "v-list-item-content": passThroughStub,
          "v-list-item-title": passThroughStub,
          "v-menu": passThroughStub,
          "v-select": true,
          "v-spacer": true,
          EventOptions: true,
          GCalWeekSelector: true,
          TimezoneSelector: true,
        },
      },
    })

    expect(cancelWrapper.find("button").attributes("data-variant")).toBe("outlined")
  })
})
