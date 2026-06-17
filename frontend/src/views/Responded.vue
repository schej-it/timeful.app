<template>
  <div
    class="tw-mx-auto tw-mt-4 tw-flex tw-h-full tw-max-w-5xl tw-flex-col tw-items-center tw-justify-center"
  >
    <h2 v-if="state === states.CONFIRMING" class="tw-px-4 tw-text-2xl">
      Confirming response...
    </h2>
    <h2
      v-else-if="state === states.CONFIRMED"
      class="tw-px-4 tw-text-base sm:tw-text-lg"
    >
      Your response has been confirmed! Feel free to close this browser tab.
    </h2>
    <h2
      v-else-if="state === states.ERROR"
      class="tw-px-4 tw-text-base sm:tw-text-lg"
    >
      Something went wrong while confirming your response. Refresh the page and
      try again.
    </h2>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRoute } from "vue-router"
import { post } from "@/utils"

defineOptions({ name: 'AppResponded' })

const props = defineProps<{
  eventId: string
}>()

const route = useRoute()

const states = {
  CONFIRMING: "confirming",
  CONFIRMED: "confirmed",
  ERROR: "error",
} as const

const state = ref<string>(states.CONFIRMING)

const { email } = route.query
post(`/events/${props.eventId}/responded`, { email })
  .then(() => {
    state.value = states.CONFIRMED
  })
  .catch((err: unknown) => {
    console.error(err)
    state.value = states.ERROR
  })
</script>
