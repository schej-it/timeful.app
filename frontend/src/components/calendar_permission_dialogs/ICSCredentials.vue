<template>
  <div class="tw-flex tw-flex-col tw-gap-6">
    <div class="tw-flex tw-flex-col tw-gap-3">
      <div class="tw-text-md tw-flex tw-flex-row tw-items-center tw-justify-start tw-gap-2 tw-font-medium">
        Connect an ICS calendar feed
      </div>
      <div class="tw-flex tw-flex-col tw-gap-2">
        <div class="tw-text-sm tw-text-very-dark-gray">
          Paste the ICS feed URL from your calendar provider. This is usually found in your calendar's sharing or export settings.
        </div>
      </div>
    </div>
    <div class="tw-flex tw-flex-col tw-gap-3">
      <v-text-field v-model="feedUrl" solo placeholder="Feed URL" hide-details="auto" :error-messages="feedUrlError" />
      <v-text-field v-model="label" solo placeholder="Label" hide-details />
      <div class="tw-flex tw-items-center tw-gap-2">
        <v-btn text class="tw-grow" @click="emit('back')">Back</v-btn>
        <v-btn
:disabled="!enableSubmit" color="primary" class="tw-grow" :loading="loading"
          @click="submit">Submit</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { post } from "@/utils"
import { urlRegex } from "@/constants"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"

const emit = defineEmits<{
  back: []
  addedCalendar: []
}>()

const mainStore = useMainStore()

const feedUrl = ref("")
const label = ref("")
const loading = ref(false)

const enableSubmit = computed(
  () => label.value && urlRegex.test(feedUrl.value)
)

const feedUrlError = computed(() => {
  if (!feedUrl.value || feedUrl.value.length === 0) return ""
  if (!urlRegex.test(feedUrl.value)) return "Please enter a valid URL"
  return ""
})

const submit = () => {
  loading.value = true
  post(`/user/add-ics-calendar-account`, {
    feedUrl: feedUrl.value,
    label: label.value,
  })
    .then(async () => {
      await mainStore.refreshAuthUser()
      emit("addedCalendar")
      posthog.capture("ICS Calendar Added")
    })
    .catch((err: unknown) => {
      mainStore.showError(
        "An error occurred while adding your ICS Calendar! Please check your feed URL or try again later."
      )
      console.error(err)
    })
    .finally(() => {
      loading.value = false
    })
}
</script>
