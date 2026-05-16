// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { defineComponent, ref } from "vue"
import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFormStub, mergeComponentStubs, nullStub, passThroughStub } from "@/test/componentStubs"
import type { Event, SignUpBlockWithResponses } from "@/types"
import SignUpForSlotDialog from "./SignUpForSlotDialog.vue"

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

const formRefMethods = {
  validate: vi.fn<() => Promise<{ valid: boolean }>>(() => Promise.resolve({ valid: true })),
  resetValidation: vi.fn<() => void>(() => undefined),
}

const VBtnStub = defineComponent({
  name: "VBtn",
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  template: `
    <button :disabled="disabled" @click="$emit('click')">
      <slot />
    </button>
  `,
})

const VTextFieldStub = defineComponent({
  name: "VTextField",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    variant: {
      type: String,
      default: undefined,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
})

const baseEvent = {
  _id: "evt-1",
  collectEmails: true,
  blindAvailabilityEnabled: false,
} as Event

const signUpBlock = {
  _id: "slot-1",
  name: "Slot 1",
  respondents: [],
} as SignUpBlockWithResponses

const getSubmitButton = (wrapper: ReturnType<typeof mount>) => {
  const button = wrapper.findAll("button").at(1)
  if (button == null) {
    throw new Error("Expected submit button to exist")
  }
  return button
}

describe("SignUpForSlotDialog", () => {
  beforeEach(() => {
    formRefMethods.validate.mockClear()
    formRefMethods.resetValidation.mockClear()
  })

  it("uses explicit Vuetify 3 solo variants and allows guest submit after typing", async () => {
    const wrapper = mount(SignUpForSlotDialog, {
      props: {
        modelValue: true,
        event: baseEvent,
        signUpBlock,
      },
      global: {
        stubs: mergeComponentStubs({
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-dialog": passThroughStub,
          "v-form": createFormStub(formRefMethods),
          "v-icon": nullStub,
          "v-spacer": nullStub,
          "v-text-field": VTextFieldStub,
          SignUpBlock: passThroughStub,
        }),
      },
    })

    const fields = wrapper.findAllComponents(VTextFieldStub)
    expect(fields).toHaveLength(2)
    expect(fields[0]?.props("variant")).toBe("solo")
    expect(fields[1]?.props("variant")).toBe("solo")
    expect(getSubmitButton(wrapper).attributes("disabled")).toBeDefined()

    const inputs = wrapper.findAll("input")
    await inputs[0]?.setValue(" guest ")
    await inputs[1]?.setValue(" guest@example.com ")

    expect(getSubmitButton(wrapper).attributes("disabled")).toBeUndefined()

    await getSubmitButton(wrapper).trigger("click")

    expect(formRefMethods.validate).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted("submit")).toEqual([
      [{ name: "guest", email: "guest@example.com" }],
    ])
  })
})
