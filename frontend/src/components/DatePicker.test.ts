// @vitest-environment happy-dom

import { defineComponent, nextTick } from "vue"
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import DatePicker from "./DatePicker.vue"

const VDatePickerStub = defineComponent({
  name: "VDatePicker",
  props: {
    hideHeader: {
      type: Boolean,
      required: false,
      default: false,
    },
    modelValue: {
      type: Array,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  template: "<div />",
})

describe("DatePicker native-Date boundary", () => {
  it("adapts ISO calendar dates to native Date objects for the Vuetify boundary", () => {
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: ["2026-01-05", "2026-01-06"],
      },
      global: {
        stubs: {
          "v-date-picker": VDatePickerStub,
        },
      },
    })

    const boundaryDates = wrapper.getComponent(VDatePickerStub).props("modelValue") as Date[]

    expect(boundaryDates).toHaveLength(2)
    expect(boundaryDates[0]).toBeInstanceOf(Date)
    expect(boundaryDates[0]?.getFullYear()).toBe(2026)
    expect(boundaryDates[0]?.getMonth()).toBe(0)
    expect(boundaryDates[0]?.getDate()).toBe(5)
    expect(boundaryDates[1]?.getFullYear()).toBe(2026)
    expect(boundaryDates[1]?.getMonth()).toBe(0)
    expect(boundaryDates[1]?.getDate()).toBe(6)
    expect(wrapper.getComponent(VDatePickerStub).props("hideHeader")).toBe(true)
  })

  it("converts native Date updates from the Vuetify boundary back to ISO strings", async () => {
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: ["2026-01-05"],
      },
      global: {
        stubs: {
          "v-date-picker": VDatePickerStub,
        },
      },
    })

    wrapper.getComponent(VDatePickerStub).vm.$emit("update:modelValue", [
      new Date(2026, 0, 7),
      new Date(2026, 0, 8),
    ])
    await nextTick()

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-07", "2026-01-08"]],
    ])
  })
})
