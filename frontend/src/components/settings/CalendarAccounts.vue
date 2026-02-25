<template>
  <div
    :class="toggleState ? '' : 'tw-w-fit tw-min-w-[288px] tw-drop-shadow'"
    class="tw-flex tw-flex-col tw-rounded-lg tw-bg-surface tw-text-text-primary tw-transition-all"
  >
    <v-btn
      v-if="toggleState"
      class="-tw-ml-2 tw-w-[calc(100%+1rem)] tw-justify-between tw-px-2"
      block
      text
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
            :syncWithBackend="syncWithBackend"
            :toggleState="toggleState"
            :account="account"
            :eventId="eventId"
            :calendarEventsMap="calendarEventsMapCopy"
            :removeDialog="removeDialog"
            :selectedRemoveEmail="removePayload.email"
            :fillSpace="fillSpace"
            @toggleCalendarAccount="
              (payload) => $emit('toggleCalendarAccount', payload)
            "
            @toggleSubCalendarAccount="
              (payload) => $emit('toggleSubCalendarAccount', payload)
            "
            @openRemoveDialog="openRemoveDialog"
          ></CalendarAccount>
        </div>
        <v-dialog
          v-if="allowAddCalendarAccount"
          v-model="addCalendarAccountDialog"
          width="400"
          content-class="tw-m-0"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              color="primary"
              :class="
                toggleState ? '-tw-ml-2 tw-mt-0 tw-w-min tw-px-2' : 'tw-w-full'
              "
              v-bind="attrs"
              v-on="on"
              >+ Add calendar</v-btn
            >
          </template>
          <CalendarTypeSelector
            @addGoogleCalendar="addGoogleCalendar"
            @addedAppleCalendar="addedAppleCalendar"
            @addOutlookCalendar="addOutlookCalendar"
          />
        </v-dialog>
      </span>
    </v-expand-transition>
    <v-dialog v-model="removeDialog" width="500" persistent>
      <v-card>
        <v-card-title>Are you sure?</v-card-title>
        <v-card-text class="tw-text-sm tw-text-text-muted"
          >Are you sure you want to remove
          {{ removePayload.email }}?</v-card-text
        >
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="removeDialog = false">Cancel</v-btn>
          <v-btn text color="error" @click="removeAccount">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from "vuex"
import { authTypes, calendarTypes } from "@/constants"
import {
  get,
  post,
  _delete,
  signInGoogle,
  signInOutlook,
  getCalendarAccountKey,
} from "@/utils"
import CalendarAccount from "@/components/settings/CalendarAccount.vue"
import CalendarTypeSelector from "@/components/settings/CalendarTypeSelector.vue"

export default {
  name: "CalendarAccounts",

  props: {
    toggleState: { type: Boolean, default: false }, // Whether to allow user to toggle calendar accounts
    eventId: { type: String, default: "" },
    calendarEventsMap: { type: Object, default: () => {} }, // Object of different users' calendar events
    syncWithBackend: { type: Boolean, default: true }, // Whether toggling calendar accounts also updates the backend
    allowAddCalendarAccount: { type: Boolean, default: true }, // Whether to allow user to add a new calendar account
    initialCalendarAccountsData: { type: Object, default: () => {} }, // Initial data to display for enabled calendar accounts
    fillSpace: { type: Boolean, default: false }, // Whether to fill the available space up
  },

  data: () => ({
    removeDialog: false,
    removePayload: {},

    addCalendarAccountDialog: false,

    calendarAccounts: {},
    showCalendars:
      localStorage["showCalendars"] == undefined
        ? true
        : localStorage["showCalendars"] == "true",

    calendarEventsMapCopy: {},
  }),

  computed: {
    ...mapState(["authUser"]),
  },

  mounted() {
    this.calendarAccounts = !this.initialCalendarAccountsData
      ? this.authUser.calendarAccounts
      : this.initialCalendarAccountsData
  },

  methods: {
    ...mapActions(["showError", "showInfo", "refreshAuthUser"]),
    ...mapMutations(["setAuthUser"]),
    addGoogleCalendar() {
      signInGoogle({
        state: {
          type: this.toggleState
            ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
            : authTypes.ADD_CALENDAR_ACCOUNT,
          eventId: this.eventId,
          calendarType: calendarTypes.GOOGLE,
        },
        requestCalendarPermission: true,
        selectAccount: true,
      })
    },
    addedAppleCalendar() {
      this.addCalendarAccountDialog = false
      this.calendarAccounts = this.authUser.calendarAccounts
    },
    addOutlookCalendar() {
      signInOutlook({
        state: {
          type: this.toggleState
            ? authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
            : authTypes.ADD_CALENDAR_ACCOUNT,
          eventId: this.eventId,
          calendarType: calendarTypes.OUTLOOK,
        },
        requestCalendarPermission: true,
      })
    },
    openRemoveDialog(payload) {
      this.removeDialog = true
      this.removePayload = payload
    },
    removeAccount() {
      _delete(`/user/remove-calendar-account`, this.removePayload)
        .then(async () => {
          // Remove calendar account locally
          const calendarAccountKey = getCalendarAccountKey(
            this.removePayload.email,
            this.removePayload.calendarType
          )
          delete this.authUser.calendarAccounts[calendarAccountKey]
          this.setAuthUser(this.authUser)

          this.removeDialog = false
        })
        .catch((err) => {
          console.error(err)
          this.showError(
            "There was a problem removing this account! Please try again later."
          )
        })
    },
    toggleShowCalendars() {
      this.showCalendars = !this.showCalendars
      localStorage["showCalendars"] = this.showCalendars
    },
  },

  components: {
    CalendarAccount,
    CalendarTypeSelector,
  },

  watch: {
    calendarEventsMap: {
      immediate: true,
      async handler() {
        // Do a test request to calendarevents route to check if calendar access is allowed for each account
        if (
          !this.calendarEventsMap ||
          Object.keys(this.calendarEventsMap).length === 0
        ) {
          const timeMin = new Date()
          const timeMax = new Date()
          try {
            this.calendarEventsMapCopy = await get(
              `/user/calendars?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`
            )
          } catch (err) {
            console.error(err)
          }
        } else {
          this.calendarEventsMapCopy = this.calendarEventsMap
        }
      },
    },
  },
}
</script>
