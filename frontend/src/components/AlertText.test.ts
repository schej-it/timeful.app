// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import AlertText from "./AlertText.vue"
import alertTextSource from "./AlertText.vue?raw"

describe("AlertText", () => {
  it("uses baseline alignment for the icon and first line of copy", () => {
    const wrapper = shallowMount(AlertText, {
      slots: {
        default: "Anybody can edit this event because it was created while not signed in",
      },
      global: {
        stubs: {
          "v-icon": {
            template: '<i class="v-icon"><slot /></i>',
          },
        },
      },
    })

    expect(wrapper.classes()).toContain("tw-items-baseline")
    expect(wrapper.get(".v-icon").classes()).toContain("tw-text-base")
    expect(alertTextSource).not.toContain("-tw-mt-px")
  })
})
