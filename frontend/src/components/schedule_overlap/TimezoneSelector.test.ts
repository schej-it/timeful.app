// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { shallowMount } from "@vue/test-utils"
import { computed, defineComponent, type PropType } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { durations } from "@/constants"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import { createLocalStorageMock } from "@/test/localStorage"
import { vSelectStub as VSelectStub } from "@/test/componentStubs"
import TimezoneSelector from "./TimezoneSelector.vue"
import timezoneSelectorSource from "./TimezoneSelector.vue?raw"

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
    const selectedItem = computed(() =>
      props.items.find((item) => item[props.itemValue] === props.modelValue)
    )

    const renderedLabel = computed(() => {
      return selectedItem.value?.[props.itemTitle]
    })

    return { renderedLabel, selectedItem }
  },
  template: `
    <div>
      <slot
        v-if="selectedItem"
        name="selection"
        :item="{ raw: selectedItem }"
      />
      <div v-else>{{ renderedLabel }}</div>
    </div>
  `,
})

const ItemSlotRenderingVSelectStub = defineComponent({
  name: "ItemSlotRenderingVSelectStub",
  props: {
    items: {
      type: Array as PropType<Record<string, unknown>[]>,
      default: () => [],
    },
  },
  template: `
    <div>
      <slot
        v-for="item in items"
        :key="String(item.value)"
        name="item"
        :item="{ raw: item }"
        :props="{ title: item.title, value: item.value }"
      />
    </div>
  `,
})

const RenderingVListItemStub = defineComponent({
  name: "RenderingVListItemStub",
  template: `<div><slot /></div>`,
})

const RenderingVListItemTitleStub = defineComponent({
  name: "RenderingVListItemTitleStub",
  template: `<div><slot /></div>`,
})

const DirectRawItemVSelectStub = defineComponent({
  name: "DirectRawItemVSelectStub",
  props: {
    items: {
      type: Array as PropType<({ timezone?: Timezone } & Record<string, unknown>)[]>,
      default: () => [],
    },
    modelValue: {
      type: String,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const selectedTimezone = computed(
      () =>
        props.items.find((item) => item.value === props.modelValue)?.timezone ??
        props.items[0]?.timezone
    )

    return { selectedTimezone }
  },
  template: `
    <div>
      <slot
        v-if="selectedTimezone"
        name="item"
        :item="{ raw: selectedTimezone }"
        :props="{ title: { text: '[object Object]' }, value: selectedTimezone.value }"
      />
      <slot
        v-if="selectedTimezone"
        name="selection"
        :item="{ raw: selectedTimezone }"
      />
    </div>
  `,
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

  it("does not initialize parent-owned timezone state during setup", () => {
    localStorage.setItem(
      "timezone",
      JSON.stringify({
        value: "",
        offset: Temporal.Duration.from({ hours: 5, minutes: 45 }).toString(),
      })
    )

    const wrapper = mountTimezoneSelector()

    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
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
    expect(selectProps.variant).toBe("underlined")
    expect(selectProps.density).toBe("compact")
    expect(String(selectProps.class)).toContain("compact-inline-select")
    expect(wrapper.get("#timezone-select-container").attributes("class")).toContain(
      "tw-text-[rgba(0,0,0,0.6)]"
    )
    const matchingTimezoneItem = (selectProps.items as Record<string, unknown>[]).find(
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

  it("keeps the custom timezone selection text in the truncation class path", () => {
    const wrapper = shallowMount(TimezoneSelector, {
      props: {
        modelValue: {
          value: "Europe/Moscow",
          label: "Istanbul, Minsk, Moscow, St. Petersburg, Volgograd",
          gmtString: "(GMT+3:00)",
          offset: Temporal.Duration.from({ hours: 3 }),
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

    const selection = wrapper.get(".timezone-select__selection-text")

    expect(selection.text()).toContain("(GMT+3:00)")
    expect(selection.text()).toContain("Istanbul, Minsk, Moscow")
  })

  it("renders the reset action as a sibling next to the underlined select", () => {
    expect(timezoneSelectorSource).toContain('class="timezone-select__field-row tw-flex tw-min-w-0 tw-items-center"')
    expect(timezoneSelectorSource).toContain('class="timezone-select__reset-button"')
    expect(timezoneSelectorSource).toContain('v-if="timezoneModified"')
    expect(timezoneSelectorSource).toContain("@mousedown.stop.prevent")
    expect(timezoneSelectorSource).toContain("@pointerdown.stop.prevent")
    expect(timezoneSelectorSource).not.toContain('size="x-small"')
  })

  it("allows the timezone select and its selection text to shrink for ellipsis", () => {
    expect(timezoneSelectorSource).toContain('class="tw-flex tw-min-w-0 tw-items-center tw-justify-center')
    expect(timezoneSelectorSource).toContain('class="compact-inline-select tw-z-20 -tw-mt-px tw-w-64 tw-min-w-0')
    expect(timezoneSelectorSource).toContain(
      ".compact-inline-select :deep(.v-field__input) {\n  flex-wrap: nowrap !important;\n  min-width: 0 !important;"
    )
    expect(timezoneSelectorSource).toContain(
      ".compact-inline-select :deep(.v-select__selection) {\n  display: block !important;"
    )
  })

  it("keeps the menu icon before the reset action without suppressing the field underline", () => {
    expect(timezoneSelectorSource).toContain(
      ".compact-inline-select :deep(.v-select__menu-icon) {\n  order: 1;"
    )
    expect(timezoneSelectorSource).toContain(".timezone-select__reset-button {\n  margin-inline-start: -2px;")
    expect(timezoneSelectorSource).not.toContain(
      ".compact-inline-select :deep(.v-field__outline) {\n  display: none;"
    )
  })

  it("does not restore the old field-level compact flex overrides", () => {
    expect(timezoneSelectorSource).not.toContain(
      ".compact-inline-select :deep(.v-input__control),\n.compact-inline-select :deep(.v-field__field)"
    )
    expect(timezoneSelectorSource).not.toContain(
      ".compact-inline-select :deep(.v-field__input) {\n  align-items: center !important;"
    )
    expect(timezoneSelectorSource).not.toContain(
      ".compact-inline-select :deep(.v-field) {\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  height: 26px !important;"
    )
  })

  it("does not render duplicate timezone item titles when using a custom item slot", () => {
    const wrapper = shallowMount(TimezoneSelector, {
      props: {
        modelValue: {
          value: "Europe/Moscow",
          label: "Istanbul, Minsk, Moscow, St. Petersburg, Volgograd",
          gmtString: "(GMT+3:00)",
          offset: Temporal.Duration.from({ hours: 3 }),
        },
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-icon": true,
          "v-list-item": RenderingVListItemStub,
          "v-list-item-title": RenderingVListItemTitleStub,
          "v-select": ItemSlotRenderingVSelectStub,
        },
      },
    })

    expect(wrapper.text()).toContain("Istanbul, Minsk, Moscow")
    expect(wrapper.find(".generated-title").exists()).toBe(false)
  })

  it("renders timezone labels when Vuetify exposes the raw timezone object", () => {
    const wrapper = shallowMount(TimezoneSelector, {
      props: {
        modelValue: {
          value: "Europe/Moscow",
          label: "Istanbul, Minsk, Moscow, St. Petersburg, Volgograd",
          gmtString: "(GMT+3:00)",
          offset: Temporal.Duration.from({ hours: 3 }),
        },
      },
      global: {
        stubs: {
          "v-btn": true,
          "v-icon": true,
          "v-list-item": RenderingVListItemStub,
          "v-list-item-title": RenderingVListItemTitleStub,
          "v-select": DirectRawItemVSelectStub,
        },
      },
    })

    expect(wrapper.text()).toContain("(GMT+3:00) Istanbul, Minsk, Moscow")
    expect(wrapper.text()).not.toContain("[object Object]")
  })

  it("uses the shared selection palette for the active timezone dropdown item", () => {
    expect(timezoneSelectorSource).toContain("class=\"timezone-select__item\"")
    expect(timezoneSelectorSource).toContain("'timezone-select__item--active':")
    expect(timezoneSelectorSource).toContain(
      "class=\"timezone-select__item-title\""
    )
    expect(timezoneSelectorSource).toContain(
      ".timezone-select__item {\n  min-height: 48px;\n}"
    )
    expect(timezoneSelectorSource).toContain(
      ".timezone-select__item-title {\n  color: rgba(0, 0, 0, 0.87);\n}"
    )
    expect(timezoneSelectorSource).toContain(
      ".timezone-select__item--active {\n  background-color: var(--timeful-selection-bg);\n}"
    )
    expect(timezoneSelectorSource).toContain(
      ".timezone-select__item--active :deep(.timezone-select__item-title) {\n  color: var(--timeful-selection-fg);\n}"
    )
  })
})
