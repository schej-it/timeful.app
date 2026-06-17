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
              class="timeful-elevated-button tw-bg-white"
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
              class="timeful-elevated-button tw-bg-white"
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
                class="timeful-solo-field tw-mb-2"
                placeholder="Enter your email..."
                type="email"
                variant="solo"
                hide-details="auto"
                :error-messages="emailError"
                @keydown.enter="submitEmail"
              />
              <v-btn
                block
                color="primary"
                class="timeful-elevated-button"
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
          <v-btn
            icon
            size="small"
            class="tw-mr-1"
            @click="returnToProviderSelection"
          >
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
            variant="solo"
            hide-details="auto"
            autofocus
            class="timeful-solo-field tw-mb-3"
            @keydown.enter="lastNameField?.focus()"
          />
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Last name</div>
          <v-text-field
            ref="lastNameField"
            v-model="lastName"
            placeholder="Last name (optional)"
            variant="solo"
            hide-details="auto"
            class="timeful-solo-field tw-mb-3"
            @keydown.enter="submitOnboarding"
          />
          <div class="tw-mb-1 tw-text-sm tw-font-medium">Email</div>
          <v-text-field
            :model-value="email"
            placeholder="Email..."
            variant="solo"
            hide-details="auto"
            disabled
            background-color="#f5f5f5"
            class="timeful-solo-field tw-mb-3"
          />
          <v-btn
            block
            color="primary"
            class="timeful-elevated-button"
            :loading="sending"
            :disabled="!canSubmitOnboarding"
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
            size="small"
            class="tw-mr-1"
            @click="returnFromOtp"
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
            variant="solo"
            hide-details="auto"
            maxlength="6"
            :error-messages="otpError"
            autofocus
            class="timeful-solo-field tw-mb-2"
            @keydown.enter="verifyOtp"
          />
          <v-btn
            block
            color="primary"
            class="timeful-elevated-button"
            :loading="verifying"
            :disabled="!canVerifyOtp"
            @click="verifyOtp"
          >
            Verify
          </v-btn>
          <div class="tw-mt-3 tw-text-center">
            <v-btn
              variant="text"
              size="x-small"
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
import { ref } from "vue"
import { calendarTypes, type CalendarType } from "@/constants"
import type { User } from "@/types"
import { useSignInDialogState } from "@/composables/useSignInDialogState"

defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  signIn: [provider: CalendarType]
  emailSignIn: [user: User]
}>()

const lastNameField = ref<{ focus: () => void } | null>(null)

const signIn = (provider: CalendarType) => {
  emit("signIn", provider)
}

const {
  step,
  email,
  firstName,
  lastName,
  otpCode,
  emailError,
  otpError,
  sending,
  verifying,
  resendCooldown,
  canSubmitOnboarding,
  canVerifyOtp,
  submitEmail,
  submitOnboarding,
  resendOtp,
  verifyOtp,
  handleDialogModelChange: onDialogInput,
  returnToProviderSelection,
  returnFromOtp,
} = useSignInDialogState({
  onEmailSignIn: (user: User) => {
    emit("emailSignIn", user)
  },
  onDialogVisibilityChange: (value: boolean) => {
    emit("update:modelValue", value)
  },
})
</script>
