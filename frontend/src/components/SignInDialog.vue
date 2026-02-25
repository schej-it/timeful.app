<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    :width="400"
    content-class="tw-m-0"
  >
    <v-card>
      <v-card-title>Sign in</v-card-title>
      <v-card-text class="tw-flex tw-flex-col tw-items-center">
        <div class="tw-mb-4 tw-flex tw-w-full tw-flex-col tw-gap-2">
          <v-btn
            block
            @click="signIn(calendarTypes.GOOGLE)"
            class="tw-bg-surface"
          >
            <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
              <v-img
                class="tw-flex-initial"
                width="20"
                height="20"
                src="@/assets/google_logo.svg"
              />
              <v-spacer />
              Sign in with Google
              <v-spacer />
            </div>
          </v-btn>
          <v-btn
            block
            @click="signIn(calendarTypes.OUTLOOK)"
            class="tw-bg-surface"
          >
            <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
              <v-img
                class="tw-flex-initial"
                width="20"
                height="20"
                src="@/assets/outlook_logo.svg"
              />
              <v-spacer />
              Sign in with Outlook
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
    </v-card>
  </v-dialog>
</template>

<script>
import { calendarTypes } from "@/constants"

export default {
  name: "SignInDialog",
  props: {
    value: { type: Boolean, required: true },
  },
  data() {
    return {
      calendarTypes,
    }
  },
  methods: {
    signIn(provider) {
      this.$emit("signIn", provider)
      // this.$emit("input", false) // Close dialog after emitting
    },
  },
}
</script>
