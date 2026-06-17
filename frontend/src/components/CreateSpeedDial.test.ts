// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import CreateSpeedDial from "./CreateSpeedDial.vue"

const passThroughStub = {
  template: "<div><slot /><slot name='activator' :props='{}' /></div>",
}

const VBtnStub = {
  inheritAttrs: false,
  props: ["icon", "size", "variant", "color"],
  template:
    '<button v-bind="$attrs" :data-icon="String(icon)" :data-size="size" :data-variant="variant" :data-color="color"><slot /></button>',
}

describe("CreateSpeedDial", () => {
  it("uses explicit icon and size props for floating action buttons", () => {
    const wrapper = shallowMount(CreateSpeedDial, {
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
          "v-scale-transition": passThroughStub,
          "v-speed-dial": passThroughStub,
        },
      },
    })

    const buttons = wrapper.findAll("button")

    expect(buttons).toHaveLength(3)
    expect(buttons.every((button) => button.attributes("fab") === undefined)).toBe(true)
    expect(buttons.every((button) => button.attributes("dark") === undefined)).toBe(true)
    expect(
      buttons.filter((button) => button.attributes("data-size") === "small")
    ).toHaveLength(2)
    expect(
      buttons.some((button) => button.attributes("data-color") === "primary")
    ).toBe(true)
  })
})
