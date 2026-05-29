// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { mount } from "@vue/test-utils"
import { Temporal } from "temporal-polyfill"
import type { timeTypes } from "@/constants"
import type * as UtilsModule from "@/utils"
import {
  buildScheduleOverlapProps,
  installScheduleOverlapTestGlobals,
  mountScheduleOverlap,
  scheduleOverlapGlobalStubs,
} from "./scheduleOverlapTestUtils"
import { formatTooltipContent } from "./scheduleOverlapRendering"
import ScheduleOverlap from "./ScheduleOverlap.vue"

const smAndDown = { value: false }
const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO("UTC")
const { putMock, refreshAuthUserMock, showInfoMock, showErrorMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  refreshAuthUserMock: vi.fn(),
  showInfoMock: vi.fn(),
  showErrorMock: vi.fn(),
}))
const utcTimezone = {
  value: "UTC",
  offset: Temporal.Duration.from({ hours: 0 }),
  label: "UTC",
  gmtString: "GMT+0",
}
const buildUtcSpecificTimes = (date: string, times: string[]) =>
  times.map((time) => zdt(`${date}T${time}Z`))

vi.mock("vuetify", () => ({
  useDisplay: () => ({
    smAndDown,
  }),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")
  return {
    ...actual,
    put: putMock,
  }
})

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: null,
    refreshAuthUser: refreshAuthUserMock,
    showInfo: showInfoMock,
    showError: showErrorMock,
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
    putMock.mockReset()
    putMock.mockResolvedValue(undefined)
    refreshAuthUserMock.mockReset()
    showInfoMock.mockReset()
    showErrorMock.mockReset()
    installScheduleOverlapTestGlobals()
  })

  it("renders overnight split calendar events without comparing Temporal.Duration via valueOf", () => {
    expect(() => mountScheduleOverlap()).not.toThrow()
  })

  it("maps a rendered specific-times drag to the exact UTC quarter-hour instants", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {
          return undefined
        }

        disconnect() {
          return undefined
        }
      }
    )
    vi.stubGlobal("scrollTo", vi.fn())

    const wrapper = mount(ScheduleOverlap, {
      props: {
        ...buildScheduleOverlapProps(),
        fromEditEvent: true,
        initialTimezone: utcTimezone,
        event: {
          ...buildScheduleOverlapProps().event,
          name: "Specific times drag mapping",
          dates: [
            Temporal.PlainDate.from("2026-05-29"),
            Temporal.PlainDate.from("2026-05-30"),
          ],
          timeSeed: zdt("2026-05-29T00:00:00Z"),
          startTime: Temporal.PlainTime.from("00:00"),
          duration: Temporal.Duration.from({ hours: 24 }),
          hasSpecificTimes: true,
          timeIncrement: Temporal.Duration.from({ minutes: 15 }),
          times: [],
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          ScheduleOverlapSidebar: true,
          ScheduleOverlapMobileOverlay: true,
        },
      },
    })

    await nextTick()
    await nextTick()

    const startCell = wrapper.get('[data-row="0"][data-col="0"]')
    const endCell = wrapper.get('[data-row="15"][data-col="1"]')

    await startCell.trigger("mousedown", { clientX: 5, clientY: 5 })
    await endCell.trigger("mousemove", { clientX: 10, clientY: 10 })
    await endCell.trigger("mouseup", { clientX: 10, clientY: 10 })

    const vm = wrapper.vm as unknown as {
      tempTimes: Set<Temporal.ZonedDateTime>
    }

    expect(
      [...vm.tempTimes]
        .sort((a, b) => Temporal.ZonedDateTime.compare(a, b))
        .map((time) => time.toString())
    ).toEqual(
      ["2026-05-29", "2026-05-30"].flatMap((date) =>
        [
          "00:00:00",
          "00:15:00",
          "00:30:00",
          "00:45:00",
          "01:00:00",
          "01:15:00",
          "01:30:00",
          "01:45:00",
          "02:00:00",
          "02:15:00",
          "02:30:00",
          "02:45:00",
          "03:00:00",
          "03:15:00",
          "03:30:00",
          "03:45:00",
        ].map((time) => `${date}T${time}+00:00[UTC]`)
      )
    )
  })

  it("renders the saved specific-times window immediately after saving a new event selection", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {
          return undefined
        }

        disconnect() {
          return undefined
        }
      }
    )
    vi.stubGlobal("scrollTo", vi.fn())

    const wrapper = mount(ScheduleOverlap, {
      props: {
        ...buildScheduleOverlapProps(),
        fromEditEvent: true,
        initialTimezone: utcTimezone,
        event: {
          ...buildScheduleOverlapProps().event,
          name: "Immediate saved specific times",
          dates: [
            Temporal.PlainDate.from("2026-05-29"),
            Temporal.PlainDate.from("2026-05-30"),
          ],
          timeSeed: zdt("2026-05-29T00:00:00Z"),
          startTime: Temporal.PlainTime.from("00:00"),
          duration: Temporal.Duration.from({ hours: 24 }),
          hasSpecificTimes: true,
          timeIncrement: Temporal.Duration.from({ minutes: 15 }),
          times: [],
        },
      },
      global: {
        stubs: {
          ...scheduleOverlapGlobalStubs,
          ScheduleOverlapSidebar: true,
          ScheduleOverlapMobileOverlay: true,
        },
      },
    })

    await nextTick()
    await nextTick()

    const startCell = wrapper.get('[data-row="0"][data-col="0"]')
    const endCell = wrapper.get('[data-row="15"][data-col="1"]')

    await startCell.trigger("mousedown", { clientX: 5, clientY: 5 })
    await endCell.trigger("mousemove", { clientX: 10, clientY: 10 })
    await endCell.trigger("mouseup", { clientX: 10, clientY: 10 })

    const vm = wrapper.vm as unknown as {
      saveTempTimes: () => void
      days: { dateObject: Temporal.ZonedDateTime }[]
      splitTimes: { text?: string; displayedMinutes?: number }[][]
      eventRef: { times?: Temporal.ZonedDateTime[]; startTime?: Temporal.PlainTime; endTime?: Temporal.PlainTime }
      renderedRows: { kind: "timeslot" | "collapsed" | "filler" | "split-gap"; startLabel?: string; endLabel?: string }[]
    }

    vm.saveTempTimes()
    await Promise.resolve()
    await nextTick()
    await nextTick()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      dates: ["2026-05-29T00:00:00Z", "2026-05-30T00:00:00Z"],
      duration: 4,
      times: [
        "2026-05-29T00:00:00Z",
        "2026-05-29T00:15:00Z",
        "2026-05-29T00:30:00Z",
        "2026-05-29T00:45:00Z",
        "2026-05-29T01:00:00Z",
        "2026-05-29T01:15:00Z",
        "2026-05-29T01:30:00Z",
        "2026-05-29T01:45:00Z",
        "2026-05-29T02:00:00Z",
        "2026-05-29T02:15:00Z",
        "2026-05-29T02:30:00Z",
        "2026-05-29T02:45:00Z",
        "2026-05-29T03:00:00Z",
        "2026-05-29T03:15:00Z",
        "2026-05-29T03:30:00Z",
        "2026-05-29T03:45:00Z",
        "2026-05-30T00:00:00Z",
        "2026-05-30T00:15:00Z",
        "2026-05-30T00:30:00Z",
        "2026-05-30T00:45:00Z",
        "2026-05-30T01:00:00Z",
        "2026-05-30T01:15:00Z",
        "2026-05-30T01:30:00Z",
        "2026-05-30T01:45:00Z",
        "2026-05-30T02:00:00Z",
        "2026-05-30T02:15:00Z",
        "2026-05-30T02:30:00Z",
        "2026-05-30T02:45:00Z",
        "2026-05-30T03:00:00Z",
        "2026-05-30T03:15:00Z",
        "2026-05-30T03:30:00Z",
        "2026-05-30T03:45:00Z",
      ],
    })
    expect(vm.eventRef.times?.map((time) => time.toString())).toEqual(
      ["2026-05-29", "2026-05-30"].flatMap((date) =>
        [
          "00:00:00",
          "00:15:00",
          "00:30:00",
          "00:45:00",
          "01:00:00",
          "01:15:00",
          "01:30:00",
          "01:45:00",
          "02:00:00",
          "02:15:00",
          "02:30:00",
          "02:45:00",
          "03:00:00",
          "03:15:00",
          "03:30:00",
          "03:45:00",
        ].map((time) => `${date}T${time}+00:00[UTC]`)
      )
    )
    expect(vm.eventRef.startTime?.toString()).toBe("00:00:00")
    expect(vm.eventRef.endTime?.toString()).toBe("04:00:00")
    expect(
      vm.days.map((day) => day.dateObject.withTimeZone("UTC").toPlainDate().toString())
    ).toEqual(["2026-05-29", "2026-05-30"])
    expect(vm.splitTimes[0].map((time) => time.text).filter(Boolean)).toEqual([
      "12 am",
      "1 am",
      "2 am",
      "3 am",
    ])
    expect(vm.splitTimes[0].map((time) => time.displayedMinutes)).toEqual([
      0,
      15,
      30,
      45,
      60,
      75,
      90,
      105,
      120,
      135,
      150,
      165,
      180,
      195,
      210,
      225,
    ])
    expect(
      vm.renderedRows.filter((row) => row.kind === "collapsed")
    ).toEqual([])
  })

  it("uses the saved timezone when initialTimezone is missing", () => {
    localStorage.setItem("timezone", JSON.stringify({ value: "America/Los_Angeles" }))

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
        },
      },
    })

    const sidebarViewModel = wrapper.findComponent({ name: "ScheduleOverlapSidebar" })
      .props("sidebar") as {
      curTimezone: {
        value: string
        label: string
        gmtString: string
        offset: { total: (unit: string) => number }
      }
    }

    expect(sidebarViewModel.curTimezone.value).toBe("America/Los_Angeles")
    expect(sidebarViewModel.curTimezone.label).toBe("Pacific Time")
    expect(sidebarViewModel.curTimezone.gmtString).toBe("(GMT-8:00)")
    expect(sidebarViewModel.curTimezone.offset.total("minutes")).toBe(-480)
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

  it("keeps the explicit guest edit target in the respondents panel view model", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        curGuestId: "guest-1",
      },
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
        },
      },
    })

    const sidebarViewModel = wrapper.findComponent({ name: "ScheduleOverlapSidebar" })
      .props("sidebar") as {
      respondentsPanel: { curGuestId: string }
    }

    expect(sidebarViewModel.respondentsPanel.curGuestId).toBe("guest-1")
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
        actions: { updateShowBestTimes: (value: boolean) => void }
      }
    }

    expect(daysOnlyGrid.event.daysOnly).toBe(true)
    expect(typeof daysOnlyGrid.actions.prevPage).toBe("function")
    expect(typeof daysOnlyGrid.actions.closeHint).toBe("function")
    expect(daysOnlyGrid.toolRow.numResponses).toBe(0)
    expect(typeof daysOnlyGrid.toolRow.actions.updateShowBestTimes).toBe("function")
  })

  it("clears curGuestId when the selected guest is deleted from the respondents panel", async () => {
    const wrapper = mountScheduleOverlap({
      props: {
        curGuestId: "guest-1",
      },
      global: {
        stubs: {
          ScheduleOverlapSidebar: {
            name: "ScheduleOverlapSidebar",
            emits: ["guestAvailabilityDeleted"],
            template:
              "<button class=\"delete-selected-guest\" @click=\"$emit('guestAvailabilityDeleted', 'guest-1')\" />",
          },
        },
      },
    })

    await wrapper.get(".delete-selected-guest").trigger("click")

    expect(wrapper.emitted("setCurGuestId")).toEqual([[""]])
  })

  it("leaves curGuestId unchanged when a different guest is deleted", async () => {
    const wrapper = mountScheduleOverlap({
      props: {
        curGuestId: "guest-1",
      },
      global: {
        stubs: {
          ScheduleOverlapSidebar: {
            name: "ScheduleOverlapSidebar",
            emits: ["guestAvailabilityDeleted"],
            template:
              "<button class=\"delete-other-guest\" @click=\"$emit('guestAvailabilityDeleted', 'guest-2')\" />",
          },
        },
      },
    })

    await wrapper.get(".delete-other-guest").trigger("click")

    expect(wrapper.emitted("setCurGuestId")).toBeUndefined()
  })

  it("keeps curGuestId on the token guest id when renaming the selected guest", async () => {
    localStorage.setItem(
      "evt-1.guestOwnership",
      JSON.stringify({
        name: "guest-1",
        guestId: "guest-token-id",
        guestEditToken: "edit-token",
        guestEditPolicy: "protected",
        guestOwnershipMode: "token",
      })
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                guestCredentials: {
                  guestId: "guest-token-id",
                  guestEditToken: "edit-token-2",
                  guestEditPolicy: "protected",
                  guestOwnershipMode: "token",
                },
              })
            ),
        })
      )
    )

    const wrapper = mountScheduleOverlap({
      props: {
        curGuestId: "guest-token-id",
        event: {
          ...buildScheduleOverlapProps().event,
          responses: {
            "guest-token-id": {
              name: "guest-1",
              guest: true,
              guestId: "guest-token-id",
              guestEditPolicy: "protected",
              guestOwnershipMode: "token",
              user: {
                _id: "guest-token-id",
                firstName: "guest-1",
                lastName: "",
                email: "",
              },
              availability: [],
              ifNeeded: [],
              manualAvailability: {},
            },
          },
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      newGuestName: string
      saveGuestName: () => Promise<void>
      canEditGuestName: boolean
    }

    expect(vm.canEditGuestName).toBe(true)

    vm.newGuestName = "guest-2"
    await vm.saveGuestName()
    const selectedGuestKey = wrapper.emitted("setCurGuestId")?.[0]?.[0] as string

    expect(selectedGuestKey).toBe("guest-token-id")

    await wrapper.setProps({
      curGuestId: selectedGuestKey,
    })

    expect(vm.canEditGuestName).toBe(true)
  })

  it("updates curGuestId to the renamed guest name for legacy guests", async () => {
    localStorage.setItem(
      "evt-1.guestOwnership",
      JSON.stringify({
        name: "guest-1",
        guestOwnershipMode: "legacy",
      })
    )

    const wrapper = mountScheduleOverlap({
      props: {
        curGuestId: "guest-1",
        event: {
          ...buildScheduleOverlapProps().event,
          responses: {
            "guest-1": {
              name: "guest-1",
              guest: true,
              guestOwnershipMode: "legacy",
              user: {
                _id: "guest-1",
                firstName: "guest-1",
                lastName: "",
                email: "",
              },
              availability: [],
              ifNeeded: [],
              manualAvailability: {},
            },
          },
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      newGuestName: string
      saveGuestName: () => Promise<void>
    }

    vm.newGuestName = "guest-2"
    await vm.saveGuestName()

    expect(wrapper.emitted("setCurGuestId")).toEqual([["guest-2"]])
  })

  it("keeps respondents in the sidebar view model for specific-date events", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          responses: {
            khh: {
              user: {
                _id: "000000000000000000000000",
                firstName: "khh",
                lastName: "",
                email: "",
              },
              availability: [],
              ifNeeded: [],
              manualAvailability: {},
            },
          },
        },
      },
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
        },
      },
    })

    const sidebarViewModel = wrapper.findComponent({ name: "ScheduleOverlapSidebar" })
      .props("sidebar") as {
      respondentsPanel: {
        respondents: { _id?: string; firstName?: string }[]
      }
    }

    expect(sidebarViewModel.respondentsPanel.respondents).toEqual([
      expect.objectContaining({
        _id: "khh",
        firstName: "khh",
      }),
    ])
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
                <button class="sidebar-name" @click="$emit('update:newGuestName', 'Renamed guest')" />
                <button class="sidebar-best-times" @click="$emit('update:showBestTimes', true)" />
                <button class="sidebar-add-availability" @click="$emit('addAvailability')" />
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
                <button class="overlay-type" @click="$emit('update:availabilityType', 'ifNeeded')" />
                <button class="overlay-week-offset" @click="$emit('update:weekOffset', 2)" />
                <button class="overlay-add-guest" @click="$emit('addAvailabilityAsGuest')" />
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

  it("keeps non-editing hover following the cursor after a click", async () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          responses: {
            khh: {
              user: {
                _id: "000000000000000000000000",
                firstName: "khh",
                lastName: "",
                email: "",
              },
              availability: [],
              ifNeeded: [],
              manualAvailability: {},
            },
          },
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      curTimeslot: { row: number; col: number }
      timeslotSelected: boolean
      getTimeslotVon: (row: number, col: number) => Record<string, () => void>
    }

    vm.getTimeslotVon(0, 0).click()
    vm.getTimeslotVon(1, 0).mouseover()
    await nextTick()

    expect(vm.timeslotSelected).toBe(false)
    expect(vm.curTimeslot).toEqual({ row: 1, col: 0 })
  })

  it("shows tooltip text for grey specific-time gaps after save", async () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [Temporal.PlainDate.from("2026-01-01")],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("09:00"),
          duration: Temporal.Duration.from({ hours: 3 }),
          timeIncrement: Temporal.Duration.from({ hours: 1 }),
          times: [
            zdt("2026-01-01T09:00:00Z"),
            zdt("2026-01-01T11:00:00Z"),
          ],
        },
        initialTimezone: utcTimezone,
      },
    })

    const vm = wrapper.vm as unknown as {
      curTimezone: typeof utcTimezone
      timeType: (typeof timeTypes)[keyof typeof timeTypes]
      tooltipContent: string
      getDisplayDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null
      getTimeslotVon: (row: number, col: number) => Record<string, () => void>
    }

    vm.getTimeslotVon(1, 0).mouseover()
    await nextTick()
    const tooltipDate = vm.getDisplayDateFromRowCol(1, 0)

    expect(tooltipDate).not.toBeNull()
    if (tooltipDate == null) {
      throw new Error("Expected a tooltip date for the grey specific-time gap")
    }

    expect(vm.tooltipContent).toBe(
      formatTooltipContent({
        date: tooltipDate,
        curTimezone: vm.curTimezone,
        timeslotDuration: Temporal.Duration.from({ hours: 1 }),
        timeType: vm.timeType,
        isSpecificDates: true,
      })
    )
  })

  it("trims hidden edge hours by default and restores them when showing all hours", async () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [
            Temporal.PlainDate.from("2026-01-01"),
            Temporal.PlainDate.from("2026-01-02"),
          ],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("09:00"),
          duration: Temporal.Duration.from({ hours: 11 }),
          times: [
            ...buildUtcSpecificTimes("2026-01-01", [
              "09:00:00",
              "10:00:00",
              "11:00:00",
              "12:00:00",
              "13:00:00",
              "14:00:00",
              "15:00:00",
              "16:00:00",
              "17:00:00",
              "18:00:00",
              "19:00:00",
              "20:00:00",
            ]),
            ...buildUtcSpecificTimes("2026-01-02", [
              "09:00:00",
              "10:00:00",
              "11:00:00",
              "12:00:00",
              "13:00:00",
              "14:00:00",
              "15:00:00",
              "16:00:00",
              "17:00:00",
              "18:00:00",
              "19:00:00",
              "20:00:00",
            ]),
          ],
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: {
          value: "UTC",
          offset: Temporal.Duration.from({ hours: 0 }),
          label: "UTC",
          gmtString: "GMT+0",
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: {
        id: string
        kind: "timeslot" | "collapsed" | "filler" | "split-gap"
        timeText?: string
      }[]
      splitTimes: { absoluteMinutes?: number; text?: string }[][]
      showAllHours: boolean
      updateShowAllHours: (value: boolean) => void
    }

    expect(vm.showAllHours).toBe(false)

    const initialTimeslotRows = vm.renderedRows.filter((row) => row.kind === "timeslot")
    expect(vm.renderedRows.some((row) => row.kind === "collapsed")).toBe(false)
    expect(initialTimeslotRows.length).toBeLessThan(vm.splitTimes.flat().length)
    expect(initialTimeslotRows[0]?.timeText).toBe("9 am")
    expect(initialTimeslotRows.at(-1)?.timeText).toBe("8 pm")

    vm.updateShowAllHours(true)
    await nextTick()

    expect(vm.showAllHours).toBe(true)
    expect(vm.renderedRows.some((row) => row.kind === "collapsed")).toBe(false)
    const expandedTimeslotRows = vm.renderedRows.filter((row) => row.kind === "timeslot")
    expect(expandedTimeslotRows).toHaveLength(vm.splitTimes.flat().length)
    expect(expandedTimeslotRows.length).toBeGreaterThan(initialTimeslotRows.length)
  })

  it("animates loaded availability when editing an existing respondent", async () => {
    vi.useFakeTimers()

    try {
      localStorage.setItem("evt-1.guestName", "Mag")

      const wrapper = mountScheduleOverlap({
        props: {
          event: {
            ...buildScheduleOverlapProps().event,
            dates: [
              Temporal.PlainDate.from("2026-01-01"),
              Temporal.PlainDate.from("2026-01-02"),
            ],
            timeSeed: zdt("2026-01-01T09:00:00Z"),
            startTime: Temporal.PlainTime.from("09:00"),
            duration: Temporal.Duration.from({ hours: 4 }),
            timeIncrement: Temporal.Duration.from({ hours: 1 }),
            responses: {
              Mag: {
                name: "Mag",
                user: {
                  _id: "Mag",
                  firstName: "Mag",
                  lastName: "",
                  email: "",
                },
                availability: [],
                ifNeeded: [],
                manualAvailability: {},
              },
            },
          },
          initialTimezone: utcTimezone,
        },
      })

      const vm = wrapper.vm as unknown as {
        fetchedResponses: Record<string, { availability?: Temporal.ZonedDateTime[]; ifNeeded?: Temporal.ZonedDateTime[] }>
        editGuestAvailability: (id: string) => void
        availabilityAnimEnabled: boolean
        availability: { size: number }
      }

      vm.fetchedResponses = {
        Mag: {
          availability: [
            zdt("2026-01-01T09:00:00Z"),
            zdt("2026-01-01T10:00:00Z"),
          ],
          ifNeeded: [],
        },
      }

      vm.editGuestAvailability("Mag")
      await nextTick()

      expect(vm.availabilityAnimEnabled).toBe(false)
      expect(vm.availability.size).toBe(2)
      expect(showInfoMock).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps rows visible when any page day allows them, even if the same edge hours are grey on other days", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [
            Temporal.PlainDate.from("2026-01-01"),
            Temporal.PlainDate.from("2026-01-02"),
          ],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("09:00"),
          duration: Temporal.Duration.from({ hours: 14 }),
          timeIncrement: Temporal.Duration.from({ hours: 1 }),
          times: [
            ...buildUtcSpecificTimes("2026-01-01", [
              "13:00:00",
              "14:00:00",
              "15:00:00",
              "16:00:00",
              "17:00:00",
              "18:00:00",
              "19:00:00",
            ]),
            ...buildUtcSpecificTimes("2026-01-02", [
              "11:00:00",
              "12:00:00",
              "13:00:00",
              "14:00:00",
              "15:00:00",
              "16:00:00",
              "17:00:00",
              "18:00:00",
              "19:00:00",
              "20:00:00",
              "21:00:00",
              "22:00:00",
            ]),
          ],
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: utcTimezone,
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: { kind: "timeslot" | "collapsed" | "filler" | "split-gap"; startLabel?: string; endLabel?: string }[]
    }

    expect(vm.renderedRows.filter((row) => row.kind === "collapsed")).toEqual([])
  })

  it("collapses interior gaps between discontiguous daily specific-time ranges", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [
            Temporal.PlainDate.from("2026-01-01"),
            Temporal.PlainDate.from("2026-01-02"),
          ],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("09:00"),
          duration: Temporal.Duration.from({ hours: 8 }),
          timeIncrement: Temporal.Duration.from({ hours: 1 }),
          times: [
            ...buildUtcSpecificTimes("2026-01-01", [
              "09:00:00",
              "10:00:00",
              "15:00:00",
              "16:00:00",
            ]),
            ...buildUtcSpecificTimes("2026-01-02", [
              "09:00:00",
              "10:00:00",
              "15:00:00",
              "16:00:00",
            ]),
          ],
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: utcTimezone,
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: { kind: "timeslot" | "collapsed" | "filler" | "split-gap"; startLabel?: string; endLabel?: string }[]
    }

    expect(vm.renderedRows.filter((row) => row.kind === "collapsed")).toEqual([
      expect.objectContaining({
        startLabel: "11:00",
        endLabel: "15:00",
      }),
    ])
  })

  it("does not add leading or trailing collapsed bands outside the saved specific-times window", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [
            Temporal.PlainDate.from("2026-01-01"),
            Temporal.PlainDate.from("2026-01-02"),
          ],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("09:00"),
          duration: Temporal.Duration.from({ hours: 13 }),
          timeIncrement: Temporal.Duration.from({ hours: 1 }),
          times: [
            ...buildUtcSpecificTimes("2026-01-01", [
              "14:00:00",
              "15:00:00",
              "16:00:00",
              "17:00:00",
            ]),
            ...buildUtcSpecificTimes("2026-01-02", [
              "14:00:00",
              "15:00:00",
              "16:00:00",
              "17:00:00",
            ]),
          ],
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: utcTimezone,
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: {
        kind: "timeslot" | "collapsed" | "filler" | "split-gap"
        startLabel?: string
        endLabel?: string
        timeText?: string
      }[]
    }

    expect(vm.renderedRows.filter((row) => row.kind === "collapsed")).toEqual([])
    const timeslotRows = vm.renderedRows.filter((row) => row.kind === "timeslot")
    expect(timeslotRows[0]?.timeText).toBe("2 pm")
    expect(timeslotRows.at(-1)?.timeText).toBe("5 pm")
  })

  it("keeps a row expanded when any visible day allows that exact specific-time slot", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [
            Temporal.PlainDate.from("2026-01-01"),
            Temporal.PlainDate.from("2026-01-02"),
          ],
          timeSeed: zdt("2026-01-01T09:00:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("09:00"),
          duration: Temporal.Duration.from({ hours: 9 }),
          timeIncrement: Temporal.Duration.from({ hours: 1 }),
          times: [
            ...buildUtcSpecificTimes("2026-01-01", [
              "09:00:00",
              "10:00:00",
              "16:00:00",
              "17:00:00",
            ]),
            ...buildUtcSpecificTimes("2026-01-02", [
              "09:00:00",
              "10:00:00",
              "13:00:00",
              "16:00:00",
              "17:00:00",
            ]),
          ],
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: utcTimezone,
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: { kind: "timeslot" | "collapsed" | "filler" | "split-gap"; startLabel?: string; endLabel?: string }[]
    }

    expect(vm.renderedRows.filter((row) => row.kind === "collapsed")).toEqual([])
  })

  it("collapses only whole interior hours for schedule-grey runs with partial-hour boundaries", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [
            Temporal.PlainDate.from("2026-01-01"),
            Temporal.PlainDate.from("2026-01-02"),
          ],
          timeSeed: zdt("2026-01-01T08:15:00Z"),
          hasSpecificTimes: true,
          startTime: Temporal.PlainTime.from("08:15"),
          duration: Temporal.Duration.from({ hours: 12 }),
          times: [
            zdt("2026-01-01T08:15:00Z"),
            zdt("2026-01-01T10:15:00Z"),
            zdt("2026-01-02T18:45:00Z"),
            zdt("2026-01-02T20:15:00Z"),
          ],
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: utcTimezone,
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: { kind: "timeslot" | "collapsed" | "filler" | "split-gap"; startLabel?: string; endLabel?: string }[]
    }

    const collapsedRows = vm.renderedRows.filter((row) => row.kind === "collapsed")

    expect(collapsedRows).toEqual([
      expect.objectContaining({
        startLabel: "11:00",
        endLabel: "18:00",
      }),
    ])
  })

  it("inserts a structural split gap between wrapped UTC+3:30 midnight rows", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [Temporal.PlainDate.from("2026-01-01"), Temporal.PlainDate.from("2026-01-02")],
          timeSeed: zdt("2026-01-01T19:30:00Z"),
          startTime: Temporal.PlainTime.from("19:30"),
          duration: Temporal.Duration.from({ hours: 8 }),
          timeIncrement: Temporal.Duration.from({ minutes: 30 }),
          hasSpecificTimes: false,
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: {
          value: "+03:30",
          offset: Temporal.Duration.from({ minutes: -210 }),
          label: "UTC+3:30",
          gmtString: "GMT+3:30",
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: {
        kind: "timeslot" | "collapsed" | "filler" | "split-gap"
        timeText?: string
        height: number
      }[]
      splitTimes: { text?: string }[][]
      days: { dateObject: Temporal.ZonedDateTime }[]
      getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null
    }

    const splitGapIndex = vm.renderedRows.findIndex((row) => row.kind === "split-gap")
    const hourLabels = vm.renderedRows
      .map((row) => row.timeText)
      .filter((label): label is string => Boolean(label))

    expect(splitGapIndex).toBe(vm.splitTimes[0].length)
    expect(vm.renderedRows[splitGapIndex - 1]?.timeText).toBeUndefined()
    expect(vm.renderedRows[splitGapIndex + 1]?.timeText).toBe("11 pm")
    expect(vm.renderedRows[0]?.timeText).toBe("12 am")
    expect(vm.renderedRows[splitGapIndex]).toEqual(
      expect.objectContaining({
        kind: "split-gap",
        height: 40,
      })
    )
    expect(vm.renderedRows[splitGapIndex - 1]?.kind).toBe("timeslot")
    expect(vm.renderedRows[splitGapIndex + 1]?.kind).toBe("timeslot")
    expect(hourLabels.filter((label) => label === "2 am")).toHaveLength(1)

    for (let col = 0; col < vm.days.length; col += 1) {
      const headerDate = vm.days[col]?.dateObject.withTimeZone("+03:30").toPlainDate().toString()
      for (let row = 0; row < vm.splitTimes[0].length + vm.splitTimes[1].length; row += 1) {
        const slot = vm.getDateFromRowCol(row, col)
        if (!slot) continue
        expect(slot.withTimeZone("+03:30").toPlainDate().toString()).toBe(headerDate)
      }
    }
  })

  it("does not render a split gap when wrapped UTC+4:00 local-day ranges only touch", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [Temporal.PlainDate.from("2026-01-01"), Temporal.PlainDate.from("2026-01-02")],
          timeSeed: zdt("2026-01-01T21:00:00Z"),
          startTime: Temporal.PlainTime.from("21:00"),
          duration: Temporal.Duration.from({ hours: 24 }),
          timeIncrement: Temporal.Duration.from({ hours: 1 }),
          hasSpecificTimes: false,
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: {
          value: "+04:00",
          offset: Temporal.Duration.from({ hours: -4 }),
          label: "UTC+4:00",
          gmtString: "GMT+4:00",
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: {
        kind: "timeslot" | "collapsed" | "filler" | "split-gap"
        timeText?: string
      }[]
      splitTimes: { text?: string; displayedMinutes?: number }[][]
    }

    const hourLabels = vm.renderedRows
      .map((row) => row.timeText)
      .filter((label): label is string => Boolean(label))

    expect(vm.renderedRows.some((row) => row.kind === "split-gap")).toBe(false)
    expect(vm.splitTimes[1]).toEqual([])
    expect(hourLabels.slice(0, 4)).toEqual(["12 am", "1 am", "2 am", "3 am"])
    expect(hourLabels.at(-1)).toBe("11 pm")
    expect(hourLabels.filter((label) => label === "12 am")).toHaveLength(1)
    expect(hourLabels.filter((label) => label === "1 am")).toHaveLength(1)
    expect(
      new Set(
        vm.splitTimes[0]
          .map((time) => time.displayedMinutes)
          .filter((minutes): minutes is number => typeof minutes === "number")
      ).size
    ).toBe(vm.splitTimes[0].length)
  })

  it("does not render a split gap or duplicate hour labels when a wrapped Kathmandu window overlaps in displayed local time", () => {
    const wrapper = mountScheduleOverlap({
      props: {
        event: {
          ...buildScheduleOverlapProps().event,
          dates: [Temporal.PlainDate.from("2026-01-01"), Temporal.PlainDate.from("2026-01-02")],
          timeSeed: zdt("2025-12-31T18:30:00Z"),
          startTime: Temporal.PlainTime.from("18:30"),
          duration: Temporal.Duration.from({ hours: 25 }),
          timeIncrement: Temporal.Duration.from({ minutes: 15 }),
          hasSpecificTimes: false,
        },
        alwaysShowCalendarEvents: false,
        sampleCalendarEventsByDay: [],
        initialTimezone: {
          value: "Asia/Kathmandu",
          offset: Temporal.Duration.from({ minutes: -345 }),
          label: "Asia/Kathmandu",
          gmtString: "GMT+5:45",
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      renderedRows: {
        kind: "timeslot" | "collapsed" | "filler" | "split-gap"
        timeText?: string
      }[]
      splitTimes: { text?: string; displayedMinutes?: number }[][]
    }

    const hourLabels = vm.renderedRows
      .map((row) => row.timeText)
      .filter((label): label is string => Boolean(label))

    expect(vm.renderedRows.some((row) => row.kind === "split-gap")).toBe(false)
    expect(vm.splitTimes[1]).toEqual([])
    expect(hourLabels.filter((label) => label === "12 am")).toHaveLength(1)
    expect(hourLabels.filter((label) => label === "1 am")).toHaveLength(1)
    expect(hourLabels.filter((label) => label === "2 am")).toHaveLength(1)
    expect(
      new Set(
        vm.splitTimes[0]
          .map((time) => time.displayedMinutes)
          .filter((minutes): minutes is number => typeof minutes === "number")
      ).size
    ).toBe(vm.splitTimes[0].length)
  })
})
