// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import ScheduleOverlapRespondentsPanel from "./ScheduleOverlapRespondentsPanel.vue"
import { buildRespondentsPanelViewModel } from "./scheduleOverlapTestUtils"

describe("ScheduleOverlapRespondentsPanel", () => {
  it("forwards respondent-list events through the presentational boundary", async () => {
    const handleMouseOverRespondent = vi.fn()
    const wrapper = mount(
      defineComponent({
        components: {
          ScheduleOverlapRespondentsPanel,
        },
        data: () => ({
          panel: buildRespondentsPanelViewModel(),
        }),
        methods: {
          handleMouseOverRespondent,
        },
        template: `
          <ScheduleOverlapRespondentsPanel
            :panel="panel"
            @mouse-over-respondent="handleMouseOverRespondent"
          />
        `,
      }),
      {
        global: {
          stubs: {
            RespondentsList: {
              name: "RespondentsList",
              emits: ["mouseOverRespondent"],
              template: "<button @click=\"$emit('mouseOverRespondent', $event, 'user-1')\" />",
            },
          },
        },
      },
    )

    await wrapper.find("button").trigger("click")

    expect(handleMouseOverRespondent).toHaveBeenCalledTimes(1)
    expect(handleMouseOverRespondent.mock.calls[0]?.[1]).toBe("user-1")
  })
})
