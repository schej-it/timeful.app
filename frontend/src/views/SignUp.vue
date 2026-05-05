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
import { errors, eventTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import type { SerializedEventDraft } from "@/composables/event/types"
import { serializeRouteContactsPayload, serializeRouteTimezone } from "@/router/routeProps"
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

    if ((event.value as { type?: string }).type === eventTypes.GROUP) {
      void router.replace({
        name: "group",
        params: {
          groupId: props.signUpId,
        },
        query: {
          initialTimezone: serializeRouteTimezone(props.initialTimezone),
          fromSignIn: String(props.fromSignIn),
          contactsPayload: serializeRouteContactsPayload(props.contactsPayload),
        },
      })
      return
    }

    if (!event.value.isSignUpForm) {
      void router.replace({
        name: "event",
        params: {
          eventId: props.signUpId,
        },
        query: {
          initialTimezone: serializeRouteTimezone(props.initialTimezone),
          fromSignIn: String(props.fromSignIn),
          editingMode: String(props.editingMode),
          contactsPayload: serializeRouteContactsPayload(props.contactsPayload),
        },
      })
    }
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
