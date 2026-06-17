// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import HelpDialog from "./HelpDialog.vue"

const passThroughStub = {
  template: "<div><slot /></div>",
}

const VBtnStub = {
  props: ["variant"],
  template: '<button :data-variant="variant"><slot /></button>',
}

describe("HelpDialog", () => {
  it("uses an explicit text variant for the footer action", () => {
    const wrapper = shallowMount(HelpDialog, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-actions": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-dialog": passThroughStub,
          "v-spacer": true,
        },
      },
    })

    expect(wrapper.find("button").attributes("data-variant")).toBe("text")
  })
})
