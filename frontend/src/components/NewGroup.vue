<template>
  <v-card
    :flat="dialog"
    :class="{ 'tw-py-4': !dialog, 'tw-flex-1': dialog }"
    class="tw-relative tw-flex tw-max-w-[28rem] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-transition-all"
  >
    <v-card-title class="tw-mb-2 tw-flex tw-gap-2 tw-px-4 sm:tw-px-8">
      <div>
        <div class="tw-mb-1">
          {{ edit ? "Edit group" : "New group" }}
        </div>
        <div
          v-if="dialog && showHelp"
          class="tw-text-xs tw-font-normal tw-italic tw-text-dark-gray"
        >
          Ideal for viewing weekly calendar availability
        </div>
      </div>
      <v-spacer />
      <template v-if="dialog">
        <v-btn v-if="showHelp" icon @click="helpDialog = true">
          <v-icon>mdi-information-outline</v-icon>
        </v-btn>
        <v-btn v-else @click="$emit('input', false)" icon>
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <HelpDialog v-model="helpDialog">
          <template v-slot:header>Availability groups</template>
          <div class="mb-4">
            Use availability groups to see group members' weekly calendar
            availabilities from Google Calendar. Your actual calendar events
            will NOT be visible to others.
          </div>
        </HelpDialog>
      </template>
    </v-card-title>
    <v-card-text class="tw-flex-1 tw-overflow-auto tw-px-4 tw-py-1 sm:tw-px-8">
      <v-form
        ref="form"
        class="tw-flex tw-flex-col tw-space-y-6"
        v-model="formValid"
        lazy-validation
        :disabled="loading"
      >
        <v-text-field
          ref="name-field"
          v-model="name"
          placeholder="Name your group..."
          hide-details="auto"
          solo
          @keyup.enter="blurNameField"
          :rules="nameRules"
          required
        />

        <div>
          <div class="tw-mb-2 tw-text-lg tw-text-black">Time range</div>
          <div class="tw-flex tw-items-baseline tw-justify-center tw-space-x-2">
            <v-select
              v-model="startTime"
              menu-props="auto"
              :items="times"
              hide-details
              solo
            ></v-select>
            <div>to</div>
            <v-select
              v-model="endTime"
              menu-props="auto"
              :items="times"
              hide-details
              solo
            ></v-select>
          </div>
        </div>

        <div>
          <div class="tw-mb-2 tw-text-lg tw-text-black">Day range</div>
          <v-input
            v-model="selectedDaysOfWeek"
            hide-details="auto"
            :rules="selectedDaysRules"
          >
            <v-btn-toggle
              v-model="selectedDaysOfWeek"
              multiple
              solo
              color="primary"
            >
              <v-btn depressed v-show="!startOnMonday"> Sun </v-btn>
              <v-btn depressed> Mon </v-btn>
              <v-btn depressed> Tue </v-btn>
              <v-btn depressed> Wed </v-btn>
              <v-btn depressed> Thu </v-btn>
              <v-btn depressed> Fri </v-btn>
              <v-btn depressed> Sat </v-btn>
              <v-btn depressed v-show="startOnMonday"> Sun </v-btn>
            </v-btn-toggle>
          </v-input>
          <v-checkbox class="tw-mt-2" v-model="startOnMonday" hide-details>
            <template v-slot:label>
              <span class="tw-text-sm tw-text-very-dark-gray">
                Start on Monday
              </span>
            </template>
          </v-checkbox>
        </div>

        <!-- <div v-if="!edit"> -->
        <EmailInput
          ref="emailInput"
          :addedEmails="addedEmails"
          @update:emails="(newEmails) => (emails = newEmails)"
          @requestContactsAccess="requestContactsAccess"
        >
          <template v-slot:header>
            <div class="tw-mb-2 tw-text-lg tw-text-black">Members</div>
          </template>
        </EmailInput>
        <!-- </div> -->

        <div>
          <v-btn
            class="tw-justify-start tw-pl-0"
            block
            text
            @click="showAdvancedOptions = !showAdvancedOptions"
            ><span class="tw-mr-1">Advanced options</span>
            <v-icon :class="`tw-rotate-${showAdvancedOptions ? '180' : '0'}`"
              >mdi-chevron-down</v-icon
            ></v-btn
          >
          <v-expand-transition>
            <div v-show="showAdvancedOptions">
              <div class="tw-my-2">
                <TimezoneSelector v-model="timezone" label="Timezone" />
              </div>
            </div>
          </v-expand-transition>
        </div>
      </v-form>
    </v-card-text>
    <v-card-actions class="tw-relative tw-px-4 sm:tw-px-8">
      <div class="tw-relative tw-w-full">
        <v-btn
          :disabled="!formValid"
          block
          :loading="loading"
          color="primary"
          class="tw-mt-4 tw-bg-green"
          @click="submit"
        >
          {{ edit ? "Save edits" : "Create group" }}
        </v-btn>
        <div
          :class="formValid ? 'tw-invisible' : 'tw-visible'"
          class="tw-mt-1 tw-text-xs tw-text-red"
        >
          Please fix form errors before continuing
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script>
import {
  validateEmail,
  isPhone,
  post,
  put,
  timeNumToTimeString,
  dateToTimeNum,
  signInGoogle,
  getDateWithTimezone,
} from "@/utils"
import { mapState, mapActions } from "vuex"
import { eventTypes, dayIndexToDayString, authTypes } from "@/constants"
import HelpDialog from "./HelpDialog.vue"
import CalendarPermissionsCard from "./calendar_permission_dialogs/CalendarPermissionsCard.vue"
import TimezoneSelector from "./schedule_overlap/TimezoneSelector.vue"
import EmailInput from "./event/EmailInput.vue"

import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
import moment from "moment"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

export default {
  name: "NewGroup",

  emits: ["input"],

  props: {
    event: { type: Object },
    edit: { type: Boolean, default: false },
    dialog: { type: Boolean, default: true },
    showHelp: { type: Boolean, default: false },
    contactsPayload: { type: Object, default: () => ({}) },
    folderId: { type: String, default: null },
  },

  components: {
    HelpDialog,
    TimezoneSelector,
    EmailInput,
    CalendarPermissionsCard,
  },

  data: () => ({
    formValid: true,
    name: "",
    startTime: 9,
    endTime: 17,
    loading: false,
    selectedDaysOfWeek: [],
    startOnMonday: false,
    emails: [],

    showAdvancedOptions: false,
    timezone: {},

    helpDialog: false,
    initialEventData: {},
  }),

  computed: {
    ...mapState(["authUser"]),
    nameRules() {
      return [(v) => !!v || "Group name is required"]
    },
    selectedDaysRules() {
      return [
        (selectedDays) =>
          selectedDays.length > 0 || "Please select at least one day",
      ]
    },
    formEmpty() {
      return (
        this.name === "" &&
        this.emails.length === 0 &&
        this.selectedDaysOfWeek.length === 0
      )
    },
    isPhone() {
      return isPhone(this.$vuetify)
    },
    times() {
      const times = []

      for (let h = 1; h < 12; ++h) {
        times.push({ text: `${h} am`, value: h })
      }
      for (let h = 0; h < 12; ++h) {
        times.push({ text: `${h == 0 ? 12 : h} pm`, value: h + 12 })
      }
      times.push({ text: "12 am", value: 0 })

      return times
    },
    otherEventAttendees() {
      return this.event && this.event.attendees
        ? this.event.attendees
            .map((a) => a.email)
            .filter((email) => email !== this.authUser.email)
        : []
    },
    addedEmails() {
      if (Object.keys(this.contactsPayload).length > 0)
        return this.contactsPayload.emails
      return this.otherEventAttendees
    },
  },

  mounted() {
    if (Object.keys(this.contactsPayload).length > 0) {
      this.name = this.contactsPayload.name
      this.startTime = this.contactsPayload.startTime
      this.endTime = this.contactsPayload.endTime
      this.selectedDaysOfWeek = this.contactsPayload.selectedDaysOfWeek
      this.startOnMonday = this.contactsPayload.startOnMonday

      this.$refs.form.resetValidation()
    }
  },

  methods: {
    ...mapActions(["showError", "setEventFolder"]),
    blurNameField() {
      this.$refs["name-field"].blur()
    },
    reset() {
      this.name = ""
      this.startTime = 9
      this.endTime = 17
      this.selectedDaysOfWeek = []

      this.$refs.form.resetValidation()
    },
    submit() {
      if (!this.$refs.form.validate()) return

      // Get duration of event
      let duration = this.endTime - this.startTime
      if (duration < 0) duration += 24

      // Populate dates
      const dates = []
      const startTimeString = timeNumToTimeString(this.startTime)
      this.selectedDaysOfWeek.sort((a, b) => a - b)
      this.selectedDaysOfWeek = this.selectedDaysOfWeek.filter((dayIndex) => {
        return this.startOnMonday ? dayIndex !== 0 : dayIndex !== 7
      })
      for (const dayIndex of this.selectedDaysOfWeek) {
        const day = dayIndexToDayString[dayIndex]
        let date = dayjs.tz(`${day} ${startTimeString}`, this.timezone.value)

        // Check if cur date is NOT in daylight savings time
        // because the dow days ARE in daylight savings time
        if (!moment().isDST()) {
          // Add one hour if not in DST
          date = date.add(1, "hour")
        }

        dates.push(date.toDate())
      }

      this.loading = true

      const name = this.name
      const type = eventTypes.GROUP
      const attendees = this.emails
      const startOnMonday = this.startOnMonday

      if (!this.edit) {
        // Create a new group
        post("/events", {
          name,
          duration,
          dates,
          attendees,
          type,
          startOnMonday,
          creatorPosthogId: this.$posthog?.get_distinct_id(),
        })
          .then(async ({ eventId, shortId }) => {
            if (this.authUser) {
              await this.setEventFolder({ eventId, folderId: this.folderId })
            }
            this.$router.push({
              name: "group",
              params: {
                groupId: shortId ?? eventId,
                initialTimezone: this.timezone,
              },
            })
            this.$emit("input", false)

            this.$posthog?.capture("Availability group created", {
              eventId: eventId,
              eventName: name,
              eventDuration: duration,
              eventDates: JSON.stringify(dates),
              eventAttendees: attendees,
              eventType: type,
              eventStartOnMonday: startOnMonday,
            })
          })
          .catch((err) => {
            this.showError(
              "There was a problem creating that group! Please try again later."
            )
            console.error(err)
          })
          .finally(() => {
            this.loading = false
          })
      } else {
        // Edit group
        put(`/events/${this.event._id}`, {
          name,
          duration,
          dates,
          attendees,
          type,
          startOnMonday,
        })
          .then(() => {
            this.$posthog?.capture("Availability group edited", {
              eventId: this.event._id,
              eventName: name,
              eventDuration: duration,
              eventDates: JSON.stringify(dates),
              eventAttendees: attendees,
              eventType: type,
              eventStartOnMonday: startOnMonday,
            })

            this.$emit("input", false)
            this.reset()
            window.location.reload()
          })
          .catch((err) => {
            this.showError(
              "There was a problem editing this group! Please try again later."
            )
          })
          .finally(() => {
            this.loading = false
          })
      }
    },
    /** Redirects user to oauth page requesting access to the user's contacts */
    requestContactsAccess({ emails }) {
      const payload = {
        emails,
        name: this.name,
        startTime: this.startTime,
        endTime: this.endTime,
        selectedDaysOfWeek: this.selectedDaysOfWeek,
      }
      signInGoogle({
        state: {
          type: authTypes.EVENT_CONTACTS,
          eventId: this.event ? this.event.shortId ?? this.event._id : "",
          openNewGroup: true,
          payload,
        },
        requestContactsPermission: true,
      })
    },
    /** Populate fields with data from event */
    updateFieldsFromEvent() {
      if (this.event) {
        this.name = this.event.name

        // Set start time, accounting for the timezone
        this.startTime = Math.floor(
          dateToTimeNum(getDateWithTimezone(this.event.dates[0]), true)
        )
        this.startTime %= 24

        this.endTime = (this.startTime + this.event.duration) % 24
        this.startOnMonday = this.event.startOnMonday

        const selectedDaysOfWeek = []
        for (let date of this.event.dates) {
          date = getDateWithTimezone(date)

          if (this.startOnMonday && date.getUTCDay() === 0) {
            selectedDaysOfWeek.push(7)
          } else {
            selectedDaysOfWeek.push(date.getUTCDay())
          }
        }
        this.selectedDaysOfWeek = selectedDaysOfWeek

        this.emails = this.otherEventAttendees
      }
    },
    resetToEventData() {
      this.updateFieldsFromEvent()
      this.$refs.emailInput.reset()
    },
    setInitialEventData() {
      this.initialEventData = {
        name: this.name,
        startTime: this.startTime,
        endTime: this.endTime,
        selectedDaysOfWeek: this.selectedDaysOfWeek,
        emails: [...this.emails],
      }
    },
    hasEventBeenEdited() {
      return (
        this.name !== this.initialEventData.name ||
        this.startTime !== this.initialEventData.startTime ||
        this.endTime !== this.initialEventData.endTime ||
        JSON.stringify(this.selectedDaysOfWeek) !==
          JSON.stringify(this.initialEventData.selectedDaysOfWeek) ||
        JSON.stringify(this.emails) !==
          JSON.stringify(this.initialEventData.emails)
      )
    },
  },

  watch: {
    event: {
      immediate: true,
      handler() {
        this.updateFieldsFromEvent()
        this.setInitialEventData()
      },
    },
    formEmpty(val) {
      this.$emit("update:formEmpty", val)
    },
  },
}
</script>
