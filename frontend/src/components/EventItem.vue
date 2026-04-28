<template>
  <router-link
    :to="{
      name: linkTo,
      params: { [identifier]: event.shortId ?? event._id },
    }"
  >
    <v-container
      v-ripple
      class="tw-flex tw-min-h-16 tw-items-center tw-justify-between tw-rounded-lg tw-bg-white tw-px-4 tw-py-2.5 tw-text-black tw-drop-shadow tw-transition-all hover:tw-drop-shadow-md sm:tw-py-3"
      :data-ph-capture-attribute-event-id="event._id"
      :data-ph-capture-attribute-event-name="event.name"
    >
      <div class="tw-flex tw-items-center">
        <div
          class="tw-flex tw-size-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded"
          :class="{
            'tw-bg-pale-green': isOwner,
            'tw-bg-off-white': !isOwner,
          }"
        >
          <v-icon :color="isOwner ? 'green' : 'grey'">{{
            isGroup
              ? "mdi-account-group"
              : isDow
              ? "mdi-calendar-range"
              : event.daysOnly
              ? "mdi-calendar-month"
              : "mdi-calendar"
          }}</v-icon>
        </div>
        <div class="tw-ml-3">
          <div>{{ event.name }}</div>
          <div class="tw-text-sm tw-font-light tw-text-very-dark-gray">
            {{ dateString }}
          </div>
        </div>
      </div>
      <div class="tw-min-w-max">
        <div
          v-if="isGroup && !userHasResponded"
          class="tw-inline-block tw-text-sm tw-italic tw-text-gray"
        >
          Invited
        </div>
        <v-chip
          v-else
          small
          class="tw-m-0.5 tw-bg-off-white tw-text-very-dark-gray"
        >
          <v-icon left small> mdi-account-multiple </v-icon>
          {{ event.numResponses }}
        </v-chip>
        <v-menu
          v-if="isOwner"
          v-model="showMenu"
          :close-on-content-click="false"
          transition="slide-x-transition"
          right
          offset-x
        >
          <template #activator="{ props: menuProps }">
            <v-btn plain icon v-bind="menuProps" @click.prevent>
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list class="tw-py-1" dense>
            <v-list-item @click="copyLink">
              <v-list-item-content>
                <v-list-item-title>Copy link</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-divider />
            <v-dialog
              v-if="!isGroup"
              v-model="duplicateDialog"
              width="400"
              persistent
            >
              <template #activator="{ props: duplicateProps }">
                <v-list-item id="duplicate-event-btn" v-bind="duplicateProps">
                  <v-list-item-content>
                    <v-list-item-title>Duplicate</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
              <v-card>
                <v-card-title>Duplicate {{ typeText }}</v-card-title>
                <v-card-text>
                  <v-text-field
                    v-model="duplicateDialogOptions.name"
                    required
                    placeholder="Name your event..."
                    :disabled="duplicateDialogOptions.loading"
                    hide-details
                    solo
                  />
                  <v-checkbox
                    v-model="duplicateDialogOptions.copyAvailability"
                    label="Copy responses"
                    :disabled="duplicateDialogOptions.loading"
                    hide-details
                    class="tw-mt-2"
                  />
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn
                    text
                    :disabled="duplicateDialogOptions.loading"
                    @click="duplicateDialog = false"
                    >Cancel</v-btn
                  >
                  <v-btn
                    text
                    color="primary"
                    :loading="duplicateDialogOptions.loading"
                    @click="duplicateEvent"
                    >Confirm</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-menu
              v-if="isOwner"
              right
              offset-x
              :close-on-content-click="false"
              open-on-hover
            >
              <template #activator="{ props: moveToMenuProps }">
                <v-list-item
                  v-bind="moveToMenuProps"
                  class="tw-cursor-pointer tw-pr-1 hover:tw-bg-light-gray"
                >
                  <v-list-item-title>Move to</v-list-item-title>
                  <v-list-item-icon>
                    <v-icon small>mdi-chevron-right</v-icon>
                  </v-list-item-icon>
                </v-list-item>
              </template>
              <v-list dense class="tw-py-1">
                <v-list-item class="tw-pr-1" @click="moveEventToFolder(null)">
                  <v-list-item-title>No folder</v-list-item-title>
                  <v-list-item-action v-if="folderId === null">
                    <v-icon small>mdi-check</v-icon>
                  </v-list-item-action>
                </v-list-item>
                <v-list-item
                  v-for="folder in folders"
                  :key="folder._id"
                  class="tw-pr-1"
                  @click="moveEventToFolder(folder._id ?? null)"
                >
                  <v-list-item-title>{{ folder.name }}</v-list-item-title>
                  <v-list-item-action v-if="folder._id === folderId">
                    <v-icon small>mdi-check</v-icon>
                  </v-list-item-action>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-divider />
            <v-list-item @click="_archiveEvent">
              <v-list-item-title>{{
                event.isArchived ? "Unarchive" : "Archive"
              }}</v-list-item-title>
            </v-list-item>
            <v-dialog v-model="removeDialog" width="400" persistent>
              <template #activator="{ props: removeDialogProps }">
                <v-list-item
                  id="delete-event-btn"
                  class="red--text"
                  v-bind="removeDialogProps"
                >
                  <v-list-item-content>
                    <v-list-item-title>Delete {{ typeText }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
              <v-card>
                <v-card-title>Are you sure?</v-card-title>
                <v-card-text
                  >Are you sure you want to delete this
                  {{ typeText }}?</v-card-text
                >
                <v-card-actions>
                  <v-spacer />
                  <v-btn text @click="removeDialog = false">Cancel</v-btn>
                  <v-btn text color="error" @click="removeEvent"
                    >I'm sure</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-list>
        </v-menu>
        <v-icon v-else class="tw-ml-2 tw-mr-1 tw-opacity-75"
          >mdi-chevron-right</v-icon
        >
      </div>
    </v-container>
  </router-link>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { getDateRangeStringForEvent, _delete, post } from "@/utils"
import type { EventLike } from "@/utils/date_utils"
import { eventTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import type { Event } from "@/types"

const props = withDefaults(
  defineProps<{
    event: Event
    folderId?: string | null
  }>(),
  { folderId: null }
)

const mainStore = useMainStore()
const { authUser, folders } = storeToRefs(mainStore)

const showMenu = ref(false)
const duplicateDialog = ref(false)
const duplicateDialogOptions = ref({
  name: "",
  copyAvailability: false,
  loading: false,
})
const removeDialog = ref(false)

const dateString = computed(() => getDateRangeStringForEvent(props.event as EventLike))
const isOwner = computed(() => props.event.ownerId === authUser.value?._id)
const isGroup = computed(() => props.event.type === eventTypes.GROUP)
const isDow = computed(() => props.event.type === eventTypes.DOW)
const isSignUp = computed(() => props.event.isSignUpForm)
const linkTo = computed(() => {
  if (isGroup.value) return "group"
  if (isSignUp.value) return "signUp"
  return "event"
})
const identifier = computed(() => {
  if (isGroup.value) return "groupId"
  if (isSignUp.value) return "signUpId"
  return "eventId"
})
const typeText = computed(() => (isGroup.value ? "group" : "event"))
const userHasResponded = computed(() => props.event.hasResponded ?? false)

const _archiveEvent = () => {
  void mainStore.archiveEvent({
    eventId: props.event._id ?? "",
    archive: !props.event.isArchived,
  })
}
const moveEventToFolder = (folderId: string | null) => {
  void mainStore.setEventFolder({
    eventId: props.event._id ?? "",
    folderId,
  })
  showMenu.value = false
}
const copyLink = () => {
  void navigator.clipboard.writeText(
    `${window.location.origin}/e/${props.event.shortId ?? props.event._id ?? ""}`
  )
  mainStore.showInfo("Link copied to clipboard!")
  showMenu.value = false
}
const removeEvent = () => {
  _delete(`/events/${props.event._id ?? ""}`)
    .then(() => {
      void mainStore.refreshAuthUser()
      void mainStore.getEvents()
      showMenu.value = false

      posthog.capture("Event removed", {
        eventId: props.event._id,
        eventName: props.event.name,
        eventDuration: props.event.duration,
        eventDates: props.event.dates,
        eventNotificationsEnabled: props.event.notificationsEnabled,
        eventType: props.event.type,
      })
    })
    .catch(() => {
      mainStore.showError(
        "There was a problem removing that event! Please try again later."
      )
    })
}
const duplicateEvent = () => {
  duplicateDialogOptions.value.loading = true
  post<{ eventId: string; shortId: string }>(
    `/events/${props.event._id ?? ""}/duplicate`,
    {
      eventName: duplicateDialogOptions.value.name,
      copyAvailability: duplicateDialogOptions.value.copyAvailability,
    }
  )
    .then(({ eventId }) => {
      void mainStore.getEvents()
      showMenu.value = false

      posthog.capture("Event duplicated", {
        eventId,
        eventName: duplicateDialogOptions.value.name,
        eventDuration: props.event.duration,
        eventDates: props.event.dates,
        eventNotificationsEnabled: props.event.notificationsEnabled,
        eventType: props.event.type,
        copyAvailability: duplicateDialogOptions.value.copyAvailability,
      })
    })
    .catch(() => {
      mainStore.showError(
        "There was a problem duplicating that event! Please try again later."
      )
    })
    .finally(() => {
      duplicateDialogOptions.value.loading = false
    })
}

watch(
  duplicateDialog,
  (val) => {
    if (val) {
      duplicateDialogOptions.value.name = `Copy of ${props.event.name ?? ""}`
    }
  },
  { immediate: true }
)
</script>
