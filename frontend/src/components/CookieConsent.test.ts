// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { nextTick } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { mergeComponentStubs, passThroughStub } from "@/test/componentStubs"
import { setCookieConsent } from "@/utils/cookie_utils"
import CookieConsent from "./CookieConsent.vue"

const VCheckboxStub = {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <label>
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event.target.checked)"
      >
      <slot name="label" />
    </label>
  `,
}

const mountCookieConsent = () =>
  mount(CookieConsent, {
    global: {
      stubs: mergeComponentStubs({
        "v-checkbox": VCheckboxStub,
        "v-expand-transition": passThroughStub,
      }),
    },
  })

describe("CookieConsent", () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("shows the banner when consent is missing or corrupt", () => {
    localStorage.setItem("cookieConsent", "{not-json")
    const wrapper = mountCookieConsent()

    expect(wrapper.text()).toContain("We value your privacy")
  })

  it("reacts to shared consent updates and hides the banner", async () => {
    const wrapper = mountCookieConsent()

    setCookieConsent({
      analytics: false,
      advertising: false,
    })
    await nextTick()

    expect(wrapper.text()).not.toContain("We value your privacy")
  })

  it("persists acceptance through the shared helper without reloading", async () => {
    const wrapper = mountCookieConsent()

    const buttons = wrapper.findAll("button")
    const acceptAllButton = buttons.find(button => button.text().includes("Accept all"))
    if (acceptAllButton == null) {
      throw new Error("Missing Accept all button")
    }

    await acceptAllButton.trigger("click")
    await nextTick()

    expect(JSON.parse(localStorage.getItem("cookieConsent") ?? "null")).toMatchObject({
      preferences: {
        necessary: true,
        analytics: true,
        advertising: true,
      },
    })
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain("We value your privacy")
  })
})
