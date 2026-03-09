<template>
  <div
    class="tw-flex tw-min-h-screen tw-items-center tw-justify-center tw-bg-light-gray tw-px-4"
  >
    <div class="tw-w-full tw-max-w-[420px]">
      <!-- Logo -->
      <div class="tw-mb-8 tw-flex tw-justify-center">
        <router-link :to="{ name: 'landing' }">
          <Logo type="timeful" />
        </router-link>
      </div>

      <v-card class="tw-rounded-xl tw-px-2 tw-py-4">
        <!-- Main sign-in screen -->
        <template v-if="step === 'select'">
          <v-card-title class="tw-flex tw-flex-col tw-items-center tw-pb-0">
            <div class="tw-text-2xl tw-font-semibold">Welcome back</div>
            <div class="tw-mt-1 tw-text-sm tw-font-normal tw-text-dark-gray">
              Sign in to your account
            </div>
          </v-card-title>
          <v-card-text class="tw-flex tw-flex-col tw-items-center tw-pt-6">
            <div class="tw-mb-4 tw-flex tw-w-full tw-flex-col tw-gap-y-2">
              <v-btn block @click="signIn(calendarTypes.GOOGLE)" class="tw-bg-white">
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
              <v-btn block @click="signIn(calendarTypes.OUTLOOK)" class="tw-bg-white">
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
                <span class="tw-text-xs tw-text-gray">or</span>
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
              <router-link class="tw-text-blue" :to="{ name: 'privacy-policy' }">
                privacy policy
              </router-link>
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
              @click="step = isNewUser ? 'onboarding' : 'select'"
              class="tw-mr-1"
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
              <v-btn text x-small :disabled="resendCooldown > 0" @click="resendOtp">
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
    </div>
  </div>
</template>

<script>
import { calendarTypes } from "@/constants"
import { post, signInGoogle, signInOutlook } from "@/utils"
import { mapMutations } from "vuex"
import Logo from "@/components/Logo.vue"

export default {
  name: "SignIn",

  metaInfo: {
    title: "Sign In - Timeful",
  },

  components: {
    Logo,
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
    ...mapMutations(["setAuthUser"]),
    signIn(provider) {
      if (provider === calendarTypes.GOOGLE) {
        signInGoogle({ state: null, selectAccount: true })
      } else if (provider === calendarTypes.OUTLOOK) {
        signInOutlook({ state: null, selectAccount: true })
      }
    },
    validateEmail() {
      const email = this.email.trim()
      if (!email) {
        this.emailError = "Please enter an email address."
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.emailError = "Please enter a valid email address."
        return false
      }
      if (email.includes("+")) {
        this.emailError = "Email aliases with '+' are not allowed."
        return false
      }
      return true
    },
    async submitEmail() {
      if (this.sending) return
      this.emailError = ""
      if (!this.validateEmail()) return
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
        this.setAuthUser(user)
        this.$posthog?.identify(user._id, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        })
        this.$router.replace({ name: "home" })
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
  },

  beforeDestroy() {
    if (this.resendTimer) clearInterval(this.resendTimer)
  },
}
</script>
