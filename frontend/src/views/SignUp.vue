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
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import Event from "./Event.vue"
import { errors, eventTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import type { EventDraft } from "@/composables/event/types"
import { fetchEventById } from "@/composables/event/eventTransportBoundary"
import { serializeRouteContactsPayload, serializeRouteTimezone } from "@/router/routeProps"
import type { Event as EventType } from "@/types"
import type { Timezone } from "@/composables/schedule_overlap/types"

defineOptions({ name: 'AppSignUp' })

const props = defineProps<{
  signUpId: string
  fromSignIn?: boolean
  editingMode?: boolean
  initialTimezone?: Timezone
  contactsPayload?: EventDraft
}>()

const router = useRouter()
const mainStore = useMainStore()

const event = ref<EventType | null>(null)

async function loadEvent() {
  try {
    event.value = await fetchEventById(props.signUpId)

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
}

onMounted(() => {
  void loadEvent()
})
</script>
