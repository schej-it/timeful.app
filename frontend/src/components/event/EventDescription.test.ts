// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { eventTypes } from "@/constants"
import EventDescription from "./EventDescription.vue"
import eventDescriptionSource from "./EventDescription.vue?raw"

vi.mock("@/utils", () => ({
  put: vi.fn(),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: vi.fn(),
  }),
}))

const VBtnStub = {
  inheritAttrs: false,
  props: ["variant", "icon", "size", "color"],
  emits: ["click"],
  template:
    '<button v-bind="$attrs" :data-variant="variant" :data-icon="String(icon)" :data-size="size" :data-color="color" @click="$emit(\'click\')"><slot /></button>',
}

const baseEvent = {
  _id: "evt-1",
  name: "Planning",
  type: eventTypes.SPECIFIC_DATES,
}

describe("EventDescription", () => {
  it("renders the description pencil as a circular text icon button", () => {
    const wrapper = shallowMount(EventDescription, {
      props: {
        event: {
          ...baseEvent,
          description: "klklk",
        },
        canEdit: true,
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
        },
      },
    })

    expect(wrapper.get(".event-description-edit-button").attributes("data-variant")).toBe(
      "text"
    )
    expect(eventDescriptionSource).toContain(
      'class="event-description-action-button event-description-edit-button tw-h-9 tw-w-9"'
    )
    expect(eventDescriptionSource).toContain('<v-icon size="24">mdi-pencil</v-icon>')
  })

  it("renders save and cancel as circular icon buttons while editing", async () => {
    const wrapper = shallowMount(EventDescription, {
      props: {
        event: baseEvent,
        canEdit: true,
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
        },
      },
    })

    await wrapper.get("button").trigger("click")

    const actionButtons = wrapper.findAll(
      ".event-description-cancel-button, .event-description-save-button"
    )
    expect(actionButtons).toHaveLength(2)
    expect(
      actionButtons.every((button) => button.attributes("data-variant") === "text")
    ).toBe(true)
    expect(
      actionButtons.every((button) => button.attributes("data-size") === "small")
    ).toBe(true)
    expect(wrapper.get('[role="textbox"]').classes()).toContain(
      "event-description-editor-field"
    )
    expect(wrapper.get('[role="textbox"]').attributes("contenteditable")).toBe(
      "true"
    )
    expect(eventDescriptionSource).toContain(
      'class="event-description-action-button event-description-cancel-button tw-h-9 tw-w-9"'
    )
    expect(eventDescriptionSource).toContain(
      'class="event-description-action-button event-description-save-button tw-h-9 tw-w-9"'
    )
    expect(eventDescriptionSource).toContain('<v-icon size="24">mdi-close</v-icon>')
    expect(eventDescriptionSource).toContain('<v-icon size="24">mdi-check</v-icon>')
    expect(eventDescriptionSource).toContain(
      'class="event-description-editor tw-pr-20"'
    )
    expect(eventDescriptionSource).toContain(
      'class="event-description-copy event-description-editor-field tw-min-h-6 tw-border-0 tw-border-b tw-border-solid tw-bg-transparent tw-outline-none"'
    )
  })
})
