// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils"
import { defineComponent, ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import type { SignUpBlockWithResponses } from "@/types"
import SignUpBlock from "./SignUpBlock.vue"

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: ref(null),
  }),
}))

vi.mock("@/utils", () => ({
  getStartEndDateString: vi.fn(() => "9:00 AM - 10:00 AM"),
}))

const VBtnStub = defineComponent({
  name: "VBtn",
  props: {
    color: {
      type: String,
      default: undefined,
    },
  },
  emits: ["click"],
  template: `
    <button :data-color="color" @click="$emit('click')">
      <slot />
    </button>
  `,
})

const VTextFieldStub = defineComponent({
  name: "VTextField",
  props: {
    density: {
      type: String,
      default: undefined,
    },
    modelValue: {
      type: String,
      default: "",
    },
    variant: {
      type: String,
      default: undefined,
    },
  },
  emits: ["update:modelValue", "keyup.enter"],
  template: `
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('keyup.enter')"
    />
  `,
})

const VSelectStub = defineComponent({
  name: "VSelect",
  props: {
    density: {
      type: String,
      default: undefined,
    },
    modelValue: {
      type: Number,
      default: undefined,
    },
    variant: {
      type: String,
      default: undefined,
    },
  },
  emits: ["update:modelValue"],
  template: "<div />",
})

const signUpBlock = {
  _id: "slot-1",
  name: "Slot 1",
  capacity: 4,
  responses: [],
} as SignUpBlockWithResponses

describe("SignUpBlock", () => {
  it("uses compact inline edit controls without forcing a variant and preserves update emits", async () => {
    const wrapper = mount(SignUpBlock, {
      props: {
        signUpBlock,
        isEditing: true,
        isOwner: true,
      },
      global: {
        stubs: {
          "v-avatar": true,
          "v-btn": VBtnStub,
          "v-icon": true,
          "v-select": VSelectStub,
          "v-text-field": VTextFieldStub,
        },
      },
    })

    await wrapper.findAll("button")[0]?.trigger("click")

    const nameField = wrapper.getComponent(VTextFieldStub)
    const capacitySelect = wrapper.getComponent(VSelectStub)

    expect(nameField.props("density")).toBe("compact")
    expect(nameField.props("variant")).toBeUndefined()
    expect(capacitySelect.props("density")).toBe("compact")
    expect(capacitySelect.props("variant")).toBeUndefined()

    await wrapper.get("input").setValue("Renamed slot")
    await wrapper.get("input").trigger("keyup.enter")

    expect(wrapper.emitted("update:signUpBlock")?.[0]).toEqual([
      {
        ...signUpBlock,
        name: "Renamed slot",
      },
    ])

    wrapper.getComponent(VSelectStub).vm.$emit("update:modelValue", 6)

    expect(wrapper.emitted("update:signUpBlock")?.[1]).toEqual([
      {
        ...signUpBlock,
        capacity: 6,
      },
    ])
  })

  it("renders guest attendee names without leaking undefined last names", () => {
    const wrapper = mount(SignUpBlock, {
      props: {
        signUpBlock: {
          ...signUpBlock,
          responses: [
            {
              name: "Ada",
              user: {
                firstName: "Ada",
              },
            },
          ],
        },
      },
      global: {
        stubs: {
          "v-avatar": true,
          "v-btn": VBtnStub,
          "v-icon": true,
          "v-select": VSelectStub,
          "v-text-field": VTextFieldStub,
        },
      },
    })

    expect(wrapper.text()).toContain("Ada")
    expect(wrapper.text()).not.toContain("undefined")
  })
})
