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
          <v-checkbox
            v-model="account.enabled"
            @change="(enabled) => toggleCalendarAccount(enabled)"
            hide-details
          />
          <div
            v-if="hasSubCalendars"
            class="-tw-ml-2 tw-h-fit tw-w-fit tw-cursor-pointer"
            @click="
              () => {
                showSubCalendars = !showSubCalendars
              }
            "
          >
            <!-- Make sure tailwind classes are compiled -->
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
        <v-tooltip top v-if="accountHasError">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              v-bind="attrs"
              v-on="on"
              @click="reauthenticateCalendarAccount"
            >
              <v-icon>mdi-alert-circle</v-icon>
            </v-btn>
          </template>
          <span>{{ reauthenticateBtnText }}</span>
        </v-tooltip>
      </div>
      <!-- Needed to make sure tailwind classes compile -->
      <span class="tw-hidden tw-opacity-0 tw-opacity-100"></span>

      <!-- Delete account button -->
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

    <!-- Sub-calendar accounts -->

    <v-expand-transition>
      <div v-if="hasSubCalendars && showSubCalendars" class="tw-space-y-2 tw-bg-[#EBF7EF] tw-py-2">
        <div
          v-for="(subCalendar, id) in account.subCalendars"
          :key="id"
          class="tw-flex tw-flex-row tw-items-start"
        >
          <v-checkbox
            v-model="subCalendar.enabled"
            @change="(enabled) => toggleSubCalendarAccount(enabled, id)"
            class="-tw-mt-px"
            hide-details
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

<script>
import { mapState, mapActions } from "vuex"
import { authTypes, calendarTypes } from "@/constants"
import {
  post,
  _delete,
  signInGoogle,
  getCalendarAccountKey,
} from "@/utils"
import UserAvatarContent from "@/components/UserAvatarContent.vue"

export default {
  name: "CalendarAccount",

  props: {
    toggleState: { type: Boolean, default: false },
    account: { type: Object, default: () => {} },
    eventId: { type: String, default: "" },
    calendarEventsMap: { type: Object, default: () => {} }, // Object of different users' calendar events
    removeDialog: { type: Boolean, default: false },
    selectedRemoveEmail: { type: String, default: "" },
    syncWithBackend: { type: Boolean, default: true },
    fillSpace: { type: Boolean, default: false },
  },

  components: {
    UserAvatarContent,
  },

  data: () => ({
    showSubCalendars: false,
  }),

  computed: {
    ...mapState(["authUser"]),
    allowDelete() {
      return !(
        (this.account.calendarType == calendarTypes.GOOGLE &&
          this.account.email == this.authUser.email) ||
        this.toggleState
      )
    },
    hasSubCalendars() {
      return this.account.calendarType !== calendarTypes.ICS
    },
    accountHasError() {
      const account =
        this.calendarEventsMap?.[
          getCalendarAccountKey(this.account.email, this.account.calendarType)
        ]
      return account?.error && account?.calendarEvents?.length === 0
    },
    /** don't show account if in toggle state and account has an error */
    showAccount() {
      return !(this.toggleState && this.accountHasError)
    },
    reauthenticateBtnText() {
      if (this.account.calendarType == calendarTypes.GOOGLE) {
        return "Calendar access not granted, click to reauthenticate"
      } else if (this.account.calendarType == calendarTypes.APPLE) {
        return "Error with Apple Calendar account, click to remove"
      } else if (this.account.calendarType == calendarTypes.OUTLOOK) {
        return "Error with Outlook Calendar account, click to remove"
      }
    },
  },

  methods: {
    ...mapActions(["showError"]),
    addCalendarAccount() {
      signInGoogle({
        state: {
          type: this.toggleState
            ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
            : authTypes.ADD_CALENDAR_ACCOUNT,
          eventId: this.eventId,
        },
        requestCalendarPermission: true,
        selectAccount: true,
      })
    },
    reauthenticateCalendarAccount() {
      if (this.account.calendarType == calendarTypes.GOOGLE) {
        signInGoogle({
          state: {
            type: this.toggleState
              ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
              : authTypes.ADD_CALENDAR_ACCOUNT,
            eventId: this.eventId,
          },
          requestCalendarPermission: true,
          selectAccount: false,
          loginHint: this.account.email,
        })
      } else if (this.account.calendarType == calendarTypes.APPLE) {
        this.openRemoveDialog()
      } else if (this.account.calendarType == calendarTypes.OUTLOOK) {
        this.openRemoveDialog()
      }
    },
    toggleSubCalendarAccount(enabled, subCalendarId) {
      if (this.syncWithBackend) {
        post(`/user/toggle-sub-calendar`, {
          email: this.account.email,
          calendarType: this.account.calendarType,
          enabled,
          subCalendarId,
        }).catch((err) => {
          this.showError(
            "There was a problem with toggling your calendar account! Please try again later."
          )
        })
      } else {
        this.$emit("toggleSubCalendarAccount", {
          email: this.account.email,
          calendarType: this.account.calendarType,
          enabled,
          subCalendarId,
        })
      }
    },
    toggleCalendarAccount(enabled) {

      if (!enabled) this.showSubCalendars = false

      if (this.syncWithBackend) {
        post(`/user/toggle-calendar`, {
          email: this.account.email,
          calendarType: this.account.calendarType,
          enabled,
        }).catch((err) => {
          this.showError(
            "There was a problem with toggling your calendar account! Please try again later."
          )
        })
      } else {
        this.$emit("toggleCalendarAccount", {
          email: this.account.email,
          calendarType: this.account.calendarType,
          enabled,
        })
      }
    },
    openRemoveDialog() {
      this.$emit("openRemoveDialog", {
        email: this.account.email,
        calendarType: this.account.calendarType,
      })
    },
  },
}
</script>
