/* eslint-disable vue/one-component-per-file */

// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it, vi } from "vitest"
import type { WorkingHoursOptions } from "@/types"
import type * as UtilsModule from "@/utils"
import WorkingHoursToggle from "./WorkingHoursToggle.vue"
import workingHoursToggleSource from "./WorkingHoursToggle.vue?raw"

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    getTimeOptions: vi.fn(() => [
      { title: "9:00 AM", time: 540 },
      { title: "5:00 PM", time: 1020 },
      { title: "11:30 PM", time: 1410 },
    ]),
  }
})

const VSwitchStub = defineComponent({
  name: "VSwitch",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <div>
      <slot name="label" />
      <button class="working-hours-toggle" @click="$emit('update:modelValue', !modelValue)" />
    </div>
  `,
})

const VSelectEmitStub = defineComponent({
  name: "VSelect",
  props: {
    density: {
      type: String,
      default: undefined,
    },
    hideDetails: {
      type: [Boolean, String],
      default: undefined,
    },
    itemTitle: {
      type: String,
      default: undefined,
    },
    itemValue: {
      type: String,
      default: undefined,
    },
    items: {
      type: Array,
      default: () => [],
    },
    returnObject: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <button
      class="time-select"
      @click="$emit('update:modelValue', items[items.length - 1])"
    />
  `,
})

const mountWorkingHoursToggle = (workingHours: WorkingHoursOptions) =>
  mount(WorkingHoursToggle, {
    props: {
      workingHours,
    },
    global: {
      stubs: {
        "v-select": VSelectEmitStub,
        "v-switch": VSwitchStub,
      },
    },
  })

describe("WorkingHoursToggle", () => {
  it("uses compact selects with explicit time option mappings", () => {
    const wrapper = mountWorkingHoursToggle({
      enabled: true,
      startTime: 540,
      endTime: 1020,
    })

    const selects = wrapper.findAllComponents(VSelectEmitStub)

    expect(selects).toHaveLength(2)
    expect(workingHoursToggleSource).toContain('density="compact"')
    expect(workingHoursToggleSource).toContain('item-title="title"')
    expect(workingHoursToggleSource).toContain('item-value="time"')
    expect(workingHoursToggleSource).toContain("hide-details")
    expect(workingHoursToggleSource).toContain("return-object")
    expect(workingHoursToggleSource).not.toContain("\n              dense\n")
    for (const select of selects) {
      expect(select.props("density")).toBe("compact")
      expect(select.props("itemTitle")).toBe("title")
      expect(select.props("itemValue")).toBe("time")
      expect(select.props("returnObject")).toBe(true)
      expect(select.props("hideDetails")).toBe(true)
    }
  })

  it("keeps the start and end time emit payload shape", async () => {
    const wrapper = mountWorkingHoursToggle({
      enabled: true,
      startTime: 540,
      endTime: 1020,
    })

    const selects = wrapper.findAll(".time-select")
    await selects[0].trigger("click")
    await selects[1].trigger("click")

    expect(wrapper.emitted("update:workingHours")).toEqual([
      [{ enabled: true, startTime: 1410, endTime: 1020 }],
      [{ enabled: true, startTime: 540, endTime: 1410 }],
    ])
  })

  it("keeps the enabled toggle backend-facing boolean semantics", async () => {
    const wrapper = mountWorkingHoursToggle({
      enabled: true,
      startTime: 540,
      endTime: 1020,
    })

    await wrapper.get(".working-hours-toggle").trigger("click")

    expect(wrapper.emitted("update:workingHours")).toEqual([
      [{ enabled: false, startTime: 540, endTime: 1020 }],
    ])
  })
})
