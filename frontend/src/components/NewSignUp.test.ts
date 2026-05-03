// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { durations } from "@/constants"
import { createLocalStorageMock } from "@/test/localStorage"
import type * as UtilsModule from "@/utils"
import NewSignUp from "./NewSignUp.vue"

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

describe("NewSignUp", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    postMock.mockReset()
    putMock.mockReset()
    postMock.mockResolvedValue({ eventId: "evt-created" })
    putMock.mockResolvedValue(undefined)
    formRefMethods.validate.mockClear()
    formRefMethods.resetValidation.mockClear()
  })

  it("normalizes restored draft selectedDays into Temporal.PlainDate values", () => {
    const wrapper = shallowMount(NewSignUp, {
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
    expect(selectedDays.every((day) => day instanceof Temporal.PlainDate)).toBe(true)
  })

  it("preserves minute-level start and end times when editing an event", () => {
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

    const wrapper = shallowMount(NewSignUp, {
      props: {
        edit: true,
        event: {
          _id: "evt-1",
          name: "Minute-sensitive event",
          dates: [
            Temporal.Instant.from("2026-01-02T09:30:00Z").toZonedDateTimeISO(
              "UTC"
            ),
          ],
          duration: Temporal.Duration.from({ hours: 1, minutes: 15 }),
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTime: Temporal.PlainTime
      endTime: Temporal.PlainTime
    }

    expect(vm.startTime.toString()).toBe("09:30:00")
    expect(vm.endTime.toString()).toBe("10:45:00")
  })

  it("does not throw when editing an event whose dates array is empty", () => {
    expect(() =>
      shallowMount(NewSignUp, {
        props: {
          edit: true,
          event: {
            _id: "evt-1",
            name: "Broken sign up",
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

  it("submits an overnight sign-up with the next-day duration", async () => {
    const wrapper = shallowMount(NewSignUp, {
      props: {
        contactsPayload: {
          name: "Late sign up",
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
          duration: Temporal.Duration
        }
      ).duration.toString()
    ).toBe("PT1H30M")
  })
})
