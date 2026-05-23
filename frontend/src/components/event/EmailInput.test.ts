// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it, vi } from "vitest"
import EmailInput from "./EmailInput.vue"

vi.mock("@/utils", () => ({
  get: vi.fn(() => Promise.resolve([])),
  validateEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
}))

const VComboboxStub = defineComponent({
  name: "VCombobox",
  props: {
    itemTitle: {
      type: String,
      default: undefined,
    },
    itemValue: {
      type: String,
      default: undefined,
    },
    modelValue: {
      type: Array,
      default: () => [],
    },
    rules: {
      type: Array,
      default: () => [],
    },
    searchInput: {
      type: String,
      default: "",
    },
    variant: {
      type: String,
      default: undefined,
    },
  },
  emits: ["update:modelValue", "update:searchInput"],
  template: `
    <div>
      <input class="search-input" :value="searchInput" />
      <button
        class="emit-remindee"
        @click="$emit('update:modelValue', ['guest@example.com'])"
      />
    </div>
  `,
})

describe("EmailInput", () => {
  it("uses explicit Vuetify 3 combobox props and emits trimmed emails", async () => {
    const wrapper = mount(EmailInput, {
      props: {
        addedEmails: [],
      },
      global: {
        stubs: {
          "v-combobox": VComboboxStub,
          "v-expand-transition": true,
          "v-icon": true,
          "v-list-item": true,
          "v-list-item-subtitle": true,
          "v-list-item-title": true,
          UserChip: true,
        },
      },
    })

    const combobox = wrapper.getComponent(VComboboxStub)
    expect(combobox.props("variant")).toBe("solo")
    expect(combobox.props("itemTitle")).toBe("queryString")
    expect(combobox.props("itemValue")).toBe("queryString")

    await wrapper.get(".emit-remindee").trigger("click")

    expect(wrapper.emitted("update:emails")?.at(-1)).toEqual([["guest@example.com"]])
  })

  it("resyncs its internal entries when the parent changes addedEmails", async () => {
    const wrapper = mount(EmailInput, {
      props: {
        addedEmails: ["first@example.com"],
      },
      global: {
        stubs: {
          "v-combobox": VComboboxStub,
          "v-expand-transition": true,
          "v-icon": true,
          "v-list-item": true,
          "v-list-item-subtitle": true,
          "v-list-item-title": true,
          UserChip: true,
        },
      },
    })

    await wrapper.setProps({ addedEmails: ["second@example.com"] })

    expect(wrapper.emitted("update:emails")?.at(-1)).toEqual([
      ["second@example.com"],
    ])
  })
})
