// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file */

import { computed, defineComponent, h } from "vue"
import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import newDialogSource from "./NewDialog.vue?raw"
import NewDialog from "./NewDialog.vue"

const {
  storeState,
} = vi.hoisted(() => ({
  storeState: {
    groupsEnabled: true,
    signUpFormEnabled: true,
  },
}))

vi.mock("pinia", () => ({
  storeToRefs: () => ({
    groupsEnabled: computed(() => storeState.groupsEnabled),
    signUpFormEnabled: computed(() => storeState.signUpFormEnabled),
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({}),
}))

vi.mock("@/utils/useDisplayHelpers", () => ({
  useDisplayHelpers: () => ({
    isPhone: computed(() => false),
  }),
}))

const editableFormState = {
  hasEventBeenEdited: false,
  reset: vi.fn(),
  resetToEventData: vi.fn(),
}

const createEditableStub = (name: string) =>
  defineComponent({
    name,
    emits: ["update:modelValue", "signIn"],
    setup(_, { emit, expose }) {
      expose({
        hasEventBeenEdited: () => editableFormState.hasEventBeenEdited,
        reset: editableFormState.reset,
        resetToEventData: editableFormState.resetToEventData,
      })

      return () =>
        h("div", { "data-testid": name }, [
          h(
            "button",
            {
              class: `${name}-close`,
              onClick: () => {
                emit("update:modelValue", false)
              },
            },
            "close"
          ),
        ])
    },
  })

const VDialogStub = defineComponent({
  name: "VDialogStub",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["update:modelValue", "click:outside"],
  setup(_, { slots }) {
    return () => h("div", slots.default?.())
  },
})

const VBtnStub = defineComponent({
  name: "VBtnStub",
  inheritAttrs: false,
  emits: ["click"],
  setup(_, { attrs, slots, emit }) {
    return () =>
      h(
        "button",
        {
          ...attrs,
          onClick: () => {
            emit("click")
          },
        },
        slots.default?.()
      )
  },
})

const UnsavedChangesDialogStub = defineComponent({
  name: "UnsavedChangesDialogStub",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["update:modelValue", "leave"],
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "data-testid": "unsaved-dialog",
          "data-open": String(props.modelValue),
        },
        slots.default?.()
      )
  },
})

const mountDialog = (props: Record<string, unknown> = {}) =>
  mount(NewDialog, {
    props: {
      modelValue: true,
      type: "event",
      ...props,
    },
    global: {
      stubs: {
        "v-dialog": VDialogStub,
        "v-card": { template: "<div><slot /></div>" },
        "v-btn": VBtnStub,
        "v-icon": true,
        "v-spacer": true,
        NewEvent: createEditableStub("NewEvent"),
        NewGroup: createEditableStub("NewGroup"),
        NewSignUp: createEditableStub("NewSignUp"),
        UnsavedChangesDialog: UnsavedChangesDialogStub,
      },
    },
  })

describe("NewDialog", () => {
  beforeEach(() => {
    storeState.groupsEnabled = true
    storeState.signUpFormEnabled = true
    editableFormState.hasEventBeenEdited = false
    editableFormState.reset.mockReset()
    editableFormState.resetToEventData.mockReset()
  })

  it("only renders the wrapper header when tabs are visible and otherwise delegates close actions to child dialogs", () => {
    expect(newDialogSource).toContain(
      '<div v-if="!_noTabs" class="tw-flex tw-rounded sm:-tw-mt-4 sm:tw-px-8">'
    )
    expect(newDialogSource).toContain(':hide-dialog-actions="!_noTabs"')
  })

  it("emits close through the dialog model and resets the active child form", async () => {
    const wrapper = mountDialog()

    await wrapper.get(".tw-self-center").trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
    expect(editableFormState.reset).toHaveBeenCalledTimes(1)
    expect(editableFormState.resetToEventData).not.toHaveBeenCalled()
  })

  it("resets the active tab from the current type when reopened", async () => {
    const wrapper = mountDialog({ type: "event" })

    await wrapper.get('[tab-value="signup"]').trigger("click")
    expect(wrapper.find('[data-testid="NewSignUp"]').exists()).toBe(true)

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ type: "group", modelValue: true })

    expect(wrapper.find('[data-testid="NewGroup"]').exists()).toBe(true)
  })

  it("opens the unsaved changes dialog instead of closing when the child has edits", async () => {
    editableFormState.hasEventBeenEdited = true

    const wrapper = mountDialog({ edit: true })

    await wrapper.get(".tw-self-center").trigger("click")

    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
    expect(wrapper.get('[data-testid="unsaved-dialog"]').attributes("data-open")).toBe(
      "true"
    )
    expect(editableFormState.reset).not.toHaveBeenCalled()
    expect(editableFormState.resetToEventData).not.toHaveBeenCalled()
  })
})
