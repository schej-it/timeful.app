// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import AutoSnackbar from "./AutoSnackbar.vue"

const VSnackbarStub = {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template: `
    <div v-if="modelValue" :data-color="color">
      <slot />
      <slot name="actions" />
    </div>
  `,
}

const VBtnStub = {
  emits: ["click"],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
}

const mountSnackbar = (text = "") =>
  mount(AutoSnackbar, {
    props: {
      text,
      color: "green",
    },
    global: {
      stubs: {
        "v-btn": VBtnStub,
        "v-icon": true,
        "v-snackbar": VSnackbarStub,
      },
    },
  })

describe("AutoSnackbar", () => {
  it("shows when text becomes non-empty and hides when cleared", async () => {
    const wrapper = mountSnackbar()

    expect(wrapper.text()).toBe("")

    await wrapper.setProps({ text: "Saved successfully" })
    expect(wrapper.text()).toContain("Saved successfully")

    await wrapper.setProps({ text: "" })
    expect(wrapper.text()).toBe("")
  })

  it("stays dismissed for the current message but reopens for a new one", async () => {
    const wrapper = mountSnackbar("Saved successfully")

    expect(wrapper.text()).toContain("Saved successfully")

    await wrapper.get("button").trigger("click")
    expect(wrapper.text()).toBe("")

    await wrapper.setProps({ text: "Saved successfully" })
    expect(wrapper.text()).toBe("")

    await wrapper.setProps({ text: "Saved again" })
    expect(wrapper.text()).toContain("Saved again")
  })
})
