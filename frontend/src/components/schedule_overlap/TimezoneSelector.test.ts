// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils"
import { computed, defineComponent, type PropType } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { durations } from "@/constants"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import { createLocalStorageMock } from "@/test/localStorage"
import { vSelectStub as VSelectStub } from "@/test/componentStubs"
import TimezoneSelector from "./TimezoneSelector.vue"

const RenderingVSelectStub = defineComponent({
  name: "RenderingVSelectStub",
  props: {
    items: {
      type: Array as PropType<Record<string, unknown>[]>,
      default: () => [],
    },
    modelValue: {
      type: String,
      required: false,
      default: undefined,
    },
    itemTitle: {
      type: String,
      default: "title",
    },
    itemValue: {
      type: String,
      default: "value",
    },
  },
  setup(props) {
    const renderedLabel = computed(() => {
      const selectedItem = props.items.find(
        (item) => item[props.itemValue] === props.modelValue
      )

      return selectedItem?.[props.itemTitle]
    })

    return { renderedLabel }
  },
  template: "<div>{{ renderedLabel }}</div>",
})

const mountTimezoneSelector = (modelValue?: Timezone) =>
  shallowMount(TimezoneSelector, {
    props: {
      modelValue: modelValue ?? {
        value: "",
        label: "",
        gmtString: "",
        offset: durations.ZERO,
      },
    },
    global: {
      stubs: {
        "v-btn": true,
        "v-icon": true,
        "v-list-item": true,
        "v-list-item-content": true,
        "v-list-item-title": true,
        "v-select": VSelectStub,
      },
    },
  })

describe("TimezoneSelector", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "America/New_York" }),
        }) as Intl.DateTimeFormat
    )
  })

  it("falls back to the browser timezone when saved timezone JSON is malformed", () => {
    localStorage.setItem("timezone", "{")

    expect(() => mountTimezoneSelector()).not.toThrow()

    const wrapper = mountTimezoneSelector()
    const emitted = wrapper.emitted("update:modelValue")

    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toMatchObject({
      value: "America/New_York",
      label: "Eastern Time",
    })
  })

  it("rehydrates an offset-only saved timezone selection", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: Temporal.Duration.from({ hours: 5, minutes: 45 }).toString(),
      })
    )

    const wrapper = mountTimezoneSelector()
    const emitted = wrapper.emitted("update:modelValue")
    const restoredTimezone = emitted?.[0]?.[0] as Timezone | undefined

    expect(emitted).toBeTruthy()
    expect(restoredTimezone).toMatchObject({
      value: "+05:45",
      label: "+05:45",
      gmtString: "(GMT+5:45)",
    })
    expect(restoredTimezone?.offset.total("minutes")).toBe(345)
  })

  it("uses explicit Vuetify 3 item bindings for timezone labels and values", () => {
    const wrapper = mountTimezoneSelector({
      value: "America/New_York",
      label: "Eastern Time",
      gmtString: "(GMT-5:00)",
      offset: Temporal.Duration.from({ hours: -5 }),
    })
    const select = wrapper.getComponent(VSelectStub)
    const selectProps = select.props()

    expect(selectProps.itemTitle).toBe("title")
    expect(selectProps.itemValue).toBe("value")
    expect(selectProps.modelValue).toBe("America/New_York")
    expect(selectProps.variant).toBe("plain")
    expect(selectProps.density).toBe("compact")
    expect(selectProps.menuProps).toEqual({ auto: true })
    const matchingTimezoneItem = (selectProps.items as Array<Record<string, unknown>>).find(
      (item) => item.value === "America/New_York"
    )

    expect(matchingTimezoneItem).toMatchObject({
      value: "America/New_York",
    })
    expect(String(matchingTimezoneItem?.title)).toContain("Eastern Time")
  })

  it("renders a readable timezone label even when the selected value is an offset-only timezone", () => {
    const wrapper = shallowMount(TimezoneSelector, {
      props: {
        modelValue: {
          value: "+05:45",
          label: "+05:45",
          gmtString: "(GMT+5:45)",
          offset: Temporal.Duration.from({ hours: 5, minutes: 45 }),
        },
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-icon": true,
          "v-list-item": true,
          "v-list-item-title": true,
          "v-select": RenderingVSelectStub,
        },
      },
    })

    expect(wrapper.text()).toContain("(GMT+5:45) +05:45")
  })
})
