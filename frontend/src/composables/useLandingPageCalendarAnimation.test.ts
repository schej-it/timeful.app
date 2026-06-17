// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent, nextTick, ref } from "vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useLandingPageCalendarAnimation } from "./useLandingPageCalendarAnimation"

describe("useLandingPageCalendarAnimation", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("restarts the landing calendar animation from a replay token without overlapping timers", () => {
    vi.useFakeTimers()

    const replayToken = ref(0)
    const events: string[] = []

    mount(
      defineComponent({
        setup() {
          useLandingPageCalendarAnimation({
            replayToken,
            actions: {
              reset: () => {
                events.push("reset")
              },
              startEditing: () => {
                events.push("startEditing")
              },
              populateCalendar: () => {
                events.push("populateCalendar")
              },
              setAvailabilityAutomatically: () => {
                events.push("setAvailabilityAutomatically")
              },
              stopEditing: () => {
                events.push("stopEditing")
              },
            },
          })

          return () => null
        },
      })
    )

    expect(events).toEqual(["reset", "startEditing"])

    vi.advanceTimersByTime(200)
    expect(events).toEqual(["reset", "startEditing", "populateCalendar"])

    replayToken.value += 1

    return nextTick().then(() => {
      expect(events).toEqual([
        "reset",
        "startEditing",
        "populateCalendar",
        "reset",
        "startEditing",
      ])

      vi.advanceTimersByTime(200)
      vi.advanceTimersByTime(500)
      vi.advanceTimersByTime(2000)

      expect(events).toEqual([
        "reset",
        "startEditing",
        "populateCalendar",
        "reset",
        "startEditing",
        "populateCalendar",
        "setAvailabilityAutomatically",
        "stopEditing",
      ])
    })
  })
})
