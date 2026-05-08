// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it } from "vitest"
import ExpandableSection from "./ExpandableSection.vue"

const VButtonStub = defineComponent({
  name: "VBtn",
  props: {
    density: {
      type: String,
      default: undefined,
    },
    variant: {
      type: String,
      default: undefined,
    },
  },
  template: "<button><slot /></button>",
})

describe("ExpandableSection", () => {
  it("keeps the advanced-options toggle on the lightweight text-button treatment", () => {
    const wrapper = shallowMount(ExpandableSection, {
      props: {
        modelValue: false,
        label: "Advanced options",
      },
      global: {
        stubs: {
          "v-btn": VButtonStub,
          "v-expand-transition": true,
          "v-icon": true,
          "v-spacer": true,
        },
      },
    })

    const button = wrapper.getComponent(VButtonStub)

    expect(button.props("variant")).toBe("text")
    expect(button.props("density")).toBe("compact")
    expect(button.attributes("class")).toContain("expandable-section-toggle")
  })
})
