<template>
  <v-dialog
    :model-value="modelValue"
    :width="400"
    content-class="tw-m-0"
    @update:model-value="onDialogInput"
  >
    <v-card>
      <!-- Main sign-in screen -->
      <template v-if="step === 'select'">
        <v-card-title>Sign in</v-card-title>
        <v-card-text class="tw-flex tw-flex-col tw-items-center">
          <div class="tw-mb-4 tw-flex tw-w-full tw-flex-col tw-gap-y-2">
            <v-btn
              block
              class="tw-bg-white"
              @click="signIn(calendarTypes.GOOGLE)"
            >
              <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
                <v-img
                  class="tw-flex-initial"
                  width="20"
                  height="20"
                  src="@/assets/google_logo.svg"
                />
                <v-spacer />
                Continue with Google
                <v-spacer />
              </div>
            </v-btn>
            <v-btn
              block
              class="tw-bg-white"
              @click="signIn(calendarTypes.OUTLOOK)"
            >
              <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
                <v-img
                  class="tw-flex-initial"
                  width="20"
                  height="20"
                  src="@/assets/outlook_logo.svg"
                />
                <v-spacer />
                Continue with Outlook
                <v-spacer />
              </div>
            </v-btn>

            <div class="tw-my-2 tw-flex tw-items-center tw-gap-3">
              <v-divider />
              <span class="tw-text-gray-500 tw-text-xs">or</span>
              <v-divider />
            </div>

            <div>
              <div class="tw-mb-1 tw-text-sm tw-font-medium">Email address</div>
              <v-text-field
                v-model="email"
                class="tw-mb-2"
                placeholder="Enter your email..."
                type="email"
                solo
                hide-details="auto"
                :error-messages="emailError"
                @keydown.enter="submitEmail"
              />
              <v-btn
                block
                color="primary"
                :loading="sending"
                :disabled="sending"
                @click="submitEmail"
              >
                Continue with Email
              </v-btn>
            </div>
          </div>
          <div class="tw-text-center tw-text-xs">
            By continuing, you agree to our
            <router-link class="tw-text-blue" :to="{ name: 'privacy-policy' }"
              >privacy policy</router-link
            >
          </div>
        </v-card-text>
      </template>

      <!-- Onboarding: name entry for new users -->
      <template v-else-if="step === 'onboarding'">
        <v-card-title class="tw-flex tw-items-center">
          <v-btn icon small class="tw-mr-1" @click="step = 'select'">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          What's your name?
        </v-card-title>
        <v-card-text>
          <p class="tw-text-gray-600 tw-mb-4 tw-text-sm">
            We just need a couple details to set up your account.
          </p>
          <div class="tw-mb-1 tw-text-sm tw-font-medium">First name</div>
          <v-text-field
            v-model="firstName"
            placeholder="First name"
            solo
            hide-details="auto"
            autofocus
            class="tw-mb-3"
            @keydown.enter="lastNameField?.focus()"
          />
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Last name</div>
          <v-text-field
            ref="lastNameField"
            v-model="lastName"
            placeholder="Last name (optional)"
            solo
            hide-details="auto"
            class="tw-mb-3"
            @keydown.enter="submitOnboarding"
          />
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Email</div>
          <v-text-field
            :model-value="email"
            placeholder="Email..."
            solo
            hide-details="auto"
            disabled
            background-color="#f5f5f5"
            class="tw-mb-3"
          />
          <v-btn
            block
            color="primary"
            :loading="sending"
            :disabled="!firstName.trim() || sending"
            @click="submitOnboarding"
          >
            Continue
          </v-btn>
        </v-card-text>
      </template>

      <!-- OTP code input -->
      <template v-else-if="step === 'otp'">
        <v-card-title class="tw-flex tw-items-center">
          <v-btn
            icon
            small
            class="tw-mr-1"
            @click="step = isNewUser ? 'onboarding' : 'select'"
          >
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          Enter verification code
        </v-card-title>
        <v-card-text>
          <p class="tw-text-gray-600 tw-mb-4 tw-text-sm">
            Enter the 6-digit code sent to
            <strong>{{ email }}</strong>
          </p>
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Verification code</div>
          <v-text-field
            v-model="otpCode"
            placeholder="Enter 6-digit code..."
            solo
            hide-details="auto"
            maxlength="6"
            :error-messages="otpError"
            autofocus
            class="tw-mb-2"
            @keydown.enter="verifyOtp"
          />
          <v-btn
            block
            color="primary"
            :loading="verifying"
            :disabled="otpCode.length !== 6 || verifying"
            @click="verifyOtp"
          >
            Verify
          </v-btn>
          <div class="tw-mt-3 tw-text-center">
            <v-btn
              text
              x-small
              :disabled="resendCooldown > 0"
              @click="resendOtp"
            >
              {{
                resendCooldown > 0
                  ? `Resend code (${resendCooldown}s)`
                  : "Resend code"
              }}
            </v-btn>
          </div>
        </v-card-text>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue"
import { calendarTypes, type CalendarType } from "@/constants"
import { post } from "@/utils"
import { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import type { RawUser } from "@/types/transport"
import { fromRawUser } from "@/types/transport"

defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  signIn: [provider: CalendarType]
  emailSignIn: [user: User]
}>()

type Step = "select" | "onboarding" | "otp"

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
const lastNameField = ref<{ focus: () => void } | null>(null)

const signIn = (provider: CalendarType) => {
  emit("signIn", provider)
}

const validateEmail = () => {
  const e = email.value.trim()
  if (!e) {
    emailError.value = "Please enter an email address."
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    emailError.value = "Please enter a valid email address."
    return false
  }
  if (e.includes("+")) {
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
    const res = await post<{ isNewUser: boolean }>("/auth/otp/check-email", {
      email: email.value,
    })
    isNewUser.value = res.isNewUser
    if (isNewUser.value) {
      step.value = "onboarding"
    } else {
      await sendOtpEmail()
      step.value = "otp"
      otpCode.value = ""
      otpError.value = ""
    }
  } catch {
    emailError.value = "Something went wrong. Please try again."
  } finally {
    sending.value = false
  }
}

const submitOnboarding = async () => {
  if (!firstName.value.trim() || sending.value) return
  sending.value = true
  try {
    await sendOtpEmail()
    step.value = "otp"
    otpCode.value = ""
    otpError.value = ""
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
    otpCode.value = ""
    otpError.value = ""
  } catch {
    otpError.value = "Failed to resend code. Please try again."
  } finally {
    sending.value = false
  }
}

const verifyOtp = async () => {
  if (otpCode.value.length !== 6 || verifying.value) return
  otpError.value = ""
  verifying.value = true
  try {
    const body: Record<string, unknown> = {
      email: email.value,
      code: otpCode.value,
      timezoneOffset: Temporal.Now.zonedDateTimeISO().offsetNanoseconds / (1000 * 1000 * 1000) / 60 * -1,
    }
    if (isNewUser.value) {
      body.firstName = firstName.value.trim()
      body.lastName = lastName.value.trim()
    }
    const user = fromRawUser(await post<RawUser>("/auth/otp/verify", body))
    emit("emailSignIn", user)
    reset()
    emit("update:modelValue", false)
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

const startResendCooldown = () => {
  resendCooldown.value = 30
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      if (resendTimer) clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

const reset = () => {
  step.value = "select"
  email.value = ""
  firstName.value = ""
  lastName.value = ""
  otpCode.value = ""
  emailError.value = ""
  otpError.value = ""
  sending.value = false
  verifying.value = false
  isNewUser.value = false
  resendCooldown.value = 0
  if (resendTimer) clearInterval(resendTimer)
}

const onDialogInput = (e: boolean) => {
  emit("update:modelValue", e)
  if (!e) reset()
}

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})
</script>
