// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import {
  buttonStubWithDisabled,
  mergeComponentStubs,
  nullStub,
  passThroughStub,
  vTextFieldStub,
} from "@/test/componentStubs"
import AppleCredentials from "./AppleCredentials.vue"

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

const credentialStubs = mergeComponentStubs({
  "v-btn": buttonStubWithDisabled,
  "v-img": nullStub,
  "v-text-field": vTextFieldStub,
  "v-card": passThroughStub,
})

const mountAppleCredentials = () =>
  mount(AppleCredentials, {
    global: {
      stubs: credentialStubs,
    },
  })

describe("AppleCredentials", () => {
  beforeEach(() => {
    postMock.mockReset()
    refreshAuthUserMock.mockClear()
    showErrorMock.mockClear()
    captureMock.mockClear()
  })

  it("uses variant solo and enables submit only after both credentials are present", async () => {
    postMock.mockResolvedValueOnce(undefined)

    const wrapper = mountAppleCredentials()
    const fields = wrapper.findAllComponents(vTextFieldStub)

    expect(fields).toHaveLength(2)
    expect(fields[0]?.props("variant")).toBe("solo")
    expect(fields[1]?.props("variant")).toBe("solo")

    const submitButton = wrapper.findAll("button").find(button => button.text().includes("Submit"))
    if (submitButton == null) {
      throw new Error("Expected submit button")
    }

    expect(submitButton.attributes("disabled")).toBeDefined()

    const inputs = wrapper.findAll("input")
    await inputs[0]?.setValue("apple@example.com")
    await inputs[1]?.setValue("app-password")

    expect(submitButton.attributes("disabled")).toBeUndefined()

    await submitButton.trigger("click")
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith("/user/add-apple-calendar-account", {
      email: "apple@example.com",
      password: "app-password",
    })
    expect(refreshAuthUserMock).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted("addedCalendar")).toEqual([[]])
  })
})
