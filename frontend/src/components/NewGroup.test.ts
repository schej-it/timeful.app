// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  buildEventEditorStubs,
  type ComponentStubMap,
  vSelectStub as VSelectStub,
  vTextFieldStub as VTextFieldStub,
} from "@/test/componentStubs"
import type * as UtilsModule from "@/utils"
import NewGroup from "./NewGroup.vue"
import newGroupSource from "./NewGroup.vue?raw"

const { postMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    post: postMock,
    put: putMock,
  }
})

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown }) => ({
    authUser: store.authUser,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: { value: null },
    showInfo: vi.fn(),
    showError: vi.fn(),
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
    get_distinct_id: vi.fn(() => "distinct-id"),
  },
}))

const formRefMethods = {
  validate: vi.fn<() => Promise<{ valid: boolean }>>(() =>
    Promise.resolve({ valid: true })
  ),
  resetValidation: vi.fn<() => void>(() => undefined),
}

const globalStubs: ComponentStubMap = buildEventEditorStubs(formRefMethods)

describe("NewGroup", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    postMock.mockReset()
    putMock.mockReset()
    postMock.mockResolvedValue({ eventId: "group-created" })
    putMock.mockResolvedValue(undefined)
    formRefMethods.validate.mockClear()
    formRefMethods.resetValidation.mockClear()
  })

  it("preserves minute-level start and end times when editing a group", () => {
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        timezone: JSON.stringify({
          value: "UTC",
          label: "UTC",
          gmtString: "GMT",
          offset: "PT0S",
        }),
      })
    )

    const wrapper = shallowMount(NewGroup, {
      props: {
        edit: true,
        event: {
          _id: "group-1",
          name: "Minute-sensitive group",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.Instant.from("2026-01-02T09:30:00Z").toZonedDateTimeISO(
            "UTC"
          ),
          duration: Temporal.Duration.from({ hours: 1, minutes: 15 }),
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTime: Temporal.PlainTime
      endTime: Temporal.PlainTime
    }

    expect(vm.startTime.toString()).toBe("09:30:00")
    expect(vm.endTime.toString()).toBe("10:45:00")
  })

  it("uses explicit solo variants for the editor text and time fields", () => {
    const wrapper = shallowMount(NewGroup, {
      global: {
        stubs: {
          ...globalStubs,
          "v-select": VSelectStub,
          "v-text-field": VTextFieldStub,
        },
      },
    })

    const textField = wrapper.getComponent(VTextFieldStub)
    const selects = wrapper.findAllComponents(VSelectStub)

    expect(textField.props("variant")).toBe("solo")
    expect(selects).toHaveLength(2)
    expect(selects[0]?.props("variant")).toBe("solo")
    expect(selects[1]?.props("variant")).toBe("solo")
  })

  it("uses the shared weekday-toggle class contract instead of boolean solo props", () => {
    expect(newGroupSource).toContain('class="editor-dow-toggle"')
    expect(newGroupSource).toContain('v-for="day in dayOfWeekButtons"')
    expect(newGroupSource).toContain('getDayOfWeekButtonClass(day.value)')
    expect(newGroupSource).toContain('"editor-dow-button--selected": selectedDaysOfWeek.value.includes(dayIndex)')
    expect(newGroupSource).not.toContain("<v-btn-toggle\n              v-model=\"selectedDaysOfWeek\"\n              multiple\n              solo")
  })

  it("prefers the explicit event time seed over membership dates when editing a group", () => {
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        timezone: JSON.stringify({
          value: "UTC",
          label: "UTC",
          gmtString: "GMT",
          offset: "PT0S",
        }),
      })
    )

    const wrapper = shallowMount(NewGroup, {
      props: {
        edit: true,
        event: {
          _id: "group-1b",
          name: "Seeded group",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.ZonedDateTime.from(
            "2026-01-02T09:30:00+00:00[UTC]"
          ),
          duration: Temporal.Duration.from({ hours: 1, minutes: 15 }),
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTime: Temporal.PlainTime
      endTime: Temporal.PlainTime
    }

    expect(vm.startTime.toString()).toBe("09:30:00")
    expect(vm.endTime.toString()).toBe("10:45:00")
  })

  it("keeps DOW edit membership stable when the saved timezone would shift the seed instant to a different weekday", () => {
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        timezone: JSON.stringify({
          value: "America/Los_Angeles",
          label: "Pacific Time",
          gmtString: "GMT-8",
          offset: "-PT8H",
        }),
      })
    )

    const wrapper = shallowMount(NewGroup, {
      props: {
        edit: true,
        event: {
          _id: "group-2",
          name: "Weekly group",
          dates: [Temporal.PlainDate.from("2026-01-05")],
          timeSeed: Temporal.ZonedDateTime.from("2026-01-05T00:30:00+00:00[UTC]"),
          duration: Temporal.Duration.from({ hours: 1 }),
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      selectedDaysOfWeek: number[]
    }

    expect(vm.selectedDaysOfWeek).toEqual([1])
  })

  it("does not throw when editing a group whose dates array is empty", () => {
    expect(() =>
      shallowMount(NewGroup, {
        props: {
          edit: true,
          event: {
            _id: "group-1",
            name: "Broken group",
            dates: [],
            duration: durations.ONE_HOUR,
          },
        },
        global: {
          stubs: globalStubs,
        },
      })
    ).not.toThrow()
  })

  it("submits an overnight group with the next-day duration", async () => {
    const wrapper = shallowMount(NewGroup, {
      props: {
        contactsPayload: {
          name: "Late group",
          startTime: Temporal.PlainTime.from("23:30"),
          endTime: Temporal.PlainTime.from("01:00"),
          selectedDaysOfWeek: [1],
          startOnMonday: true,
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      timezone: {
        value: string
        label: string
        gmtString: string
        offset: Temporal.Duration
      }
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    vm.timezone = {
      value: "UTC",
      label: "UTC",
      gmtString: "GMT",
      offset: durations.ZERO,
    }

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]?.[0]).toBe("/events")
    expect((postMock.mock.calls[0]?.[1] as { duration: number }).duration).toBe(1.5)
  })

  it("initializes parent-owned timezone state from the saved selection", async () => {
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        timezone: JSON.stringify({
          value: "America/Los_Angeles",
          label: "Pacific Time",
          gmtString: "(GMT-8:00)",
          offset: "-PT8H",
        }),
      })
    )

    const wrapper = shallowMount(NewGroup, {
      props: {
        contactsPayload: {
          name: "Recovered group",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("10:00"),
          selectedDaysOfWeek: [1],
          startOnMonday: true,
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      timezone: {
        value: string
      }
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    expect(vm.timezone.value).toBe("America/Los_Angeles")

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(
      (postMock.mock.calls[0]?.[1] as { eventTimezone: string }).eventTimezone
    ).toBe("America/Los_Angeles")
  })

  it("treats equal start and end times as a 24-hour group duration", async () => {
    const wrapper = shallowMount(NewGroup, {
      props: {
        contactsPayload: {
          name: "All day group",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("09:00"),
          selectedDaysOfWeek: [1],
          startOnMonday: true,
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      timezone: {
        value: string
        label: string
        gmtString: string
        offset: Temporal.Duration
      }
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    vm.timezone = {
      value: "UTC",
      label: "UTC",
      gmtString: "GMT",
      offset: durations.ZERO,
    }

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect((postMock.mock.calls[0]?.[1] as { duration: number }).duration).toBe(24)
  })

  it("submits canonical timed fields for new groups", async () => {
    const wrapper = shallowMount(NewGroup, {
      props: {
        contactsPayload: {
          name: "Canonical group",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("10:00"),
          selectedDaysOfWeek: [1],
          startOnMonday: true,
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      timezone: {
        value: string
        label: string
        gmtString: string
        offset: Temporal.Duration
      }
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    vm.timezone = {
      value: "UTC",
      label: "UTC",
      gmtString: "GMT",
      offset: durations.ZERO,
    }

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]?.[1]).toMatchObject({
      enabledSlots: [
        expect.stringMatching(/^.+T09:00:00Z$/),
        expect.stringMatching(/^.+T09:15:00Z$/),
        expect.stringMatching(/^.+T09:30:00Z$/),
        expect.stringMatching(/^.+T09:45:00Z$/),
      ],
      activeSlots: [
        expect.stringMatching(/^.+T09:00:00Z$/),
        expect.stringMatching(/^.+T09:15:00Z$/),
        expect.stringMatching(/^.+T09:30:00Z$/),
        expect.stringMatching(/^.+T09:45:00Z$/),
      ],
      times: [
        expect.stringMatching(/^.+T09:00:00Z$/),
        expect.stringMatching(/^.+T09:15:00Z$/),
        expect.stringMatching(/^.+T09:30:00Z$/),
        expect.stringMatching(/^.+T09:45:00Z$/),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: "09:00:00",
        endTimeLocal: "10:00:00",
        timeIncrementMinutes: 15,
      },
      timedRecurrence: {
        kind: "weekly",
        selectedDays: [],
        selectedDaysOfWeek: [1],
        startOnMonday: true,
      },
      duration: 1,
      type: "group",
      attendees: [],
    })
  })

  it("submits canonical timed fields when editing groups", async () => {
    const wrapper = shallowMount(NewGroup, {
      props: {
        edit: true,
        event: {
          _id: "group-timed",
          name: "Weekly group",
          type: "group",
          dates: [Temporal.PlainDate.from("2026-05-25")],
          timeSeed: Temporal.ZonedDateTime.from("2026-05-25T09:00:00+00:00[UTC]"),
          duration: durations.ONE_HOUR,
          enabledSlots: [
            Temporal.ZonedDateTime.from("2026-05-25T09:00:00+00:00[UTC]"),
            Temporal.ZonedDateTime.from("2026-05-25T09:30:00+00:00[UTC]"),
          ],
          activeSlots: [
            Temporal.ZonedDateTime.from("2026-05-25T09:00:00+00:00[UTC]"),
            Temporal.ZonedDateTime.from("2026-05-25T09:30:00+00:00[UTC]"),
          ],
          eventTimezone: "UTC",
          slotGeneration: {
            startTimeLocal: Temporal.PlainTime.from("09:00"),
            endTimeLocal: Temporal.PlainTime.from("10:00"),
            timeIncrement: Temporal.Duration.from({ minutes: 30 }),
          },
          timedRecurrence: {
            kind: "weekly",
            selectedDays: [],
            selectedDaysOfWeek: [1],
            startOnMonday: true,
          },
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    await wrapper.findAll("button").find((button) => button.text().includes("Save edits"))?.trigger("click")
    await Promise.resolve()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({
      enabledSlots: [
        expect.stringMatching(/^.+T09:00:00Z$/),
        expect.stringMatching(/^.+T09:30:00Z$/),
      ],
      activeSlots: [
        expect.stringMatching(/^.+T09:00:00Z$/),
        expect.stringMatching(/^.+T09:30:00Z$/),
      ],
      times: [
        expect.stringMatching(/^.+T09:00:00Z$/),
        expect.stringMatching(/^.+T09:30:00Z$/),
      ],
      eventTimezone: "UTC",
      slotGeneration: {
        startTimeLocal: "09:00:00",
        endTimeLocal: "10:00:00",
        timeIncrementMinutes: 30,
      },
      timedRecurrence: {
        kind: "weekly",
        selectedDays: [],
        selectedDaysOfWeek: [1],
        startOnMonday: true,
      },
      type: "group",
    })
  })
})
