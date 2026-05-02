// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { durations } from "@/constants"
import { Temporal } from "temporal-polyfill"
import NewEvent from "./NewEvent.vue"

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

const createLocalStorageMock = () => {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    get length() {
      return store.size
    },
  } satisfies Storage
}

describe("NewEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
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
          stubs: {
            "v-btn": true,
            "v-btn-toggle": true,
            "v-card": true,
            "v-card-actions": true,
            "v-card-text": true,
            "v-card-title": true,
            "v-checkbox": true,
            "v-expand-transition": true,
            "v-form": true,
            "v-icon": true,
            "v-input": true,
            "v-select": true,
            "v-spacer": true,
            "v-text-field": true,
            "v-tooltip": true,
            AlertText: true,
            DatePicker: true,
            EmailInput: true,
            ExpandableSection: true,
            HelpDialog: true,
            OverflowGradient: true,
            SlideToggle: true,
            TimezoneSelector: true,
          },
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
          dates: [Temporal.ZonedDateTime.from("2026-01-02T23:30:00+00:00[UTC]")],
          duration: Temporal.Duration.from({ minutes: 90 }),
        },
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-btn-toggle": true,
          "v-card": true,
          "v-card-actions": true,
          "v-card-text": true,
          "v-card-title": true,
          "v-checkbox": true,
          "v-expand-transition": true,
          "v-form": true,
          "v-icon": true,
          "v-input": true,
          "v-select": true,
          "v-spacer": true,
          "v-text-field": true,
          "v-tooltip": true,
          AlertText: true,
          DatePicker: true,
          EmailInput: true,
          ExpandableSection: true,
          HelpDialog: true,
          OverflowGradient: true,
          SlideToggle: true,
          TimezoneSelector: true,
        },
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
          dates: [Temporal.ZonedDateTime.from("2026-06-15T12:00:00+00:00[UTC]")],
          duration: Temporal.Duration.from({ hours: 1 }),
        },
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-btn-toggle": true,
          "v-card": true,
          "v-card-actions": true,
          "v-card-text": true,
          "v-card-title": true,
          "v-checkbox": true,
          "v-expand-transition": true,
          "v-form": true,
          "v-icon": true,
          "v-input": true,
          "v-select": true,
          "v-spacer": true,
          "v-text-field": true,
          "v-tooltip": true,
          AlertText: true,
          DatePicker: true,
          EmailInput: true,
          ExpandableSection: true,
          HelpDialog: true,
          OverflowGradient: true,
          SlideToggle: true,
          TimezoneSelector: true,
        },
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
})
