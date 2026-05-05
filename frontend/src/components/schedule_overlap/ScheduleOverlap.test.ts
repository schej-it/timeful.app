// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import {
  buildScheduleOverlapProps,
  installScheduleOverlapTestGlobals,
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
    installScheduleOverlapTestGlobals()
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

  it("passes cohesive timed and days-only grid view models to grid boundaries", () => {
    const timedWrapper = mountScheduleOverlap({
      global: {
        stubs: {
          ScheduleOverlapTimeGrid: {
            name: "ScheduleOverlapTimeGrid",
            props: {
              timedGrid: {
                type: Object,
                required: true,
              },
            },
            template: "<div />",
          },
        },
      },
    })

    const timedGrid = timedWrapper.findComponent({ name: "ScheduleOverlapTimeGrid" })
      .props("timedGrid") as {
      event: { _id?: string }
      actions: { nextPage: () => void; signUpForBlock: (block: { _id: string }) => void }
      toolRow: {
        numResponses: number
        actions: { updateWeekOffset: (value: number) => void }
      }
    }

    expect(timedGrid.event._id).toBe("evt-1")
    expect(typeof timedGrid.actions.nextPage).toBe("function")
    expect(typeof timedGrid.actions.signUpForBlock).toBe("function")
    expect(timedGrid.toolRow.numResponses).toBe(0)
    expect(typeof timedGrid.toolRow.actions.updateWeekOffset).toBe("function")

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
              daysOnlyGrid: {
                type: Object,
                required: true,
              },
            },
            template: "<div />",
          },
        },
      },
    })

    const daysOnlyGrid = daysOnlyWrapper.findComponent({
      name: "ScheduleOverlapDaysOnlyGrid",
    }).props("daysOnlyGrid") as {
      event: { daysOnly?: boolean }
      actions: { prevPage: () => void; closeHint: () => void }
      toolRow: {
        numResponses: number
        actions: { toggleShowEventOptions: () => void }
      }
    }

    expect(daysOnlyGrid.event.daysOnly).toBe(true)
    expect(typeof daysOnlyGrid.actions.prevPage).toBe("function")
    expect(typeof daysOnlyGrid.actions.closeHint).toBe("function")
    expect(daysOnlyGrid.toolRow.numResponses).toBe(0)
    expect(typeof daysOnlyGrid.toolRow.actions.toggleShowEventOptions).toBe("function")
  })

  it("keeps grouped sidebar and mobile overlay listeners wired to local state and parent emits", async () => {
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
            template: `
              <div>
                <button class="sidebar-name" @click="$emit('update:new-guest-name', 'Renamed guest')" />
                <button class="sidebar-best-times" @click="$emit('update:show-best-times', true)" />
                <button class="sidebar-add-availability" @click="$emit('add-availability')" />
              </div>
            `,
          },
          ScheduleOverlapMobileOverlay: {
            name: "ScheduleOverlapMobileOverlay",
            props: {
              overlay: {
                type: Object,
                required: true,
              },
            },
            template: `
              <div>
                <button class="overlay-type" @click="$emit('update:availability-type', 'ifNeeded')" />
                <button class="overlay-week-offset" @click="$emit('update:week-offset', 2)" />
                <button class="overlay-add-guest" @click="$emit('add-availability-as-guest')" />
              </div>
            `,
          },
        },
      },
    })

    await wrapper.get(".sidebar-name").trigger("click")
    await wrapper.get(".sidebar-best-times").trigger("click")
    await wrapper.get(".overlay-type").trigger("click")
    await nextTick()

    const sidebarViewModel = wrapper.findComponent({ name: "ScheduleOverlapSidebar" })
      .props("sidebar") as {
      newGuestName: string
      respondentsPanel: { showBestTimes: boolean }
    }
    const overlayViewModel = wrapper.findComponent({
      name: "ScheduleOverlapMobileOverlay",
    }).props("overlay") as {
      availabilityType: string
    }

    expect(sidebarViewModel.newGuestName).toBe("Renamed guest")
    expect(sidebarViewModel.respondentsPanel.showBestTimes).toBe(true)
    expect(overlayViewModel.availabilityType).toBe("ifNeeded")

    await wrapper.get(".sidebar-add-availability").trigger("click")
    await wrapper.get(".overlay-week-offset").trigger("click")
    await wrapper.get(".overlay-add-guest").trigger("click")

    expect(wrapper.emitted("addAvailability")).toEqual([[]])
    expect(wrapper.emitted("update:weekOffset")).toEqual([[2]])
    expect(wrapper.emitted("addAvailabilityAsGuest")).toEqual([[]])
  })
})
