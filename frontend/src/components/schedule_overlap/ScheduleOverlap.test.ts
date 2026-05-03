// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { mountScheduleOverlap } from "./scheduleOverlapTestUtils"

const smAndDown = { value: false }

vi.mock("vuetify", () => ({
  useDisplay: () => ({
    smAndDown,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
    refreshAuthUser: vi.fn(),
    showInfo: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

describe("ScheduleOverlap", () => {
  beforeEach(() => {
    smAndDown.value = false
    vi.stubGlobal("localStorage", createLocalStorageMock())
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          text: () => Promise.resolve("{}"),
        })
      )
    )
  })

  it("renders overnight split calendar events without comparing Temporal.Duration via valueOf", () => {
    expect(() => mountScheduleOverlap()).not.toThrow()
  })

  it("renders the extracted timed grid child for timed events", () => {
    const wrapper = mountScheduleOverlap()

    expect(wrapper.findComponent({ name: "ScheduleOverlapTimeGrid" }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: "ScheduleOverlapDaysOnlyGrid" }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: "ScheduleOverlapSidebar" }).exists()).toBe(true)
  })

  it("passes cohesive sidebar and mobile overlay view models to extracted children", () => {
    smAndDown.value = true

    const wrapper = mountScheduleOverlap({
      global: {
        stubs: {
          ScheduleOverlapSidebar: {
            name: "ScheduleOverlapSidebar",
            props: {
              sidebar: {
                type: Object,
                required: true,
              },
            },
            template: "<div />",
          },
          ScheduleOverlapMobileOverlay: {
            name: "ScheduleOverlapMobileOverlay",
            props: {
              overlay: {
                type: Object,
                required: true,
              },
            },
            template: "<div />",
          },
        },
      },
      props: {
        calendarPermissionGranted: true,
      },
    })

    const sidebarViewModel = wrapper.findComponent({ name: "ScheduleOverlapSidebar" })
      .props("sidebar") as {
        event: { _id?: string }
        respondentsPanel: { eventId: string }
      }
    const overlayViewModel = wrapper.findComponent({
      name: "ScheduleOverlapMobileOverlay",
    }).props("overlay") as {
      event: { _id?: string }
      respondentsPanel: { eventId: string }
    }

    expect(sidebarViewModel.event._id).toBe("evt-1")
    expect(sidebarViewModel.respondentsPanel.eventId).toBe("evt-1")
    expect(overlayViewModel.event._id).toBe("evt-1")
    expect(overlayViewModel.respondentsPanel.eventId).toBe("evt-1")
  })
})
