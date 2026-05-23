<template>
  <div v-if="event" class="tw-h-full">
    <NotSignedIn v-if="!authUser && ownerLoaded" :event="event" :owner="owner" />
    <AccessDenied v-else-if="authUser && accessDenied" />
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
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import Event from "./Event.vue"
import { errors, eventTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import AccessDenied from "@/components/groups/AccessDenied.vue"
import NotSignedIn from "@/components/groups/NotSignedIn.vue"
import type { EventDraft } from "@/composables/event/types"
import { getRealOwnerId, isSignedInOwner } from "@/composables/event/eventOwnership"
import { fetchEventById } from "@/composables/event/eventTransportBoundary"
import { serializeRouteContactsPayload, serializeRouteTimezone } from "@/router/routeProps"
import type { Event as EventType, User } from "@/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import { fetchUserById } from "@/utils/services/UserService"

const props = defineProps<{
  groupId: string
  fromSignIn?: boolean
  initialTimezone?: Timezone
  contactsPayload?: EventDraft
}>()

defineOptions({ name: 'AppGroup' })

const router = useRouter()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const event = ref<EventType | null>(null)
const owner = ref<User | null>(null)
const ownerLoaded = ref(false)

const accessDenied = computed(() => {
  if (!event.value) return false
  if (isSignedInOwner(event.value, authUser.value)) return false

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

async function loadOwner(groupEvent: EventType) {
  ownerLoaded.value = false
  owner.value = null

  try {
    const ownerId = getRealOwnerId(groupEvent)
    if (ownerId) {
      owner.value = await fetchUserById(ownerId)
    }
  } finally {
    ownerLoaded.value = true
  }
}

async function loadEvent() {
  try {
    event.value = await fetchEventById(props.groupId)

    if ((event.value as { type?: string }).type !== eventTypes.GROUP) {
      void router.replace({
        name: "event",
        params: {
          eventId: props.groupId,
        },
        query: {
          initialTimezone: serializeRouteTimezone(props.initialTimezone),
          fromSignIn: String(props.fromSignIn),
          contactsPayload: serializeRouteContactsPayload(props.contactsPayload),
        },
      })
      return
    }

    if (!authUser.value) {
      await loadOwner(event.value)
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
