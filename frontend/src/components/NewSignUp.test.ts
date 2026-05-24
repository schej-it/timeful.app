// @vitest-environment happy-dom

import { flushPromises, shallowMount } from "@vue/test-utils"
import { defineComponent, nextTick } from "vue"
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
import NewSignUp from "./NewSignUp.vue"
import newSignUpSource from "./NewSignUp.vue?raw"

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

const defaultStubs: ComponentStubMap = buildEventEditorStubs(formRefMethods)

const DatePickerModelStub = defineComponent({
  name: "DatePicker",
  props: {
    modelValue: {
      type: Array,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  template: "<div />",
})

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
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("10:00"),
          daysOnly: true,
          selectedDateOption: "Specific dates",
          selectedDays: [
            Temporal.PlainDate.from("2026-01-02"),
            Temporal.PlainDate.from("2026-01-03"),
          ],
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

  it("emits an explicit refresh event after editing instead of reloading the page", async () => {
    const wrapper = shallowMount(NewSignUp, {
      props: {
        edit: true,
        event: {
          _id: "evt-1",
          name: "Edited sign up",
          type: "specific_dates",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          duration: durations.ONE_HOUR,
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    await wrapper.findAll("button").find((button) => button.text().includes("Save edits"))?.trigger("click")
    await flushPromises()

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted("refresh-event")).toEqual([[{ fromEditEvent: false }]])
  })

  it("uses explicit solo variants for the name, time, and date fields", () => {
    const wrapper = shallowMount(NewSignUp, {
      global: {
        stubs: {
          ...defaultStubs,
          "v-select": VSelectStub,
          "v-text-field": VTextFieldStub,
        },
      },
    })

    const textField = wrapper.getComponent(VTextFieldStub)
    const selects = wrapper.findAllComponents(VSelectStub)

    expect(textField.props("variant")).toBe("solo")
    expect(selects).toHaveLength(3)
    expect(selects[0]?.props("itemColor")).toBe("green")
    expect(selects[0]?.props("menuProps")).toEqual({ minWidth: 176, maxWidth: 176 })
    expect(selects[0]?.props("variant")).toBe("solo")
    expect(selects[1]?.props("itemColor")).toBe("green")
    expect(selects[1]?.props("menuProps")).toEqual({ minWidth: 176, maxWidth: 176 })
    expect(selects[1]?.props("variant")).toBe("solo")
    expect(selects[2]?.props("itemColor")).toBe("green")
    expect(selects[2]?.props("variant")).toBe("solo")
  })

  it("uses the shared weekday-toggle class contract instead of boolean solo props", () => {
    expect(newSignUpSource).toContain('class="editor-dow-toggle"')
    expect(newSignUpSource).toContain('v-for="day in dayOfWeekButtons"')
    expect(newSignUpSource).toContain('getDayOfWeekButtonClass(day.value)')
    expect(newSignUpSource).not.toContain("<v-btn-toggle\n                  v-model=\"selectedDaysOfWeek\"\n                  multiple\n                  solo")
  })

  it("commits ISO dates emitted by DatePicker into Temporal selected days", async () => {
    const wrapper = shallowMount(NewSignUp, {
      global: {
        stubs: {
          ...defaultStubs,
          DatePicker: DatePickerModelStub,
        },
      },
    })

    wrapper
      .getComponent(DatePickerModelStub)
      .vm.$emit("update:modelValue", ["2026-05-15"])
    await nextTick()

    const selectedDays = (wrapper.vm as unknown as {
      selectedDays: Temporal.PlainDate[]
    }).selectedDays

    expect(selectedDays.map(day => day.toString())).toEqual(["2026-05-15"])
    expect(selectedDays[0]).toBeInstanceOf(Temporal.PlainDate)
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
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.Instant.from("2026-01-02T09:30:00Z").toZonedDateTimeISO(
            "UTC"
          ),
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

  it("prefers the explicit event time seed over membership dates when editing", () => {
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
          _id: "evt-1b",
          name: "Seeded sign up",
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
          startTime: Temporal.PlainTime.from("23:30"),
          endTime: Temporal.PlainTime.from("01:00"),
          daysOnly: false,
          selectedDateOption: "Specific dates",
          selectedDays: [Temporal.PlainDate.from("2026-01-02")],
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

  it("treats equal start and end times as a 24-hour sign-up duration", async () => {
    const wrapper = shallowMount(NewSignUp, {
      props: {
        contactsPayload: {
          name: "All day sign up",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("09:00"),
          daysOnly: false,
          selectedDateOption: "Specific dates",
          selectedDays: [Temporal.PlainDate.from("2026-01-02")],
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
    ).toBe("PT24H")
  })
})
