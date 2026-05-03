<template>
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-card class="tw-p-4 sm:tw-p-6">
      <v-expand-transition>
        <div v-show="state === states.CHOICES">
          <div class="tw-text-md mb-1 tw-text-center">
            How would you like to add <br class="tw-block sm:tw-hidden" />
            your availability?
          </div>
          <div class="tw-pb-4 tw-text-center tw-text-xs tw-text-dark-gray">
            You can always manually edit after autofilling
          </div>
          <div class="tw-flex tw-flex-col tw-gap-2">
            <v-btn block class="tw-bg-white" @click="autofillWithGcal">
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
            <v-btn block class="tw-bg-white" @click="autofillWithApple">
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
            <v-btn block class="tw-bg-white" @click="autofillWithOutlook">
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
            <v-btn block class="tw-bg-white" @click="autofillWithICS">
              <div class="tw-flex tw-w-full tw-items-center tw-gap-2">
                <v-icon class="tw-flex-initial" size="20">
                  mdi-calendar-sync
                </v-icon>
                <v-spacer />
                Autofill with ICS Calendar Feed
                <v-spacer />
              </div>
            </v-btn>
            <div class="tw-flex tw-items-center tw-gap-3">
              <v-divider />
              <div
                class="tw-text-center tw-text-xs tw-font-medium tw-text-dark-gray"
              >
                or
              </div>
              <v-divider />
            </div>
            <v-btn block @click="setAvailabilityManually">Manually</v-btn>
          </div>
        </div>
      </v-expand-transition>
      <v-expand-transition>
        <CalendarPermissionsCard
          v-show="state === states.GCAL_PERMISSIONS"
          cancel-label="Back"
          @cancel="showChoices"
          @allow="emit('allowGoogleCalendar')"
        />
      </v-expand-transition>
      <v-expand-transition>
        <CreateAccount
          v-if="state === states.CREATE_ACCOUNT_APPLE"
          @sign-in-link-apple="emit('signInLinkApple')"
          @back="state = states.CHOICES"
          @continue="state = states.APPLE_CREDENTIALS"
        />
      </v-expand-transition>
      <v-expand-transition>
        <AppleCredentials
          v-if="state === states.APPLE_CREDENTIALS"
          @back="state = states.CHOICES"
          @added-apple-calendar="emit('addedAppleCalendar')"
        />
      </v-expand-transition>
      <v-expand-transition>
        <ICSCredentials
          v-if="state === states.ICS_CREDENTIALS"
          @back="state = states.CHOICES"
          @added-calendar="emit('addedICSCalendar')"
        />
      </v-expand-transition>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import CalendarPermissionsCard from "./CalendarPermissionsCard.vue"
import CreateAccount from "./CreateAccount.vue"
import AppleCredentials from "./AppleCredentials.vue"
import ICSCredentials from "./ICSCredentials.vue"

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    initialState?: string
  }>(),
  { initialState: "choices" }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  setAvailabilityManually: []
  allowGoogleCalendar: []
  allowOutlookCalendar: []
  signInLinkApple: []
  addedAppleCalendar: []
  addedICSCalendar: []
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const states = {
  CHOICES: "choices",
  GCAL_PERMISSIONS: "gcal_permissions",
  CREATE_ACCOUNT_APPLE: "create_account_apple",
  APPLE_CREDENTIALS: "apple_credentials",
  ICS_CREDENTIALS: "ics_credentials",
} as const

const state = ref<string>(props.initialState)

const setAvailabilityManually = () => {
  emit("setAvailabilityManually")
}
const autofillWithGcal = () => {
  posthog.capture("autofill_with_gcal_clicked")
  state.value = states.GCAL_PERMISSIONS
}
const autofillWithApple = () => {
  posthog.capture("autofill_with_apple_clicked")
  if (authUser.value) {
    state.value = states.APPLE_CREDENTIALS
  } else {
    state.value = states.CREATE_ACCOUNT_APPLE
  }
}
const autofillWithOutlook = () => {
  posthog.capture("autofill_with_outlook_clicked")
  emit("allowOutlookCalendar")
}
const autofillWithICS = () => {
  posthog.capture("autofill_with_ics_clicked")
  state.value = states.ICS_CREDENTIALS
}
const showChoices = () => {
  state.value = states.CHOICES
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) setTimeout(() => (state.value = states.CHOICES), 100)
  }
)
</script>
