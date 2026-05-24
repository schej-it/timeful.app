// @vitest-environment happy-dom

import { mount, shallowMount } from "@vue/test-utils"
import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes } from "@/constants"
import EventDescription from "./EventDescription.vue"
import eventDescriptionSource from "./EventDescription.vue?raw"

const { putMock, showErrorMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  showErrorMock: vi.fn(),
}))

vi.mock("@/utils", () => ({
  put: putMock,
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: showErrorMock,
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
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("saves the edited description and emits the updated event", async () => {
    putMock.mockResolvedValue({})

    const wrapper = mount(EventDescription, {
      props: {
        event: {
          ...baseEvent,
          description: "Original description",
          duration: Temporal.Duration.from({ minutes: 30 }),
          dates: [],
          timeSeed: undefined,
        },
        canEdit: true,
      },
      attachTo: document.body,
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
        },
      },
    })

    await wrapper.get(".event-description-edit-button").trigger("click")

    const editor = wrapper.get('[role="textbox"]')
    editor.element.textContent = "Updated description"
    await editor.trigger("input")
    await wrapper.get(".event-description-save-button").trigger("click")

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted("update:event")).toEqual([
      [
        {
          ...baseEvent,
          description: "Updated description",
          duration: Temporal.Duration.from({ minutes: 30 }),
          dates: [],
          timeSeed: undefined,
        },
      ],
    ])
    expect(showErrorMock).not.toHaveBeenCalled()
  })

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

  it("seeds the editor from the latest prop description when editing begins", async () => {
    const wrapper = mount(EventDescription, {
      props: {
        event: {
          ...baseEvent,
          description: "First description",
        },
        canEdit: true,
      },
      attachTo: document.body,
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
        },
      },
    })

    await wrapper.setProps({
      event: {
        ...baseEvent,
        description: "Updated description",
      },
    })
    await wrapper.get(".event-description-edit-button").trigger("click")

    expect(wrapper.get('[role="textbox"]').element.textContent).toBe(
      "Updated description"
    )
  })

  it("discards draft edits when editing is canceled", async () => {
    const wrapper = mount(EventDescription, {
      props: {
        event: {
          ...baseEvent,
          description: "Original description",
        },
        canEdit: true,
      },
      attachTo: document.body,
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
        },
      },
    })

    await wrapper.get(".event-description-edit-button").trigger("click")

    const editor = wrapper.get('[role="textbox"]')
    editor.element.textContent = "Draft description"
    await editor.trigger("input")
    await wrapper.get(".event-description-cancel-button").trigger("click")
    await wrapper.get(".event-description-edit-button").trigger("click")

    expect(wrapper.get('[role="textbox"]').element.textContent).toBe(
      "Original description"
    )
  })

  it("reflects prop description updates while not editing", async () => {
    const wrapper = shallowMount(EventDescription, {
      props: {
        event: {
          ...baseEvent,
          description: "Before update",
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

    await wrapper.setProps({
      event: {
        ...baseEvent,
        description: "After update",
      },
    })

    expect(wrapper.text()).toContain("After update")
  })

  it("restores the previous event and reports an error when save fails", async () => {
    putMock.mockRejectedValueOnce(new Error("save failed"))

    const wrapper = mount(EventDescription, {
      props: {
        event: {
          ...baseEvent,
          description: "Original description",
          duration: Temporal.Duration.from({ minutes: 30 }),
          dates: [],
          timeSeed: undefined,
        },
        canEdit: true,
      },
      attachTo: document.body,
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-icon": true,
        },
      },
    })

    await wrapper.get(".event-description-edit-button").trigger("click")

    const editor = wrapper.get('[role="textbox"]')
    editor.element.textContent = "Broken update"
    await editor.trigger("input")
    await wrapper.get(".event-description-save-button").trigger("click")
    await Promise.resolve()

    expect(wrapper.emitted("update:event")).toEqual([
      [
        {
          ...baseEvent,
          description: "Broken update",
          duration: Temporal.Duration.from({ minutes: 30 }),
          dates: [],
          timeSeed: undefined,
        },
      ],
      [
        {
          ...baseEvent,
          description: "Original description",
          duration: Temporal.Duration.from({ minutes: 30 }),
          dates: [],
          timeSeed: undefined,
        },
      ],
    ])
    expect(showErrorMock).toHaveBeenCalledWith(
      "Failed to save description! Please try again later."
    )
  })
})
