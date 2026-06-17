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
  template: `
    <div>
      <div data-v-date="2026-01-07">
        <button
          type="button"
          @mousedown.stop="$emit('update:modelValue', [new Date(2026, 0, 7), new Date(2026, 0, 8)])"
          @pointerdown.stop="$emit('update:modelValue', [new Date(2026, 0, 7), new Date(2026, 0, 8)])"
          @click="$emit('update:modelValue', [new Date(2026, 0, 7), new Date(2026, 0, 8)])"
        >
          <span>7</span>
        </button>
      </div>
      <div data-v-date="2026-01-08">
        <button
          type="button"
          @mousedown.stop="$emit('update:modelValue', [new Date(2026, 0, 7), new Date(2026, 0, 8), new Date(2026, 0, 14)])"
          @pointerdown.stop="$emit('update:modelValue', [new Date(2026, 0, 7), new Date(2026, 0, 8), new Date(2026, 0, 14)])"
          @click="$emit('update:modelValue', [new Date(2026, 0, 7), new Date(2026, 0, 8), new Date(2026, 0, 14)])"
        >
          <span>8</span>
        </button>
      </div>
      <div
        data-v-date="2026-02-01"
        class="v-date-picker-month__day--adjacent"
      >
        <button
          type="button"
          @pointerdown.stop
          @click="$emit('update:modelValue', [new Date(2026, 1, 1)])"
        >
          <span>1</span>
        </button>
      </div>
    </div>
  `,
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
    expect(wrapper.classes()).toContain("timeful-date-picker")
    expect(wrapper.classes()).toContain("tw-w-full")
    expect(wrapper.getComponent(VDatePickerStub).classes()).toContain("tw-w-full")
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

  it("commits clicked days from the rendered date-cell DOM", async () => {
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

    await wrapper.get('[data-v-date="2026-01-07"] button').trigger("pointerdown")
    await nextTick()

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-05", "2026-01-07"]],
    ])

    await wrapper.setProps({
      modelValue: ["2026-01-05", "2026-01-07"],
    })

    const boundaryDates = wrapper.getComponent(VDatePickerStub).props("modelValue") as Date[]

    expect(boundaryDates).toHaveLength(2)
    expect(boundaryDates[1]?.getFullYear()).toBe(2026)
    expect(boundaryDates[1]?.getMonth()).toBe(0)
    expect(boundaryDates[1]?.getDate()).toBe(7)
  })

  it("suppresses underlying date-picker click updates so two targeted clicks do not emit an extra date", async () => {
    const wrapper = mount(DatePicker, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: {
          "v-date-picker": VDatePickerStub,
        },
      },
    })

    const firstButton = wrapper.get('[data-v-date="2026-01-07"] button')
    await firstButton.trigger("pointerdown")
    await firstButton.trigger("click")
    await wrapper.setProps({
      modelValue: ["2026-01-07"],
    })

    const secondButton = wrapper.get('[data-v-date="2026-01-08"] button')
    await secondButton.trigger("pointerdown")
    await secondButton.trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-07"]],
      [["2026-01-07", "2026-01-08"]],
    ])
  })

  it("stops drag selection after pointerup so hover does not select more dates", async () => {
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

    await wrapper.get('[data-v-date="2026-01-07"] button').trigger("pointerdown")
    await wrapper.get('[data-v-date="2026-01-07"] button').trigger("pointerup")
    await wrapper.setProps({
      modelValue: ["2026-01-05", "2026-01-07"],
    })
    await wrapper.get('[data-v-date="2026-01-08"] button').trigger("pointerover")

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-05", "2026-01-07"]],
    ])
  })

  it("does not extend selection from pointerover events once the pointer buttons are no longer pressed", async () => {
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

    await wrapper.get('[data-v-date="2026-01-07"] button').trigger("pointerdown")
    await wrapper.setProps({
      modelValue: ["2026-01-05", "2026-01-07"],
    })
    await wrapper.get('[data-v-date="2026-01-08"] button').trigger("pointerover", {
      buttons: 0,
    })

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-05", "2026-01-07"]],
    ])
  })

  it("continues drag selection only after the pointer has actually moved", async () => {
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

    await wrapper.get('[data-v-date="2026-01-07"] button').trigger("pointerdown", {
      clientX: 0,
      clientY: 0,
    })
    await wrapper.setProps({
      modelValue: ["2026-01-05", "2026-01-07"],
    })
    await wrapper.get('[data-v-date="2026-01-08"] button').trigger("pointerover", {
      buttons: 1,
      clientX: 10,
      clientY: 0,
    })

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-05", "2026-01-07"]],
      [["2026-01-05", "2026-01-07", "2026-01-08"]],
    ])
  })

  it("ignores adjacent-month drag targets so cross-month hover does not select or navigate", async () => {
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

    await wrapper.get('[data-v-date="2026-01-07"] button').trigger("pointerdown")
    await wrapper.setProps({
      modelValue: ["2026-01-05", "2026-01-07"],
    })
    await wrapper.get('[data-v-date="2026-02-01"] button').trigger("pointerover")

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [["2026-01-05", "2026-01-07"]],
    ])
  })

  it("blocks adjacent-month clicks from driving Vuetify month navigation through empty slots", async () => {
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

    await wrapper.get('[data-v-date="2026-02-01"] button').trigger("click")

    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
  })
})
