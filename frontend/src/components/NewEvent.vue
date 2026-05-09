<template>
  <v-card
    :flat="dialog"
    :class="{ 'tw-py-4': !dialog, 'tw-flex-1': dialog }"
    class="tw-relative tw-flex tw-max-w-[28rem] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-transition-all"
  >
    <EditorDialogHeader
      :title="edit ? 'Edit event' : 'New event'"
      subtitle="Ideal for one-time / recurring meetings"
      help-header="Events"
      :dialog="dialog"
      :show-help="showHelp"
      :hide-dialog-actions="hideDialogActions"
      @close="emit('update:modelValue', false)"
    >
      <template #help-content>
        <div class="tw-mb-4">
          Use events to collect people's availabilities and compare them
          across certain days.
        </div>
      </template>
    </EditorDialogHeader>
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
          variant="solo"
          class="new-event-name-field"
          :class="{ 'new-event-name-field--invalid': showNameFieldError }"
          :rules="nameRules"
          autofocus
          required
          @focus="handleNameFieldFocus"
          @blur="handleNameFieldBlur"
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
                  <div class="time-range-row tw-mb-2 tw-flex tw-justify-center tw-space-x-2">
                    <v-select
                      :model-value="startTimeNum"
                      :items="times"
                      class="time-range-select"
                      item-color="green"
                      item-title="text"
                      item-value="value"
                      return-object
                      hide-details
                      :menu-props="{ minWidth: 176, maxWidth: 176 }"
                      variant="solo"
                      @update:model-value="(t: any) => (startTimeNum = t.time ?? t)"
                    ></v-select>
                    <div class="time-range-separator">to</div>
                    <v-select
                      :model-value="endTimeNum"
                      :items="times"
                      class="time-range-select"
                      item-color="green"
                      item-title="text"
                      item-value="value"
                      return-object
                      hide-details
                      :menu-props="{ minWidth: 176, maxWidth: 176 }"
                      variant="solo"
                      @update:model-value="(t: any) => (endTimeNum = t.time ?? t)"
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
            item-color="green"
            variant="solo"
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
                  v-model="selectedDaysStr"
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
                  <v-btn v-show="!startOnMonday" variant="flat"> Sun </v-btn>
                  <v-btn variant="flat"> Mon </v-btn>
                  <v-btn variant="flat"> Tue </v-btn>
                  <v-btn variant="flat"> Wed </v-btn>
                  <v-btn variant="flat"> Thu </v-btn>
                  <v-btn variant="flat"> Fri </v-btn>
                  <v-btn variant="flat"> Sat </v-btn>
                  <v-btn v-show="startOnMonday" variant="flat"> Sun </v-btn>
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
          class="gated-feature-checkbox tw-mt-2"
          disabled
          messages="test"
          false-icon="mdi-checkbox-blank-off-outline"
        >
          <template #label>
            <span class="advanced-options-disabled-label tw-text-sm"
              >Email me each time someone joins my event</span
            >
          </template>
          <template #message>
            <div
              class="advanced-options-disabled-message tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
            >
              <span
                class="advanced-options-disabled-copy tw-font-medium tw-text-very-dark-gray"
                ><a class="advanced-options-sign-in-link" @click="emit('signIn')"
                  >Sign in</a
                >
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
            <div
              class="advanced-options-panel tw-flex tw-flex-col tw-gap-5 tw-pt-2 tw-text-[rgba(0,0,0,0.6)]"
            >
              <div v-if="!edit" class="tw-flex tw-items-center tw-gap-x-2">
                <div class="tw-text-sm tw-text-black">Time increment:</div>
                <v-select
                  v-model="timeIncrement"
                  class="time-increment-select -tw-mt-[2px] tw-w-24 tw-grow-0 tw-text-sm tw-text-black"
                  density="compact"
                  hide-details
                  :items="timeIncrementItems"
                  item-title="title"
                  item-value="value"
                  single-line
                  variant="plain"
                ></v-select>
              </div>
              <v-checkbox
                v-if="authUser && !guestEvent"
                v-model="collectEmails"
                density="compact"
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
                class="gated-feature-checkbox"
                disabled
                density="compact"
                messages="test"
                false-icon="mdi-checkbox-blank-off-outline"
              >
                <template #label>
                  <span class="advanced-options-disabled-label tw-text-sm"
                    >Collect respondents' email addresses</span
                  >
                </template>
                <template #message>
                  <div
                    class="advanced-options-disabled-message tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                  >
                    <span
                      class="advanced-options-disabled-copy tw-font-medium tw-text-very-dark-gray"
                      ><a class="advanced-options-sign-in-link" @click="emit('signIn')"
                        >Sign in</a
                      >
                      to use this feature
                    </span>
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox
                v-if="authUser && !guestEvent"
                v-model="blindAvailabilityEnabled"
                density="compact"
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
                class="gated-feature-checkbox"
                disabled
                density="compact"
                messages="Only show responses to event creator. "
                false-icon="mdi-checkbox-blank-off-outline"
              >
                <template #label>
                  <span class="advanced-options-disabled-label tw-text-sm"
                    >Hide responses from respondents</span
                  >
                </template>
                <template #message="{ message }">
                  <div
                    class="advanced-options-disabled-message tw-pointer-events-auto -tw-mt-1 tw-ml-[32px] tw-text-xs tw-text-dark-gray"
                  >
                    {{ message }}
                    <span
                      class="advanced-options-disabled-copy tw-font-medium tw-text-very-dark-gray"
                      ><a class="advanced-options-sign-in-link" @click="emit('signIn')"
                        >Sign in</a
                      >
                      to use this feature
                    </span>
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox
                v-if="authUser && !guestEvent"
                v-model="sendEmailAfterXResponsesEnabled"
                density="compact"
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
      v-if="hasMounted && cardTextElement"
      :scroll-container="cardTextElement"
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
  authTypes,
  guestUserId,
  durations,
  hoursPlainTime,
  UTC,
  dateOptions,
  type DateOptionType
} from "@/constants"
import {
  post,
  put,
  signInGoogle,
  getDateWithTimezone,
  getEventMembershipDayOfWeekValues,
  getEventMembershipPlainDates,
  getEventTimeSeed,
  getTimeOptions,
  addEventToCreatedList,
  prefersStartOnMonday,
  getWrappedTimeRangeDuration,
  plainTimeToTimeNum,
  resolveTimezoneValue,
  timeNumToPlainTime,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import TimezoneSelector from "./schedule_overlap/TimezoneSelector.vue"
import { Temporal } from "temporal-polyfill"
import EmailInput from "./event/EmailInput.vue"
import DatePicker from "@/components/DatePicker.vue"
import SlideToggle from "./SlideToggle.vue"
import AlertText from "@/components/AlertText.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"
import ExpandableSection from "./ExpandableSection.vue"
import EditorDialogHeader from "./EditorDialogHeader.vue"
import type { Event as EventModel } from "@/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import type { EventDraft } from "@/composables/event/types"
import {
  getDraftEndTime,
  getDraftSelectedDays,
  getDraftStartTime,
  getDraftTimezone,
  hasEventDraftData,
} from "@/composables/event/draftBoundary"

interface FormRef {
  validate: () => Promise<{ valid: boolean }> | boolean
  resetValidation: () => void
}
interface NameFieldRef { blur: () => void }
interface EmailInputRef { reset: () => void }
interface ElementWithRoot { $el?: HTMLElement }

const props = withDefaults(
  defineProps<{
    event?: EventModel
    edit?: boolean
    dialog?: boolean
    contactsPayload?: EventDraft
    showHelp?: boolean
    folderId?: string | null
    isDialogOpen?: boolean
    hideDialogActions?: boolean
  }>(),
  {
    event: undefined,
    edit: false,
    dialog: true,
    contactsPayload: () => ({}),
    showHelp: false,
    folderId: null,
    isDialogOpen: false,
    hideDialogActions: false,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  signIn: []
}>()

const router = useRouter()
const mainStore = useMainStore()
const { authUser, daysOnlyEnabled } = storeToRefs(mainStore)

const daysOnlyOptions = [
  { text: "Dates and times", value: false },
  { text: "Dates only", value: true },
] as const

const formRef = ref<FormRef | null>(null)
const nameField = ref<NameFieldRef | null>(null)
const emailInput = ref<EmailInputRef | null>(null)
const cardText = ref<HTMLElement | ElementWithRoot | null>(null)
const cardTextElement = computed(() => {
  if (!cardText.value) return null
  if (cardText.value instanceof HTMLElement) return cardText.value
  return cardText.value.$el ?? null
})

const formValid = ref(true)
const name = ref("")
const hasBlurredNameField = ref(false)
const isNameFieldFocused = ref(true)
const startTime = ref<Temporal.PlainTime>(hoursPlainTime.NINE)
const endTime = ref<Temporal.PlainTime>(hoursPlainTime.SEVENTEEN)
const specificTimesEnabled = ref(false)
const loading = ref(false)
const selectedDays = ref<Temporal.PlainDate[]>([])
const selectedDaysStr = computed<string[]>({
  get: () => selectedDays.value.map(x => x.toString()),
  set: value => {
    selectedDays.value = value.map(date => Temporal.PlainDate.from(date))
  },
})
const selectedDaysOfWeek = ref<number[]>([])
const startOnMonday = ref(prefersStartOnMonday())
const notificationsEnabled = ref(true)

const daysOnly = ref(false)
const selectedDateOption = ref<DateOptionType>(dateOptions.SPECIFIC)

const showEmailReminders = ref(false)
const emails = ref<string[]>([])

const showAdvancedOptions = ref(false)
const DEFAULT_TIME_INCREMENT = 15
const SUPPORTED_TIME_INCREMENTS = new Set([15, 30, 60])

const timeIncrement = ref(DEFAULT_TIME_INCREMENT)
const collectEmails = ref(false)
const blindAvailabilityEnabled = ref(false)
const timezone = ref<Timezone>({ value: "", label: "", gmtString: "", offset: durations.ZERO })
const sendEmailAfterXResponsesEnabled = ref(false)
const sendEmailAfterXResponses = ref(3)

const initialEventData = ref<Record<string, unknown>>({})
const hasMounted = ref(false)

const nameRules = computed(() => [
  (v: string) => !!v || "Event name is required",
])
const showNameFieldError = computed(
  () => !name.value.trim() && hasBlurredNameField.value && !isNameFieldFocused.value
)
const selectedDaysRules = computed(() => [
  (s: unknown[]) => s.length > 0 || "Please select at least one day",
])
const addedEmails = computed(() => {
  if (hasEventDraftData(props.contactsPayload))
    return props.contactsPayload.emails ?? []
  return props.event?.remindees
    ? props.event.remindees
        .map((r) => r.email)
        .filter((e): e is string => !!e)
    : []
})
const times = computed(() => getTimeOptions())
// Computed properties to convert Temporal.PlainTime to/from number for UI compatibility
const startTimeNum = computed({
  get: () => plainTimeToTimeNum(startTime.value),
  set: (num: number) => { startTime.value = timeNumToPlainTime(num) }
})
const endTimeNum = computed({
  get: () => plainTimeToTimeNum(endTime.value),
  set: (num: number) => { endTime.value = timeNumToPlainTime(num) }
})
const minCalendarDate = computed(() => {
  if (props.edit) return ""
  // Use Temporal to get today's date in ISO format
  const today = Temporal.Now.plainDateISO()
  return today.toString()
})
const guestEvent = computed(
  () => props.event?.ownerId === guestUserId
)
function normalizeTimeIncrement(value: unknown): number {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : value instanceof Temporal.Duration
          ? value.total("minutes")
          : typeof value === "object" &&
              value !== null &&
              "value" in value &&
              typeof value.value === "number"
            ? value.value
            : NaN

  return SUPPORTED_TIME_INCREMENTS.has(candidate)
    ? candidate
    : DEFAULT_TIME_INCREMENT
}

const timeIncrementItems = computed(() => [
  { title: "15 min", value: 15 },
  { title: "30 min", value: 30 },
  { title: "60 min", value: 60 },
])

onMounted(() => {
  if (hasEventDraftData(props.contactsPayload)) {
    toggleEmailReminders(true)

    name.value = props.contactsPayload.name ?? ""
    startTime.value = getDraftStartTime(props.contactsPayload)
    endTime.value = getDraftEndTime(props.contactsPayload)
    daysOnly.value = props.contactsPayload.daysOnly ?? false
    selectedDateOption.value = (props.contactsPayload.selectedDateOption ?? dateOptions.SPECIFIC) as DateOptionType
    selectedDaysOfWeek.value = props.contactsPayload.selectedDaysOfWeek ?? []
    selectedDays.value = getDraftSelectedDays(props.contactsPayload)
    notificationsEnabled.value = props.contactsPayload.notificationsEnabled ?? true
    timezone.value = getDraftTimezone(props.contactsPayload) ?? { value: "", label: "", gmtString: "", offset: durations.ZERO }
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

const handleNameFieldFocus = () => {
  isNameFieldFocused.value = true
}

const handleNameFieldBlur = () => {
  isNameFieldFocused.value = false
  hasBlurredNameField.value = true
}

const reset = () => {
  name.value = ""
  hasBlurredNameField.value = false
  isNameFieldFocused.value = true
  startTime.value = hoursPlainTime.NINE
  endTime.value = hoursPlainTime.SEVENTEEN
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
  const timezoneValue = resolveTimezoneValue(timezone.value.value)

  selectedDays.value.sort((a, b) => Temporal.PlainDate.compare(a, b))

  let duration = getWrappedTimeRangeDuration(startTime.value, endTime.value)

  const dates: Temporal.ZonedDateTime[] = []
  let type: string
  if (daysOnly.value) {
    duration = durations.ZERO
    type = eventTypes.SPECIFIC_DATES

    for (const day of selectedDays.value) {
      const zdt = day.toZonedDateTime({ timeZone: UTC, plainTime: "00:00" })
      dates.push(zdt)
    }
    specificTimesEnabled.value = false
  } else {
    if (selectedDateOption.value === dateOptions.SPECIFIC) {
      type = eventTypes.SPECIFIC_DATES
      for (const plainDate of selectedDays.value) {
        const plainTime = startTime.value
        const zdt = plainDate.toZonedDateTime({ 
          timeZone: timezoneValue,
          plainTime
        })
        dates.push(zdt)
      }
    } else {
      type = eventTypes.DOW

      selectedDaysOfWeek.value.sort((a, b) => a - b)
      selectedDaysOfWeek.value = selectedDaysOfWeek.value.filter((dayIndex) =>
        startOnMonday.value ? dayIndex !== 0 : dayIndex !== 7
      )
      for (const dayIndex of selectedDaysOfWeek.value) {
        // For DOW events, we need to find the next occurrence of this day
        const plainTime = startTime.value
        
        // Get current date in the specified timezone
        const now = Temporal.Now.zonedDateTimeISO(timezoneValue)
        const currentDayOfWeek = now.dayOfWeek // 1-7 (Mon-Sun)
        const targetDayOfWeek = dayIndex === 7 ? 7 : dayIndex // Convert from Sunday-based to Monday-based
        
        // Calculate days until next occurrence
        let daysUntil = targetDayOfWeek - currentDayOfWeek
        if (daysUntil < 0) daysUntil += 7
        
        const targetDate = now.add({ days: daysUntil }).toPlainDate()
        const zdt = targetDate.toZonedDateTime({ 
          timeZone: timezoneValue,
          plainTime
        })
        dates.push(zdt)
      }
    }
  }

  loading.value = true

  const payload = {
    name: name.value,
    duration: duration.total("hours"),
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
    specificTimesEnabled: specificTimesEnabled.value,
    startOnMonday: startOnMonday.value,
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
    const eventDate = getEventTimeSeed(props.event)
    if (eventDate != null) {
      const zdt = getDateWithTimezone(eventDate)
      startTime.value = zdt.toPlainTime()

      const duration = props.event.duration ?? durations.ZERO
      endTime.value = startTime.value.add(duration)
    }

    notificationsEnabled.value = props.event.notificationsEnabled ?? false
    blindAvailabilityEnabled.value =
      props.event.blindAvailabilityEnabled ?? false
    daysOnly.value = props.event.daysOnly ?? false
    specificTimesEnabled.value = props.event.hasSpecificTimes ?? false
    startOnMonday.value = props.event.startOnMonday ?? startOnMonday.value
    collectEmails.value = props.event.collectEmails ?? false
    timeIncrement.value = normalizeTimeIncrement(props.event.timeIncrement)

    if (
      props.event.sendEmailAfterXResponses != null &&
      props.event.sendEmailAfterXResponses > 0
    ) {
      sendEmailAfterXResponsesEnabled.value = true
      sendEmailAfterXResponses.value = props.event.sendEmailAfterXResponses
    }

    if (props.event.daysOnly) {
      selectedDateOption.value = dateOptions.SPECIFIC
      selectedDays.value = getEventMembershipPlainDates(props.event.dates)
    } else {
      if (props.event.type === eventTypes.SPECIFIC_DATES) {
        selectedDateOption.value = dateOptions.SPECIFIC
        selectedDays.value = getEventMembershipPlainDates(props.event.dates)
      } else if (props.event.type === eventTypes.DOW) {
        selectedDateOption.value = dateOptions.DOW
        selectedDaysOfWeek.value = getEventMembershipDayOfWeekValues(
          props.event.dates
        )
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
const trackTimezoneChange = (newTimezone: Timezone) => {
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

.new-event-name-field .v-field__outline {
  display: none;
}

.new-event-name-field--invalid .v-field {
  outline: red solid;
  border-radius: 3px;
}

.time-increment-select {
  --v-input-control-height: 26px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-padding-start: 0px;
  --v-field-padding-end: 0px;
}

.advanced-options-panel {
  letter-spacing: 0.1px;
  line-height: 22px;
}

.gated-feature-checkbox .v-selection-control--disabled {
  opacity: 1 !important;
}

.gated-feature-checkbox {
  --v-disabled-opacity: 1;
}

.gated-feature-checkbox.v-input--disabled {
  opacity: 1 !important;
}

.gated-feature-checkbox .v-selection-control__input > .v-icon {
  opacity: 0.38 !important;
}

.gated-feature-checkbox .v-input__details,
.gated-feature-checkbox .v-messages,
.gated-feature-checkbox .v-messages__message {
  opacity: 1 !important;
}

.advanced-options-disabled-label {
  color: rgba(0, 0, 0, 0.38) !important;
}

.advanced-options-disabled-message {
  color: rgba(0, 0, 0, 0.6) !important;
  line-height: 16px !important;
}

.gated-feature-checkbox.v-input--density-default .advanced-options-disabled-message {
  margin-left: 40px !important;
}

.gated-feature-checkbox.v-input--density-compact .advanced-options-disabled-message {
  margin-left: 28px !important;
}

.advanced-options-disabled-copy {
  color: rgb(79, 79, 79) !important;
}

.advanced-options-sign-in-link {
  color: #00994c !important;
  cursor: pointer;
}

.time-increment-select,
.time-increment-select.v-input,
.time-increment-select .v-input,
.time-increment-select .v-field,
.time-increment-select .v-field__input,
.time-increment-select .v-select__selection,
.time-increment-select .v-select__selection-text {
  letter-spacing: normal !important;
}

.time-increment-select .v-field {
  background: transparent;
  border: 0;
  border-radius: 0;
  align-items: center !important;
  display: flex !important;
  height: 26px !important;
  min-height: 26px !important;
}

.time-increment-select .v-input__control,
.time-increment-select .v-field__field {
  align-items: center !important;
  display: flex !important;
  height: 26px !important;
  min-height: 26px !important;
}

.time-increment-select .v-field__input {
  align-items: center !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  height: 26px !important;
  min-height: 26px;
  overflow: hidden !important;
  padding-inline: 0px !important;
  padding-bottom: 0px;
  padding-top: 0px;
}

.time-increment-select .v-select__selection {
  overflow: hidden !important;
}

.time-increment-select .v-field__append-inner {
  align-items: center !important;
  height: 26px !important;
  min-height: 26px !important;
  padding-bottom: 0px !important;
  padding-top: 0px !important;
}

.time-increment-select .v-select__selection-text {
  line-height: 22px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.time-increment-select .v-field__overlay {
  opacity: 0;
}

.time-increment-select .v-field__outline {
  display: none;
}

.time-range-separator {
  align-items: center;
  display: flex;
  height: var(--time-range-control-height);
  line-height: var(--time-range-separator-line-height);
}

.time-range-row {
  --time-range-control-height: 44px;
  --time-range-select-width: 176px;
  --time-range-separator-line-height: 20px;
  align-items: center;
}

.time-range-select {
  flex: 0 0 var(--time-range-select-width);
  width: var(--time-range-select-width);
}
</style>
