// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  buildScheduleOverlapProps,
  mountScheduleOverlap,
} from "./scheduleOverlapTestUtils"

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

  it("passes a cohesive tool-row view model to timed and days-only grid boundaries", () => {
    const timedWrapper = mountScheduleOverlap({
      global: {
        stubs: {
          ScheduleOverlapTimeGrid: {
            name: "ScheduleOverlapTimeGrid",
            props: {
              toolRow: {
                type: Object,
                required: true,
              },
            },
            template: "<div />",
          },
        },
      },
    })

    const timedToolRow = timedWrapper.findComponent({ name: "ScheduleOverlapTimeGrid" })
      .props("toolRow") as {
      event: { _id?: string }
      numResponses: number
    }

    expect(timedToolRow.event._id).toBe("evt-1")
    expect(timedToolRow.numResponses).toBe(0)

    const daysOnlyWrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          daysOnly: true,
        },
      },
      global: {
        stubs: {
          ScheduleOverlapDaysOnlyGrid: {
            name: "ScheduleOverlapDaysOnlyGrid",
            props: {
              toolRow: {
                type: Object,
                required: true,
              },
            },
            template: "<div />",
          },
        },
      },
    })

    const daysOnlyToolRow = daysOnlyWrapper.findComponent({
      name: "ScheduleOverlapDaysOnlyGrid",
    }).props("toolRow") as {
      event: { daysOnly?: boolean }
      numResponses: number
    }

    expect(daysOnlyToolRow.event.daysOnly).toBe(true)
    expect(daysOnlyToolRow.numResponses).toBe(0)
  })
})
