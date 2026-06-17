// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import { useSignInDialogState } from "./useSignInDialogState"

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

interface SignInDialogStateVm {
  step: "select" | "onboarding" | "otp"
  email: string
  firstName: string
  otpCode: string
  resendCooldown: number
  submitEmail: () => Promise<void>
  verifyOtp: () => Promise<void>
  handleDialogModelChange: (value: boolean) => void
}

const mountStateHost = () => {
  const onEmailSignIn = vi.fn()
  const onDialogVisibilityChange = vi.fn()

  const wrapper = mount(
    defineComponent({
      setup() {
        return useSignInDialogState({
          onEmailSignIn,
          onDialogVisibilityChange,
        })
      },
      template: "<div />",
    })
  )

  return {
    wrapper,
    vm: wrapper.vm as unknown as SignInDialogStateVm,
    onEmailSignIn,
    onDialogVisibilityChange,
  }
}

describe("useSignInDialogState", () => {
  beforeEach(() => {
    postMock.mockReset()
    verifyOtpSignInMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts and clears the resend cooldown around the OTP flow", async () => {
    vi.useFakeTimers()
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)

    const { vm } = mountStateHost()

    vm.email = "existing@example.com"
    await vm.submitEmail()

    expect(vm.step).toBe("otp")
    expect(vm.resendCooldown).toBe(30)

    vi.advanceTimersByTime(1000)
    expect(vm.resendCooldown).toBe(29)

    vi.advanceTimersByTime(29000)
    expect(vm.resendCooldown).toBe(0)
  })

  it("resets dialog state and clears cooldown when the dialog closes", async () => {
    vi.useFakeTimers()
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)

    const { vm, onDialogVisibilityChange } = mountStateHost()

    vm.email = "existing@example.com"
    await vm.submitEmail()
    vm.firstName = "Ada"
    vm.otpCode = "123456"

    vm.handleDialogModelChange(false)

    expect(onDialogVisibilityChange).toHaveBeenCalledWith(false)
    expect(vm.step).toBe("select")
    expect(vm.email).toBe("")
    expect(vm.firstName).toBe("")
    expect(vm.otpCode).toBe("")
    expect(vm.resendCooldown).toBe(0)

    vi.advanceTimersByTime(5000)
    expect(vm.resendCooldown).toBe(0)
  })

  it("clears the resend cooldown timer on unmount", async () => {
    vi.useFakeTimers()
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)

    const { wrapper, vm } = mountStateHost()

    vm.email = "existing@example.com"
    await vm.submitEmail()

    expect(vm.resendCooldown).toBe(30)

    wrapper.unmount()
    vi.advanceTimersByTime(5000)

    expect(vm.resendCooldown).toBe(0)
  })

  it("keeps the success callbacks wired through verification", async () => {
    postMock.mockResolvedValueOnce({ isNewUser: false })
    postMock.mockResolvedValueOnce(undefined)
    verifyOtpSignInMock.mockResolvedValue({
      _id: "user-1",
      email: "existing@example.com",
    })

    const { vm, onEmailSignIn, onDialogVisibilityChange } = mountStateHost()

    vm.email = "existing@example.com"
    await vm.submitEmail()
    vm.otpCode = "123456"
    await vm.verifyOtp()
    await flushPromises()

    expect(onEmailSignIn).toHaveBeenCalledWith({
      _id: "user-1",
      email: "existing@example.com",
    })
    expect(onDialogVisibilityChange).toHaveBeenCalledWith(false)
  })
})
