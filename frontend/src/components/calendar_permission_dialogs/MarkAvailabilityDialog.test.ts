/* eslint-disable vue/one-component-per-file */

// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { defineComponent } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mergeComponentStubs, passThroughStub } from "@/test/componentStubs"
import MarkAvailabilityDialog from "./MarkAvailabilityDialog.vue"

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

const CalendarPermissionsCardStub = defineComponent({
  emits: ["cancel", "allow"],
  template: '<div data-test="calendar-permissions-card" />',
})

const CreateAccountStub = defineComponent({
  emits: ["signInLinkApple", "back", "continue"],
  template: '<div data-test="create-account" />',
})

const AppleCredentialsStub = defineComponent({
  emits: ["back", "addedAppleCalendar"],
  template: '<div data-test="apple-credentials" />',
})

const ICSCredentialsStub = defineComponent({
  emits: ["back", "addedCalendar"],
  template: '<div data-test="ics-credentials" />',
})

const mountDialog = () =>
  mount(MarkAvailabilityDialog, {
    props: {
      modelValue: true,
    },
    global: {
      plugins: [createPinia()],
      stubs: mergeComponentStubs({
        AppleCredentials: AppleCredentialsStub,
        CalendarPermissionsCard: CalendarPermissionsCardStub,
        CreateAccount: CreateAccountStub,
        ICSCredentials: ICSCredentialsStub,
        "v-btn": passThroughStub,
        "v-card": passThroughStub,
        "v-dialog": passThroughStub,
        "v-divider": passThroughStub,
        "v-expand-transition": passThroughStub,
        "v-icon": passThroughStub,
        "v-spacer": passThroughStub,
      }),
    },
  })

describe("MarkAvailabilityDialog", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("renders provider icons for the autofill actions", () => {
    const wrapper = mountDialog()
    const icons = wrapper.findAll("img")

    expect(icons).toHaveLength(3)
    expect(icons.map(icon => icon.attributes("alt"))).toEqual(["Google", "Apple", "Outlook"])
    expect(icons[0]?.attributes("src")).toContain("google_logo.svg")
    expect(icons[1]?.attributes("src")).toContain("apple_logo.svg")
    expect(icons[2]?.attributes("src")).toContain("outlook_logo.svg")
  })
})
