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

  it("passes respondents display state through to the list", () => {
    const panel = buildRespondentsPanelViewModel()
    panel.hideIfNeeded = true

    const wrapper = shallowMount(ScheduleOverlapRespondentsPanel, {
      props: {
        panel,
      },
      global: {
        stubs: {
          RespondentsList: {
            props: ["hideIfNeeded"],
            template: "<div id=\"hide-if-needed-state\">{{ String(hideIfNeeded) }}</div>",
          },
        },
      },
    })

    expect(wrapper.get("#hide-if-needed-state").text()).toBe("true")
  })
})
