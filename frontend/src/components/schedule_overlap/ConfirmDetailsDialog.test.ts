// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it, vi } from "vitest"
import { passThroughStub } from "@/test/componentStubs"
import ConfirmDetailsDialog from "./ConfirmDetailsDialog.vue"

vi.mock("@/utils", () => ({
  get: vi.fn(() => Promise.resolve([])),
  validateEmail: (email: string) => email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
}))

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
  emits: ["update:modelValue"],
  template: `
    <input
      class="location-input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
})

const VTextareaStub = defineComponent({
  name: "VTextarea",
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
  emits: ["update:modelValue"],
  template: `
    <textarea
      class="description-input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
})

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

describe("ConfirmDetailsDialog", () => {
  it("uses Vuetify 3 panel and field props while preserving confirm payloads", async () => {
    const wrapper = mount(ConfirmDetailsDialog, {
      props: {
        modelValue: true,
        respondents: [{ email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" }],
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-actions": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-combobox": true,
          "v-dialog": passThroughStub,
          "v-expansion-panel": passThroughStub,
          "v-expansion-panel-text": passThroughStub,
          "v-expansion-panel-title": passThroughStub,
          "v-expansion-panels": passThroughStub,
          "v-icon": true,
          "v-list-item": passThroughStub,
          "v-list-item-subtitle": passThroughStub,
          "v-list-item-title": passThroughStub,
          "v-spacer": passThroughStub,
          "v-text-field": VTextFieldStub,
          "v-textarea": VTextareaStub,
          UserAvatarContent: true,
        },
      },
    })

    expect(wrapper.html()).toContain("Attendees")
    expect(wrapper.html()).toContain("Location &amp; description (optional)")

    const textField = wrapper.getComponent(VTextFieldStub)
    const textArea = wrapper.getComponent(VTextareaStub)
    expect(textField.props("variant")).toBe("outlined")
    expect(textField.props("density")).toBe("compact")
    expect(textArea.props("variant")).toBe("outlined")
    expect(textArea.props("density")).toBe("compact")

    await wrapper.get(".location-input").setValue("Room 12")
    await wrapper.get(".description-input").setValue("Discuss roadmap")

    const confirmButton = wrapper.findAll("button").find((button) => button.text().includes("Confirm"))
    if (confirmButton == null) {
      throw new Error("Expected confirm button to exist")
    }
    await confirmButton.trigger("click")

    expect(wrapper.emitted("confirm")).toEqual([
      [{ emails: ["ada@example.com"], location: "Room 12", description: "Discuss roadmap" }],
    ])
  })

  it("applies parent-owned draft updates without an exposed setter API", async () => {
    const wrapper = mount(ConfirmDetailsDialog, {
      props: {
        modelValue: true,
        respondents: [{ email: "", firstName: "Ada", lastName: "Lovelace" }],
        draft: {
          emails: [""],
          location: "Room 1",
          description: "Original",
        },
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-actions": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-combobox": true,
          "v-dialog": passThroughStub,
          "v-expansion-panel": passThroughStub,
          "v-expansion-panel-text": passThroughStub,
          "v-expansion-panel-title": passThroughStub,
          "v-expansion-panels": passThroughStub,
          "v-icon": true,
          "v-list-item": passThroughStub,
          "v-list-item-subtitle": passThroughStub,
          "v-list-item-title": passThroughStub,
          "v-spacer": passThroughStub,
          "v-text-field": VTextFieldStub,
          "v-textarea": VTextareaStub,
          UserAvatarContent: true,
        },
      },
    })

    await wrapper.setProps({
      draft: {
        emails: [""],
        location: "Room 2",
        description: "Updated",
      },
    })

    expect(
      (wrapper.get(".location-input").element as HTMLInputElement).value
    ).toBe("Room 2")
    expect(
      (wrapper.get(".description-input").element as HTMLTextAreaElement).value
    ).toBe("Updated")
  })
})
