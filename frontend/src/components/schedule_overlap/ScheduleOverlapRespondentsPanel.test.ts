// @vitest-environment happy-dom

import { describe, expect, it } from "vitest"
import { shallowMount } from "@vue/test-utils"
import ScheduleOverlapRespondentsPanel from "./ScheduleOverlapRespondentsPanel.vue"
import { buildRespondentsPanelViewModel } from "./scheduleOverlapTestUtils"

describe("ScheduleOverlapRespondentsPanel", () => {
  it("forwards respondent-list events through the presentational boundary", async () => {
    const wrapper = shallowMount(ScheduleOverlapRespondentsPanel, {
      props: {
        panel: buildRespondentsPanelViewModel(),
      },
      global: {
        stubs: {
          RespondentsList: {
            template: "<button id=\"respondent-list\" @click=\"$emit('mouseOverRespondent', 'evt', 'user-1')\" />",
          },
        },
      },
    })

    await wrapper.get("#respondent-list").trigger("click")

    expect(wrapper.emitted("mouseOverRespondent")).toEqual([["evt", "user-1"]])
  })

  it("forwards options updates through the presentational boundary", async () => {
    const wrapper = shallowMount(ScheduleOverlapRespondentsPanel, {
      props: {
        panel: buildRespondentsPanelViewModel(),
      },
      global: {
        stubs: {
          RespondentsList: {
            template:
              "<button id=\"event-options-toggle\" @click=\"$emit('update:showBestTimes', false)\" />",
          },
        },
      },
    })

    await wrapper.get("#event-options-toggle").trigger("click")

    expect(wrapper.emitted("update:showBestTimes")).toEqual([[false]])
  })
})
