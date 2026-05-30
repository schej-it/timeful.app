// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC } from "@/constants"
import EventOptions from "./EventOptions.vue"

const isPhoneValue = ref(false)

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: isPhoneValue,
  }),
}))

const baseEvent = {
  _id: "evt-1",
  ownerId: "owner-1",
  name: "Planning",
  type: eventTypes.SPECIFIC_DATES,
  dates: [Temporal.PlainDate.from("2026-01-01")],
  timeSeed: Temporal.Instant.from("2026-01-01T12:00:00Z").toZonedDateTimeISO(UTC),
  duration: durations.ONE_HOUR,
  daysOnly: false,
}

describe("EventOptions", () => {
  const VSwitchLabelStub = {
    props: ["id"],
    template:
      '<div :id="id" class="event-options-switch"><slot name="label" /></div>',
  }
  const VMenuStub = {
    template:
      "<div><slot name=\"activator\" :props=\"{}\" /><slot /></div>",
  }
  const VBtnStub = {
    template: "<button id=\"event-options-menu-activator\"><slot /></button>",
  }
  const passThroughStub = {
    template: "<div><slot /></div>",
  }

  it("shows the section variant with an inline heading", () => {
    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: true,
        hideIfNeeded: false,
        numResponses: 2,
        showAllHours: false,
      },
      global: {
        stubs: {
          "v-switch": VSwitchLabelStub,
        },
      },
    })

    expect(wrapper.text()).toContain("Options")
    expect(wrapper.text()).toContain("Show best times")
    expect(wrapper.find("#event-options-menu-activator").exists()).toBe(false)
    expect(wrapper.find("#show-best-times-toggle").exists()).toBe(true)
  })

  it("keeps emitting best-times updates from the static options block", async () => {
    const VSwitchStub = {
      emits: ["update:modelValue"],
      template:
        '<button class="event-options-best-times" @click="$emit(\'update:modelValue\', false)" />',
    }

    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: true,
        hideIfNeeded: false,
        numResponses: 2,
        showAllHours: false,
      },
      global: {
        stubs: {
          "v-switch": VSwitchStub,
        },
      },
    })

    await wrapper.get(".event-options-best-times").trigger("click")

    expect(wrapper.emitted("update:showBestTimes")).toEqual([[false]])
  })

  it("renders the compact menu variant without duplicating show-best-times", () => {
    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: true,
        hideIfNeeded: false,
        numResponses: 2,
        showAllHours: false,
        variant: "menu",
        includeShowBestTimes: false,
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-icon": true,
          "v-menu": VMenuStub,
          "v-switch": VSwitchLabelStub,
        },
      },
    })

    expect(wrapper.find("#event-options-menu-activator").exists()).toBe(true)
    expect(wrapper.text()).toContain("Options")
    expect(wrapper.text()).toContain("Hide if needed times")
    expect(wrapper.text()).toContain("Show all hours")
    expect(wrapper.text()).not.toContain("Show best times")
  })

  it("uses a custom label for the compact menu activator when provided", () => {
    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: true,
        hideIfNeeded: false,
        numResponses: 2,
        showAllHours: false,
        variant: "menu",
        menuButtonLabel: "More options",
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-icon": true,
          "v-menu": VMenuStub,
          "v-switch": VSwitchLabelStub,
        },
      },
    })

    expect(wrapper.get("#event-options-menu-activator").text()).toContain(
      "More options"
    )
  })

  it("shows timed-event grid options with zero responses when show-all-hours is available", () => {
    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: false,
        hideIfNeeded: false,
        numResponses: 0,
        showAllHours: false,
      },
      global: {
        stubs: {
          "v-switch": VSwitchLabelStub,
        },
      },
    })

    expect(wrapper.text()).toContain("Options")
    expect(wrapper.text()).toContain("Show all hours")
    expect(wrapper.text()).not.toContain("Show best times")
    expect(wrapper.text()).not.toContain("Hide if needed times")
  })

  it("hides timed-event options with zero responses when the full-grid toggle is unavailable", () => {
    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: false,
        hideIfNeeded: false,
        numResponses: 0,
      },
      global: {
        stubs: {
          "v-switch": VSwitchLabelStub,
        },
      },
    })

    expect(wrapper.text()).not.toContain("Options")
    expect(wrapper.find("#show-all-hours-toggle").exists()).toBe(false)
  })

  it("keeps emitting full-grid updates from the visible timed toggle", async () => {
    const VSwitchEmitStub = {
      props: ["id"],
      emits: ["update:modelValue"],
      template:
        '<button :id="id" class="event-options-show-all-hours" @click="$emit(\'update:modelValue\', true)" />',
    }

    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: false,
        hideIfNeeded: false,
        numResponses: 0,
        showAllHours: false,
      },
      global: {
        stubs: {
          "v-switch": VSwitchEmitStub,
        },
      },
    })

    await wrapper.get(".event-options-show-all-hours").trigger("click")

    expect(wrapper.emitted("update:showAllHours")).toEqual([[true]])
  })

  it("emits remaining toggle updates from the menu variant", async () => {
    const VSwitchEmitStub = {
      props: ["id"],
      emits: ["update:modelValue"],
      template:
        '<button :id="id" @click="$emit(\'update:modelValue\', true)" />',
    }

    const wrapper = shallowMount(EventOptions, {
      props: {
        event: baseEvent,
        showBestTimes: true,
        hideIfNeeded: false,
        numResponses: 2,
        showAllHours: false,
        variant: "menu",
        includeShowBestTimes: false,
      },
      global: {
        stubs: {
          "v-btn": VBtnStub,
          "v-card": passThroughStub,
          "v-card-text": passThroughStub,
          "v-icon": true,
          "v-menu": VMenuStub,
          "v-switch": VSwitchEmitStub,
        },
      },
    })

    await wrapper.get("#hide-if-needed-toggle").trigger("click")
    await wrapper.get("#show-all-hours-toggle").trigger("click")

    expect(wrapper.emitted("update:hideIfNeeded")).toEqual([[true]])
    expect(wrapper.emitted("update:showAllHours")).toEqual([[true]])
  })
})
