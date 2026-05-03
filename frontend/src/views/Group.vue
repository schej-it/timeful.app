<template>
  <div v-if="event" class="tw-h-full">
    <NotSignedIn v-if="!authUser" :event="event" />
    <AccessDenied v-else-if="accessDenied" />
    <Event
      v-else
      :event-id="groupId"
      :from-sign-in="fromSignIn"
      :initial-timezone="initialTimezone"
      :contacts-payload="contactsPayload"
    ></Event>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import Event from "./Event.vue"
import { get } from "@/utils"
import { errors, eventTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import AccessDenied from "@/components/groups/AccessDenied.vue"
import NotSignedIn from "@/components/groups/NotSignedIn.vue"
import type { SerializedEventDraft } from "@/composables/event/types"
import { serializeRouteContactsPayload, serializeRouteTimezone } from "@/router/routeProps"
import type { Event as EventType } from "@/types"

const props = defineProps<{
  groupId: string
  fromSignIn?: boolean
  initialTimezone?: Record<string, unknown>
  contactsPayload?: SerializedEventDraft
}>()

defineOptions({ name: 'AppGroup' })

const router = useRouter()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const event = ref<EventType | null>(null)

const accessDenied = computed(() => {
  if (!event.value) return false
  if (event.value.ownerId === authUser.value?._id) return false

  const attendees = event.value.attendees
  if (!attendees) return true

  let found = false
  for (const attendee of attendees) {
    if (attendee.email?.toLowerCase() === (authUser.value?.email ?? "").toLowerCase()) {
      found = true
      break
    }
  }

  return !found
})

void (async () => {
  try {
    event.value = await get<EventType>(`/events/${props.groupId}`)

    if ((event.value as { type?: string }).type !== eventTypes.GROUP) {
      void router.replace({
        name: "event",
        params: {
          eventId: props.groupId,
          initialTimezone: serializeRouteTimezone(props.initialTimezone),
          fromSignIn: String(props.fromSignIn),
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
