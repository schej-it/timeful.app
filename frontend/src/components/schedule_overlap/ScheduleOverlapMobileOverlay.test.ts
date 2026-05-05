// @vitest-environment happy-dom

import { describe, expect, it } from "vitest"
import { mount, shallowMount } from "@vue/test-utils"
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

  it("re-emits respondents-panel events through the grouped overlay listener bridge", async () => {
    const wrapper = mount(ScheduleOverlapMobileOverlay, {
      props: {
        overlay: {
          bottomOffset: "4rem",
          hintTextShown: false,
          hintText: "",
          isGroup: false,
          editing: false,
          isSignUp: false,
          availabilityType: availabilityTypes.AVAILABLE,
          isWeekly: false,
          calendarPermissionGranted: false,
          weekOffset: 0,
          event: buildRespondentsPanelViewModel().event,
          showStickyRespondents: true,
          respondentsPanel: buildRespondentsPanelViewModel(),
          state: states.HEATMAP,
          numTempTimes: 0,
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          "v-expand-transition": {
            template: "<div><slot /></div>",
          },
          RespondentsList: {
            name: "RespondentsList",
            emits: ["update:showCalendarEvents", "mouseOverRespondent", "refreshEvent"],
            template: `
              <div>
                <button class="show-calendar" @click="$emit('update:showCalendarEvents', false)" />
                <button
                  class="mouse-over"
                  @click="$emit('mouseOverRespondent', $event, 'user-1')"
                />
                <button class="refresh" @click="$emit('refreshEvent')" />
              </div>
            `,
          },
        },
      },
    })

    await wrapper.find("button.show-calendar").trigger("click")
    await wrapper.find("button.mouse-over").trigger("click")
    await wrapper.find("button.refresh").trigger("click")

    expect(wrapper.emitted("update:showCalendarEvents")?.[0]).toEqual([false])
    expect(wrapper.emitted("mouseOverRespondent")?.[0]?.[1]).toBe("user-1")
    expect(wrapper.emitted("refreshEvent")).toHaveLength(1)
  })
})
