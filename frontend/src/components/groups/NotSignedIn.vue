<template>
  <v-fade-transition>
    <div
      v-if="loaded"
      class="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-p-2"
    >
      <div class="tw-mb-8 tw-flex tw-max-w-[26rem] tw-flex-col tw-items-center">
        <UserAvatarContent
          :user="owner"
          :size="90"
          class="tw-mb-4 tw-text-center"
        />
        <h1 class="tw-mb-2 tw-text-center tw-text-xl tw-font-medium">
          {{ owner?.firstName ?? "" }} invited you to join <br />"{{
            event.name
          }}"
        </h1>
        <div class="tw-text-center tw-text-dark-gray">
          Join the group now to share your real-time <br v-if="!isPhone" />
          calendar availability with each other!
        </div>
      </div>
      <v-btn color="primary" class="tw-mb-8" @click="join"
        >Join with Google Calendar</v-btn
      >
      <div class="tw-text-center tw-text-dark-gray">
        Already have a Timeful account?
        <a class="tw-underline" @click="signIn">Sign in</a>
      </div>

      <v-dialog
        v-model="calendarPermissionsDialog"
        width="400"
        content-class="tw-m-0"
      >
        <v-card class="tw-p-4 sm:tw-p-6">
          <CalendarPermissionsCard
            @cancel="calendarPermissionsDialog = false"
            @allow="allowCalendarAccess"
          />
        </v-card>
      </v-dialog>

      <SignInNotSupportedDialog v-model="webviewDialog" />
    </div>
  </v-fade-transition>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRoute } from "vue-router"
import { get, signInGoogle } from "@/utils"
import { authTypes } from "@/constants"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import CalendarPermissionsCard from "@/components/calendar_permission_dialogs/CalendarPermissionsCard.vue"
import SignInNotSupportedDialog from "@/components/SignInNotSupportedDialog.vue"
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import isWebview from "is-ua-webview"
import type { Event, User } from "@/types"
import type { RawUser } from "@/types/transport"
import { fromRawUser } from "@/types/transport"

const props = defineProps<{
  event: Event
}>()

const route = useRoute()
const { isPhone } = useDisplayHelpers()

const owner = ref<User | null>(null)
const loaded = ref(false)
const calendarPermissionsDialog = ref(false)
const webviewDialog = ref(false)

const join = () => {
  calendarPermissionsDialog.value = true
}

const allowCalendarAccess = () => {
  if (isWebview(navigator.userAgent)) {
    webviewDialog.value = true
    return
  }

  signInGoogle({
    state: {
      type: authTypes.GROUP_SIGN_IN,
      groupId: route.params.groupId,
    },
    selectAccount: true,
    requestCalendarPermission: true,
  })
}

const signIn = () => {
  if (isWebview(navigator.userAgent)) {
    webviewDialog.value = true
    return
  }

  signInGoogle({
    state: {
      type: authTypes.GROUP_SIGN_IN,
      groupId: route.params.groupId,
    },
    selectAccount: true,
  })
}

void (async () => {
  owner.value = fromRawUser(
    await get<RawUser>(`/users/${props.event.ownerId ?? ""}`)
  )
  loaded.value = true
})()
</script>
