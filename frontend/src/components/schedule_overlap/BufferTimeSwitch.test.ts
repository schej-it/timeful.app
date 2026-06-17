/* eslint-disable vue/one-component-per-file */

// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it, vi } from "vitest"
import type { BufferTimeOptions } from "@/types"
import BufferTimeSwitch from "./BufferTimeSwitch.vue"
import bufferTimeSwitchSource from "./BufferTimeSwitch.vue?raw"

const { captureMock } = vi.hoisted(() => ({
  captureMock: vi.fn(),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

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
      <button class="buffer-time-toggle" @click="$emit('update:modelValue', !modelValue)" />
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
  },
  emits: ["update:modelValue"],
  template: `
    <button
      class="buffer-time-select"
      @click="$emit('update:modelValue', items[1].value)"
    />
  `,
})

const mountBufferTimeSwitch = (bufferTime: BufferTimeOptions) =>
  mount(BufferTimeSwitch, {
    props: {
      bufferTime,
    },
    global: {
      stubs: {
        "v-select": VSelectEmitStub,
        "v-switch": VSwitchStub,
      },
    },
  })

describe("BufferTimeSwitch", () => {
  it("uses a compact select with explicit title and value mappings", () => {
    const wrapper = mountBufferTimeSwitch({
      enabled: true,
      time: 15,
    })

    const select = wrapper.getComponent(VSelectEmitStub)

    expect(bufferTimeSwitchSource).toContain('density="compact"')
    expect(bufferTimeSwitchSource).toContain('item-title="title"')
    expect(bufferTimeSwitchSource).toContain('item-value="value"')
    expect(bufferTimeSwitchSource).toContain("hide-details")
    expect(bufferTimeSwitchSource).not.toContain("\n            dense\n")
    expect(select.props("density")).toBe("compact")
    expect(select.props("itemTitle")).toBe("title")
    expect(select.props("itemValue")).toBe("value")
  })

  it("keeps the buffer time update payload unchanged", async () => {
    const wrapper = mountBufferTimeSwitch({
      enabled: true,
      time: 15,
    })

    await wrapper.get(".buffer-time-select").trigger("click")

    expect(wrapper.emitted("update:bufferTime")).toEqual([
      [{ enabled: true, time: 30 }],
    ])
  })

  it("keeps the switch analytics payload unchanged", async () => {
    const wrapper = mountBufferTimeSwitch({
      enabled: true,
      time: 15,
    })

    await wrapper.get(".buffer-time-toggle").trigger("click")

    expect(wrapper.emitted("update:bufferTime")).toEqual([
      [{ enabled: false, time: 15 }],
    ])
    expect(captureMock).toHaveBeenCalledWith("buffer_time_switch_toggled", {
      enabled: false,
    })
  })
})
