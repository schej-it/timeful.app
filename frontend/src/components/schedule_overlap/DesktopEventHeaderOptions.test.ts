// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations, eventTypes, UTC } from "@/constants"
import DesktopEventHeaderOptions from "./DesktopEventHeaderOptions.vue"

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

describe("DesktopEventHeaderOptions", () => {
  const EventOptionsStub = {
    props: [
      "variant",
      "includeShowBestTimes",
      "menuButtonLabel",
      "menuActivatorClass",
    ],
    template:
      "<div id=\"header-options-menu\" :data-activator-class=\"menuActivatorClass\">{{ variant }}|{{ String(includeShowBestTimes) }}|{{ menuButtonLabel }}</div>",
  }

  it("renders the desktop options row as a two-column lower grid with More options", () => {
    const wrapper = shallowMount(DesktopEventHeaderOptions, {
      props: {
        event: baseEvent,
        numResponses: 2,
        showBestTimes: true,
        hideIfNeeded: false,
        showAllHours: false,
      },
      global: {
        stubs: {
          EventOptions: EventOptionsStub,
          "v-switch": {
            props: ["id"],
            template: '<div :id="id"><slot name="label" /></div>',
          },
        },
      },
    })

    expect(wrapper.get("#desktop-header-display-options").classes()).toContain(
      "desktop-event-header-options"
    )
    expect(wrapper.get("#desktop-header-show-best-times").text()).toContain(
      "Best times"
    )
    expect(wrapper.get("#show-best-times-header-toggle").classes()).toContain(
      "desktop-event-header-control"
    )
    expect(wrapper.get("#desktop-header-show-best-times").classes()).toContain(
      "desktop-event-header-options__best-times-slot"
    )
    expect(wrapper.get("#desktop-header-show-best-times").attributes("class")).toContain(
      "desktop-event-header-options__best-times-slot"
    )
    expect(wrapper.get("#desktop-header-show-best-times").classes()).not.toContain(
      "desktop-event-header-options__surface"
    )
    expect(wrapper.get("#desktop-header-more-options").text()).toContain(
      "More options"
    )
    expect(wrapper.get("#header-options-menu").text()).toBe(
      "menu|false|More options"
    )
    expect(wrapper.get("#header-options-menu").attributes("data-activator-class")).toContain(
      "desktop-event-header-control"
    )
  })

  it("emits best-times updates from the header toggle", async () => {
    const wrapper = shallowMount(DesktopEventHeaderOptions, {
      props: {
        event: baseEvent,
        numResponses: 2,
        showBestTimes: true,
        hideIfNeeded: false,
        showAllHours: false,
      },
      global: {
        stubs: {
          EventOptions: true,
          "v-switch": {
            props: ["id"],
            emits: ["update:modelValue"],
            template:
              '<button :id="id" @click="$emit(\'update:modelValue\', false)" />',
          },
        },
      },
    })

    await wrapper.get("#show-best-times-header-toggle").trigger("click")

    expect(wrapper.emitted("update:showBestTimes")).toEqual([[false]])
  })

  it("shows only the More options control when best-times is not available", () => {
    const wrapper = shallowMount(DesktopEventHeaderOptions, {
      props: {
        event: { ...baseEvent, daysOnly: true },
        numResponses: 0,
        showBestTimes: false,
        hideIfNeeded: false,
        showAllHours: false,
      },
      global: {
        stubs: {
          EventOptions: EventOptionsStub,
          "v-switch": true,
        },
      },
    })

    expect(wrapper.find("#desktop-header-show-best-times").exists()).toBe(false)
    expect(wrapper.get("#desktop-header-more-options").text()).toContain(
      "More options"
    )
  })
})
