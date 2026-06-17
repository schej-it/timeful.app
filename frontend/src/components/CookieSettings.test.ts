// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { nextTick } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { mergeComponentStubs } from "@/test/componentStubs"
import { setCookieConsent } from "@/utils/cookie_utils"
import CookieSettings from "./CookieSettings.vue"

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

const mountCookieSettings = () =>
  mount(CookieSettings, {
    global: {
      stubs: mergeComponentStubs({
        "v-checkbox": VCheckboxStub,
      }),
    },
  })

describe("CookieSettings", () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("hydrates the saved preferences during setup", () => {
    setCookieConsent({
      analytics: false,
      advertising: true,
    })

    const wrapper = mountCookieSettings()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    expect(checkboxes).toHaveLength(3)
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(false)
    expect((checkboxes[2].element as HTMLInputElement).checked).toBe(true)
  })

  it("saves explicit preferences without reloading", async () => {
    const wrapper = mountCookieSettings()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    await checkboxes[1].setValue(false)
    await checkboxes[2].setValue(false)
    await wrapper.get("button").trigger("click")

    expect(JSON.parse(localStorage.getItem("cookieConsent") ?? "null")).toMatchObject({
      preferences: {
        necessary: true,
        analytics: false,
        advertising: false,
      },
    })
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it("refreshes from the shared consent boundary when consent changes externally", async () => {
    const wrapper = mountCookieSettings()

    setCookieConsent({
      analytics: false,
      advertising: false,
    })
    await nextTick()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(false)
    expect((checkboxes[2].element as HTMLInputElement).checked).toBe(false)
  })
})
