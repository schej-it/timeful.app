// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { Temporal } from "temporal-polyfill"
import { timeTypes } from "@/constants"
import {
  buildScheduleOverlapProps,
  installScheduleOverlapTestGlobals,
  mountScheduleOverlap,
} from "./scheduleOverlapTestUtils"
import { formatTooltipContent } from "./scheduleOverlapRendering"

const smAndDown = { value: false }
const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO("UTC")
const { refreshAuthUserMock, showInfoMock, showErrorMock } = vi.hoisted(() => ({
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
    refreshAuthUserMock.mockReset()
    showInfoMock.mockReset()
    showErrorMock.mockReset()
    installScheduleOverlapTestGlobals()
  })

  it("renders overnight split calendar events without comparing Temporal.Duration via valueOf", () => {
    expect(() => mountScheduleOverlap()).not.toThrow()
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

  it("updates curGuestId when renaming the selected guest", async () => {
    const wrapper = mountScheduleOverlap({
      props: {
        curGuestId: "guest-1",
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

    expect(vm.tooltipContent).toBe(
      formatTooltipContent({
        date: vm.getDisplayDateFromRowCol(1, 0)!,
        curTimezone: vm.curTimezone,
        timeslotDuration: Temporal.Duration.from({ hours: 1 }),
        timeType: vm.timeType,
        isSpecificDates: true,
      })
    )
  })

  it("collapses hidden hours by default and expands them on demand", async () => {
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
            zdt("2026-01-01T09:00:00Z"),
            zdt("2026-01-01T12:00:00Z"),
            zdt("2026-01-02T17:00:00Z"),
            zdt("2026-01-02T20:00:00Z"),
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
      renderedRows: { id: string; kind: "timeslot" | "collapsed" | "filler" }[]
      splitTimes: { absoluteMinutes?: number; text?: string }[][]
      showAllHours: boolean
      toggleCollapsedSpan: (id: string) => void
      updateShowAllHours: (value: boolean) => void
    }

    expect(vm.showAllHours).toBe(false)

    const initialCollapsedRows = vm.renderedRows.filter((row) => row.kind === "collapsed")
    const initialTimeslotCount = vm.renderedRows.filter((row) => row.kind === "timeslot").length

    expect(initialCollapsedRows.length).toBeGreaterThan(0)

    vm.toggleCollapsedSpan(initialCollapsedRows[0].id)
    await nextTick()

    expect(vm.renderedRows.some((row) => row.id === initialCollapsedRows[0].id)).toBe(false)
    expect(vm.renderedRows.filter((row) => row.kind === "timeslot").length).toBeGreaterThan(
      initialTimeslotCount
    )

    vm.updateShowAllHours(true)
    await nextTick()

    expect(vm.showAllHours).toBe(true)
    expect(vm.renderedRows.some((row) => row.kind === "collapsed")).toBe(false)
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

  it("does not collapse leading or trailing grey hours, and keeps rows visible when any page day allows them", () => {
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
      renderedRows: { kind: "timeslot" | "collapsed" | "filler"; startLabel?: string; endLabel?: string }[]
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
      renderedRows: { kind: "timeslot" | "collapsed" | "filler"; startLabel?: string; endLabel?: string }[]
    }

    expect(vm.renderedRows.filter((row) => row.kind === "collapsed")).toEqual([
      expect.objectContaining({
        startLabel: "11:00",
        endLabel: "15:00",
      }),
    ])
  })

  it("does not collapse edge grey runs for discontiguous daily specific times", () => {
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
          duration: Temporal.Duration.from({ hours: 12 }),
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
      renderedRows: { kind: "timeslot" | "collapsed" | "filler" }[]
    }

    expect(vm.renderedRows.filter((row) => row.kind === "collapsed")).toEqual([])
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
      renderedRows: { kind: "timeslot" | "collapsed" | "filler"; startLabel?: string; endLabel?: string }[]
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
      renderedRows: { kind: "timeslot" | "collapsed" | "filler"; startLabel?: string; endLabel?: string }[]
    }

    const collapsedRows = vm.renderedRows.filter((row) => row.kind === "collapsed")

    expect(collapsedRows).toHaveLength(1)
    expect(collapsedRows[0]).toMatchObject({
      startLabel: "11:00",
      endLabel: "18:00",
    })
  })
})
