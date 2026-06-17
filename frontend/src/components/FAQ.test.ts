// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import FAQ from "./FAQ.vue"

const PassThroughStub = {
  template: "<div><slot /></div>",
}

const VIconStub = {
  template: "<i><slot /></i>",
}

describe("FAQ", () => {
  it("renders question and answer paragraphs as escaped text", async () => {
    const wrapper = shallowMount(FAQ, {
      props: {
        question: "<strong>Unsafe question</strong>",
        answerParagraphs: ["First <em>paragraph</em>", "Second paragraph"],
      },
      global: {
        stubs: {
          "v-expand-transition": PassThroughStub,
          "v-icon": VIconStub,
        },
      },
    })

    await wrapper.trigger("click")

    expect(wrapper.text()).toContain("<strong>Unsafe question</strong>")
    expect(wrapper.text()).toContain("First <em>paragraph</em>")
    expect(wrapper.html()).not.toContain("<strong>Unsafe question</strong>")
    expect(wrapper.html()).not.toContain("<em>paragraph</em>")
  })

  it("shows a disabled-build message for auth-required entries when sign-in is disabled", async () => {
    const wrapper = shallowMount(FAQ, {
      props: {
        question: "Auth-only question",
        authRequired: true,
        signInEnabled: false,
      },
      global: {
        stubs: {
          "v-expand-transition": PassThroughStub,
          "v-icon": VIconStub,
        },
      },
    })

    await wrapper.trigger("click")

    expect(wrapper.text()).toContain("Requires sign-in, which is disabled in this build")
    expect(wrapper.text()).not.toContain("Sign in to use this feature")
  })
})
