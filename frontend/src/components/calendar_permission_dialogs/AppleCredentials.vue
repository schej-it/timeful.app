<template>
  <div class="tw-flex tw-flex-col tw-gap-6">
    <div class="tw-flex tw-flex-col tw-gap-3">
      <div
        class="tw-text-md tw-flex tw-flex-row tw-items-center tw-justify-start tw-gap-2 tw-font-medium"
      >
        Connect your
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
      <div class="tw-flex tw-flex-col tw-gap-2">
        <div class="tw-text-sm tw-text-very-dark-gray">
          Generate an
          <span class="tw-font-medium tw-text-black"
            >app-specific password</span
          >
          to use with Timeful at
          <a
            href="https://appleid.apple.com/account/manage"
            target="_blank"
            rel="noopener noreferrer"
            >https://appleid.apple.com/account/manage</a
          >. Copy and paste the generated app password below.
        </div>
        <div class="tw-text-sm tw-text-very-dark-gray">
          Your credentials will be stored and encrypted.
        </div>
      </div>
    </div>
    <div class="tw-flex tw-flex-col tw-gap-3">
      <v-text-field v-model="email" solo placeholder="Apple ID" hide-details />
      <v-text-field
        v-model="password"
        solo
        placeholder="App password"
        hide-details
        type="password"
      />
      <div class="tw-flex tw-items-center tw-gap-2">
        <v-btn text class="tw-grow" @click="emit('back')">Back</v-btn>
        <v-btn
          :disabled="!enableSubmit"
          color="primary"
          class="tw-grow"
          :loading="loading"
          @click="submit"
          >Submit</v-btn
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { post } from "@/utils"
import { errors } from "@/constants"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"

const emit = defineEmits<{
  back: []
  addedCalendar: []
}>()

const mainStore = useMainStore()

const email = ref("")
const password = ref("")
const loading = ref(false)

const enableSubmit = computed(() => email.value && password.value)

const submit = () => {
  loading.value = true
  post(`/user/add-apple-calendar-account`, {
    email: email.value,
    password: password.value,
  })
    .then(async () => {
      await mainStore.refreshAuthUser()
      emit("addedCalendar")
      posthog.capture("Apple Calendar Added")
    })
    .catch((err: unknown) => {
      const e = err as { error?: string }
      if (e.error === errors.InvalidCredentials) {
        mainStore.showError("Your Apple ID or app password is incorrect.")
      } else {
        mainStore.showError(
          "An error occurred while adding your Apple Calendar! Please try again later."
        )
      }
    })
    .finally(() => {
      loading.value = false
    })
}
</script>
