<template>
  <v-card
    :flat="dialog"
    :class="{ 'tw-py-4': !dialog, 'tw-flex-1': dialog }"
    class="tw-relative tw-flex tw-max-w-[28rem] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-transition-all"
  >
    <v-card-title class="tw-mb-2 tw-flex tw-gap-2 tw-px-4 sm:tw-px-8">
      <div>
        <div class="tw-mb-1">
          {{ edit ? "Edit event" : "New event" }}
        </div>
        <div
          v-if="dialog && showHelp"
          class="tw-text-xs tw-font-normal tw-italic tw-text-dark-gray"
        >
          Ideal for one-time / recurring meetings
        </div>
      </div>
      <v-spacer />
      <template v-if="dialog">
        <v-btn v-if="showHelp" icon @click="helpDialog = true">
          <v-icon>mdi-information-outline</v-icon>
        </v-btn>
        <v-btn v-else icon @click="emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <HelpDialog v-model="helpDialog">
          <template #header>Events</template>
          <div class="tw-mb-4">
            Use events to collect people's availabilities and compare them
            across certain days.
          </div>
        </HelpDialog>
      </template>
    </v-card-title>
    <v-card-text
      ref="cardText"
      class="tw-relative tw-flex-1 tw-overflow-auto tw-px-4 tw-py-1 sm:tw-px-8"
    >
      <AlertText v-if="edit && guestEvent" class="tw-mb-4">
        Anybody can edit this event because it was created while not signed in
      </AlertText>
      <v-form
        ref="formRef"
        v-model="formValid"
        lazy-validation
        class="tw-flex tw-flex-col tw-gap-y-6"
        :disabled="loading"
      >
        <v-text-field
          ref="nameField"
          v-model="name"
          placeholder="Name your event..."
          hide-details="auto"
          solo
          :rules="nameRules"
          autofocus
          required
          @keyup.enter="blurNameField"
        />

        <SlideToggle
          v-if="daysOnlyEnabled && !edit"
          v-model="daysOnly"
          class="tw-w-full"
          :options="[...daysOnlyOptions]"
        />

        <div>
          <v-expand-transition>
            <div v-if="!daysOnly">
              <div class="tw-mb-2 tw-text-lg tw-text-black">
                What times might work?
              </div>
              <v-expand-transition>
                <div v-if="!specificTimesEnabled">
                  <div
                    class="tw-mb-2 tw-flex tw-items-baseline tw-justify-center tw-space-x-2"
                  >
                    <v-select
                      :model-value="startTime"
                      :items="times"
                      return-object
                      hide-details
                      solo
                      @update:model-value="(t: any) => (startTime = t.time ?? t)"
                    ></v-select>
                    <div>to</div>
                    <v-select
                      :model-value="endTime"
                      :items="times"
                      return-object
                      hide-details
                      solo
                      @update:model-value="(t: any) => (endTime = t.time ?? t)"
                    ></v-select>
                  </div>
                </div>
              </v-expand-transition>
              <div class="tw-mb-2">
                <v-checkbox
                  v-model="specificTimesEnabled"
                  messages="Specify the times in the next step"
                >
                  <template #label>
                    <span
                      class="tw-text-sm"
                      :class="
                        specificTimesEnabled
                          ? 'tw-text-black'
                          : 'tw-text-very-dark-gray'
                      "
                    >
                      Set specific times per day
                    </span>
                  </template>
                  <template #message="{ message }">
                    <v-expand-transition>
                      <div
                        v-if="specificTimesEnabled"
                        class="tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                      >
                        {{ message }}
                      </div>
                    </v-expand-transition>
                  </template>
                </v-checkbox>
              </div>
            </div>
          </v-expand-transition>

          <div class="tw-mb-2 tw-text-lg tw-text-black">
            What
            {{ selectedDateOption === dateOptions.SPECIFIC ? "dates" : "days" }}
            might work?
          </div>
          <v-select
            v-if="!edit && !daysOnly"
            v-model="selectedDateOption"
            :items="Object.values(dateOptions)"
            solo
            hide-details
            class="tw-mb-4"
          />

          <v-expand-transition>
            <div v-if="selectedDateOption === dateOptions.SPECIFIC || daysOnly">
              <div class="tw-mb-2 tw-text-xs tw-text-dark-gray">
                Drag to select multiple dates
              </div>
              <v-input
                key="date-picker"
                v-model="selectedDays"
                hide-details="auto"
                :rules="selectedDaysRules"
              >
                <DatePicker
                  v-model="selectedDays"
                  :min-calendar-date="minCalendarDate"
                  :start-calendar-on-monday="startOnMonday"
                />
              </v-input>
            </div>
            <div v-else-if="selectedDateOption === dateOptions.DOW">
              <v-input
                key="days-of-week"
                v-model="selectedDaysOfWeek"
                hide-details="auto"
                :rules="selectedDaysRules"
                class="tw-w-fit"
              >
                <v-btn-toggle
                  v-model="selectedDaysOfWeek"
                  multiple
                  solo
                  color="primary"
                >
                  <v-btn v-show="!startOnMonday" depressed> Sun </v-btn>
                  <v-btn depressed> Mon </v-btn>
                  <v-btn depressed> Tue </v-btn>
                  <v-btn depressed> Wed </v-btn>
                  <v-btn depressed> Thu </v-btn>
                  <v-btn depressed> Fri </v-btn>
                  <v-btn depressed> Sat </v-btn>
                  <v-btn v-show="startOnMonday" depressed> Sun </v-btn>
                </v-btn-toggle>
              </v-input>
              <v-checkbox v-model="startOnMonday" class="tw-mt-2" hide-details>
                <template #label>
                  <span class="tw-text-sm tw-text-very-dark-gray">
                    Start on Monday
                  </span>
                </template>
              </v-checkbox>
            </div>
          </v-expand-transition>
        </div>

        <v-checkbox
          v-if="!guestEvent && authUser"
          v-model="notificationsEnabled"
          hide-details
          class="tw-mt-2"
        >
          <template #label>
            <span class="tw-text-sm tw-text-very-dark-gray"
              >Email me each time someone joins my event</span
            >
          </template>
        </v-checkbox>
        <v-checkbox
          v-else-if="!guestEvent"
          disabled
          messages="test"
          off-icon="mdi-checkbox-blank-off-outline"
          class="tw-mt-2"
        >
          <template #label>
            <span class="tw-text-sm"
              >Email me each time someone joins my event</span
            >
          </template>
          <template #message>
            <div
              class="tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
            >
              <span class="tw-font-medium tw-text-very-dark-gray"
                ><a @click="emit('signIn')">Sign in</a>
                to use this feature
              </span>
            </div>
          </template>
        </v-checkbox>

        <div class="tw-flex tw-flex-col tw-gap-2">
          <ExpandableSection
            v-if="authUser && !guestEvent"
            v-model="showEmailReminders"
            label="Email reminders"
            :auto-scroll="dialog"
          >
            <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2">
              <EmailInput
                v-show="authUser"
                ref="emailInput"
                label-color="tw-text-very-dark-gray"
                :added-emails="addedEmails"
                @request-contacts-access="requestContactsAccess"
                @update:emails="(newEmails) => { emails = newEmails as string[] }"
              >
                <template #header>
                  <div class="tw-flex tw-gap-1">
                    <div class="tw-text-very-dark-gray">
                      Remind people to fill out the event
                    </div>

                    <v-tooltip
                      top
                      content-class="tw-bg-very-dark-gray tw-shadow-lg tw-opacity-100 tw-py-4"
                    >
                      <template #activator="{ props: tooltipProps }">
                        <v-icon small v-bind="tooltipProps"
                          >mdi-information-outline
                        </v-icon>
                      </template>
                      <div>
                        Reminder emails will be sent the day of event
                        creation,<br />one day after, and three days after. You
                        will also receive <br />an email when everybody has
                        filled out the event.
                      </div>
                    </v-tooltip>
                  </div>
                </template>
              </EmailInput>
            </div>
          </ExpandableSection>

          <ExpandableSection
            v-model="showAdvancedOptions"
            label="Advanced options"
            :auto-scroll="dialog"
          >
            <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2">
              <div v-if="!edit" class="tw-flex tw-items-center tw-gap-x-2">
                <div class="tw-text-sm tw-text-black">Time increment:</div>
                <v-select
                  v-model="timeIncrement"
                  dense
                  class="-tw-mt-[2px] tw-w-24 tw-grow-0 tw-text-sm"
                  hide-details
                  :items="timeIncrementItems"
                ></v-select>
              </div>
              <v-checkbox
                v-if="authUser && !guestEvent"
                v-model="collectEmails"
                hide-details
              >
                <template #label>
                  <span class="tw-text-sm tw-text-black">
                    Collect respondents' email addresses
                  </span>
                </template>
                <template #message="{ message }">
                  <div
                    class="-tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                  >
                    {{ message }}
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox
                v-else-if="!guestEvent"
                disabled
                messages="test"
                off-icon="mdi-checkbox-blank-off-outline"
              >
                <template #label>
                  <span class="tw-text-sm"
                    >Collect respondents' email addresses</span
                  >
                </template>
                <template #message>
                  <div
                    class="tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                  >
                    <span class="tw-font-medium tw-text-very-dark-gray"
                      ><a @click="emit('signIn')">Sign in</a>
                      to use this feature
                    </span>
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox
                v-if="authUser && !guestEvent"
                v-model="blindAvailabilityEnabled"
                messages="Only show responses to event creator"
              >
                <template #label>
                  <span class="tw-text-sm tw-text-black">
                    Hide responses from respondents
                  </span>
                </template>
                <template #message="{ message }">
                  <div
                    class="-tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                  >
                    {{ message }}
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox
                v-else-if="!guestEvent"
                disabled
                messages="Only show responses to event creator. "
                off-icon="mdi-checkbox-blank-off-outline"
              >
                <template #label>
                  <span class="tw-text-sm"
                    >Hide responses from respondents</span
                  >
                </template>
                <template #message="{ message }">
                  <div
                    class="tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                  >
                    {{ message }}
                    <span class="tw-font-medium tw-text-very-dark-gray"
                      ><a @click="emit('signIn')">Sign in</a>
                      to use this feature
                    </span>
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox
                v-if="authUser && !guestEvent"
                v-model="sendEmailAfterXResponsesEnabled"
                hide-details
              >
                <template #label>
                  <div
                    :class="!sendEmailAfterXResponsesEnabled && 'tw-opacity-50'"
                    class="tw-flex tw-items-center tw-gap-x-2 tw-text-sm tw-text-very-dark-gray"
                  >
                    <div>Email me after</div>
                    <v-text-field
                      v-model="sendEmailAfterXResponses"
                      :disabled="!sendEmailAfterXResponsesEnabled"
                      dense
                      class="email-me-after-text-field -tw-mt-[2px] tw-w-10"
                      hide-details
                      type="number"
                      min="1"
                    ></v-text-field>
                    <div>responses</div>
                  </div>
                </template>
              </v-checkbox>
              <TimezoneSelector
                v-model="timezone"
                label="Timezone"
                @update:model-value="(val) => { timezone = val; trackTimezoneChange(val) }"
              />
            </div>
          </ExpandableSection>
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
          {{
            specificTimesEnabled ? "Next" : edit ? "Save edits" : "Create event"
          }}
        </v-btn>
        <div
          :class="formValid ? 'tw-invisible' : 'tw-visible'"
          class="tw-mt-1 tw-text-xs tw-text-red"
        >
          Please fix form errors before continuing
        </div>
      </div>
    </v-card-actions>

    <OverflowGradient
      v-if="hasMounted && cardText"
      :scroll-container="cardText"
      class="tw-bottom-[90px]"
    />
  </v-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import {
  eventTypes,
  dayIndexToDayString,
  authTypes,
  guestUserId,
} from "@/constants"
import {
  post,
  put,
  timeNumToTimeString,
  dateToTimeNum,
  getISODateString,
  signInGoogle,
  getDateWithTimezone,
  getTimeOptions,
  addEventToCreatedList,
  prefersStartOnMonday,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import TimezoneSelector from "./schedule_overlap/TimezoneSelector.vue"
import HelpDialog from "./HelpDialog.vue"
import EmailInput from "./event/EmailInput.vue"
import DatePicker from "@/components/DatePicker.vue"
import SlideToggle from "./SlideToggle.vue"
import AlertText from "@/components/AlertText.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"
import ExpandableSection from "./ExpandableSection.vue"
import type { Event as EventModel } from "@/types"
import type { Timezone } from "@/composables/schedule_overlap/types"

import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

interface FormRef {
  validate: () => Promise<{ valid: boolean }> | boolean
  resetValidation: () => void
}
interface NameFieldRef { blur: () => void }
interface EmailInputRef { reset: () => void }
export interface ContactsPayload {
  emails?: string[]
  name?: string
  startTime?: number
  endTime?: number
  daysOnly?: boolean
  selectedDateOption?: string
  selectedDaysOfWeek?: number[]
  selectedDays?: string[]
  notificationsEnabled?: boolean
  timezone?: { value?: string; [k: string]: unknown }
  specificTimesEnabled?: boolean
  startOnMonday?: boolean
}

const props = withDefaults(
  defineProps<{
    event?: EventModel
    edit?: boolean
    dialog?: boolean
    contactsPayload?: ContactsPayload
    showHelp?: boolean
    folderId?: string | null
    isDialogOpen?: boolean
  }>(),
  {
    event: undefined,
    edit: false,
    dialog: true,
    contactsPayload: () => ({}),
    showHelp: false,
    folderId: null,
    isDialogOpen: false,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  signIn: []
}>()

const router = useRouter()
const mainStore = useMainStore()
const { authUser, daysOnlyEnabled } = storeToRefs(mainStore)

const dateOptions = Object.freeze({
  SPECIFIC: "Specific dates",
  DOW: "Days of the week",
} as const)

const daysOnlyOptions = Object.freeze([
  { text: "Dates and times", value: false },
  { text: "Dates only", value: true },
])

const formRef = ref<FormRef | null>(null)
const nameField = ref<NameFieldRef | null>(null)
const emailInput = ref<EmailInputRef | null>(null)
const cardText = ref<HTMLElement | null>(null)

const formValid = ref(true)
const name = ref("")
const startTime = ref(9)
const endTime = ref(17)
const specificTimesEnabled = ref(false)
const loading = ref(false)
const selectedDays = ref<string[]>([])
const selectedDaysOfWeek = ref<number[]>([])
const startOnMonday = ref(prefersStartOnMonday())
const notificationsEnabled = ref(true)

type DateOptionType = typeof dateOptions[keyof typeof dateOptions]
const daysOnly = ref(false)
const selectedDateOption = ref<DateOptionType>(dateOptions.SPECIFIC)

const showEmailReminders = ref(false)
const emails = ref<string[]>([])

const showAdvancedOptions = ref(false)
const timeIncrement = ref(15)
const collectEmails = ref(false)
const blindAvailabilityEnabled = ref(false)
const timezone = ref<Timezone>({ value: "", label: "", gmtString: "", offset: 0 })
const sendEmailAfterXResponsesEnabled = ref(false)
const sendEmailAfterXResponses = ref(3)

const helpDialog = ref(false)
const initialEventData = ref<Record<string, unknown>>({})
const hasMounted = ref(false)

const nameRules = computed(() => [
  (v: string) => !!v || "Event name is required",
])
const selectedDaysRules = computed(() => [
  (s: unknown[]) => s.length > 0 || "Please select at least one day",
])
const addedEmails = computed(() => {
  if (Object.keys(props.contactsPayload).length > 0)
    return props.contactsPayload.emails ?? []
  return props.event?.remindees
    ? props.event.remindees
        .map((r) => r.email)
        .filter((e): e is string => !!e)
    : []
})
const times = computed(() => getTimeOptions())
const minCalendarDate = computed(() => {
  if (props.edit) return ""
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, "0")
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const yyyy = today.getFullYear()
  return `${String(yyyy)}-${mm}-${dd}`
})
const guestEvent = computed(
  () => props.event?.ownerId === guestUserId
)
const timeIncrementItems = computed(() => [
  { text: "15 min", value: 15 },
  { text: "30 min", value: 30 },
  { text: "60 min", value: 60 },
])

onMounted(() => {
  if (Object.keys(props.contactsPayload).length > 0) {
    toggleEmailReminders(true)

    name.value = props.contactsPayload.name ?? ""
    startTime.value = props.contactsPayload.startTime ?? 9
    endTime.value = props.contactsPayload.endTime ?? 17
    daysOnly.value = props.contactsPayload.daysOnly ?? false
    selectedDateOption.value = (props.contactsPayload.selectedDateOption ?? dateOptions.SPECIFIC) as DateOptionType
    selectedDaysOfWeek.value = props.contactsPayload.selectedDaysOfWeek ?? []
    selectedDays.value = props.contactsPayload.selectedDays ?? []
    notificationsEnabled.value = props.contactsPayload.notificationsEnabled ?? true
    timezone.value = (props.contactsPayload.timezone as Timezone | undefined) ?? { value: "", label: "", gmtString: "", offset: 0 }
    specificTimesEnabled.value = props.contactsPayload.specificTimesEnabled ?? false

    formRef.value?.resetValidation()
  }

  void nextTick(() => {
    hasMounted.value = true
  })
})

const blurNameField = () => {
  nameField.value?.blur()
}

const reset = () => {
  name.value = ""
  startTime.value = 9
  endTime.value = 17
  specificTimesEnabled.value = false
  selectedDays.value = []
  selectedDaysOfWeek.value = []
  notificationsEnabled.value = true
  daysOnly.value = false
  selectedDateOption.value = dateOptions.SPECIFIC
  emails.value = []
  showAdvancedOptions.value = false
  blindAvailabilityEnabled.value = false
  sendEmailAfterXResponsesEnabled.value = false
  sendEmailAfterXResponses.value = 3
  collectEmails.value = false
  startOnMonday.value = prefersStartOnMonday()

  formRef.value?.resetValidation()
}

const submit = async () => {
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return

  selectedDays.value.sort()

  let duration = endTime.value - startTime.value
  if (duration <= 0) duration += 24

  const dates: Date[] = []
  let type: string
  if (daysOnly.value) {
    duration = 0
    type = eventTypes.SPECIFIC_DATES

    for (const day of selectedDays.value) {
      dates.push(new Date(`${day} 00:00:00Z`))
    }
    specificTimesEnabled.value = false
  } else {
    const startTimeString = timeNumToTimeString(startTime.value)
    if (selectedDateOption.value === dateOptions.SPECIFIC) {
      type = eventTypes.SPECIFIC_DATES
      for (const day of selectedDays.value) {
        const date = dayjs.tz(`${day} ${startTimeString}`, timezone.value.value)
        dates.push(date.toDate())
      }
    } else {
      type = eventTypes.DOW

      selectedDaysOfWeek.value.sort((a, b) => a - b)
      selectedDaysOfWeek.value = selectedDaysOfWeek.value.filter((dayIndex) =>
        startOnMonday.value ? dayIndex !== 0 : dayIndex !== 7
      )
      for (const dayIndex of selectedDaysOfWeek.value) {
        const day = dayIndexToDayString[dayIndex]
        const date = dayjs.tz(`${day} ${startTimeString}`, timezone.value.value)

        const refOffset = date.utcOffset()
        const currentOffset = dayjs().tz(timezone.value.value).utcOffset()
        dates.push(date.subtract(currentOffset - refOffset, "minutes").toDate())
      }
    }
  }

  loading.value = true

  const payload = {
    name: name.value,
    duration,
    dates,
    hasSpecificTimes: specificTimesEnabled.value,
    notificationsEnabled: !authUser.value ? false : notificationsEnabled.value,
    blindAvailabilityEnabled: blindAvailabilityEnabled.value,
    daysOnly: daysOnly.value,
    remindees: emails.value,
    type,
    sendEmailAfterXResponses: sendEmailAfterXResponsesEnabled.value
      ? sendEmailAfterXResponses.value
      : -1,
    collectEmails: collectEmails.value,
    startOnMonday: startOnMonday.value,
    timeIncrement: timeIncrement.value,
    creatorPosthogId: posthog.get_distinct_id(),
  }

  const posthogPayload: Record<string, unknown> = {
    eventName: name.value,
    eventDuration: duration,
    eventDates: JSON.stringify(dates),
    eventHasSpecificTimes: specificTimesEnabled.value,
    eventNotificationsEnabled: !authUser.value
      ? false
      : notificationsEnabled.value,
    eventBlindAvailabilityEnabled: blindAvailabilityEnabled.value,
    eventDaysOnly: daysOnly.value,
    eventRemindees: emails.value,
    eventType: type,
    eventSendEmailAfterXResponses: sendEmailAfterXResponsesEnabled.value
      ? sendEmailAfterXResponses.value
      : -1,
    eventCollectEmails: collectEmails.value,
    eventStartOnMonday: startOnMonday.value,
    eventTimeIncrement: timeIncrement.value,
  }

  if (!props.edit) {
    post<{ eventId: string; shortId?: string }>("/events", payload)
      .then(async ({ eventId, shortId }) => {
        if (authUser.value) {
          await mainStore.setEventFolder({ eventId, folderId: props.folderId })
        }
        await router.push({
          name: "event",
          params: { eventId: shortId ?? eventId },
        })

        emit("update:modelValue", false)
        reset()

        posthogPayload.eventId = eventId
        posthog.capture("Event created", posthogPayload)

        if (!authUser.value) {
          addEventToCreatedList(eventId)
        }
      })
      .catch((err: unknown) => {
        mainStore.showError(
          "There was a problem creating that event! Please try again later."
        )
        console.error(err)
      })
      .finally(() => {
        loading.value = false
      })
  } else if (props.event) {
    put(`/events/${props.event._id ?? ""}`, payload)
      .then(() => {
        posthogPayload.eventId = props.event?._id
        posthog.capture("Event edited", posthogPayload)

        localStorage.setItem(`from-edit-event-${props.event?._id ?? ""}`, "true")
        window.location.reload()
      })
      .catch((err: unknown) => {
        mainStore.showError(
          "There was a problem editing this event! Please try again later."
        )
        console.log(err)
      })
      .finally(() => {
        loading.value = false
      })
  }
}

const toggleEmailReminders = (delayed = false) => {
  if (delayed) {
    setTimeout(
      () => (showEmailReminders.value = !showEmailReminders.value),
      300
    )
  } else {
    showEmailReminders.value = !showEmailReminders.value
  }
}

const requestContactsAccess = ({ emails: requestEmails }: { emails: (string | { email: string })[] }) => {
  // Convert Remindee[] (which can be strings or Contact objects) to string[]
  const emailStrings = requestEmails.map(e => typeof e === 'string' ? e : e.email)
  const payload = {
    emails: emailStrings,
    name: name.value,
    startTime: startTime.value,
    endTime: endTime.value,
    daysOnly: daysOnly.value,
    selectedDays: selectedDays.value,
    selectedDaysOfWeek: selectedDaysOfWeek.value,
    selectedDateOption: selectedDateOption.value,
    notificationsEnabled: notificationsEnabled.value,
    timezone: timezone.value,
  }
  signInGoogle({
    state: {
      type: authTypes.EVENT_CONTACTS,
      eventId: props.event ? props.event.shortId ?? props.event._id : "",
      openNewGroup: false,
      payload,
    },
    requestContactsPermission: true,
  })
}

const updateFieldsFromEvent = () => {
  if (props.event) {
    name.value = props.event.name ?? ""

    startTime.value = Math.floor(
      dateToTimeNum(getDateWithTimezone((props.event.dates ?? [])[0]), true)
    )
    startTime.value %= 24

    endTime.value = (startTime.value + (props.event.duration ?? 0)) % 24
    notificationsEnabled.value = props.event.notificationsEnabled ?? false
    blindAvailabilityEnabled.value =
      props.event.blindAvailabilityEnabled ?? false
    daysOnly.value = props.event.daysOnly ?? false
    specificTimesEnabled.value = props.event.hasSpecificTimes ?? false
    startOnMonday.value = props.event.startOnMonday ?? startOnMonday.value
    collectEmails.value = props.event.collectEmails ?? false
    timeIncrement.value = props.event.timeIncrement ?? 15

    if (
      props.event.sendEmailAfterXResponses != null &&
      props.event.sendEmailAfterXResponses > 0
    ) {
      sendEmailAfterXResponsesEnabled.value = true
      sendEmailAfterXResponses.value = props.event.sendEmailAfterXResponses
    }

    if (props.event.daysOnly) {
      selectedDateOption.value = dateOptions.SPECIFIC
      const days: string[] = []
      for (const date of props.event.dates ?? []) {
        days.push(getISODateString(date, true))
      }
      selectedDays.value = days
    } else {
      if (props.event.type === eventTypes.SPECIFIC_DATES) {
        selectedDateOption.value = dateOptions.SPECIFIC
        const days: string[] = []
        for (let date of props.event.dates ?? []) {
          const d = getDateWithTimezone(date)
          days.push(getISODateString(d, true))
        }
        selectedDays.value = days
      } else if (props.event.type === eventTypes.DOW) {
        selectedDateOption.value = dateOptions.DOW
        const dows: number[] = []
        for (let date of props.event.dates ?? []) {
          const d = getDateWithTimezone(date)
          if (props.event.startOnMonday && d.getUTCDay() === 0) dows.push(7)
          else dows.push(d.getUTCDay())
        }
        selectedDaysOfWeek.value = dows
        if (props.event.startOnMonday) startOnMonday.value = true
      }
    }
  }
}
const resetToEventData = () => {
  updateFieldsFromEvent()
  emailInput.value?.reset()
}
const setInitialEventData = () => {
  initialEventData.value = {
    name: name.value,
    startTime: startTime.value,
    endTime: endTime.value,
    specificTimesEnabled: specificTimesEnabled.value,
    daysOnly: daysOnly.value,
    selectedDays: [...selectedDays.value],
    selectedDaysOfWeek: [...selectedDaysOfWeek.value],
    selectedDateOption: selectedDateOption.value,
    notificationsEnabled: notificationsEnabled.value,
    emails: [...emails.value],
    blindAvailabilityEnabled: blindAvailabilityEnabled.value,
    sendEmailAfterXResponsesEnabled: sendEmailAfterXResponsesEnabled.value,
    sendEmailAfterXResponses: sendEmailAfterXResponses.value,
    timeIncrement: timeIncrement.value,
  }
}
const hasEventBeenEdited = () => {
  const i = initialEventData.value
  return (
    name.value !== i.name ||
    startTime.value !== i.startTime ||
    endTime.value !== i.endTime ||
    specificTimesEnabled.value !== i.specificTimesEnabled ||
    selectedDateOption.value !== i.selectedDateOption ||
    JSON.stringify(selectedDays.value) !== JSON.stringify(i.selectedDays) ||
    JSON.stringify(selectedDaysOfWeek.value) !==
      JSON.stringify(i.selectedDaysOfWeek) ||
    daysOnly.value !== i.daysOnly ||
    notificationsEnabled.value !== i.notificationsEnabled ||
    JSON.stringify(emails.value) !== JSON.stringify(i.emails) ||
    blindAvailabilityEnabled.value !== i.blindAvailabilityEnabled ||
    sendEmailAfterXResponsesEnabled.value !==
      i.sendEmailAfterXResponsesEnabled ||
    sendEmailAfterXResponses.value !== i.sendEmailAfterXResponses
  )
}
const trackTimezoneChange = (newTimezone: { value?: string; label?: string; gmtString?: string; offset?: number }) => {
  posthog.capture("timezone_selected_in_new_event_dialog", {
    timezone: newTimezone.value,
  })
}

defineExpose({ reset, resetToEventData, hasEventBeenEdited })

watch(
  () => props.event,
  () => {
    updateFieldsFromEvent()
    setInitialEventData()
  },
  { immediate: true }
)
watch(selectedDateOption, () => {
  if (selectedDateOption.value === dateOptions.SPECIFIC) {
    selectedDaysOfWeek.value = []
  } else {
    selectedDays.value = []
  }
})
watch(startOnMonday, () => {
  localStorage.setItem("startCalendarOnMonday", String(startOnMonday.value))
})
watch(
  () => props.isDialogOpen,
  (newVal) => {
    if (newVal) reset()
  }
)
</script>

<style>
.email-me-after-text-field input {
  padding: 0px !important;
}
</style>
