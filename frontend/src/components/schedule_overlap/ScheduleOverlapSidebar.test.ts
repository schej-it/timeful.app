// @vitest-environment happy-dom

import { mount, shallowMount } from "@vue/test-utils"
import { h, nextTick, ref, type ComponentPublicInstance } from "vue"
import { describe, expect, it, vi } from "vitest"
import { states } from "@/composables/schedule_overlap/types"
import ScheduleOverlapSidebar from "./ScheduleOverlapSidebar.vue"
import type {
  ScheduleOverlapRespondentsPanelExposed,
  ScheduleOverlapSidebarExposed,
} from "./scheduleOverlapContracts"
import {
  buildScheduleOverlapSidebarViewModel,
  scheduleOverlapGlobalStubs,
} from "./scheduleOverlapTestUtils"

type ExposeFn<T> = (exposed?: T) => void

describe("ScheduleOverlapSidebar", () => {
  it("exposes the sign-up block scroll bridge through the child ref boundary", () => {
    const scrollToSignUpBlock = vi.fn()
    const SignUpBlocksListStub = {
      name: "SignUpBlocksList",
      setup(
        _: unknown,
        { expose }: { expose: ExposeFn<{ scrollToSignUpBlock: typeof scrollToSignUpBlock }> }
      ) {
        expose({ scrollToSignUpBlock })
        return () => null
      },
    }

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
      wrapper.vm as ComponentPublicInstance & ScheduleOverlapSidebarExposed
    ).scrollToSignUpBlock?.("block-42")

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

    const vm = wrapper.vm as ComponentPublicInstance & ScheduleOverlapSidebarExposed

    expect(vm.optionsSectionEl).toBeInstanceOf(HTMLElement)
  })

  it("exposes the respondents panel element while the panel branch is rendered", async () => {
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
            setup(
              _: unknown,
              { expose }: { expose: ExposeFn<ScheduleOverlapRespondentsPanelExposed> }
            ) {
              const panelEl = ref<HTMLElement | null>(null)
              expose({
                get panelEl() {
                  return panelEl.value
                },
              })
              return () => h("div", { ref: panelEl, class: "respondents-panel-stub" })
            },
          },
        },
      },
    })

    await nextTick()

    const vm = wrapper.vm as ComponentPublicInstance & ScheduleOverlapSidebarExposed

    expect(vm.respondentsPanelEl).toBeInstanceOf(HTMLElement)
    expect(vm.respondentsPanelEl?.className).toContain("respondents-panel-stub")
  })

  it("renders the overlay availability switch with the compact switch styling", () => {
    const wrapper = mount(ScheduleOverlapSidebar, {
      props: {
        sidebar: {
          ...buildScheduleOverlapSidebarViewModel(),
          showOverlayAvailabilityToggle: true,
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
        },
      },
    })

    const overlaySwitch = wrapper.find("#overlay-availabilities-toggle")

    expect(overlaySwitch.exists()).toBe(true)
    expect(overlaySwitch.classes()).toContain("schedule-overlap-compact-switch")
  })

  it("does not render the ad wrapper when the sidebar view model disables ads", () => {
    const wrapper = mount(ScheduleOverlapSidebar, {
      props: {
        sidebar: {
          ...buildScheduleOverlapSidebarViewModel(),
          state: states.HEATMAP,
          showAds: false,
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          AsyncPubliftAd: {
            template: "<div class='async-publift-ad-stub'><slot /></div>",
          },
        },
      },
    })

    expect(wrapper.find(".async-publift-ad-stub").exists()).toBe(false)
  })
})
