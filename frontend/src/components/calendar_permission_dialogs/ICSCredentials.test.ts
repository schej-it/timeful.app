// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import {
  buttonStubWithDisabled,
  mergeComponentStubs,
  vTextFieldStub,
} from "@/test/componentStubs"
import ICSCredentials from "./ICSCredentials.vue"

const { postMock, refreshAuthUserMock, showErrorMock, captureMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  refreshAuthUserMock: vi.fn(() => Promise.resolve()),
  showErrorMock: vi.fn(),
  captureMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    post: postMock,
  }
})

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    refreshAuthUser: refreshAuthUserMock,
    showError: showErrorMock,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

const mountICSCredentials = () =>
  mount(ICSCredentials, {
    global: {
      stubs: mergeComponentStubs({
        "v-btn": buttonStubWithDisabled,
        "v-text-field": vTextFieldStub,
      }),
    },
  })

describe("ICSCredentials", () => {
  beforeEach(() => {
    postMock.mockReset()
    refreshAuthUserMock.mockClear()
    showErrorMock.mockClear()
    captureMock.mockClear()
  })

  it("uses variant solo and keeps submit gated on a valid feed URL and label", async () => {
    postMock.mockResolvedValueOnce(undefined)

    const wrapper = mountICSCredentials()
    const fields = wrapper.findAllComponents(vTextFieldStub)

    expect(fields).toHaveLength(2)
    expect(fields[0]?.props("variant")).toBe("solo")
    expect(fields[1]?.props("variant")).toBe("solo")

    const submitButton = wrapper.findAll("button").find(button => button.text().includes("Submit"))
    if (submitButton == null) {
      throw new Error("Expected submit button")
    }

    const inputs = wrapper.findAll("input")

    await inputs[0]?.setValue("not-a-url")
    await inputs[1]?.setValue("Work")

    expect(fields[0]?.props("errorMessages")).toBe("Please enter a valid URL")
    expect(submitButton.attributes("disabled")).toBeDefined()

    await inputs[0]?.setValue("https://example.com/calendar.ics")

    expect(fields[0]?.props("errorMessages")).toBe("")
    expect(submitButton.attributes("disabled")).toBeUndefined()

    await submitButton.trigger("click")
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith("/user/add-ics-calendar-account", {
      feedUrl: "https://example.com/calendar.ics",
      label: "Work",
    })
    expect(refreshAuthUserMock).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted("addedCalendar")).toEqual([[]])
  })
})
