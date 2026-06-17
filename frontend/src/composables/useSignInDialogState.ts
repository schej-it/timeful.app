import { computed, onBeforeUnmount, ref } from "vue"
import { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import { post } from "@/utils"
import { verifyOtpSignIn } from "@/utils/services/UserService"

type Step = "select" | "onboarding" | "otp"

interface CheckEmailResponse {
  isNewUser: boolean
}

export interface UseSignInDialogStateOptions {
  onEmailSignIn: (user: User) => void
  onDialogVisibilityChange: (value: boolean) => void
}

export const useSignInDialogState = ({
  onEmailSignIn,
  onDialogVisibilityChange,
}: UseSignInDialogStateOptions) => {
  const step = ref<Step>("select")
  const email = ref("")
  const firstName = ref("")
  const lastName = ref("")
  const otpCode = ref("")
  const emailError = ref("")
  const otpError = ref("")
  const sending = ref(false)
  const verifying = ref(false)
  const isNewUser = ref(false)
  const resendCooldown = ref(0)
  let resendTimer: ReturnType<typeof setInterval> | null = null

  const canSubmitOnboarding = computed(() => firstName.value.trim().length > 0 && !sending.value)
  const canVerifyOtp = computed(() => otpCode.value.length === 6 && !verifying.value)

  const clearResendCooldown = () => {
    resendCooldown.value = 0
    if (resendTimer != null) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }

  const startResendCooldown = () => {
    clearResendCooldown()
    resendCooldown.value = 30

    resendTimer = setInterval(() => {
      resendCooldown.value -= 1
      if (resendCooldown.value <= 0) {
        clearResendCooldown()
      }
    }, 1000)
  }

  const clearOtpState = () => {
    otpCode.value = ""
    otpError.value = ""
  }

  const validateEmail = () => {
    const trimmedEmail = email.value.trim()
    if (!trimmedEmail) {
      emailError.value = "Please enter an email address."
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      emailError.value = "Please enter a valid email address."
      return false
    }
    if (trimmedEmail.includes("+")) {
      emailError.value = "Email aliases with '+' are not allowed."
      return false
    }
    return true
  }

  const sendOtpEmail = async () => {
    await post("/auth/otp/send", { email: email.value })
    startResendCooldown()
  }

  const submitEmail = async () => {
    if (sending.value) return

    emailError.value = ""
    if (!validateEmail()) return

    sending.value = true
    try {
      const res = await post<CheckEmailResponse>("/auth/otp/check-email", {
        email: email.value,
      })
      isNewUser.value = res.isNewUser
      if (isNewUser.value) {
        step.value = "onboarding"
      } else {
        await sendOtpEmail()
        step.value = "otp"
        clearOtpState()
      }
    } catch {
      emailError.value = "Something went wrong. Please try again."
    } finally {
      sending.value = false
    }
  }

  const submitOnboarding = async () => {
    if (!canSubmitOnboarding.value) return

    sending.value = true
    try {
      await sendOtpEmail()
      step.value = "otp"
      clearOtpState()
    } catch {
      otpError.value = "Failed to send code. Please try again."
    } finally {
      sending.value = false
    }
  }

  const resendOtp = async () => {
    if (sending.value || resendCooldown.value > 0) return

    sending.value = true
    try {
      await sendOtpEmail()
      clearOtpState()
    } catch {
      otpError.value = "Failed to resend code. Please try again."
    } finally {
      sending.value = false
    }
  }

  const verifyOtp = async () => {
    if (!canVerifyOtp.value) return

    otpError.value = ""
    verifying.value = true
    try {
      const body: Record<string, unknown> = {
        email: email.value,
        code: otpCode.value,
        timezoneOffset:
          (Temporal.Now.zonedDateTimeISO().offsetNanoseconds / (1000 * 1000 * 1000) / 60) * -1,
      }
      if (isNewUser.value) {
        body.firstName = firstName.value.trim()
        body.lastName = lastName.value.trim()
      }
      const user = await verifyOtpSignIn(body)
      onEmailSignIn(user)
      reset()
      onDialogVisibilityChange(false)
    } catch (err: unknown) {
      const errorCode = (err as { parsed?: { error?: string } }).parsed?.error
      if (errorCode === "otp-expired") {
        otpError.value = "Code has expired. Please request a new one."
      } else if (errorCode === "otp-too-many-attempts") {
        otpError.value = "Too many attempts. Please request a new code."
      } else {
        otpError.value = "Invalid code. Please try again."
      }
    } finally {
      verifying.value = false
    }
  }

  const reset = () => {
    step.value = "select"
    email.value = ""
    firstName.value = ""
    lastName.value = ""
    clearOtpState()
    emailError.value = ""
    sending.value = false
    verifying.value = false
    isNewUser.value = false
    clearResendCooldown()
  }

  const handleDialogModelChange = (value: boolean) => {
    onDialogVisibilityChange(value)
    if (!value) {
      reset()
    }
  }

  const returnToProviderSelection = () => {
    step.value = "select"
  }

  const returnFromOtp = () => {
    step.value = isNewUser.value ? "onboarding" : "select"
  }

  onBeforeUnmount(clearResendCooldown)

  return {
    step,
    email,
    firstName,
    lastName,
    otpCode,
    emailError,
    otpError,
    sending,
    verifying,
    isNewUser,
    resendCooldown,
    canSubmitOnboarding,
    canVerifyOtp,
    submitEmail,
    submitOnboarding,
    resendOtp,
    verifyOtp,
    reset,
    handleDialogModelChange,
    returnToProviderSelection,
    returnFromOtp,
  }
}
