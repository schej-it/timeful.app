// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { defineComponent, ref } from "vue"
import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFormStub, mergeComponentStubs, nullStub, passThroughStub } from "@/test/componentStubs"
import type { Event } from "@/types"
import GuestDialog from "./GuestDialog.vue"

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
    placeholder: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "keyup.enter"],
  template: `
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('keyup.enter')"
    />
  `,
})

const VCheckboxStub = defineComponent({
  name: "VCheckbox",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template: `
    <label>
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <slot name="label">{{ label }}</slot>
    </label>
  `,
})

const baseEvent = {
  _id: "evt-1",
  collectEmails: true,
  responses: {},
} as Event

const getSubmitButton = (wrapper: ReturnType<typeof mount>) => {
  const button = wrapper.findAll("button").at(1)
  if (button == null) {
    throw new Error("Expected submit button to exist")
  }
  return button
}

describe("GuestDialog", () => {
  beforeEach(() => {
    formRefMethods.validate.mockClear()
    formRefMethods.resetValidation.mockClear()
  })

  it("uses explicit Vuetify 3 solo variants and enables submit from typed guest details", async () => {
    const wrapper = mount(GuestDialog, {
      props: {
        modelValue: true,
        event: baseEvent,
        respondents: [],
      },
      global: {
        stubs: mergeComponentStubs({
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-checkbox": VCheckboxStub,
          "v-dialog": passThroughStub,
          "v-form": createFormStub(formRefMethods),
          "v-icon": nullStub,
          "v-spacer": nullStub,
          "v-text-field": VTextFieldStub,
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
      [{ name: "guest", email: "guest@example.com", allowOthersToEdit: false }],
    ])
  })

  it("forwards the guest payload to a parent submit listener", async () => {
    const onSubmit = vi.fn()
    const ParentHarness = defineComponent({
      components: { GuestDialog },
      setup() {
        const open = ref(true)
        return { open, onSubmit, event: baseEvent }
      },
      template: `
        <GuestDialog
          v-model="open"
          :event="event"
          :respondents="[]"
          @submit="onSubmit"
        />
      `,
    })

    const wrapper = mount(ParentHarness, {
      global: {
        stubs: mergeComponentStubs({
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-checkbox": VCheckboxStub,
          "v-dialog": passThroughStub,
          "v-form": createFormStub(formRefMethods),
          "v-icon": nullStub,
          "v-spacer": nullStub,
          "v-text-field": VTextFieldStub,
        }),
      },
    })

    const inputs = wrapper.findAll("input")
    await inputs[0]?.setValue("guest")
    await inputs[1]?.setValue("guest@example.com")
    await getSubmitButton(wrapper).trigger("click")

    expect(onSubmit).toHaveBeenCalledWith({
      name: "guest",
      email: "guest@example.com",
      allowOthersToEdit: false,
    })
  })

  it("treats whitespace-only name differences as duplicate guest names", async () => {
    formRefMethods.validate.mockImplementationOnce(() => Promise.resolve({ valid: false }))

    const wrapper = mount(GuestDialog, {
      props: {
        modelValue: true,
        event: baseEvent,
        respondents: ["guest"],
      },
      global: {
        stubs: mergeComponentStubs({
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-checkbox": VCheckboxStub,
          "v-dialog": passThroughStub,
          "v-form": createFormStub(formRefMethods),
          "v-icon": nullStub,
          "v-spacer": nullStub,
          "v-text-field": VTextFieldStub,
        }),
      },
    })

    const inputs = wrapper.findAll("input")
    await inputs[0]?.setValue(" guest ")
    await inputs[1]?.setValue(" guest@example.com ")
    await getSubmitButton(wrapper).trigger("click")

    expect(formRefMethods.validate).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted("submit")).toBeUndefined()
  })

  it("defaults guest ownership to protected and emits open mode when toggled", async () => {
    const wrapper = mount(GuestDialog, {
      props: {
        modelValue: true,
        event: baseEvent,
        respondents: [],
      },
      global: {
        stubs: mergeComponentStubs({
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-checkbox": VCheckboxStub,
          "v-dialog": passThroughStub,
          "v-form": createFormStub(formRefMethods),
          "v-icon": nullStub,
          "v-spacer": nullStub,
          "v-text-field": VTextFieldStub,
        }),
      },
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)

    const inputs = wrapper.findAll('input[type="text"], input:not([type])')
    await inputs[0]?.setValue("guest")
    await inputs[1]?.setValue("guest@example.com")
    await checkbox.setValue(true)
    await getSubmitButton(wrapper).trigger("click")

    expect(wrapper.emitted("submit")).toEqual([
      [{ name: "guest", email: "guest@example.com", allowOthersToEdit: true }],
    ])
  })

  it("uses the shared slotted checkbox label styling for availability editing", async () => {
    const wrapper = mount(GuestDialog, {
      props: {
        modelValue: true,
        event: baseEvent,
        respondents: [],
      },
      global: {
        stubs: mergeComponentStubs({
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-checkbox": VCheckboxStub,
          "v-dialog": passThroughStub,
          "v-form": createFormStub(formRefMethods),
          "v-icon": nullStub,
          "v-spacer": nullStub,
          "v-text-field": VTextFieldStub,
        }),
      },
    })

    const label = wrapper.get("span.tw-text-sm")
    expect(label.classes()).toContain("tw-text-very-dark-gray")
    expect(label.text()).toBe("Allow others to edit this availability")

    await wrapper.get('input[type="checkbox"]').setValue(true)

    expect(label.classes()).toContain("tw-text-black")
    expect(label.classes()).not.toContain("tw-text-very-dark-gray")
  })

})
