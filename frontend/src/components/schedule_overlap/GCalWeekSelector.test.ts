// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { eventTypes, UTC } from "@/constants"
import { Temporal } from "temporal-polyfill"
import GCalWeekSelector from "./GCalWeekSelector.vue"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

const mountWeekSelector = (
  dates: Temporal.PlainDate[] = [],
  timeSeed?: Temporal.ZonedDateTime
) =>
  shallowMount(GCalWeekSelector, {
    props: {
      weekOffset: 0,
      event: {
        _id: "evt-1",
        name: "Weekly event",
        type: eventTypes.DOW,
        dates,
        timeSeed,
      },
    },
    global: {
      stubs: {
        "v-btn": true,
        "v-icon": true,
      },
    },
  })

describe("GCalWeekSelector", () => {
  it("does not throw when a weekly event has no dates", () => {
    expect(() => mountWeekSelector()).not.toThrow()

    const wrapper = mountWeekSelector()

    expect(wrapper.text()).toContain("Showing calendar for week of unknown date")
  })

  it("renders the projected displayed week label for weekly events", () => {
    const wrapper = mountWeekSelector(
      [Temporal.PlainDate.from("2026-01-05")],
      zdt("2026-01-05T09:00:00Z")
    )

    expect(wrapper.text()).toContain("Showing calendar for week of")
  })
})
