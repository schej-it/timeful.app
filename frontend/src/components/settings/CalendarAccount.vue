<template>
  <div v-if="showAccount" class="tw-flex tw-flex-col">
    <div
      class="tw-group tw-flex tw-h-10 tw-flex-row tw-items-center tw-justify-between tw-text-black"
    >
      <div
        :class="`tw-gap-${toggleState ? '0' : '2'}`"
        class="tw-flex tw-w-full tw-flex-row tw-items-center"
      >
        <div v-if="toggleState" class="tw-flex tw-items-center">
          <!-- eslint-disable vue/no-mutating-props -->
          <v-checkbox
            v-model="account.enabled"
            hide-details
            @update:model-value="(enabled: boolean | null) => toggleCalendarAccount(!!enabled)"
          />
          <!-- eslint-enable vue/no-mutating-props -->
          <div
            v-if="hasSubCalendars"
            class="-tw-ml-2 tw-h-fit tw-w-fit tw-cursor-pointer"
            @click="showSubCalendars = !showSubCalendars"
          >
            <div class="tw-rotate-0 tw-rotate-90"></div>

            <v-icon
              :class="`tw-rotate-${showSubCalendars ? 90 : 0}`"
              class="tw-text-dark-gray tw-transition-all"
              >mdi-chevron-right</v-icon
            >
          </div>
        </div>
        <UserAvatarContent v-else :size="24" :user="account" />
        <div
          :class="toggleState && !fillSpace ? 'tw-w-[180px]' : ''"
          class="tw-align-text-middle tw-inline-block tw-break-words tw-text-sm"
        >
          {{ account.email }}
        </div>
        <v-tooltip v-if="accountHasError" top>
          <template #activator="{ props: tooltipProps }">
            <v-btn
              icon
              v-bind="tooltipProps"
              @click="reauthenticateCalendarAccount"
            >
              <v-icon>mdi-alert-circle</v-icon>
            </v-btn>
          </template>
          <span>{{ reauthenticateBtnText }}</span>
        </v-tooltip>
      </div>
      <span class="tw-hidden tw-opacity-0 tw-opacity-100"></span>

      <v-btn
        icon
        :class="`tw-opacity-${
          account.email == selectedRemoveEmail && removeDialog ? '100' : '0'
        } ${!allowDelete ? 'tw-hidden' : ''}`"
        class="group-hover:tw-opacity-100"
        @click="openRemoveDialog"
        ><v-icon color="#4F4F4F">mdi-close</v-icon></v-btn
      >
    </div>

    <v-expand-transition>
      <div
        v-if="hasSubCalendars && showSubCalendars"
        class="tw-space-y-2 tw-bg-[#EBF7EF] tw-py-2"
      >
        <div
          v-for="(subCalendar, id) in account.subCalendars"
          :key="id"
          class="tw-flex tw-flex-row tw-items-start"
        >
          <v-checkbox
            v-model="subCalendar.enabled"
            class="-tw-mt-px"
            hide-details
            @update:model-value="(enabled: any) => toggleSubCalendarAccount(!!enabled, id)"
          />
          <div
            :class="!fillSpace ? 'tw-w-40' : ''"
            class="tw-align-text-middle tw-ml-8 tw-inline-block tw-break-words tw-text-sm"
          >
            {{ subCalendar.name }}
          </div>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { authTypes, calendarTypes } from "@/constants"
import { post, signInGoogle, getCalendarAccountKey } from "@/utils"
import { useMainStore } from "@/stores/main"
import UserAvatarContent from "@/components/UserAvatarContent.vue"

interface SubCalendar {
  name?: string
  enabled?: boolean
}

interface CalendarAccountProp {
  calendarType?: string
  email?: string
  enabled?: boolean
  subCalendars?: Record<string, SubCalendar>
}

interface CalendarEventsEntry {
  error?: boolean
  calendarEvents?: unknown[]
}

const props = withDefaults(
  defineProps<{
    toggleState?: boolean
    account?: CalendarAccountProp
    eventId?: string
    calendarEventsMap?: Record<string, CalendarEventsEntry | undefined>
    removeDialog?: boolean
    selectedRemoveEmail?: string
    syncWithBackend?: boolean
    fillSpace?: boolean
  }>(),
  {
    toggleState: false,
    account: () => ({}),
    eventId: "",
    calendarEventsMap: () => ({}),
    removeDialog: false,
    selectedRemoveEmail: "",
    syncWithBackend: true,
    fillSpace: false,
  }
)

const emit = defineEmits<{
  toggleCalendarAccount: [
    payload: { email: string; calendarType: string; enabled: boolean },
  ]
  toggleSubCalendarAccount: [
    payload: {
      email: string
      calendarType: string
      enabled: boolean
      subCalendarId: string | number
    },
  ]
  openRemoveDialog: [payload: { email: string; calendarType: string }]
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const showSubCalendars = ref(false)

const allowDelete = computed(
  () =>
    !(
      (props.account.calendarType == calendarTypes.GOOGLE &&
        props.account.email == authUser.value?.email) ||
      props.toggleState
    )
)
const hasSubCalendars = computed(
  () => props.account.calendarType !== calendarTypes.ICS
)
const accountHasError = computed(() => {
  const a =
    props.calendarEventsMap[
      getCalendarAccountKey(props.account.email ?? "", props.account.calendarType ?? "")
    ]
  return a?.error && a.calendarEvents?.length === 0
})
const showAccount = computed(() => !(props.toggleState && accountHasError.value))
const reauthenticateBtnText = computed(() => {
  if (props.account.calendarType == calendarTypes.GOOGLE) {
    return "Calendar access not granted, click to reauthenticate"
  } else if (props.account.calendarType == calendarTypes.APPLE) {
    return "Error with Apple Calendar account, click to remove"
  } else if (props.account.calendarType == calendarTypes.OUTLOOK) {
    return "Error with Outlook Calendar account, click to remove"
  }
  return ""
})

const reauthenticateCalendarAccount = () => {
  if (props.account.calendarType == calendarTypes.GOOGLE) {
    signInGoogle({
      state: {
        type: props.toggleState
          ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
          : authTypes.ADD_CALENDAR_ACCOUNT,
        eventId: props.eventId,
      },
      requestCalendarPermission: true,
      selectAccount: false,
      loginHint: props.account.email,
    })
  } else if (
    props.account.calendarType == calendarTypes.APPLE ||
    props.account.calendarType == calendarTypes.OUTLOOK
  ) {
    openRemoveDialog()
  }
}
const toggleSubCalendarAccount = (enabled: boolean, subCalendarId: string | number) => {
  if (props.syncWithBackend) {
    post(`/user/toggle-sub-calendar`, {
      email: props.account.email ?? "",
      calendarType: props.account.calendarType ?? "",
      enabled,
      subCalendarId,
    }).catch(() => {
      mainStore.showError(
        "There was a problem with toggling your calendar account! Please try again later."
      )
    })
  } else {
    emit("toggleSubCalendarAccount", {
      email: props.account.email ?? "",
      calendarType: props.account.calendarType ?? "",
      enabled,
      subCalendarId,
    })
  }
}
const toggleCalendarAccount = (enabled: boolean) => {
  if (!enabled) showSubCalendars.value = false

  if (props.syncWithBackend) {
    post(`/user/toggle-calendar`, {
      email: props.account.email ?? "",
      calendarType: props.account.calendarType ?? "",
      enabled,
    }).catch(() => {
      mainStore.showError(
        "There was a problem with toggling your calendar account! Please try again later."
      )
    })
  } else {
    emit("toggleCalendarAccount", {
      email: props.account.email ?? "",
      calendarType: props.account.calendarType ?? "",
      enabled,
    })
  }
}
const openRemoveDialog = () => {
  emit("openRemoveDialog", {
    email: props.account.email ?? "",
    calendarType: props.account.calendarType ?? "",
  })
}
</script>
