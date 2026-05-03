<template>
  <div v-if="event" class="tw-h-full">
    <Event
      :event-id="signUpId"
      :from-sign-in="fromSignIn"
      :editing-mode="editingMode"
      :initial-timezone="initialTimezone"
      :contacts-payload="contactsPayload"
    ></Event>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import Event from "./Event.vue"
import { get } from "@/utils"
import { errors } from "@/constants"
import { useMainStore } from "@/stores/main"
import type { SerializedEventDraft } from "@/composables/event/types"
import type { Event as EventType } from "@/types"

defineOptions({ name: 'AppSignUp' })

const props = defineProps<{
  signUpId: string
  fromSignIn?: boolean
  editingMode?: boolean
  initialTimezone?: Record<string, unknown>
  contactsPayload?: SerializedEventDraft
}>()

const router = useRouter()
const mainStore = useMainStore()

const event = ref<EventType | null>(null)

void (async () => {
  try {
    event.value = await get<EventType>(`/events/${props.signUpId}`)

    // TODO(tony): Redirect to correct route if we're at the wrong route
  } catch (err: unknown) {
    switch ((err as { error?: string }).error) {
      case errors.EventNotFound:
        mainStore.showError("The specified event does not exist!")
        void router.replace({ name: "home" })
        return
    }
  }
})()
</script>
