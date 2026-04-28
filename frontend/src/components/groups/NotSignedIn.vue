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
          {{ owner.firstName ?? "" }} invited you to join <br />"{{
            event.name
          }}"
        </h1>
        <div class="tw-text-center tw-text-dark-gray">
          Join the group now to share your real-time <br v-if="!isPhone" />
          calendar availability with each other!
        </div>
      </div>
      <v-btn @click="join" color="primary" class="tw-mb-8"
        >Join with Google Calendar</v-btn
      >
      <div class="tw-text-center tw-text-dark-gray">
        Already have a Timeful account?
        <a @click="signIn" class="tw-underline">Sign in</a>
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

<script>
import { get, isPhone, signInGoogle } from "@/utils"
import { authTypes } from "@/constants"
import CalendarPermissionsCard from "@/components/calendar_permission_dialogs/CalendarPermissionsCard.vue"
import SignInNotSupportedDialog from "@/components/SignInNotSupportedDialog.vue"
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import isWebview from "is-ua-webview"

export default {
  name: "NotSignedIn",

  props: {
    event: { type: Object, required: true },
  },

  components: {
    CalendarPermissionsCard,
    SignInNotSupportedDialog,
    UserAvatarContent,
  },

  data() {
    return {
      owner: {},
      loaded: false,
      calendarPermissionsDialog: false,
      webviewDialog: false,
    }
  },

  computed: {
    isPhone() {
      return isPhone(this.$vuetify)
    },
  },

  methods: {
    join() {
      this.calendarPermissionsDialog = true
    },
    allowCalendarAccess() {
      if (isWebview(navigator.userAgent)) {
        this.webviewDialog = true
        return
      }

      // Ask the user to select the account they want to sign in with if not logged in yet
      signInGoogle({
        state: {
          type: authTypes.GROUP_SIGN_IN,
          groupId: this.$route.params.groupId,
        },
        selectAccount: true,
        requestCalendarPermission: true,
      })
    },
    signIn() {
      if (isWebview(navigator.userAgent)) {
        this.webviewDialog = true
        return
      }

      const state = {
        type: authTypes.GROUP_SIGN_IN,
        groupId: this.$route.params.groupId,
      }
      signInGoogle({
        state,
        selectAccount: true,
      })
    },
  },

  async created() {
    try {
      this.owner = await get(`/users/${this.event.ownerId}`)
    } catch {
      this.owner = { firstName: "", picture: "" }
    } finally {
      this.loaded = true
    }
  },
}
</script>
