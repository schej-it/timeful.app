<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    width="400"
    content-class="tw-m-0"
  >
    <v-card class="tw-p-4 sm:tw-p-6">
      <v-expand-transition>
        <div v-show="state === states.CHOICES">
          <div class="tw-text-md mb-1 tw-text-center">
            How would you like to add <br class="tw-block sm:tw-hidden" />
            your availability?
          </div>
          <div class="tw-pb-4 tw-text-center tw-text-xs tw-text-text-muted">
            You can always manually edit after autofilling
          </div>
          <div class="tw-flex tw-flex-col tw-gap-2">
            <v-btn block @click="autofillWithGcal" class="tw-bg-surface">
              <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
                <v-img
                  class="tw-flex-initial"
                  width="20"
                  height="20"
                  src="@/assets/google_logo.svg"
                />
                <v-spacer />
                Autofill with Google Calendar
                <v-spacer />
              </div>
            </v-btn>
            <v-btn block @click="autofillWithApple" class="tw-bg-surface">
              <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
                <v-img
                  class="tw-flex-initial"
                  width="20"
                  height="20"
                  src="@/assets/apple_logo.svg"
                />
                <v-spacer />
                Autofill with Apple Calendar
                <v-spacer />
              </div>
            </v-btn>
            <v-btn block @click="autofillWithOutlook" class="tw-bg-surface">
              <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
                <v-img
                  class="tw-flex-initial"
                  width="20"
                  height="20"
                  src="@/assets/outlook_logo.svg"
                />
                <v-spacer />
                Autofill with Outlook Calendar
                <v-spacer />
              </div>
            </v-btn>
            <div class="tw-flex tw-items-center tw-gap-3">
              <v-divider />
              <div
                class="tw-text-center tw-text-xs tw-font-medium tw-text-text-muted"
              >
                or
              </div>
              <v-divider />
            </div>
            <v-btn @click="setAvailabilityManually" block>Manually</v-btn>
          </div>
        </div>
      </v-expand-transition>
      <v-expand-transition>
        <CalendarPermissionsCard
          v-show="state === states.GCAL_PERMISSIONS"
          cancelLabel="Back"
          @cancel="showChoices"
          @allow="$emit('allowGoogleCalendar')"
        />
      </v-expand-transition>
      <v-expand-transition>
        <CreateAccount
          v-if="state === states.CREATE_ACCOUNT_APPLE"
          @signInLinkApple="$emit('signInLinkApple')"
          @back="state = states.CHOICES"
          @continue="state = states.APPLE_CREDENTIALS"
        />
      </v-expand-transition>
      <v-expand-transition>
        <AppleCredentials
          v-if="state === states.APPLE_CREDENTIALS"
          @back="state = states.CHOICES"
          @addedAppleCalendar="$emit('addedAppleCalendar')"
        />
      </v-expand-transition>
    </v-card>
  </v-dialog>
</template>

<script>
import { isPhone } from "@/utils"
import { mapActions, mapState } from "vuex"
import CalendarPermissionsCard from "./CalendarPermissionsCard"
import CreateAccount from "./CreateAccount"
import AppleCredentials from "./AppleCredentials"

export default {
  name: "MarkAvailabilityDialog",

  props: {
    value: { type: Boolean, required: true },
    initialState: { type: String, default: "choices" },
  },

  components: {
    CalendarPermissionsCard,
    CreateAccount,
    AppleCredentials,
  },

  data() {
    return {
      states: {
        CHOICES: "choices", // present user with choice of automatic or manual
        GCAL_PERMISSIONS: "gcal_permissions", // present to user the gcal permissions we request
        CREATE_ACCOUNT_APPLE: "create_account_apple", // present to user the create account dialog
        APPLE_CREDENTIALS: "apple_credentials", // present to user the apple credentials dialog
      },
      state: this.initialState,
    }
  },

  computed: {
    ...mapState(["authUser"]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
  },

  methods: {
    ...mapActions(["showInfo"]),
    setAvailabilityManually() {
      this.$emit("setAvailabilityManually")
    },
    autofillWithGcal() {
      this.$posthog.capture("autofill_with_gcal_clicked")
      this.state = this.states.GCAL_PERMISSIONS
    },
    autofillWithApple() {
      this.$posthog.capture("autofill_with_apple_clicked")
      if (this.authUser) {
        this.state = this.states.APPLE_CREDENTIALS
      } else {
        this.state = this.states.CREATE_ACCOUNT_APPLE
      }
    },
    autofillWithOutlook() {
      this.$posthog.capture("autofill_with_outlook_clicked")
      this.$emit("allowOutlookCalendar")
    },
    showChoices() {
      this.state = this.states.CHOICES
    },
  },

  watch: {
    value() {
      if (!this.value) setTimeout(() => (this.state = this.states.CHOICES), 100)
    },
  },
}
</script>
