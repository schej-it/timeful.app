// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it, vi } from "vitest"
import { passThroughStub } from "@/test/componentStubs"
import FeatureNotReadyDialog from "./FeatureNotReadyDialog.vue"

const { captureMock, showInfoMock } = vi.hoisted(() => ({
  captureMock: vi.fn(),
  showInfoMock: vi.fn(),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showInfo: showInfoMock,
  }),
}))

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
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
})

const VBtnStub = defineComponent({
  name: "VBtn",
  emits: ["click"],
  template: `
    <button @click="$emit('click')">
      <slot />
    </button>
  `,
})

const mountDialog = () =>
  mount(FeatureNotReadyDialog, {
    props: {
      modelValue: true,
    },
    global: {
      stubs: {
        "v-btn": VBtnStub,
        "v-card": passThroughStub,
        "v-card-actions": passThroughStub,
        "v-card-text": passThroughStub,
        "v-card-title": passThroughStub,
        "v-dialog": passThroughStub,
        "v-icon": true,
        "v-spacer": passThroughStub,
        "v-textarea": VTextareaStub,
      },
    },
  })

const findButtonByText = (
  wrapper: ReturnType<typeof mountDialog>,
  text: string
) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing "${text}"`)
  }

  return button
}

describe("FeatureNotReadyDialog", () => {
  it("uses explicit outlined compact textarea props and keeps empty feedback gated", async () => {
    captureMock.mockReset()
    showInfoMock.mockReset()

    const wrapper = mountDialog()
    const textarea = wrapper.getComponent(VTextareaStub)

    expect(textarea.props("variant")).toBe("outlined")
    expect(textarea.props("density")).toBe("compact")

    await findButtonByText(wrapper, "Submit").trigger("click")

    expect(captureMock).not.toHaveBeenCalled()
    expect(showInfoMock).not.toHaveBeenCalled()
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()

    await wrapper.get("textarea").setValue("Need folders by team")
    await findButtonByText(wrapper, "Submit").trigger("click")

    expect(captureMock).toHaveBeenCalledWith("folder_usage_feedback_submitted", {
      feedback: "Need folders by team",
    })
    expect(showInfoMock).toHaveBeenCalledWith("Thanks for your input!")
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
  })
})
