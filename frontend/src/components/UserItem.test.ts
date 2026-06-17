// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { passThroughStub } from "@/test/componentStubs"
import UserItem from "./UserItem.vue"

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
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
  `,
})

const mountUserItem = () =>
  mount(UserItem, {
    props: {
      user: {
        name: "Grace Hopper",
        status: "free",
      },
    },
    global: {
      stubs: {
        "v-avatar": passThroughStub,
        "v-container": passThroughStub,
        "v-switch": VSwitchStub,
      },
    },
  })

describe("UserItem", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
  })

  it("hydrates the toggle from storage and persists user changes through the preference boundary", async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock({ showEventNames: "false" }))

    const wrapper = mountUserItem()
    const input = wrapper.get("input[type='checkbox']")

    expect((input.element as HTMLInputElement).checked).toBe(false)

    await input.setValue(true)

    expect(localStorage.getItem("showEventNames")).toBe("true")
    expect(wrapper.emitted("showEventNames")).toEqual([[true]])
  })

  it("defaults to showing event names when no stored preference exists", () => {
    const wrapper = mountUserItem()

    expect((wrapper.get("input[type='checkbox']").element as HTMLInputElement).checked).toBe(
      true
    )
  })
})
