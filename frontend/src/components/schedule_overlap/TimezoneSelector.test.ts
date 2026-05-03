// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { durations } from "@/constants"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import { createLocalStorageMock } from "@/test/localStorage"
import TimezoneSelector from "./TimezoneSelector.vue"

const mountTimezoneSelector = () =>
  shallowMount(TimezoneSelector, {
    props: {
      modelValue: {
        value: "",
        label: "",
        gmtString: "",
        offset: durations.ZERO,
      },
    },
    global: {
      stubs: {
        "v-btn": true,
        "v-icon": true,
        "v-list-item": true,
        "v-list-item-content": true,
        "v-list-item-title": true,
        "v-select": true,
      },
    },
  })

describe("TimezoneSelector", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "America/New_York" }),
        }) as Intl.DateTimeFormat
    )
  })

  it("falls back to the browser timezone when saved timezone JSON is malformed", () => {
    localStorage.setItem("timezone", "{")

    expect(() => mountTimezoneSelector()).not.toThrow()

    const wrapper = mountTimezoneSelector()
    const emitted = wrapper.emitted("update:modelValue")

    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toMatchObject({
      value: "America/New_York",
      label: "Eastern Time",
    })
  })

  it("rehydrates an offset-only saved timezone selection", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: Temporal.Duration.from({ hours: 5, minutes: 45 }).toString(),
      })
    )

    const wrapper = mountTimezoneSelector()
    const emitted = wrapper.emitted("update:modelValue")
    const restoredTimezone = emitted?.[0]?.[0] as Timezone | undefined

    expect(emitted).toBeTruthy()
    expect(restoredTimezone).toMatchObject({
      value: "+05:45",
      label: "+05:45",
      gmtString: "(GMT+5:45)",
    })
    expect(restoredTimezone?.offset.total("minutes")).toBe(345)
  })
})
