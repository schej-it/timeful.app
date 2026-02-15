<template>
  <div class="tw-flex tw-flex-col tw-gap-5">
    <div
      v-if="
        !(
          calendarPermissionGranted &&
          !event.daysOnly &&
          !addingAvailabilityAsGuest
        )
      "
      class="tw-flex tw-flex-wrap tw-items-baseline tw-gap-1 tw-text-sm tw-italic tw-text-dark-gray"
    >
      {{
        (userHasResponded && !addingAvailabilityAsGuest) ||
        curGuestId
          ? "Editing"
          : "Adding"
      }}
      availability as
      <div
        v-if="curGuestId && canEditGuestName"
        class="tw-group tw-mt-0.5 tw-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1"
        @click="openEditGuestNameDialog"
      >
        <span class="tw-font-medium group-hover:tw-underline">{{
          curGuestId
        }}</span>
        <v-icon small>mdi-pencil</v-icon>
      </div>
      <span v-else>
        {{
          authUser && !addingAvailabilityAsGuest
            ? `${authUser.firstName} ${authUser.lastName}`
            : curGuestId?.length > 0
            ? curGuestId
            : "a guest"
        }}
      </span>
      <v-dialog
        v-model="editGuestNameDialog"
        width="400"
        content-class="tw-m-0"
      >
        <v-card>
          <v-card-title>Edit guest name</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newGuestName"
              label="Guest name"
              autofocus
              @keydown.enter="saveGuestName"
              hide-details
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="editGuestNameDialog = false"
              >Cancel</v-btn
            >
            <v-btn text color="primary" @click="saveGuestName"
              >Save</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
    <div class="tw-flex tw-flex-col tw-gap-3">
      <AvailabilityTypeToggle
        v-if="!isGroup && !isPhone"
        class="tw-w-full"
        :value="availabilityType"
        @input="$emit('update:availabilityType', $event)"
      />
      <ColorLegend />
    </div>
    <!-- User's calendar accounts -->
    <CalendarAccounts
      v-if="
        calendarPermissionGranted &&
        !event.daysOnly &&
        !addingAvailabilityAsGuest
      "
      :toggleState="true"
      :eventId="event._id"
      :calendar-events-map="calendarEventsMap"
      :syncWithBackend="!isGroup"
      :allowAddCalendarAccount="!isGroup"
      @toggleCalendarAccount="$emit('toggleCalendarAccount', $event)"
      @toggleSubCalendarAccount="$emit('toggleSubCalendarAccount', $event)"
      :initialCalendarAccountsData="
        isGroup ? sharedCalendarAccounts : authUser.calendarAccounts
      "
    ></CalendarAccounts>

    <div v-if="showOverlayAvailabilityToggle">
      <v-switch
        id="overlay-availabilities-toggle"
        inset
        :input-value="overlayAvailability"
        @change="updateOverlayAvailability"
        hide-details
      >
        <template v-slot:label>
          <div class="tw-text-sm tw-text-black">
            Overlay availabilities
          </div>
        </template>
      </v-switch>

      <div class="tw-mt-2 tw-text-xs tw-text-dark-gray">
        View everyone's availability while inputting your own
      </div>
    </div>

    <!-- Options section -->
    <div
      v-if="!event.daysOnly && showCalendarOptions"
      ref="optionsSection"
    >
      <ExpandableSection
        label="Options"
        :value="showEditOptions"
        @input="toggleShowEditOptions"
      >
        <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2.5">
          <v-dialog
            v-if="showCalendarOptions"
            v-model="calendarOptionsDialog"
            width="500"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                class="tw-border-gray tw-text-sm"
                v-on="on"
                v-bind="attrs"
              >
                Calendar options...
              </v-btn>
            </template>

            <v-card>
              <v-card-title class="tw-flex">
                <div>Calendar options</div>
                <v-spacer />
                <v-btn icon @click="calendarOptionsDialog = false">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text
                class="tw-flex tw-flex-col tw-gap-6 tw-pb-8 tw-pt-2"
              >
                <AlertText v-if="isGroup" class="-tw-mb-4">
                  Calendar options will only updated for the current
                  group
                </AlertText>

                <BufferTimeSwitch
                  :bufferTime="bufferTime"
                  @update:bufferTime="$emit('update:bufferTime', $event)"
                  :syncWithBackend="!isGroup"
                />

                <WorkingHoursToggle
                  :workingHours="workingHours"
                  @update:workingHours="$emit('update:workingHours', $event)"
                  :timezone="curTimezone"
                  :syncWithBackend="!isGroup"
                />
              </v-card-text>
            </v-card>
          </v-dialog>
        </div>
      </ExpandableSection>
    </div>

    <!-- Delete availability button -->
    <div
      v-if="
        (!addingAvailabilityAsGuest && userHasResponded) ||
        curGuestId
      "
    >
      <v-dialog
        v-model="deleteAvailabilityDialog"
        width="500"
        persistent
      >
        <template v-slot:activator="{ on, attrs }">
          <span
            v-bind="attrs"
            v-on="on"
            class="tw-cursor-pointer tw-text-sm tw-text-red"
          >
            {{ !isGroup ? "Delete availability" : "Leave group" }}
          </span>
        </template>

        <v-card>
          <v-card-title>Are you sure?</v-card-title>
          <v-card-text class="tw-text-sm tw-text-dark-gray"
            >Are you sure you want to
            {{
              !isGroup
                ? "delete your availability from this event?"
                : "leave this group?"
            }}</v-card-text
          >
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="deleteAvailabilityDialog = false"
              >Cancel</v-btn
            >
            <v-btn
              text
              color="error"
              @click="
                $emit('deleteAvailability')
                deleteAvailabilityDialog = false
              "
              >{{ !isGroup ? "Delete" : "Leave" }}</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<script>
import { post } from "@/utils"
import { mapActions } from "vuex"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import ColorLegend from "./ColorLegend.vue"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"
import ExpandableSection from "../ExpandableSection.vue"
import BufferTimeSwitch from "./BufferTimeSwitch.vue"
import WorkingHoursToggle from "./WorkingHoursToggle.vue"
import AlertText from "../AlertText.vue"

export default {
  name: "EditAvailabilitySidebar",
  components: {
    AvailabilityTypeToggle,
    ColorLegend,
    CalendarAccounts,
    ExpandableSection,
    BufferTimeSwitch,
    WorkingHoursToggle,
    AlertText,
  },
  props: {
    event: { type: Object, required: true },
    authUser: { type: Object, default: null },
    curGuestId: { type: String, default: "" },
    addingAvailabilityAsGuest: { type: Boolean, default: false },
    userHasResponded: { type: Boolean, default: false },
    calendarPermissionGranted: { type: Boolean, default: false },
    isGroup: { type: Boolean, default: false },
    isPhone: { type: Boolean, default: false },
    calendarEventsMap: { type: Object, default: () => ({}) },
    sharedCalendarAccounts: { type: Object, default: () => ({}) },
    availabilityType: { type: String, default: "" },
    overlayAvailability: { type: Boolean, default: false },
    showOverlayAvailabilityToggle: { type: Boolean, default: false },
    showCalendarOptions: { type: Boolean, default: false },
    canEditGuestName: { type: Boolean, default: false },
    bufferTime: { type: Number, default: 0 },
    workingHours: { type: Object, default: () => ({}) },
    curTimezone: { type: Object, default: () => ({}) },
    guestNameKey: { type: String, default: "" },
  },
  data() {
    return {
      deleteAvailabilityDialog: false,
      calendarOptionsDialog: false,
      editGuestNameDialog: false,
      newGuestName: "",
      showEditOptions:
        localStorage["showEditOptions"] == undefined
          ? true
          : localStorage["showEditOptions"] == "true",
    }
  },
  methods: {
    ...mapActions(["showInfo", "showError"]),
    openEditGuestNameDialog() {
      this.newGuestName = this.curGuestId
      this.editGuestNameDialog = true
    },
    async saveGuestName() {
      const newName = this.newGuestName.trim()
      if (newName.length === 0) {
        this.showError("Guest name cannot be empty")
        return
      }
      if (newName === this.curGuestId) {
        this.editGuestNameDialog = false
        return
      }
      try {
        await post(`/events/${this.event._id}/rename-user`, {
          oldName: this.curGuestId,
          newName,
        })
        localStorage[this.guestNameKey] = newName
        this.showInfo("Guest name updated successfully")
        this.editGuestNameDialog = false
        this.$emit("setCurGuestId", newName)
        this.$emit("refreshEvent")
      } catch (err) {
        const errorMessage = err.parsed?.error || err.message || "Failed to update guest name"
        this.showError(errorMessage)
      }
    },
    toggleShowEditOptions() {
      this.showEditOptions = !this.showEditOptions
      localStorage["showEditOptions"] = this.showEditOptions
    },
    updateOverlayAvailability(val) {
      this.$emit("update:overlayAvailability", !!val)
      this.$posthog?.capture("overlay_availability_toggled", {
        enabled: !!val,
      })
    },
  },
}
</script>
