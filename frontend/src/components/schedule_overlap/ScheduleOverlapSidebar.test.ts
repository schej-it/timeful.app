// @vitest-environment happy-dom

import { mount, shallowMount } from "@vue/test-utils"
import { defineComponent, type ComponentPublicInstance } from "vue"
import { describe, expect, it, vi } from "vitest"
import { states } from "@/composables/schedule_overlap/types"
import ScheduleOverlapSidebar from "./ScheduleOverlapSidebar.vue"
import {
  buildScheduleOverlapSidebarViewModel,
  scheduleOverlapGlobalStubs,
} from "./scheduleOverlapTestUtils"

describe("ScheduleOverlapSidebar", () => {
  it("exposes the sign-up block scroll bridge through the child ref boundary", () => {
    const scrollToSignUpBlock = vi.fn()
    const SignUpBlocksListStub = defineComponent({
      name: "SignUpBlocksList",
      setup(_, { expose }) {
        expose({ scrollToSignUpBlock })
        return () => null
      },
    })

    const wrapper = shallowMount(ScheduleOverlapSidebar, {
      props: {
        sidebar: {
          ...buildScheduleOverlapSidebarViewModel(),
          isSignUp: true,
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          SignUpBlocksList: SignUpBlocksListStub,
        },
      },
    })

    ;(
      wrapper.vm as ComponentPublicInstance & {
        scrollToSignUpBlock: (id: string) => void
      }
    ).scrollToSignUpBlock("block-42")

    expect(scrollToSignUpBlock).toHaveBeenCalledWith("block-42")
  })

  it("exposes the options section element while edit controls are rendered", () => {
    const wrapper = mount(ScheduleOverlapSidebar, {
      props: {
        sidebar: buildScheduleOverlapSidebarViewModel(),
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
        },
      },
    })

    const vm = wrapper.vm as ComponentPublicInstance & {
      optionsSectionEl: HTMLElement | null
    }

    expect(vm.optionsSectionEl).toBeInstanceOf(HTMLElement)
  })

  it("exposes the respondents panel element while the panel branch is rendered", () => {
    const wrapper = mount(ScheduleOverlapSidebar, {
      props: {
        sidebar: {
          ...buildScheduleOverlapSidebarViewModel(),
          state: states.HEATMAP,
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          ScheduleOverlapRespondentsPanel: {
            name: "ScheduleOverlapRespondentsPanel",
            template: "<div class='respondents-panel-stub' />",
          },
        },
      },
    })

    const vm = wrapper.vm as ComponentPublicInstance & {
      respondentsPanelEl: HTMLElement | null
    }

    expect(vm.respondentsPanelEl).toBeInstanceOf(HTMLElement)
    expect(vm.respondentsPanelEl?.className).toContain("respondents-panel-stub")
  })
})
