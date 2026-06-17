/* eslint-disable vue/one-component-per-file */

// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it } from "vitest"
import {
  buttonStubWithDisabled,
  mergeComponentStubs,
  nullStub,
  passThroughStub,
} from "@/test/componentStubs"
import CalendarTypeSelector from "./CalendarTypeSelector.vue"

const AppleCredentialsStub = defineComponent({
  emits: ["back", "addedCalendar"],
  template: `
    <div data-test="apple-credentials">
      <button type="button" @click="$emit('back')">Back</button>
      <button type="button" @click="$emit('addedCalendar')">Add Apple</button>
    </div>
  `,
})

const ICSCredentialsStub = defineComponent({
  emits: ["back", "addedCalendar"],
  template: `
    <div data-test="ics-credentials">
      <button type="button" @click="$emit('back')">Back</button>
      <button type="button" @click="$emit('addedCalendar')">Add ICS</button>
    </div>
  `,
})

const mountCalendarTypeSelector = (visible = true) =>
  mount(CalendarTypeSelector, {
    props: { visible },
    global: {
      stubs: mergeComponentStubs({
        AppleCredentials: AppleCredentialsStub,
        ICSCredentials: ICSCredentialsStub,
        "v-btn": buttonStubWithDisabled,
        "v-card": passThroughStub,
        "v-card-text": passThroughStub,
        "v-card-title": passThroughStub,
        "v-expand-transition": passThroughStub,
        "v-icon": nullStub,
        "v-img": nullStub,
        "v-spacer": nullStub,
      }),
    },
  })

const findButtonByText = (
  wrapper: ReturnType<typeof mountCalendarTypeSelector>,
  text: string
) => {
  const button = wrapper.findAll("button").find(node => node.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing text: ${text}`)
  }

  return button
}

describe("CalendarTypeSelector", () => {
  it("emits provider actions from the picker view", async () => {
    const wrapper = mountCalendarTypeSelector()

    await findButtonByText(wrapper, "Google Calendar").trigger("click")
    await findButtonByText(wrapper, "Outlook Calendar").trigger("click")

    expect(wrapper.emitted("addGoogleCalendar")).toEqual([[]])
    expect(wrapper.emitted("addOutlookCalendar")).toEqual([[]])
  })

  it("resets the nested flow when a new visible session starts", async () => {
    const wrapper = mountCalendarTypeSelector()

    await findButtonByText(wrapper, "Apple Calendar").trigger("click")
    expect(wrapper.find('[data-test="apple-credentials"]').exists()).toBe(true)

    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })

    expect(wrapper.find('[data-test="apple-credentials"]').exists()).toBe(false)
    expect(findButtonByText(wrapper, "Google Calendar").exists()).toBe(true)
  })

  it("forwards added-calendar from nested credential flows", async () => {
    const wrapper = mountCalendarTypeSelector()

    await findButtonByText(wrapper, "ICS Calendar Feed").trigger("click")
    await findButtonByText(wrapper, "Add ICS").trigger("click")

    expect(wrapper.emitted("addedCalendar")).toEqual([[]])
  })
})
