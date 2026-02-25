<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    content-class="tw-max-w-[35rem] tw-m-0 tw-max-h-full"
    :transition="isPhone ? `dialog-bottom-transition` : `dialog-transition`"
    persistent
  >
    <v-expand-transition>
      <v-card
        class="tw-overflow-none tw-relative tw-flex tw-flex-col tw-rounded-lg tw-px-2 tw-py-5 tw-transition-all"
      >
        <v-card-text>
          <div
            class="tw-mb-5 tw-text-wrap tw-text-xl tw-font-medium tw-text-text-primary"
          >
            <template v-if="isOwner"> Share calendar availability </template>
            <template v-else>
              Accept invitation to share your calendar availability with "{{
                group.name
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
                @toggleCalendarAccount="toggleCalendarAccount"
                @toggleSubCalendarAccount="toggleSubCalendarAccount"
              ></CalendarAccounts>

              <div class="tw-mt-5 tw-space-y-4">
                <div class="tw-font-medium tw-text-text-primary">
                  Your calendar availability from these calendars will be shared
                  with:
                </div>
                <div
                  class="tw-flex tw-flex-wrap tw-gap-1"
                  v-if="membersToShareWith.length > 0"
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
                <div class="tw-text-xs tw-text-text-muted">
                  Your calendar events will NOT be visible to others
                </div>
              </div>
            </div>
          </v-expand-transition>

          <v-expand-transition>
            <div class="tw-p-5 tw-text-text-primary" v-if="!calendarPermissionGranted">
              <CalendarPermissionsCard
                v-show="true"
                cancelLabel=""
                @allow="
                  () => {
                    $emit('setAvailabilityAutomatically')
                  }
                "
              />
            </div>
          </v-expand-transition>
        </v-card-text>

        <v-card-actions v-if="isOwner">
          <v-btn class="tw-px-6" @click="goHome" text>Back</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            @click="acceptInvitation"
            :disabled="!calendarPermissionGranted"
            class="tw-px-6"
            >Share</v-btn
          >
        </v-card-actions>
        <v-card-actions v-else>
          <v-dialog v-model="rejectDialog" width="400" persistent>
            <template v-slot:activator="{ on, attrs }">
              <v-btn text class="tw-text-text-muted" v-bind="attrs" v-on="on"
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
                  class="tw-text-text-muted"
                  @click="rejectDialog = false"
                  >Cancel</v-btn
                >
                <v-btn text @click="rejectInvitation" color="error"
                  >I'm sure</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-spacer />
          <v-btn
            class="tw-bg-green tw-px-5 tw-text-white tw-transition-opacity"
            @click="acceptInvitation"
            :disabled="!calendarPermissionGranted"
            >Accept Invitation</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-expand-transition>
  </v-dialog>
</template>

<script>
import { mapState } from "vuex"
import { isPhone, post, generateEnabledCalendarsPayload } from "@/utils"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"
import CalendarPermissionsCard from "@/components/calendar_permission_dialogs/CalendarPermissionsCard.vue"
import UserChip from "@/components/general/UserChip.vue"

export default {
  name: "InvitationDialog",

  emits: ["input"],

  props: {
    value: { type: Boolean, required: true },
    group: { type: Object },
    calendarPermissionGranted: { type: Boolean, required: true },
  },

  components: {
    CalendarAccounts,
    UserChip,
    CalendarPermissionsCard,
  },

  data: () => ({
    calendarAccounts: {},
    rejectDialog: false,
  }),

  mounted() {
    this.calendarAccounts = JSON.parse(
      JSON.stringify(this.authUser.calendarAccounts)
    )
  },

  computed: {
    ...mapState(["authUser"]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
    isOwner() {
      return this.authUser._id === this.group.ownerId
    },
    membersToShareWith() {
      return this.group.attendees?.filter(
        (u) => !u.declined && u.email != this.authUser.email
      )
    },
  },
  methods: {
    goHome() {
      this.$router.push({ name: "home" })
    },
    rejectInvitation() {
      post(`/events/${this.group._id}/decline`).then((res) => {
        this.$router.replace({ name: "home" })
      })
    },

    acceptInvitation() {
      const payload = generateEnabledCalendarsPayload(this.calendarAccounts)

      post(`/events/${this.group._id}/response`, payload).then((res) => {
        this.$emit("input", false)
        this.$emit("refreshEvent")
      })
    },

    toggleCalendarAccount(payload) {
      this.calendarAccounts[
        `${payload.email}_${payload.calendarType}`
      ].enabled = payload.enabled
    },

    toggleSubCalendarAccount(payload) {
      this.calendarAccounts[
        `${payload.email}_${payload.calendarType}`
      ].subCalendars[payload.subCalendarId].enabled = payload.enabled
    },
  },
}
</script>
