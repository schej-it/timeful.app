// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import type * as UtilsModule from "@/utils"
import NewGroup from "./NewGroup.vue"

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

const globalStubs = {
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
  EmailInput: NullStub,
  HelpDialog: PassThroughStub,
  TimezoneSelector: NullStub,
}

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
          dates: [
            Temporal.Instant.from("2026-01-02T09:30:00Z").toZonedDateTimeISO(
              "UTC"
            ),
          ],
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
          dates: [
            Temporal.ZonedDateTime.from("2026-01-05T00:30:00+00:00[UTC]"),
          ],
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
          startTime: 23.5,
          endTime: 1,
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
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          duration: Temporal.Duration
        }
      ).duration.toString()
    ).toBe("PT1H30M")
  })

  it("falls back to the saved timezone when submit runs before timezone state is hydrated", async () => {
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
          startTime: 9,
          endTime: 10,
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

    expect(vm.timezone.value).toBe("")

    await (vm.submit ?? vm.$.setupState?.submit)?.()
    await Promise.resolve()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          dates: Temporal.ZonedDateTime[]
        }
      ).dates[0]?.timeZoneId
    ).toBe("America/Los_Angeles")
  })

  it("treats equal start and end times as a 24-hour group duration", async () => {
    const wrapper = shallowMount(NewGroup, {
      props: {
        contactsPayload: {
          name: "All day group",
          startTime: 9,
          endTime: 9,
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
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          duration: Temporal.Duration
        }
      ).duration.toString()
    ).toBe("PT24H")
  })
})
