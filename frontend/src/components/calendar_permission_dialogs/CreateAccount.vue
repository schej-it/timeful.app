<template>
  <div class="tw-flex tw-flex-col tw-gap-6">
    <div
      class="tw-text-md tw-flex tw-flex-col tw-items-center tw-gap-2 tw-font-normal"
    >
      Create a Timeful account to link your
      <div class="tw-flex tw-items-center tw-gap-1">
        <v-img
          class="-tw-mt-1 tw-flex-initial"
          width="15"
          height="15"
          src="@/assets/apple_logo.svg"
        />
        <span class="tw-font-medium">Apple Calendar</span>
      </div>
    </div>
    <div v-if="!authUser">
      <SignInGoogleBtn
        class="tw-mb-3 tw-w-full"
        @click="emit('signInLinkApple')"
      />
      <div class="tw-text-center tw-text-xs tw-text-dark-gray">
        By continuing, you agree to our
        <router-link
          class="tw-text-blue"
          target="_blank"
          :to="{ name: 'privacy-policy' }"
          >privacy policy</router-link
        >
      </div>
    </div>
    <div v-else>
      <div
        class="tw-flex tw-items-center tw-justify-center tw-text-sm tw-text-dark-gray"
      >
        <v-icon class="tw-mx-2 tw-text-green" size="16"
          >mdi-check-circle</v-icon
        >
        Timeful account created
      </div>
    </div>
    <div class="tw-flex tw-items-center tw-gap-2">
      <v-btn text class="tw-grow" @click="emit('back')">Back</v-btn>
      <v-btn
        color="primary"
        class="tw-grow"
        :disabled="!authUser"
        @click="emit('continue')"
        >Continue</v-btn
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import SignInGoogleBtn from "../SignInGoogleBtn.vue"
import { useMainStore } from "@/stores/main"

const emit = defineEmits<{
  back: []
  continue: []
  signInLinkApple: []
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
</script>
