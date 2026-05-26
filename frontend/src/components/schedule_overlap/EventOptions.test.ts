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
  it("shows always-visible desktop options without a collapse control", () => {
    const VSwitchStub = {
      props: ["id"],
      template:
        '<div :id="id" class="event-options-switch"><slot name="label" /></div>',
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

    expect(wrapper.text()).toContain("Options")
    expect(wrapper.text()).toContain("Show best times")
    expect(wrapper.html()).not.toContain("mdi-chevron")
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
})
