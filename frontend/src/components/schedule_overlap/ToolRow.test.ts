// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { eventTypes, timeTypes, UTC } from "@/constants"
import { states } from "@/composables/schedule_overlap/types"
import { Temporal } from "temporal-polyfill"
import ToolRow from "./ToolRow.vue"
import toolRowSource from "./ToolRow.vue?raw"

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

const isPhoneValue = ref(false)

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: isPhoneValue,
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
    resetCurTimezone: vi.fn(),
    updateTimeType: vi.fn(),
    updateMobileNumDays: vi.fn(),
    scheduleEvent: vi.fn(),
    cancelScheduleEvent: vi.fn(),
    confirmScheduleEvent: vi.fn(),
    updateWeekOffset: vi.fn(),
    updateShowBestTimes: vi.fn(),
    updateHideIfNeeded: vi.fn(),
    updateShowAllHours: vi.fn(),
    updateStartCalendarOnMonday: vi.fn(),
  },
  curTimezone: {
    value: UTC,
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
  timezoneReferenceDate: Temporal.Instant.from("2026-01-01T12:00:00Z").toZonedDateTimeISO(UTC),
  numResponses: 2,
  mobileNumDays: 3,
  allowScheduleEvent: true,
  timeType: timeTypes.HOUR12,
}

describe("ToolRow", () => {
  it("uses explicit Vuetify 3 select semantics for the time type control", () => {
    expect(toolRowSource).toContain(':model-value="toolRow.timeType"')
    expect(toolRowSource).toContain('item-title="label"')
    expect(toolRowSource).toContain('item-value="value"')
    expect(toolRowSource).toContain('color="primary"')
    expect(toolRowSource).toContain('density="compact"')
    expect(toolRowSource).toContain('variant="underlined"')
    expect(toolRowSource).toContain('class="tool-row-inline-select tool-row-inline-select--compact')
    expect(toolRowSource).toContain("@update:model-value=\"(value) => value && toolRow.actions.updateTimeType(value)\"")
    expect(toolRowSource).toContain('class="tool-row-inline-select__selection-text"')
    expect(toolRowSource).toContain("'tool-row-inline-select__item--active': item.raw.value === toolRow.timeType")
    expect(toolRowSource).toContain(".tool-row-inline-select__item--active {\n  background-color: var(--timeful-selection-bg);\n  color: var(--timeful-selection-fg);\n}")
  })

  it("keeps the mobile timed options visible with zero responses", () => {
    isPhoneValue.value = true

    const VSwitchStub = {
      props: ["id"],
      template:
        '<div :id="id" class="event-options-switch"><slot name="label" /></div>',
    }

    const wrapper = shallowMount(ToolRow, {
      props: {
        toolRow: {
          ...baseToolRow,
          numResponses: 0,
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
          EventOptions: false,
          GCalWeekSelector: true,
          TimezoneSelector: true,
          "v-switch": VSwitchStub,
        },
      },
    })

    expect(wrapper.text()).toContain("Options")
    expect(wrapper.text()).toContain("Show all hours")
    expect(wrapper.text()).not.toContain("Show best times")
    expect(wrapper.text()).not.toContain("Hide if needed times")

    isPhoneValue.value = false
  })
})
