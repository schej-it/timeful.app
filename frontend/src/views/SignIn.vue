<template>
  <div
    class="tw-flex tw-min-h-screen tw-items-center tw-justify-center tw-bg-light-gray tw-px-4"
  >
    <div class="tw-w-full tw-max-w-[420px]">
      <!-- Logo -->
      <div class="tw-mb-8 tw-flex tw-justify-center">
        <router-link :to="{ name: 'landing' }">
          <v-img
            alt="Timeful Logo"
            class="shrink tw-cursor-pointer"
            contain
            src="@/assets/timeful_logo_with_text.png"
            transition="fade-transition"
            width="160"
          />
        </router-link>
      </div>

      <v-card class="tw-rounded-xl tw-px-2 tw-py-4">
        <!-- Main sign-in screen -->
        <template v-if="step === 'select'">
          <v-card-title class="tw-flex tw-flex-col tw-items-center tw-pb-0">
            <div class="tw-text-2xl tw-font-medium">
              {{ isSignUp ? "Create an account" : "Welcome back" }}
            </div>
            <div class="tw-mt-1 tw-text-sm tw-font-normal tw-text-dark-gray">
              {{
                isSignUp ? "Sign up to get started" : "Sign in to your account"
              }}
            </div>
          </v-card-title>
          <v-card-text class="tw-flex tw-flex-col tw-items-center tw-pt-6">
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
                  {{ isSignUp ? "Sign up with" : "Continue with" }} Google
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
                  {{ isSignUp ? "Sign up with" : "Continue with" }} Outlook
                  <v-spacer />
                </div>
              </v-btn>

              <div class="tw-my-2 tw-flex tw-items-center tw-gap-3">
                <v-divider />
                <span class="tw-text-xs tw-text-gray">or</span>
                <v-divider />
              </div>

              <div>
                <div class="tw-mb-1 tw-text-sm tw-font-medium">
                  Email address
                </div>
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
                  {{ isSignUp ? "Sign up with" : "Continue with" }} Email
                </v-btn>
              </div>
            </div>
            <div class="tw-text-center tw-text-xs">
              By continuing, you agree to our
              <router-link
                class="tw-text-blue"
                :to="{ name: 'privacy-policy' }"
              >
                privacy policy
              </router-link>
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
            <p class="tw-mb-4 tw-text-sm tw-text-dark-gray">
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
              @keydown.enter="lastNameField && lastNameField.focus()"
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
              :value="email"
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
            <p class="tw-mb-4 tw-text-sm tw-text-dark-gray">
              Enter the 6-digit code sent to
              <strong>{{ email }}</strong>
            </p>
            <div class="tw-mb-1 tw-text-sm tw-font-medium">
              Verification code
            </div>
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

      <div
        class="tw-mt-4 tw-rounded-xl tw-bg-light-gray-stroke/50 tw-py-4 tw-text-center tw-text-sm tw-text-dark-gray"
      >
        <template v-if="isSignUp">
          Already have an account?
          <router-link
            class="tw-font-medium tw-text-green"
            :to="{ name: 'sign-in', query: route.query }"
            >Log in</router-link
          >
        </template>
        <template v-else>
          Don't have an account?
          <router-link
            class="tw-font-medium tw-text-green"
            :to="{ name: 'sign-up', query: route.query }"
            >Sign up</router-link
          >
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useHead } from "@unhead/vue"
import { authTypes, calendarTypes } from "@/constants"
import { post, signInGoogle, signInOutlook } from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import { Temporal } from "temporal-polyfill"
import type { User } from "@/types"

const props = defineProps<{
  initialIsSignUp?: boolean
}>()

const router = useRouter()
const route = useRoute()
const mainStore = useMainStore()

defineOptions({ name: 'AppSignIn' })

const isSignUp = ref(props.initialIsSignUp)
const step = ref("select")
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
const resendTimer = ref<ReturnType<typeof setInterval> | null>(null)

const lastNameField = ref<{ focus: () => void } | null>(null)

useHead(
  computed(() => ({
    title: isSignUp.value ? "Sign Up - Timeful" : "Sign In - Timeful",
  }))
)

const upgradeRedirect = computed(
  () => route.query.redirect === "upgrade"
)

function signIn(provider: string) {
  const state = upgradeRedirect.value
    ? { type: authTypes.UPGRADE, upgradeParams: route.query.upgradeParams }
    : null
  if (provider === calendarTypes.GOOGLE) {
    signInGoogle({ state, selectAccount: true })
  } else if (provider === calendarTypes.OUTLOOK) {
    signInOutlook({ state, selectAccount: true })
  }
}

function validateEmail() {
  const trimmed = email.value.trim()
  if (!trimmed) {
    emailError.value = "Please enter an email address."
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    emailError.value = "Please enter a valid email address."
    return false
  }
  if (trimmed.includes("+")) {
    emailError.value = "Email aliases with '+' are not allowed."
    return false
  }
  return true
}

async function submitEmail() {
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

async function submitOnboarding() {
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

async function sendOtpEmail() {
  await post("/auth/otp/send", { email: email.value })
  startResendCooldown()
}

async function resendOtp() {
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

async function verifyOtp() {
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
    const user = await post<User>("/auth/otp/verify", body)
    mainStore.setAuthUser(user)
    posthog.identify(user._id, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    await handlePostAuthRedirect(user)
  } catch (err: unknown) {
    const errorCode = (err as { parsed?: { error?: string } } | undefined)?.parsed?.error
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

interface UpgradeParams {
  priceId: string
  isSubscription: boolean
  originUrl: string
}

async function handlePostAuthRedirect(user: User) {
  if (upgradeRedirect.value) {
    try {
      const params = JSON.parse(route.query.upgradeParams as string) as UpgradeParams
      const res = await post<{ url: string }>(
        "/stripe/create-checkout-session",
        {
          priceId: params.priceId,
          userId: user._id,
          isSubscription: params.isSubscription,
          originUrl: params.originUrl,
        }
      )
      window.location.href = res.url
      return
    } catch (e) {
      console.error(e)
    }
  }
  void router.replace({ name: "home" })
}

function startResendCooldown() {
  resendCooldown.value = 30
  if (resendTimer.value) clearInterval(resendTimer.value)
  resendTimer.value = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(resendTimer.value ?? undefined)
      resendTimer.value = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (resendTimer.value) clearInterval(resendTimer.value)
})
</script>
