<template>
  <v-dialog
    :value="value"
    @input="onDialogInput"
    :width="400"
    content-class="tw-m-0"
  >
    <v-card>
      <!-- Main sign-in screen -->
      <template v-if="step === 'select'">
        <v-card-title>Sign in</v-card-title>
        <v-card-text class="tw-flex tw-flex-col tw-items-center">
          <div class="tw-mb-4 tw-flex tw-w-full tw-flex-col tw-gap-y-2">
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

            <div class="tw-my-2 tw-flex tw-items-center tw-gap-3">
              <v-divider />
              <span class="tw-text-gray-500 tw-text-xs">or</span>
              <v-divider />
            </div>

            <v-btn
              block
              @click="signIn(calendarTypes.GOOGLE)"
              class="tw-bg-white"
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
              @click="signIn(calendarTypes.OUTLOOK)"
              class="tw-bg-white"
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
          <v-btn icon small @click="step = 'select'" class="tw-mr-1">
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
            @keydown.enter="$refs.lastNameField && $refs.lastNameField.focus()"
            class="tw-mb-3"
          />
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Last name</div>
          <v-text-field
            ref="lastNameField"
            v-model="lastName"
            placeholder="Last name (optional)"
            solo
            hide-details="auto"
            @keydown.enter="submitOnboarding"
            class="tw-mb-3"
          />
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Email</div>
          <v-text-field
            :value="email"
            placeholder="Email..."
            solo
            hide-details="auto"
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
            @click="step = isNewUser ? 'onboarding' : 'select'"
            class="tw-mr-1"
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
            @keydown.enter="verifyOtp"
            autofocus
            class="tw-mb-2"
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

<script>
import { calendarTypes } from "@/constants"
import { post } from "@/utils"

export default {
  name: "SignInDialog",
  props: {
    value: { type: Boolean, required: true },
  },
  data() {
    return {
      calendarTypes,
      step: "select",
      email: "",
      firstName: "",
      lastName: "",
      otpCode: "",
      emailError: "",
      otpError: "",
      sending: false,
      verifying: false,
      isNewUser: false,
      resendCooldown: 0,
      resendTimer: null,
    }
  },
  methods: {
    signIn(provider) {
      this.$emit("signIn", provider)
    },
    async submitEmail() {
      if (!this.email || this.sending) return
      this.emailError = ""
      this.sending = true
      try {
        const res = await post("/auth/otp/check-email", { email: this.email })
        this.isNewUser = res.isNewUser
        if (this.isNewUser) {
          this.step = "onboarding"
        } else {
          await this.sendOtpEmail()
          this.step = "otp"
          this.otpCode = ""
          this.otpError = ""
        }
      } catch (err) {
        this.emailError = "Something went wrong. Please try again."
      } finally {
        this.sending = false
      }
    },
    async submitOnboarding() {
      if (!this.firstName.trim() || this.sending) return
      this.sending = true
      try {
        await this.sendOtpEmail()
        this.step = "otp"
        this.otpCode = ""
        this.otpError = ""
      } catch (err) {
        this.otpError = "Failed to send code. Please try again."
      } finally {
        this.sending = false
      }
    },
    async sendOtpEmail() {
      await post("/auth/otp/send", { email: this.email })
      this.startResendCooldown()
    },
    async resendOtp() {
      if (this.sending || this.resendCooldown > 0) return
      this.sending = true
      try {
        await this.sendOtpEmail()
        this.otpCode = ""
        this.otpError = ""
      } catch (err) {
        this.otpError = "Failed to resend code. Please try again."
      } finally {
        this.sending = false
      }
    },
    async verifyOtp() {
      if (this.otpCode.length !== 6 || this.verifying) return
      this.otpError = ""
      this.verifying = true
      try {
        const body = {
          email: this.email,
          code: this.otpCode,
          timezoneOffset: new Date().getTimezoneOffset(),
        }
        if (this.isNewUser) {
          body.firstName = this.firstName.trim()
          body.lastName = this.lastName.trim()
        }
        const user = await post("/auth/otp/verify", body)
        this.$emit("emailSignIn", user)
        this.reset()
        this.$emit("input", false)
      } catch (err) {
        const errorCode = err?.parsed?.error
        if (errorCode === "otp-expired") {
          this.otpError = "Code has expired. Please request a new one."
        } else if (errorCode === "otp-too-many-attempts") {
          this.otpError = "Too many attempts. Please request a new code."
        } else {
          this.otpError = "Invalid code. Please try again."
        }
      } finally {
        this.verifying = false
      }
    },
    startResendCooldown() {
      this.resendCooldown = 30
      if (this.resendTimer) clearInterval(this.resendTimer)
      this.resendTimer = setInterval(() => {
        this.resendCooldown--
        if (this.resendCooldown <= 0) {
          clearInterval(this.resendTimer)
          this.resendTimer = null
        }
      }, 1000)
    },
    reset() {
      this.step = "select"
      this.email = ""
      this.firstName = ""
      this.lastName = ""
      this.otpCode = ""
      this.emailError = ""
      this.otpError = ""
      this.sending = false
      this.verifying = false
      this.isNewUser = false
      this.resendCooldown = 0
      if (this.resendTimer) clearInterval(this.resendTimer)
    },
    onDialogInput(e) {
      this.$emit("input", e)
      if (!e) this.reset()
    },
  },
  beforeDestroy() {
    if (this.resendTimer) clearInterval(this.resendTimer)
  },
}
</script>
