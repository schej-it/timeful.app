<template>
  <div
    :class="toggleState ? '' : 'tw-w-fit tw-min-w-[288px] tw-drop-shadow'"
    class="tw-flex tw-flex-col tw-rounded-lg tw-bg-white tw-text-black tw-transition-all"
  >
    <v-btn
      v-if="toggleState"
      class="-tw-ml-2 tw-w-[calc(100%+1rem)] tw-justify-between tw-px-2"
      block
      variant="text"
      @click="toggleShowCalendars"
    >
      <span class="tw-mr-1 tw-text-base tw-font-medium">My calendars</span>
      <v-icon :class="`tw-rotate-${showCalendars ? '180' : '0'}`"
        >mdi-chevron-down</v-icon
      ></v-btn
    >
    <div
      v-else
      class="tw-border-b tw-border-off-white tw-px-4 tw-py-3 tw-font-medium"
    >
      My calendars
    </div>
    <v-expand-transition>
      <span v-if="showCalendars || !toggleState">
        <div :class="toggleState ? '' : 'tw-px-4 tw-py-2'">
          <CalendarAccount
            v-for="(account, key) in calendarAccounts"
            :key="key"
            :sync-with-backend="syncWithBackend"
            :toggle-state="toggleState"
            :account="account"
            :event-id="eventId"
            :calendar-events-map="calendarEventsMapCopy"
            :remove-dialog="removeDialog"
            :selected-remove-email="removePayload.email"
            :fill-space="fillSpace"
            @toggle-calendar-account="
              (payload: ToggleCalendarPayload) => emit('toggleCalendarAccount', payload)
            "
            @toggle-sub-calendar-account="
              (payload: ToggleSubCalendarPayload) => emit('toggleSubCalendarAccount', payload)
            "
            @open-remove-dialog="openRemoveDialog"
          ></CalendarAccount>
          <template v-if="signInEnabled">
            <v-dialog
              v-if="allowAddCalendarAccount"
              v-model="addCalendarAccountDialog"
              width="400"
              content-class="tw-m-0"
            >
              <template #activator="{ props: activatorProps }">
                <div>
                  <v-btn
                    variant="text"
                    color="primary"
                    :class="
                      toggleState
                        ? '-tw-ml-2 tw-mt-0 tw-w-min tw-px-2'
                        : '-tw-ml-2 tw-w-fit tw-px-2'
                    "
                    v-bind="activatorProps"
                    >+ Add calendar</v-btn
                  >
                  <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-dark-gray">
                    Only your available times are shared with respondents. Your
                    personal event details are never shared.
                  </p>
                </div>
              </template>
              <CalendarTypeSelector
                :visible="addCalendarAccountDialog"
                @add-google-calendar="addGoogleCalendar"
                @add-outlook-calendar="addOutlookCalendar"
                @added-calendar="addedCalendar"
              />
            </v-dialog>
          </template>
          <div v-else class="tw-mt-1 tw-text-xs tw-text-dark-gray">
            Requires sign-in, which is disabled in this build
          </div>
        </div>
      </span>
    </v-expand-transition>
    <v-dialog v-model="removeDialog" width="500" persistent>
      <v-card>
        <v-card-title>Are you sure?</v-card-title>
        <v-card-text class="tw-text-sm tw-text-dark-gray"
          >Are you sure you want to remove
          {{ removePayload.email }}?</v-card-text
        >
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="removeDialog = false">Cancel</v-btn>
          <v-btn variant="text" color="error" @click="removeAccount">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue"
import { storeToRefs } from "pinia"
import { authTypes, calendarTypes } from "@/constants"
import {
  _delete,
  signInGoogle,
  signInOutlook,
  getCalendarAccountKey,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { signInEnabled } from "@/utils/signInAvailability"
import CalendarAccount from "@/components/settings/CalendarAccount.vue"
import CalendarTypeSelector from "@/components/settings/CalendarTypeSelector.vue"
import type { CalendarAccount as CalendarAccountModel } from "@/types"
import type { CalendarEventsMap } from "@/composables/schedule_overlap/types"
import { useCalendarAccountsState } from "./useCalendarAccountsState"
export type CalendarAccountEntry = CalendarAccountModel

export interface ToggleCalendarPayload {
  email?: string
  calendarType?: string
  enabled: boolean
}

export interface ToggleSubCalendarPayload {
  email?: string
  calendarType?: string
  enabled: boolean
  subCalendarId: string | number
}

const props = withDefaults(
  defineProps<{
    toggleState?: boolean
    eventId?: string
    calendarEventsMap?: CalendarEventsMap
    syncWithBackend?: boolean
    allowAddCalendarAccount?: boolean
    initialCalendarAccountsData?: Record<string, CalendarAccountEntry>
    fillSpace?: boolean
  }>(),
  {
    toggleState: false,
    eventId: "",
    calendarEventsMap: () => ({}),
    syncWithBackend: true,
    allowAddCalendarAccount: true,
    initialCalendarAccountsData: () => ({}),
    fillSpace: false,
  }
)

const emit = defineEmits<{
  toggleCalendarAccount: [payload: ToggleCalendarPayload]
  toggleSubCalendarAccount: [payload: ToggleSubCalendarPayload]
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const removeDialog = ref(false)
const removePayload = ref<{ email?: string; calendarType?: string }>({})

const addCalendarAccountDialog = ref(false)

const { calendarAccounts, showCalendars, calendarEventsMapCopy, toggleShowCalendars } =
  useCalendarAccountsState({
    authUser,
    initialCalendarAccountsData: toRef(props, "initialCalendarAccountsData"),
    calendarEventsMap: toRef(props, "calendarEventsMap"),
  })

const addGoogleCalendar = () => {
  signInGoogle({
    state: {
      type: props.toggleState
        ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
        : authTypes.ADD_CALENDAR_ACCOUNT,
      eventId: props.eventId,
      calendarType: calendarTypes.GOOGLE,
    },
    requestCalendarPermission: true,
    selectAccount: true,
  })
}
const addOutlookCalendar = () => {
  signInOutlook({
    state: {
      type: props.toggleState
        ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
        : authTypes.ADD_CALENDAR_ACCOUNT,
      eventId: props.eventId,
      calendarType: calendarTypes.OUTLOOK,
    },
    requestCalendarPermission: true,
  })
}
const addedCalendar = () => {
  addCalendarAccountDialog.value = false
}
const openRemoveDialog = (payload: { email: string; calendarType: string }) => {
  removeDialog.value = true
  removePayload.value = payload
}
const removeAccount = () => {
  _delete(`/user/remove-calendar-account`, removePayload.value)
    .then(() => {
      const calendarAccountKey = getCalendarAccountKey(
        removePayload.value.email ?? "",
        removePayload.value.calendarType ?? ""
      )
      if (authUser.value?.calendarAccounts) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (authUser.value.calendarAccounts)[calendarAccountKey]
        mainStore.setAuthUser(authUser.value)
      }
      removeDialog.value = false
    })
    .catch((err: unknown) => {
      console.error(err)
      mainStore.showError(
        "There was a problem removing this account! Please try again later."
      )
    })
}
</script>
