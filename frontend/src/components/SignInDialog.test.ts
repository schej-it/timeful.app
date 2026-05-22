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
import SignInDialog from "./SignInDialog.vue"

const { postMock, verifyOtpSignInMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  verifyOtpSignInMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    post: postMock,
  }
})

vi.mock("@/utils/services/UserService", () => ({
  verifyOtpSignIn: verifyOtpSignInMock,
}))

const dialogStubs = mergeComponentStubs({
  "router-link": true,
  "v-btn": buttonStubWithDisabled,
  "v-card": passThroughStub,
  "v-card-text": passThroughStub,
  "v-card-title": passThroughStub,
  "v-dialog": passThroughStub,
  "v-divider": nullStub,
  "v-icon": nullStub,
  "v-img": nullStub,
  "v-spacer": nullStub,
  "v-text-field": vTextFieldStub,
})

const mountDialog = () =>
  mount(SignInDialog, {
    props: {
      modelValue: true,
    },
    global: {
      stubs: dialogStubs,
    },
  })

const findTextFieldByPlaceholder = (
  wrapper: ReturnType<typeof mountDialog>,
  placeholder: string
) => {
  const field = wrapper
    .findAllComponents(vTextFieldStub)
    .find(component => component.props("placeholder") === placeholder)

  if (field == null) {
    throw new Error(`Expected text field with placeholder "${placeholder}"`)
  }

  return field
}

const findButtonByText = (
  wrapper: ReturnType<typeof mountDialog>,
  text: string
) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing "${text}"`)
  }

  return button
}

describe("SignInDialog", () => {
  beforeEach(() => {
    postMock.mockReset()
    verifyOtpSignInMock.mockReset()
  })

  it("uses variant solo for all credential fields", async () => {
    postMock.mockResolvedValueOnce({ isNewUser: true })

    const wrapper = mountDialog()

    expect(findTextFieldByPlaceholder(wrapper, "Enter your email...").props("variant")).toBe(
      "solo"
    )

    await wrapper.get('input[placeholder="Enter your email..."]').setValue("new@example.com")
    await findButtonByText(wrapper, "Continue with Email").trigger("click")
    await flushPromises()

    expect(findTextFieldByPlaceholder(wrapper, "First name").props("variant")).toBe("solo")
    expect(findTextFieldByPlaceholder(wrapper, "Last name (optional)").props("variant")).toBe(
      "solo"
    )
    expect(findTextFieldByPlaceholder(wrapper, "Email...").props("variant")).toBe("solo")

    const otpWrapper = mountDialog()

    postMock.mockReset()
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)

    await otpWrapper.get('input[placeholder="Enter your email..."]').setValue("existing@example.com")
    await findButtonByText(otpWrapper, "Continue with Email").trigger("click")
    await flushPromises()

    expect(findTextFieldByPlaceholder(otpWrapper, "Enter 6-digit code...").props("variant")).toBe(
      "solo"
    )
  })

  it("keeps email validation errors gating OTP send", async () => {
    const wrapper = mountDialog()

    await wrapper.get('input[placeholder="Enter your email..."]').setValue("invalid-email")
    await findButtonByText(wrapper, "Continue with Email").trigger("click")

    expect(postMock).not.toHaveBeenCalled()
    expect(findTextFieldByPlaceholder(wrapper, "Enter your email...").props("errorMessages")).toBe(
      "Please enter a valid email address."
    )
  })

  it("keeps onboarding continue disabled until first name is present", async () => {
    postMock.mockResolvedValueOnce({ isNewUser: true })

    const wrapper = mountDialog()

    await wrapper.get('input[placeholder="Enter your email..."]').setValue("new@example.com")
    await findButtonByText(wrapper, "Continue with Email").trigger("click")
    await flushPromises()

    const continueButton = findButtonByText(wrapper, "Continue")
    expect(continueButton.attributes("disabled")).toBeDefined()

    await wrapper.get('input[placeholder="First name"]').setValue("Ada")

    expect(continueButton.attributes("disabled")).toBeUndefined()
  })

  it("keeps OTP verify gated until six digits are present", async () => {
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)
    verifyOtpSignInMock.mockResolvedValue({
      _id: "user-1",
      email: "existing@example.com",
    })

    const wrapper = mountDialog()

    await wrapper.get('input[placeholder="Enter your email..."]').setValue("existing@example.com")
    await findButtonByText(wrapper, "Continue with Email").trigger("click")
    await flushPromises()

    const verifyButton = findButtonByText(wrapper, "Verify")
    expect(verifyButton.attributes("disabled")).toBeDefined()

    await verifyButton.trigger("click")
    expect(verifyOtpSignInMock).not.toHaveBeenCalled()

    await wrapper.get('input[placeholder="Enter 6-digit code..."]').setValue("123456")

    expect(verifyButton.attributes("disabled")).toBeUndefined()

    await verifyButton.trigger("click")
    await flushPromises()

    expect(verifyOtpSignInMock).toHaveBeenCalledTimes(1)
  })
})
