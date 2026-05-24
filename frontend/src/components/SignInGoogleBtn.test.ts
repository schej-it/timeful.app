// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import SignInGoogleBtn from "./SignInGoogleBtn.vue"

describe("SignInGoogleBtn", () => {
  it("renders the accessible label text and emits click events", async () => {
    const wrapper = mount(SignInGoogleBtn, {
      props: {
        text: "Continue with Google",
      },
      global: {
        stubs: {
          "v-btn": {
            emits: ["click"],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.get(".gsi-material-button-contents").text()).toBe(
      "Continue with Google"
    )
    expect(wrapper.get(".tw-hidden").text()).toBe("Continue with Google")
    expect(wrapper.get("svg").classes()).toContain("tw-block")

    await wrapper.get("button").trigger("click")

    expect(wrapper.emitted("click")).toHaveLength(1)
  })
})
