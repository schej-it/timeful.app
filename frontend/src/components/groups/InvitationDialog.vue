<template>
  <v-dialog
    :model-value="modelValue"
    content-class="tw-max-w-[35rem] tw-m-0 tw-max-h-full"
    :transition="isPhone ? `dialog-bottom-transition` : `dialog-transition`"
    persistent
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-expand-transition>
      <v-card
        class="tw-overflow-none tw-relative tw-flex tw-flex-col tw-rounded-lg tw-px-2 tw-py-5 tw-transition-all"
      >
        <v-card-text>
          <div
            class="tw-mb-5 tw-text-wrap tw-text-xl tw-font-medium tw-text-black"
          >
            <template v-if="isOwner"> Share calendar availability </template>
            <template v-else>
              Accept invitation to share your calendar availability with "{{
                group?.name
              }}"?
            </template>
          </div>
          <v-expand-transition>
            <div v-if="calendarPermissionGranted">
              <CalendarAccounts
                :sync-with-backend="false"
                :allow-add-calendar-account="false"
                :toggle-state="true"
                :fill-space="true"
                @toggle-calendar-account="toggleCalendarAccount"
                @toggle-sub-calendar-account="toggleSubCalendarAccount"
              ></CalendarAccounts>

              <div class="tw-mt-5 tw-space-y-4">
                <div class="tw-font-medium tw-text-black">
                  Your calendar availability from these calendars will be shared
                  with:
                </div>
                <div
                  v-if="membersToShareWith.length > 0"
                  class="tw-flex tw-flex-wrap tw-gap-1"
                >
                  <UserChip
                    v-for="user in membersToShareWith"
                    :key="user.email"
                    :user="user"
                  ></UserChip>
                </div>
                <div v-else class="tw-flex tw-items-center tw-italic">
                  <div>No members added yet</div>
                </div>
                <div class="tw-text-xs tw-text-dark-gray">
                  Your calendar events will NOT be visible to others
                </div>
              </div>
            </div>
          </v-expand-transition>

          <v-expand-transition>
            <div v-if="!calendarPermissionGranted" class="tw-p-5 tw-text-black">
              <CalendarPermissionsCard
                v-show="true"
                cancel-label=""
                @allow="emit('setAvailabilityAutomatically')"
              />
            </div>
          </v-expand-transition>
        </v-card-text>

        <v-card-actions v-if="isOwner">
          <v-btn class="tw-px-6" text @click="goHome">Back</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            :disabled="!calendarPermissionGranted"
            class="tw-px-6"
            @click="acceptInvitation"
            >Share</v-btn
          >
        </v-card-actions>
        <v-card-actions v-else>
          <v-dialog v-model="rejectDialog" width="400" persistent>
            <template #activator="{ props: rejectDialogProps }">
              <v-btn text class="tw-text-dark-gray" v-bind="rejectDialogProps"
                >Reject invitation</v-btn
              >
            </template>
            <v-card>
              <v-card-title>Are you sure?</v-card-title>
              <v-card-text
                >Are you sure you want to reject this invite?</v-card-text
              >
              <v-card-actions>
                <v-spacer />
                <v-btn
                  text
                  class="tw-text-dark-gray"
                  @click="rejectDialog = false"
                  >Cancel</v-btn
                >
                <v-btn text color="error" @click="rejectInvitation"
                  >I'm sure</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-spacer />
          <v-btn
            class="tw-bg-green tw-px-5 tw-text-white tw-transition-opacity"
            :disabled="!calendarPermissionGranted"
            @click="acceptInvitation"
            >Accept Invitation</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-expand-transition>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { post, generateEnabledCalendarsPayload } from "@/utils"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"
import CalendarPermissionsCard from "@/components/calendar_permission_dialogs/CalendarPermissionsCard.vue"
import UserChip from "@/components/general/UserChip.vue"
import type { Event } from "@/types"

interface CalendarAccount {
  enabled: boolean
  subCalendars: Record<string, { enabled: boolean }>
}

const props = defineProps<{
  modelValue: boolean
  group?: Event
  calendarPermissionGranted: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  setAvailabilityAutomatically: []
  refreshEvent: []
}>()

const router = useRouter()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const calendarAccounts = ref<Record<string, CalendarAccount>>({})
const rejectDialog = ref(false)

onMounted(() => {
  calendarAccounts.value = JSON.parse(
    JSON.stringify(authUser.value?.calendarAccounts ?? {})
  ) as typeof calendarAccounts.value
})

const isOwner = computed(
  () => authUser.value?._id === props.group?.ownerId
)
const membersToShareWith = computed(
  () =>
    props.group?.attendees?.filter(
      (u: { declined?: boolean; email?: string }) => !u.declined && u.email !== authUser.value?.email
    ) ?? []
)

const goHome = () => {
  void router.push({ name: "home" })
}
const rejectInvitation = () => {
  void post(`/events/${props.group?._id ?? ""}/decline`).then(() => {
    void router.replace({ name: "home" })
  })
}
const acceptInvitation = () => {
  const payload = generateEnabledCalendarsPayload(calendarAccounts.value)
  void post(`/events/${props.group?._id ?? ""}/response`, payload).then(() => {
    emit("update:modelValue", false)
    emit("refreshEvent")
  })
}
const toggleCalendarAccount = (payload: {
  email?: string
  calendarType?: string
  enabled: boolean
}) => {
  if (!payload.email || !payload.calendarType) return
  calendarAccounts.value[`${payload.email}_${payload.calendarType}`].enabled =
    payload.enabled
}
const toggleSubCalendarAccount = (payload: {
  email?: string
  calendarType?: string
  subCalendarId: string | number
  enabled: boolean
}) => {
  if (!payload.email || !payload.calendarType) return
  const accountKey = `${payload.email}_${payload.calendarType}`
  const account = calendarAccounts.value[accountKey]
  const subCalendar = account.subCalendars[payload.subCalendarId]
  subCalendar.enabled = payload.enabled
}
</script>
