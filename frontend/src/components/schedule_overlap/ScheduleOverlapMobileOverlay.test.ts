// @vitest-environment happy-dom

import { describe, expect, it } from "vitest"
import { shallowMount } from "@vue/test-utils"
import { availabilityTypes } from "@/constants"
import { states } from "@/composables/schedule_overlap/types"
import ScheduleOverlapMobileOverlay from "./ScheduleOverlapMobileOverlay.vue"
import {
  buildRespondentsPanelViewModel,
  scheduleOverlapGlobalStubs,
} from "./scheduleOverlapTestUtils"

describe("ScheduleOverlapMobileOverlay", () => {
  it("renders the extracted mobile-only boundaries from a single presentational child", () => {
    const wrapper = shallowMount(ScheduleOverlapMobileOverlay, {
      props: {
        overlay: {
          bottomOffset: "4rem",
          hintTextShown: true,
          hintText: "Tap the grid to add availability",
          isGroup: false,
          editing: true,
          isSignUp: false,
          availabilityType: availabilityTypes.AVAILABLE,
          isWeekly: true,
          calendarPermissionGranted: true,
          weekOffset: 1,
          event: buildRespondentsPanelViewModel().event,
          showStickyRespondents: true,
          respondentsPanel: buildRespondentsPanelViewModel(),
          state: states.SET_SPECIFIC_TIMES,
          numTempTimes: 2,
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          "v-expand-transition": {
            template: "<div><slot /></div>",
          },
        },
      },
    })

    expect(wrapper.findComponent({ name: "AvailabilityTypeToggle" }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: "GCalWeekSelector" }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: "ScheduleOverlapRespondentsPanel" }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: "SpecificTimesInstructions" }).exists()).toBe(true)
  })
})
