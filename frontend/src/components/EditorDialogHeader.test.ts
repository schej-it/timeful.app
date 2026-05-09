// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import EditorDialogHeader from "./EditorDialogHeader.vue"

const VBtnStub = {
  name: "VBtn",
  props: ["variant", "icon"],
  template:
    '<button :data-variant="variant" :data-icon="String(icon)"><slot /></button>',
}

const VIconStub = {
  name: "VIcon",
  props: ["color"],
  template: '<i :data-color="color"><slot /></i>',
}

const passThroughStub = {
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
}

describe("EditorDialogHeader", () => {
  it("centers the close button with single-line titles and renders it as a gray text icon button", () => {
    const wrapper = shallowMount(EditorDialogHeader, {
      props: {
        title: "New event",
        subtitle: "Ideal for one-time / recurring meetings",
        helpHeader: "Events",
        dialog: true,
        showHelp: false,
        hideDialogActions: false,
      },
      global: {
        stubs: {
          HelpDialog: passThroughStub,
          "v-btn": VBtnStub,
          "v-card-title": passThroughStub,
          "v-icon": VIconStub,
          "v-spacer": true,
        },
      },
    })

    expect(wrapper.text()).toContain("New event")
    expect(wrapper.find(".tw-items-center").exists()).toBe(true)
    expect(wrapper.find("button").attributes("data-variant")).toBe("text")
    expect(wrapper.find("i").attributes("data-color")).toBe("#4F4F4F")
  })

  it("top-aligns the action when the help subtitle is visible", () => {
    const wrapper = shallowMount(EditorDialogHeader, {
      props: {
        title: "New event",
        subtitle: "Ideal for one-time / recurring meetings",
        helpHeader: "Events",
        dialog: true,
        showHelp: true,
        hideDialogActions: false,
      },
      global: {
        stubs: {
          HelpDialog: passThroughStub,
          "v-btn": VBtnStub,
          "v-card-title": passThroughStub,
          "v-icon": VIconStub,
          "v-spacer": true,
        },
      },
    })

    expect(wrapper.find(".tw-items-start").exists()).toBe(true)
  })
})
