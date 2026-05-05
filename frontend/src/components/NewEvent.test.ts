// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { durations } from "@/constants"
import { Temporal } from "temporal-polyfill"
import { createLocalStorageMock } from "@/test/localStorage"
import type * as UtilsModule from "@/utils"
import NewEvent from "./NewEvent.vue"

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
  storeToRefs: (store: { authUser: unknown; daysOnlyEnabled: unknown }) => ({
    authUser: store.authUser,
    daysOnlyEnabled: store.daysOnlyEnabled,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser: { value: null },
    daysOnlyEnabled: { value: true },
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

const VBtnStub = {
  emits: ["click"],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
}

const PassThroughStub = {
  inheritAttrs: false,
  template: "<div><slot /></div>",
}

const NullStub = {
  inheritAttrs: false,
  template: "<div />",
}

const VFormStub = {
  methods: {
    validate(): Promise<{ valid: boolean }> {
      return formRefMethods.validate()
    },
    resetValidation(): void {
      formRefMethods.resetValidation()
    },
  },
  template: "<form><slot /></form>",
}

const defaultStubs = {
  "v-btn": VBtnStub,
  "v-btn-toggle": NullStub,
  "v-card": PassThroughStub,
  "v-card-actions": PassThroughStub,
  "v-card-text": PassThroughStub,
  "v-card-title": PassThroughStub,
  "v-checkbox": NullStub,
  "v-expand-transition": PassThroughStub,
  "v-form": VFormStub,
  "v-icon": NullStub,
  "v-input": PassThroughStub,
  "v-select": NullStub,
  "v-spacer": NullStub,
  "v-text-field": NullStub,
  "v-tooltip": NullStub,
  AlertText: NullStub,
  DatePicker: NullStub,
  EmailInput: NullStub,
  ExpandableSection: PassThroughStub,
  HelpDialog: PassThroughStub,
  OverflowGradient: NullStub,
  SlideToggle: NullStub,
  TimezoneSelector: NullStub,
}

describe("NewEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    postMock.mockReset()
    putMock.mockReset()
    postMock.mockResolvedValue({ eventId: "evt-created" })
    putMock.mockResolvedValue(undefined)
    formRefMethods.validate.mockClear()
    formRefMethods.resetValidation.mockClear()
  })

  it("does not throw when editing an event whose dates array is empty", () => {
    expect(() =>
      shallowMount(NewEvent, {
        props: {
          edit: true,
          event: {
            _id: "evt-1",
            name: "Broken event",
            dates: [],
            duration: durations.ONE_HOUR,
          },
        },
        global: {
          stubs: defaultStubs,
        },
      })
    ).not.toThrow()
  })

  it("wraps cross-midnight edit durations to the next day's local end time", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "UTC",
        offset: "PT0S",
        label: "UTC",
        gmtString: "GMT",
      })
    )

    const wrapper = shallowMount(NewEvent, {
      props: {
        edit: true,
        event: {
          _id: "evt-2",
          name: "Late event",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.ZonedDateTime.from("2026-01-02T23:30:00+00:00[UTC]"),
          duration: Temporal.Duration.from({ minutes: 90 }),
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTimeNum?: number
      endTimeNum?: number
      $: { setupState?: { startTimeNum?: number; endTimeNum?: number } }
    }

    expect(vm.startTimeNum ?? vm.$.setupState?.startTimeNum).toBe(23.5)
    expect(vm.endTimeNum ?? vm.$.setupState?.endTimeNum).toBe(1)
  })

  it("uses saved timezone rules when reconstructing edit times across DST boundaries", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "America/New_York",
        offset: "-PT5H",
        label: "Eastern Time",
        gmtString: "GMT-5",
      })
    )

    const wrapper = shallowMount(NewEvent, {
      props: {
        edit: true,
        event: {
          _id: "evt-3",
          name: "Summer event",
          dates: [Temporal.PlainDate.from("2026-06-15")],
          timeSeed: Temporal.ZonedDateTime.from("2026-06-15T12:00:00+00:00[UTC]"),
          duration: Temporal.Duration.from({ hours: 1 }),
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTime?: Temporal.PlainTime
      endTime?: Temporal.PlainTime
      $: {
        setupState?: {
          startTime?: Temporal.PlainTime
          endTime?: Temporal.PlainTime
        }
      }
    }

    expect(
      (vm.startTime ?? vm.$.setupState?.startTime)?.toString()
    ).toBe("08:00:00")
    expect(
      (vm.endTime ?? vm.$.setupState?.endTime)?.toString()
    ).toBe("09:00:00")
  })

  it("prefers the explicit event time seed over membership dates when editing", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "UTC",
        offset: "PT0S",
        label: "UTC",
        gmtString: "GMT",
      })
    )

    const wrapper = shallowMount(NewEvent, {
      props: {
        edit: true,
        event: {
          _id: "evt-3b",
          name: "Seeded event",
          type: "specific_dates",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.ZonedDateTime.from(
            "2026-01-02T09:30:00+00:00[UTC]"
          ),
          duration: Temporal.Duration.from({ hours: 1, minutes: 15 }),
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTime?: Temporal.PlainTime
      endTime?: Temporal.PlainTime
      $: {
        setupState?: {
          startTime?: Temporal.PlainTime
          endTime?: Temporal.PlainTime
        }
      }
    }

    expect(
      (vm.startTime ?? vm.$.setupState?.startTime)?.toString()
    ).toBe("09:30:00")
    expect(
      (vm.endTime ?? vm.$.setupState?.endTime)?.toString()
    ).toBe("10:45:00")
  })

  it("keeps specific-date edit membership stable when the saved timezone would shift the instant to the prior day", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "America/Los_Angeles",
        offset: "-PT8H",
        label: "Pacific Time",
        gmtString: "GMT-8",
      })
    )

    const wrapper = shallowMount(NewEvent, {
      props: {
        edit: true,
        event: {
          _id: "evt-4",
          name: "Membership-stable event",
          type: "specific_dates",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.ZonedDateTime.from("2026-01-02T00:30:00+00:00[UTC]"),
          duration: Temporal.Duration.from({ hours: 1 }),
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      selectedDays?: Temporal.PlainDate[]
      $: { setupState?: { selectedDays?: Temporal.PlainDate[] } }
    }

    expect(
      (vm.selectedDays ?? vm.$.setupState?.selectedDays)?.map((day) =>
        day.toString()
      )
    ).toEqual(["2026-01-02"])
  })

  it("normalizes restored draft selectedDays into Temporal.PlainDate values", () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "Legacy draft",
          startTime: 9,
          endTime: 10,
          daysOnly: true,
          selectedDateOption: "Specific dates",
          selectedDays: ["2026-01-02", "2026-01-03"],
          notificationsEnabled: false,
          timezone: {
            value: "UTC",
            label: "UTC",
            gmtString: "GMT",
            offset: durations.ZERO,
          },
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const selectedDays = (wrapper.vm as unknown as {
      selectedDays: Temporal.PlainDate[]
    }).selectedDays

    expect(selectedDays.map((day) => day.toString())).toEqual([
      "2026-01-02",
      "2026-01-03",
    ])
    expect(selectedDays.every((day) => day instanceof Temporal.PlainDate)).toBe(
      true
    )
  })

  it("submits day-only events with a zero duration payload", async () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "Day only event",
          startTime: 9,
          endTime: 11,
          daysOnly: true,
          selectedDateOption: "Specific dates",
          selectedDays: ["2026-01-02"],
          notificationsEnabled: false,
          timezone: {
            value: "UTC",
            label: "UTC",
            gmtString: "GMT",
            offset: durations.ZERO,
          },
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]?.[0]).toBe("/events")
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          duration: number
        }
      ).duration
    ).toBe(0)
  })

  it("submits an overnight event with the next-day duration", async () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "Late event",
          startTime: 23.5,
          endTime: 1,
          daysOnly: false,
          selectedDateOption: "Specific dates",
          selectedDays: ["2026-01-02"],
          notificationsEnabled: false,
          timezone: {
            value: "UTC",
            label: "UTC",
            gmtString: "GMT",
            offset: durations.ZERO,
          },
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]?.[0]).toBe("/events")
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          duration: number
        }
      ).duration
    ).toBe(1.5)
  })

  it("treats equal start and end times as a 24-hour event duration", async () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "All day event",
          startTime: 9,
          endTime: 9,
          daysOnly: false,
          selectedDateOption: "Specific dates",
          selectedDays: ["2026-01-02"],
          notificationsEnabled: false,
          timezone: {
            value: "UTC",
            label: "UTC",
            gmtString: "GMT",
            offset: durations.ZERO,
          },
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      submit?: () => Promise<void>
      $: { setupState?: { submit?: () => Promise<void> } }
    }

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]?.[0]).toBe("/events")
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          duration: number
        }
      ).duration
    ).toBe(24)
  })
})
