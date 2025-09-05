<template>
  <div>
    <div class="tw-flex tw-items-center tw-font-medium">
      <template v-if="!isOwner && event.blindAvailabilityEnabled">
        Your response
      </template>
      <template v-else>
        <div class="tw-mr-1 tw-text-lg">
          {{ !isGroup ? "Responses" : "Members" }}
        </div>
        <div class="tw-font-normal">
          <template v-if="curRespondents.length === 0">
            {{
              isCurTimeslotSelected
                ? `(${numUsersAvailable}/${respondents.length})`
                : `(${respondents.length})`
            }}
          </template>
          <template v-else>
            {{
              isCurTimeslotSelected
                ? `(${numCurRespondentsAvailable}/${curRespondents.length})`
                : `(${curRespondents.length})`
            }}
          </template>
        </div>
        <template v-if="allowExportCsv">
          <v-spacer />
          <v-menu right offset-x>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon v-on="on" v-bind="attrs"
                ><v-icon>mdi-dots-vertical</v-icon></v-btn
              >
            </template>
            <v-list class="tw-py-1" dense>
              <v-dialog v-model="exportCsvDialog.visible" width="400">
                <template v-slot:activator="{ on, attrs }">
                  <v-list-item
                    id="export-csv-btn"
                    v-on="on"
                    v-bind="attrs"
                    @click="trackExportCsvClick"
                  >
                    <v-list-item-title>Export CSV</v-list-item-title>
                  </v-list-item>
                </template>
                <v-card>
                  <v-card-title>Export CSV</v-card-title>
                  <v-card-text>
                    <div class="tw-mb-1">Select CSV format:</div>
                    <v-select
                      v-model="exportCsvDialog.type"
                      solo
                      hide-details
                      :items="exportCsvDialog.types"
                      item-text="text"
                      item-value="value"
                    />
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      text
                      @click="exportCsvDialog.visible = false"
                      :disabled="exportCsvDialog.loading"
                      >Cancel</v-btn
                    >
                    <v-btn
                      text
                      @click="exportCsv"
                      color="primary"
                      :loading="exportCsvDialog.loading"
                      >Export</v-btn
                    >
                  </v-card-actions>
                </v-card>
              </v-dialog>
            </v-list>
          </v-menu>
        </template>
      </template>
      <template v-if="isPhone">
        <v-spacer />
        <div
          class="tw-mt-2 tw-text-sm tw-font-normal tw-text-dark-gray"
          :class="showIfNeededStar ? 'tw-visible' : 'tw-invisible'"
        >
          * if needed
        </div>
      </template>
    </div>
    <div
      v-if="isOwner && !isPhone && event.blindAvailabilityEnabled"
      class="tw-mb-2 tw-mt-1 tw-text-xs tw-italic tw-text-very-dark-gray"
    >
      Responses are only visible to {{ isOwner ? "you" : "event creator" }}
    </div>
    <div
      ref="scrollableSection"
      class="tw-flex tw-flex-col"
      :style="
        maxHeight
          ? `max-height: ${maxHeight}px !important;`
          : !isPhone
          ? `max-height: ${respondentsListMaxHeight}px !important;`
          : ''
      "
    >
      <div
        ref="respondentsScrollView"
        class="-tw-ml-2 tw-pl-2 tw-pt-2 tw-text-sm"
        :class="
          isPhone && !maxHeight
            ? 'tw-overflow-hidden'
            : 'tw-overflow-y-auto tw-overflow-x-hidden'
        "
      >
        <div v-if="respondents.length === 0" class="tw-mb-6">
          <span
            class="tw-text-very-dark-gray"
            v-if="!isOwner && event.blindAvailabilityEnabled"
          >
            No response yet!
          </span>
          <span class="tw-text-very-dark-gray" v-else>No responses yet!</span>
        </div>
        <template v-else>
          <transition-group
            name="list"
            class="tw-grid tw-grid-cols-2 tw-gap-x-2 sm:tw-block"
          >
            <div
              v-for="(user, i) in orderedRespondents"
              :key="user._id"
              class="tw-group tw-relative tw-flex tw-cursor-pointer tw-items-center tw-py-1"
              @mouseover="(e) => $emit('mouseOverRespondent', e, user._id)"
              @mouseleave="$emit('mouseLeaveRespondent')"
              @click="(e) => clickRespondent(e, user._id)"
            >
              <div class="tw-relative tw-flex tw-items-center">
                <div class="tw-ml-1 tw-mr-3">
                  <UserAvatarContent
                    v-if="!isGuest(user)"
                    :user="user"
                    :size="16"
                  ></UserAvatarContent>
                  <v-avatar v-else :size="16">
                    <v-icon small>mdi-account</v-icon>
                  </v-avatar>
                </div>

                <v-simple-checkbox
                  @click="(e) => $emit('clickRespondent', e, user._id)"
                  color="primary"
                  :value="respondentSelected(user._id)"
                  class="tw-absolute -tw-top-[2px] tw-left-0 tw-bg-white tw-opacity-0 group-hover:tw-opacity-100 group-[&:has(.email-hover-target:hover)]:!tw-opacity-0"
                  :class="
                    respondentSelected(user._id)
                      ? 'tw-opacity-100'
                      : 'tw-opacity-0'
                  "
                />
              </div>
              <div class="tw-flex tw-flex-col">
                <div
                  class="tw-mr-1 tw-transition-all"
                  :class="respondentClass(user._id)"
                >
                  {{
                    user.firstName +
                    " " +
                    user.lastName +
                    (respondentIfNeeded(user._id) ? "*" : "")
                  }}
                </div>
                <div
                  v-if="isOwner && event.collectEmails"
                  class="email-hover-target tw-flex tw-items-center tw-rounded-sm tw-p-px tw-text-xs tw-text-dark-gray tw-transition-all hover:tw-bg-light-gray"
                  :class="respondentClass(user._id)"
                  @mouseover.stop
                  @click.stop="copyEmailToClipboard(user.email)"
                >
                  {{ user.email }}
                  <v-icon class="tw-ml-1 tw-text-xs">mdi-content-copy</v-icon>
                </div>
              </div>
              <div
                class="tw-absolute tw-right-0 tw-transition-none group-hover:tw-opacity-100 group-[&:has(.email-hover-target:hover)]:!tw-opacity-0"
                :class="isPhone ? 'tw-opacity-100' : 'tw-opacity-0'"
              >
                <template
                  v-if="isPhone && (isGuest(user) || (isOwner && !isGroup))"
                >
                  <v-menu right offset-x>
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn icon v-on="on" v-bind="attrs">
                        <v-icon small color="#4F4F4F">mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list class="tw-py-1" dense>
                      <v-list-item
                        v-if="isGuest(user)"
                        @click="$emit('editGuestAvailability', user._id)"
                      >
                        <v-list-item-title class="tw-flex tw-items-center">
                          <v-icon small class="tw-mr-2" color="#4F4F4F"
                            >mdi-pencil</v-icon
                          >
                          Edit
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item
                        v-if="isOwner && !isGroup"
                        @click="() => showDeleteAvailabilityDialog(user)"
                      >
                        <v-list-item-title class="tw-flex tw-items-center">
                          <v-icon small class="tw-mr-2" color="#4F4F4F"
                            >mdi-delete</v-icon
                          >
                          Delete
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
                <template v-else>
                  <v-btn
                    v-if="isGuest(user)"
                    small
                    icon
                    class="tw-bg-white"
                    @click="$emit('editGuestAvailability', user._id)"
                    ><v-icon small color="#4F4F4F">mdi-pencil</v-icon></v-btn
                  >
                  <v-btn
                    v-if="isOwner && !isGroup"
                    small
                    icon
                    class="tw-bg-white"
                    @click="() => showDeleteAvailabilityDialog(user)"
                    ><v-icon small class="hover:tw-text-red" color="#4F4F4F"
                      >mdi-delete</v-icon
                    ></v-btn
                  >
                </template>
              </div>
            </div>
          </transition-group>
          <div class="tw-h-2"></div>
        </template>
      </div>
      <div class="tw-relative">
        <OverflowGradient
          v-if="hasMounted && !isPhone"
          class="tw-h-16"
          :scrollContainer="$refs.respondentsScrollView"
          :showArrow="false"
        />
      </div>

      <div
        v-if="!isPhone && respondents.length > 0"
        class="tw-col-span-full tw-mb-2 tw-mt-1 tw-text-sm tw-text-dark-gray"
        :class="showIfNeededStar ? 'tw-visible' : 'tw-invisible'"
      >
        * if needed
      </div>
      <div
        v-if="!maxHeight && pendingUsers.length > 0"
        class="tw-mb-4 sm:tw-mb-6"
      >
        <div class="tw-mb-2 tw-flex tw-items-center tw-font-medium">
          <div class="tw-mr-1 tw-text-lg">Pending</div>
          <div class="tw-font-normal">({{ pendingUsers.length }})</div>
        </div>
        <div>
          <div v-for="(user, i) in pendingUsers" :key="user.email">
            <div class="tw-relative tw-flex tw-items-center">
              <v-icon class="tw-ml-1 tw-mr-3" small>mdi-account</v-icon>
              <div class="tw-mr-1 tw-text-sm tw-transition-all">
                {{ user.email }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <template v-if="!isPhone">
        <v-btn
          v-if="
            !isGroup &&
            (authUser || guestAddedAvailability) &&
            (!event.blindAvailabilityEnabled || isOwner)
          "
          text
          color="primary"
          class="-tw-ml-2 tw-mb-4 tw-w-min tw-px-2"
          @click="
            () => {
              if (authUser) {
                $emit('addAvailabilityAsGuest')
              } else {
                $emit('addAvailability')
              }
            }
          "
        >
          {{
            authUser ? "+ Add guest availability" : "+ Add availability"
          }}</v-btn
        >
        <v-switch
          v-if="respondents.length > 1"
          class="tw-mb-4"
          inset
          id="show-best-times-toggle"
          :input-value="showBestTimes"
          @change="(val) => $emit('update:showBestTimes', !!val)"
          hide-details
        >
          <template v-slot:label>
            <div class="tw-text-sm tw-text-black">
              Show best {{ event.daysOnly ? "days" : "times" }}
            </div>
          </template>
        </v-switch>
        <EventOptions
          :event="event"
          :showEventOptions="showEventOptions"
          @toggleShowEventOptions="$emit('toggleShowEventOptions')"
          :showBestTimes="showBestTimes"
          @update:showBestTimes="(val) => $emit('update:showBestTimes', val)"
          :hideIfNeeded="hideIfNeeded"
          @update:hideIfNeeded="(val) => $emit('update:hideIfNeeded', val)"
          :showCalendarEvents="showCalendarEvents"
          @update:showCalendarEvents="
            (val) => $emit('update:showCalendarEvents', val)
          "
          :startCalendarOnMonday="startCalendarOnMonday"
          @update:startCalendarOnMonday="
            (val) => $emit('update:startCalendarOnMonday', val)
          "
          :numResponses="respondents.length"
        />
      </template>
    </div>

    <div
      v-if="(!isOwner || isPhone) && event.blindAvailabilityEnabled"
      class="tw-mt-2 tw-text-xs tw-italic tw-text-very-dark-gray"
    >
      Responses are only visible to {{ isOwner ? "you" : "event creator" }}
    </div>

    <v-dialog v-model="deleteAvailabilityDialog" width="500" persistent>
      <v-card>
        <v-card-title>Are you sure?</v-card-title>
        <v-card-text class="tw-text-sm tw-text-dark-gray"
          >Are you sure you want to delete
          <strong>{{ userToDelete?.firstName }}</strong
          >'s availability from this
          {{ isGroup ? "group" : "event" }}?</v-card-text
        >
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="deleteAvailabilityDialog = false">Cancel</v-btn>
          <v-btn
            text
            color="error"
            @click="
              () => {
                deleteAvailability(userToDelete)
                deleteAvailabilityDialog = false
              }
            "
            >Delete</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-switch
      v-if="isGroup && isPhone"
      :class="maxHeight && 'tw-mt-2'"
      class="tw-mb-4"
      inset
      :input-value="showCalendarEvents"
      @change="(val) => $emit('update:showCalendarEvents', Boolean(val))"
      hide-details
    >
      <template v-slot:label>
        <div class="tw-text-sm tw-text-black">Overlay calendar events</div>
      </template>
    </v-switch>

    <v-btn
      v-if="
        !maxHeight &&
        isPhone &&
        !isGroup &&
        (authUser || guestAddedAvailability) &&
        (!event.blindAvailabilityEnabled || isOwner)
      "
      text
      color="primary"
      class="-tw-ml-2 tw-mt-4 tw-w-min tw-px-2"
      @click="
        () => {
          if (authUser) {
            $emit('addAvailabilityAsGuest')
          } else {
            $emit('addAvailability')
          }
        }
      "
    >
      {{ authUser ? "+ Add guest availability" : "+ Add availability" }}</v-btn
    >
  </div>
</template>

<style scoped>
.list-move {
  transition: transform 0.5s;
}
</style>

<script>
import { _delete, getLocale, isPhone } from "@/utils"
import UserAvatarContent from "../UserAvatarContent.vue"
import { mapState, mapActions } from "vuex"
import EventOptions from "./EventOptions.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"

export default {
  name: "RespondentsList",

  components: { UserAvatarContent, EventOptions, OverflowGradient },

  props: {
    eventId: { type: String, required: true },
    event: { type: Object, required: true },
    days: { type: Array, required: true },
    times: { type: Array, required: true },
    curDate: { type: Date, required: false }, // Date of the current timeslot
    curRespondent: { type: String, required: true },
    curRespondents: { type: Array, required: true },
    curTimeslot: { type: Object, required: true },
    curTimeslotAvailability: { type: Object, required: true },
    respondents: { type: Array, required: true },
    parsedResponses: { type: Object, required: true },
    isOwner: { type: Boolean, required: true },
    maxHeight: { type: Number },
    isGroup: { type: Boolean, required: true },
    attendees: { type: Array, default: () => [] },
    showCalendarEvents: { type: Boolean, required: true },
    responsesFormatted: { type: Map, required: true },
    timezone: { type: Object, required: true },
    showBestTimes: { type: Boolean, required: true },
    hideIfNeeded: { type: Boolean, required: true },
    startCalendarOnMonday: { type: Boolean, default: false },
    showEventOptions: { type: Boolean, required: true },
    guestAddedAvailability: { type: Boolean, required: true },
    addingAvailabilityAsGuest: { type: Boolean, required: true },
  },

  data() {
    return {
      deleteAvailabilityDialog: false,
      exportCsvDialog: {
        visible: false,
        loading: false,
        type: "datesToAvailable",
        types: [
          {
            text: "Dates <> people available",
            value: "datesToAvailable",
          },
          { text: "Name <> dates available", value: "nameToDates" },
        ],
      },
      userToDelete: null,
      desktopMaxHeight: 0,
      respondentsListMinHeight: 400,

      oldCurRespondents: [],
      curRespondentsAddedTime: {}, // Map of respondent id to time they were added

      hasMounted: false,
    }
  },

  computed: {
    ...mapState(["authUser"]),
    allowExportCsv() {
      if (this.isGroup || this.isPhone) return false

      return this.event.blindAvailabilityEnabled
        ? this.isOwner && this.respondents.length > 0
        : this.respondents.length > 0
    },
    curRespondentsSet() {
      return new Set(this.curRespondents)
    },
    isCurTimeslotSelected() {
      return (
        this.curTimeslot.dayIndex !== -1 && this.curTimeslot.timeIndex !== -1
      )
    },
    numUsersAvailable() {
      this.curTimeslot
      let numUsers = 0
      for (const key in this.curTimeslotAvailability) {
        if (this.curTimeslotAvailability[key]) numUsers++
      }
      return numUsers
    },
    numCurRespondentsAvailable() {
      this.curTimeslot
      let numUsers = 0
      for (const key in this.curTimeslotAvailability) {
        if (
          this.curTimeslotAvailability[key] &&
          this.curRespondentsSet.has(key)
        )
          numUsers++
      }
      return numUsers
    },
    pendingUsers() {
      if (!this.isGroup) return []

      const respondentEmailsSet = new Set(
        this.respondents.map((r) => r.email.toLowerCase())
      )

      return this.attendees.filter((a) => {
        if (!a.declined && !respondentEmailsSet.has(a.email.toLowerCase())) {
          return true
        }
        return false
      })
    },
    showIfNeededStar() {
      if (this.hideIfNeeded) {
        return false
      }

      for (const user of this.respondents) {
        if (this.respondentIfNeeded(user._id)) {
          return true
        }
      }
      return false
    },
    isPhone() {
      return isPhone(this.$vuetify)
    },
    orderedRespondents() {
      const orderedRespondents = [...this.respondents]
      orderedRespondents.sort((a, b) => {
        // Sort by added time if both are in curRespondents
        // Sort curRespondents before others
        if (
          this.curRespondentsSet.has(a._id) &&
          this.curRespondentsSet.has(b._id)
        ) {
          return (
            this.curRespondentsAddedTime[a._id] -
            this.curRespondentsAddedTime[b._id]
          )
        } else if (
          this.curRespondentsSet.has(a._id) &&
          !this.curRespondentsSet.has(b._id)
        ) {
          return -1
        } else if (
          !this.curRespondentsSet.has(a._id) &&
          this.curRespondentsSet.has(b._id)
        ) {
          return 1
        }

        // Otherwise, sort by first name
        return (a.firstName || "").localeCompare(b.firstName || "")
      })
      return orderedRespondents
    },
    respondentsListMaxHeight() {
      return Math.max(this.desktopMaxHeight, this.respondentsListMinHeight)
    },
  },

  methods: {
    ...mapActions(["showError", "showInfo"]),
    /** Emit clickRespondent event */
    clickRespondent(e, userId) {
      e.stopImmediatePropagation()
      this.$emit("clickRespondent", e, userId)
    },
    /** Returns the class of the given respondent */
    respondentClass(id) {
      const c = []
      if (/*this.curRespondent == id ||*/ this.curRespondentsSet.has(id)) {
        // c.push("tw-font-bold")
      } else if (this.curRespondents.length > 0) {
        c.push("tw-text-gray")
      }

      if (
        (this.curRespondentsSet.has(id) || this.curRespondents.length === 0) &&
        this.respondentIfNeeded(id)
      ) {
        c.push("tw-bg-yellow")
      }

      if (!this.curTimeslotAvailability[id]) {
        c.push("tw-line-through")
        c.push("tw-text-gray")
      }
      return c
    },
    /** Returns whether the respondent has "ifNeeded" availability for the current timeslot */
    respondentIfNeeded(id) {
      if (!this.curDate || this.hideIfNeeded) return false

      return Boolean(
        this.parsedResponses[id]?.ifNeeded?.has(this.curDate.getTime())
      )
    },
    /** Returns whether the current respondent is selected (for subset avail) */
    respondentSelected(id) {
      return this.curRespondentsSet.has(id)
    },
    /** Returns whether the user is a guest */
    isGuest(user) {
      return user._id == user.firstName
    },
    /** Shows the delete availability dialog */
    showDeleteAvailabilityDialog(user) {
      this.deleteAvailabilityDialog = true
      this.userToDelete = user
    },
    /** Deletes the user's availability on the server */
    async deleteAvailability(user) {
      try {
        await _delete(`/events/${this.eventId}/response`, {
          guest: this.isGuest(user),
          userId: user._id,
          name: user._id,
        })
        this.$emit("refreshEvent")
        this.showInfo("Availability successfully deleted!")

        this.$posthog?.capture("Deleted availability of another user", {
          eventId: this.eventId,
          userId: user._id,
        })
      } catch (e) {
        console.error(e)
        this.showError(
          "There was an error deleting that person's availability!"
        )
      }
    },
    getDateString(date) {
      const locale = getLocale()

      if (this.event.daysOnly) {
        return date.toISOString().substring(0, 10)
      }
      return (
        '"' +
        date.toLocaleString(locale, { timeZone: this.timezone.value }) +
        '"'
      )
    },
    async exportCsv() {
      const csv = []
      const increment = 15
      const numIterations = this.event.daysOnly
        ? 1
        : (this.event.duration * 60) / increment

      // Get responses sorted by first name
      const responses = Object.values(this.parsedResponses).sort((a, b) =>
        a.user.firstName.localeCompare(b.user.firstName)
      )

      if (this.exportCsvDialog.type === "datesToAvailable") {
        // Write CSV header
        const header = ["Date / Time"]
        header.push(
          ...responses.map((r) => r.user.firstName + " " + r.user.lastName)
        )
        csv.push(header)

        // Iterate through the dates
        for (const date of this.event.dates) {
          const curDate = new Date(date)

          // Iterate through the timeslots for the current date
          for (let i = 0; i < numIterations; ++i) {
            const row = [this.getDateString(curDate)]

            // Iterate through the responses and mark whether they are available or not
            for (const response of responses) {
              if (response.availability.has(curDate.getTime())) {
                row.push("Available")
              } else if (response.ifNeeded.has(curDate.getTime())) {
                row.push("If needed")
              } else {
                row.push("")
              }
            }

            // Add row to CSV
            csv.push(row)

            // Increment curDate by the selected amount
            curDate.setMinutes(curDate.getMinutes() + increment)
          }
        }
      } else if (this.exportCsvDialog.type === "nameToDates") {
        // Write CSV header
        csv.push(["Name", "Date / Times available"])

        // Iterate through the responses
        for (const response of responses) {
          // The first row is the name
          const row = [`${response.user.firstName} ${response.user.lastName}`]

          // Iterate through the dates
          for (const date of this.event.dates) {
            const curDate = new Date(date)

            // Iterate through the timeslots for the current date
            for (let i = 0; i < numIterations; ++i) {
              // If the user is available for the current timeslot, add the date to the row
              if (
                response.availability.has(curDate.getTime()) ||
                response.ifNeeded.has(curDate.getTime())
              ) {
                row.push(this.getDateString(curDate))
              } else {
                row.push("")
              }

              // Increment curDate by the selected amount
              curDate.setMinutes(curDate.getMinutes() + increment)
            }
          }
          csv.push(row)
        }
      }

      // Create CSV uri
      // Source: https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
      const csvString =
        "data:text/csv;charset=utf-8," + csv.map((e) => e.join(",")).join("\n")
      const encodedUri = encodeURI(csvString)

      // Set CSV filename and download
      // Source: https://stackoverflow.com/questions/7034754/how-to-set-a-file-name-using-window-open
      const downloadLink = document.createElement("a")
      downloadLink.href = encodedUri
      downloadLink.download = `${this.event.name}.csv`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    },
    trackExportCsvClick() {
      this.$posthog.capture("export_csv_clicked", {
        eventId: this.eventId,
        numRespondents: this.respondents.length,
      })
    },
    setDesktopMaxHeight() {
      const el = this.$refs.scrollableSection
      if (el) {
        const { top } = el.getBoundingClientRect()
        this.desktopMaxHeight = window.innerHeight - top - 32
      } else {
        this.desktopMaxHeight = 0
      }
    },
    /** Copies the given email to the clipboard */
    async copyEmailToClipboard(email) {
      try {
        await navigator.clipboard.writeText(email)
        this.showInfo("Email copied to clipboard!")
      } catch (err) {
        console.error("Failed to copy email: ", err)
        this.showError("Failed to copy email.")
      }
    },
  },

  mounted() {
    this.setDesktopMaxHeight()

    addEventListener("resize", this.setDesktopMaxHeight)
    // addEventListener("scroll", this.setDesktopMaxHeight)

    this.$nextTick(() => {
      this.hasMounted = true
    })
  },

  beforeDestroy() {
    removeEventListener("resize", this.setDesktopMaxHeight)
    // removeEventListener("scroll", this.setDesktopMaxHeight)
  },

  watch: {
    curRespondents: {
      deep: true,
      handler() {
        const oldSet = new Set(this.oldCurRespondents)
        const newSet = new Set(this.curRespondents)

        // Get added respondents (in newSet but not in oldSet)
        const addedRespondents = this.curRespondents.filter(
          (id) => !oldSet.has(id)
        )

        // Get removed respondents (in oldSet but not in newSet)
        const removedRespondents = this.oldCurRespondents.filter(
          (id) => !newSet.has(id)
        )

        // Update curRespondentsAddedTime
        for (const id of addedRespondents) {
          this.$set(this.curRespondentsAddedTime, id, new Date().getTime())
        }
        for (const id of removedRespondents) {
          this.$delete(this.curRespondentsAddedTime, id)
        }

        this.oldCurRespondents = [...this.curRespondents]
      },
    },
  },
}
</script>
