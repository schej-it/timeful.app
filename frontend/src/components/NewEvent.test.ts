// @vitest-environment happy-dom

import { readFileSync } from "node:fs"
import { shallowMount } from "@vue/test-utils"
import { defineComponent, nextTick, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { durations } from "@/constants"
import { Temporal } from "temporal-polyfill"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  buildEventEditorStubs,
  type ComponentStubMap,
  vSelectStub as VSelectStub,
} from "@/test/componentStubs"
import type * as UtilsModule from "@/utils"
import NewEvent from "./NewEvent.vue"
import newEventSource from "./NewEvent.vue?raw"

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
    authUser: ref(null),
    daysOnlyEnabled: ref(true),
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

const DatePickerModelStub = {
  name: "DatePicker",
  props: {
    modelValue: {
      type: Array,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  template: "<div />",
}

const VCheckboxSlotStub = {
  name: "VCheckbox",
  inheritAttrs: false,
  props: {
    class: {
      type: [String, Array, Object],
      default: undefined,
    },
    messages: {
      type: String,
      default: "",
    },
  },
  template: `
    <div class="v-checkbox-stub" :class="$props.class">
      <div class="v-checkbox-stub__label"><slot name="label" /></div>
      <div class="v-checkbox-stub__message">
        <slot name="message" :message="messages" />
      </div>
    </div>
  `,
}

const VBtnStub = defineComponent({
  name: "VBtn",
  props: {
    class: {
      type: [String, Array, Object],
      default: undefined,
    },
    color: {
      type: String,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <button
      class="v-btn-stub"
      :class="$props.class"
      :data-color="color"
      :disabled="disabled"
    >
      <slot />
    </button>
  `,
})

const newEventStyleBlock =
  /<style>([\s\S]*)<\/style>/.exec(newEventSource)?.[1] ?? ""
const appCssSource = readFileSync("src/index.css", "utf8")
const dayOfWeekButtonSnippet =
  /<v-btn\s+v-for="dayIndex in dayIndices"[\s\S]*?<\/v-btn>/.exec(newEventSource)?.[0] ?? ""

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

  it("passes explicit Vuetify 3 item mappings to event time and increment selects", () => {
    const wrapper = shallowMount(NewEvent, {
      global: {
        stubs: {
          ...defaultStubs,
          "v-select": VSelectStub,
        },
      },
    })

    const selects = wrapper.findAllComponents(VSelectStub)

    expect(selects).toHaveLength(4)
    expect(selects[0]?.props("itemTitle")).toBe("text")
    expect(selects[0]?.props("itemValue")).toBe("value")
    expect(selects[0]?.props("itemColor")).toBeUndefined()
    expect(selects[0]?.props("menuProps")).toEqual({ minWidth: 176, maxWidth: 176 })
    expect(selects[0]?.props("variant")).toBe("solo")
    expect(selects[0]?.props("items")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "9 am", value: 9 }),
        expect.objectContaining({ text: "5 pm", value: 17 }),
      ])
    )
    expect(selects[1]?.props("itemTitle")).toBe("text")
    expect(selects[1]?.props("itemValue")).toBe("value")
    expect(selects[1]?.props("itemColor")).toBeUndefined()
    expect(selects[1]?.props("menuProps")).toEqual({ minWidth: 176, maxWidth: 176 })
    expect(selects[1]?.props("variant")).toBe("solo")
    expect(selects[2]?.props("itemColor")).toBeUndefined()
    expect(selects[2]?.props("variant")).toBe("solo")
    expect(selects[3]?.props("itemTitle")).toBe("title")
    expect(selects[3]?.props("itemValue")).toBe("value")
    expect(selects[3]?.props("variant")).toBe("plain")
    expect(selects[3]?.props("density")).toBe("compact")
    expect(selects[3]?.props("items")).toEqual([
      { title: "15 min", value: 15 },
      { title: "30 min", value: 30 },
      { title: "60 min", value: 60 },
    ])
  })

  it("defines shared semantic styling tokens at the app layer", () => {
    expect(appCssSource).toMatch(/:root\s*\{/)
    expect(appCssSource).toMatch(/--timeful-selection-bg:\s*#f2faf6;/)
    expect(appCssSource).toMatch(/--timeful-selection-fg:\s*#00994c;/)
    expect(appCssSource).toMatch(/--timeful-error-foreground:\s*#dc2626;/i)
    expect(appCssSource).toMatch(/--timeful-unavailable-bg:\s*#e523230d;/i)
    expect(appCssSource).toMatch(/--timeful-unavailable-bg-time-grid:\s*#f9cccc;/i)
    expect(appCssSource).toMatch(/--timeful-unavailable-bg-day-grid:\s*#e523233b;/i)
    expect(appCssSource).toMatch(/--timeful-grid-separator:\s*#a29e9e;/i)
    expect(appCssSource).toMatch(/--timeful-grid-hour-separator:\s*#999999;/i)
    expect(appCssSource).toMatch(/--timeful-grid-separator-strong:\s*#999999;/i)
    expect(appCssSource).toMatch(/--timeful-grid-separator-soft:\s*#dddddd99;/i)
    expect(appCssSource).toMatch(/--timeful-muted-foreground:\s*rgba\(0,\s*0,\s*0,\s*0\.6\);/)
    expect(appCssSource).toMatch(/--timeful-disabled-foreground:\s*rgba\(0,\s*0,\s*0,\s*0\.38\);/)
    expect(appCssSource).toMatch(/--timeful-disabled-checkbox-icon:\s*#aaaaaa;/i)
    expect(appCssSource).toMatch(/--timeful-emphasis-foreground:\s*#4f4f4f;/i)
    expect(appCssSource).toMatch(/--timeful-primary-action-bg:\s*#00994c;/i)
    expect(appCssSource).toMatch(/--timeful-primary-action-fg:\s*#ffffff;/i)
    expect(appCssSource).toMatch(/--timeful-primary-action-disabled-bg:\s*rgba\(0,\s*0,\s*0,\s*0\.12\);/i)
    expect(appCssSource).toMatch(/--timeful-primary-action-disabled-fg:\s*rgba\(0,\s*0,\s*0,\s*0\.26\);/i)
  })

  it("renders time-range menu items with shared semantic selection tokens", () => {
    expect(newEventSource).toContain('<template #item="{ item, props: itemProps }">')
    expect(newEventSource).toContain("'time-range-select-item--active':")
    expect(newEventStyleBlock).toMatch(
      /\.time-range-select-item--active\s*\{\s*background-color:\s*var\(--timeful-selection-bg\);\s*color:\s*var\(--timeful-selection-fg\);/
    )
  })

  it("uses the shared selection palette for the date option and time increment dropdown items", () => {
    expect(newEventSource).toContain(
      "'time-range-select-item--active': item.raw === selectedDateOption"
    )
    expect(newEventSource).toContain("item.raw.value === timeIncrement")
  })

  it("uses token-backed selected styling for day-of-week controls instead of Vuetify palette props", () => {
    expect(newEventSource).toContain('class="new-event-dow-toggle"')
    expect(newEventSource).toContain('getDayOfWeekButtonClass(0)')
    expect(newEventSource).toContain('"new-event-dow-button--selected": selectedDaysOfWeek.value.includes(dayIndex)')
    expect(dayOfWeekButtonSnippet).not.toContain('color="primary"')
    expect(newEventStyleBlock).toMatch(
      /\.new-event-dow-button--selected\s*\{\s*background-color:\s*var\(--timeful-selection-bg\);\s*color:\s*var\(--timeful-selection-fg\);/
    )
  })

  it("uses explicit primary checkbox semantics for the specific-times toggle", () => {
    expect(newEventSource).toContain('v-model="specificTimesEnabled"')
    expect(newEventSource).toContain('color="primary"')
    expect(newEventSource).toContain('messages="Specify the times in the next step"')
  })

  it("uses crossed-out Vuetify 3 false-icon for disabled unchecked gated checkboxes", () => {
    expect(newEventSource).toContain('false-icon="mdi-checkbox-blank-off-outline"')
    expect(newEventSource).not.toContain('off-icon="mdi-checkbox-blank-off-outline"')
  })

  it("uses the shared editor header for dialog title and actions", () => {
    expect(newEventSource).toContain("<EditorDialogHeader")
    expect(newEventSource).toContain('help-header="Events"')
    expect(newEventSource).toContain(`@close="emit('update:modelValue', false)"`)
  })

  it("blocks the create button until the required name and date selection are present", async () => {
    const wrapper = shallowMount(NewEvent, {
      global: {
        stubs: {
          ...defaultStubs,
          "v-btn": VBtnStub,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      formValid: boolean
      name: string
      selectedDays: Temporal.PlainDate[]
    }
    vm.formValid = false
    vm.name = ""
    vm.selectedDays = []
    await nextTick()

    const button = wrapper.get(".v-btn-stub")
    expect(button.attributes("aria-disabled")).toBe("true")
    expect(button.attributes("tabindex")).toBe("-1")
    expect(button.classes()).toContain("new-event-submit-button")
    expect(button.classes()).toContain("new-event-submit-button--disabled")
    expect(button.classes()).not.toContain("new-event-submit-button--enabled")
    expect(button.attributes("style")).toContain(
      "--timeful-primary-action-disabled-bg"
    )
    expect(button.attributes("style")).toContain(
      "--timeful-primary-action-disabled-fg"
    )

    vm.formValid = false
    vm.name = "Planning sync"
    vm.selectedDays = []
    await nextTick()

    expect(button.attributes("aria-disabled")).toBe("true")
    expect(button.classes()).toContain("new-event-submit-button--disabled")

    vm.selectedDays = [Temporal.PlainDate.from("2026-01-02")]
    await nextTick()

    expect(button.attributes("aria-disabled")).toBe("false")
    expect(button.attributes("tabindex")).toBeUndefined()
    expect(button.classes()).toContain("new-event-submit-button")
    expect(button.classes()).toContain("new-event-submit-button--enabled")
    expect(button.classes()).not.toContain("new-event-submit-button--disabled")
    expect(button.attributes("style")).toContain("--timeful-primary-action-bg")
    expect(button.attributes("style")).toContain("--timeful-primary-action-fg")
  })

  it("blocks the create button in day-of-week mode until a weekday is selected", async () => {
    const wrapper = shallowMount(NewEvent, {
      global: {
        stubs: {
          ...defaultStubs,
          "v-btn": VBtnStub,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      name: string
      selectedDateOption: string
      selectedDays: Temporal.PlainDate[]
      selectedDaysOfWeek: number[]
    }

    vm.name = "Weekly sync"
    vm.selectedDateOption = "Days of the week"
    vm.selectedDays = []
    vm.selectedDaysOfWeek = []
    await nextTick()

    const button = wrapper.get(".v-btn-stub")
    expect(button.attributes("aria-disabled")).toBe("true")

    vm.selectedDaysOfWeek = [1]
    await nextTick()

    expect(button.attributes("aria-disabled")).toBe("false")
  })

  it("submits when the current form data is valid even if lazy form validity is stale", async () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "Planning sync",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("10:00"),
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
        stubs: {
          ...defaultStubs,
          "v-btn": VBtnStub,
        },
      },
    })

    const vm = wrapper.vm as unknown as { formValid: boolean }
    vm.formValid = false
    await nextTick()

    await wrapper.get(".v-btn-stub").trigger("click")
    await Promise.resolve()

    expect(formRefMethods.validate).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0]?.[0]).toBe("/events")
  })

  it("shows the submit error only after an attempted submit fails validation", async () => {
    formRefMethods.validate.mockResolvedValueOnce({ valid: false })

    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "Planning sync",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("10:00"),
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
        stubs: {
          ...defaultStubs,
          "v-btn": VBtnStub,
        },
      },
    })

    const vm = wrapper.vm as unknown as { formValid: boolean }
    vm.formValid = false
    await nextTick()

    const error = wrapper.get(".new-event-submit-error")
    expect(error.classes()).toContain("tw-invisible")

    await wrapper.get(".v-btn-stub").trigger("click")
    await nextTick()

    expect(formRefMethods.validate).toHaveBeenCalledTimes(1)
    expect(postMock).not.toHaveBeenCalled()
    expect(error.classes()).toContain("tw-visible")
  })

  it("uses semantic tokens for submit error and invalid-name state styling", () => {
    expect(newEventSource).toContain('class="new-event-submit-error tw-mt-1 tw-text-xs"')
    expect(newEventStyleBlock).toMatch(
      /\.new-event-name-field--invalid \.v-field\s*\{\s*outline:\s*1px solid var\(--timeful-error-foreground\);/
    )
    expect(newEventStyleBlock).toMatch(
      /\.new-event-submit-error\s*\{\s*color:\s*var\(--timeful-error-foreground\);/
    )
    expect(newEventStyleBlock).toMatch(
      /\.new-event-submit-button \.v-btn__content,\s*\.new-event-submit-button \.v-progress-circular,\s*\.new-event-submit-button \.v-icon\s*\{\s*color:\s*inherit;/
    )
  })

  it("renders all signed-out gated helpers with the legacy-emphasis helper markup", () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        event: {
          ownerId: "user-1",
        },
      },
      global: {
        stubs: {
          ...defaultStubs,
          "v-checkbox": VCheckboxSlotStub,
        },
      },
    })

    expect(wrapper.findAll(".gated-feature-checkbox")).toHaveLength(3)
    expect(wrapper.findAll(".advanced-options-disabled-label")).toHaveLength(3)
    expect(wrapper.findAll(".advanced-options-disabled-message")).toHaveLength(3)
    expect(wrapper.findAll(".advanced-options-disabled-copy")).toHaveLength(3)
    expect(wrapper.findAll(".advanced-options-sign-in-link")).toHaveLength(3)
  })

  it("keeps disabled helper text and gated checkbox icon styling stable", () => {
    expect(newEventStyleBlock).toMatch(
      /\.new-event-form \.v-checkbox \.v-selection-control\s*\{\s*--v-selection-control-size:\s*32px;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox\s*\{\s*--v-disabled-opacity:\s*1;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox\.v-input--disabled\s*\{\s*opacity:\s*1 !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox \.v-selection-control--disabled\s*\{\s*opacity:\s*1 !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox \.v-input__details,\s*\.gated-feature-checkbox \.v-messages,\s*\.gated-feature-checkbox \.v-messages__message\s*\{\s*opacity:\s*1 !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox\.v-input--density-default \.advanced-options-disabled-message\s*\{\s*margin-left:\s*32px !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox\.v-input--density-compact \.advanced-options-disabled-message\s*\{\s*margin-left:\s*32px !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.gated-feature-checkbox \.v-selection-control__input > \.v-icon\s*\{\s*color:\s*var\(--timeful-disabled-checkbox-icon\) !important;\s*opacity:\s*1 !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.advanced-options-disabled-label\s*\{\s*color:\s*var\(--timeful-disabled-foreground\) !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.advanced-options-disabled-message\s*\{\s*color:\s*var\(--timeful-muted-foreground\) !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.advanced-options-disabled-copy\s*\{\s*color:\s*var\(--timeful-emphasis-foreground\) !important;/
    )
    expect(newEventStyleBlock).toMatch(
      /\.advanced-options-sign-in-link\s*\{\s*color:\s*var\(--timeful-selection-fg\) !important;/
    )
    expect(newEventStyleBlock).not.toMatch(/:deep\(/)
    expect(newEventStyleBlock).not.toMatch(/v-selection-control--disabled \.v-label/)
  })

  it("uses the shared muted-foreground token for the advanced-options panel", () => {
    expect(newEventSource).toContain('class="advanced-options-panel tw-flex tw-flex-col tw-gap-5 tw-pt-2"')
    expect(newEventStyleBlock).toMatch(
      /\.advanced-options-panel\s*\{\s*color:\s*var\(--timeful-muted-foreground\);/
    )
  })

  it("normalizes edit-flow time increment objects into a numeric advanced-options select value", () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        edit: true,
        event: {
          _id: "evt-time-increment",
          name: "Duration-backed increment",
          dates: [Temporal.PlainDate.from("2026-01-02")],
          timeSeed: Temporal.ZonedDateTime.from("2026-01-02T09:00:00+00:00[UTC]"),
          duration: durations.ONE_HOUR,
          timeIncrement: Temporal.Duration.from({ minutes: 30 }),
        },
      },
      global: {
        stubs: {
          ...defaultStubs,
          "v-select": VSelectStub,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      timeIncrement?: number
      $: { setupState?: { timeIncrement?: number } }
    }

    expect(vm.timeIncrement ?? vm.$.setupState?.timeIncrement).toBe(30)
  })

  it("commits ISO dates emitted by DatePicker into Temporal selected days", async () => {
    const wrapper = shallowMount(NewEvent, {
      global: {
        stubs: {
          ...defaultStubs,
          DatePicker: DatePickerModelStub,
        },
      },
    })

    const datePicker = wrapper.getComponent(DatePickerModelStub)
    ;(datePicker.vm as { $emit: (event: string, payload: string[]) => void }).$emit(
      "update:modelValue",
      ["2026-05-15"]
    )
    await nextTick()

    const selectedDays = (wrapper.vm as unknown as {
      selectedDays: Temporal.PlainDate[]
    }).selectedDays

    expect(selectedDays.map(day => day.toString())).toEqual(["2026-05-15"])
    expect(selectedDays[0]).toBeInstanceOf(Temporal.PlainDate)
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

  it("preserves non-hour-aligned edit times after saved timezone reconstruction", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "Asia/Kathmandu",
        offset: "PT5H45M",
        label: "Nepal Time",
        gmtString: "GMT+5:45",
      })
    )

    const wrapper = shallowMount(NewEvent, {
      props: {
        edit: true,
        event: {
          _id: "evt-3a",
          name: "Quarter-hour event",
          dates: [Temporal.PlainDate.from("2026-06-15")],
          timeSeed: Temporal.ZonedDateTime.from("2026-06-15T12:00:00+00:00[UTC]"),
          duration: Temporal.Duration.from({ hours: 1, minutes: 30 }),
        },
      },
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as unknown as {
      startTime?: Temporal.PlainTime
      endTime?: Temporal.PlainTime
      startTimeNum?: number
      endTimeNum?: number
      $: {
        setupState?: {
          startTime?: Temporal.PlainTime
          endTime?: Temporal.PlainTime
          startTimeNum?: number
          endTimeNum?: number
        }
      }
    }

    expect(
      (vm.startTime ?? vm.$.setupState?.startTime)?.toString()
    ).toBe("17:45:00")
    expect(
      (vm.endTime ?? vm.$.setupState?.endTime)?.toString()
    ).toBe("19:15:00")
    expect(vm.startTimeNum ?? vm.$.setupState?.startTimeNum).toBe(17.75)
    expect(vm.endTimeNum ?? vm.$.setupState?.endTimeNum).toBe(19.25)
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
    expect(selectedDays.every((day) => day instanceof Temporal.PlainDate)).toBe(
      true
    )
  })

  it("submits day-only events with a zero duration payload", async () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "Day only event",
          startTime: Temporal.PlainTime.from("09:00"),
          endTime: Temporal.PlainTime.from("11:00"),
          daysOnly: true,
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
          duration: number
          dates: string[]
        }
      ).duration
    ).toBe(1.5)
    expect(
      (
        postMock.mock.calls[0]?.[1] as {
          duration: number
          dates: string[]
        }
      ).dates
    ).toEqual(["2026-01-02T23:30:00Z"])
  })

  it("treats equal start and end times as a 24-hour event duration", async () => {
    const wrapper = shallowMount(NewEvent, {
      props: {
        contactsPayload: {
          name: "All day event",
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
          duration: number
        }
      ).duration
    ).toBe(24)
  })
})
