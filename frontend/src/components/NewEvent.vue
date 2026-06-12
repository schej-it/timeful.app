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
        class="new-event-form tw-flex tw-flex-col tw-gap-y-6"
        :disabled="loading"
      >
        <v-text-field
          ref="nameField"
          v-model="name"
          placeholder="Name your event..."
          hide-details="auto"
          variant="solo"
          class="new-event-name-field timeful-solo-field"
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
                      class="time-range-select timeful-solo-field"
                      item-title="text"
                      item-value="value"
                      return-object
                      hide-details
                      :menu-props="{ minWidth: 176, maxWidth: 176 }"
                      variant="solo"
                      @update:model-value="(t: any) => (startTimeNum = t.time ?? t)"
                    >
                      <template #item="{ item, props: itemProps }">
                        <div
                          v-bind="itemProps"
                          class="time-range-select-item"
                          :class="{
                            'time-range-select-item--active':
                              item.raw.value === startTimeNum,
                          }"
                        >
                          {{ item.raw.text }}
                        </div>
                      </template>
                    </v-select>
                    <div class="time-range-separator">to</div>
                    <v-select
                      :model-value="endTimeNum"
                      :items="times"
                      class="time-range-select timeful-solo-field"
                      item-title="text"
                      item-value="value"
                      return-object
                      hide-details
                      :menu-props="{ minWidth: 176, maxWidth: 176 }"
                      variant="solo"
                      @update:model-value="(t: any) => (endTimeNum = t.time ?? t)"
                    >
                      <template #item="{ item, props: itemProps }">
                        <div
                          v-bind="itemProps"
                          class="time-range-select-item"
                          :class="{
                            'time-range-select-item--active':
                              item.raw.value === endTimeNum,
                          }"
                        >
                          {{ item.raw.text }}
                        </div>
                      </template>
                    </v-select>
                  </div>
                </div>
              </v-expand-transition>
              <div
                class="tw-mb-2"
                data-testid="specific-times-toggle"
              >
                <v-checkbox
                  v-model="specificTimesEnabled"
                  class="specific-times-checkbox"
                  color="primary"
                  messages="Click the Next button below"
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
            variant="solo"
            hide-details
            class="timeful-solo-field tw-mb-4"
          >
            <template #item="{ item, props: itemProps }">
              <div
                v-bind="itemProps"
                class="time-range-select-item"
                :class="{
                  'time-range-select-item--active': item.raw === selectedDateOption,
                }"
              >
                {{ item.raw }}
              </div>
            </template>
          </v-select>

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
                  class="editor-dow-toggle new-event-dow-toggle"
                >
                  <v-btn
                    v-for="day in dayOfWeekButtons"
                    :key="day.key"
                    :class="getDayOfWeekButtonClass(day.value)"
                    :value="day.value"
                    variant="flat"
                  >
                    {{ day.label }}
                  </v-btn>
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
                :key="emailInputKey"
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

          <div class="tw-mb-2 tw-text-lg tw-text-black">Advanced options</div>
          <div class="advanced-options-panel tw-flex tw-flex-col tw-gap-5 tw-pt-2">
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
                variant="underlined"
              >
                <template #item="{ item, props: itemProps }">
                  <div
                    v-bind="itemProps"
                    class="time-range-select-item"
                    :class="{
                      'time-range-select-item--active':
                        item.raw.value === timeIncrement,
                    }"
                  >
                    {{ item.raw.title }}
                  </div>
                </template>
              </v-select>
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
                    density="compact"
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
              :model-value="timezone"
              :modified="timezoneModified"
              label="Timezone"
              label-color="tw-text-sm tw-text-black"
              @update:model-value="
                (val) => {
                  setTimezone(val)
                  trackTimezoneChange(val)
                }
              "
              @reset="resetTimezone"
            />
          </div>
        </div>
      </v-form>
    </v-card-text>
    <v-card-actions class="tw-relative tw-px-4 sm:tw-px-8">
      <div class="tw-relative tw-w-full">
        <v-btn
          :disabled="loading"
          :aria-disabled="submitBlocked"
          block
          :loading="loading"
          :style="submitButtonStyle"
          class="timeful-elevated-button"
          :class="
            submitBlocked
              ? 'new-event-submit-button new-event-submit-button--disabled tw-mt-4 tw-cursor-default tw-pointer-events-none'
              : 'new-event-submit-button new-event-submit-button--enabled tw-mt-4'
          "
          :ripple="!submitBlocked"
          :tabindex="submitBlocked ? -1 : undefined"
          @click="submitIfAllowed"
        >
          {{
            specificTimesEnabled ? "Next" : edit ? "Save edits" : "Create event"
          }}
        </v-btn>
        <div
          :class="showSubmitError ? 'tw-visible' : 'tw-invisible'"
          class="new-event-submit-error tw-mt-1 tw-text-xs"
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
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import {
  authTypes,
  dateOptions,
  eventTypes,
} from "@/constants"
import { isAnonymousOwnerEvent } from "@/composables/event/eventOwnership"
import {
  addEventToCreatedList,
  plainTimeToTimeNum,
  prefersStartOnMonday,
  post,
  put,
  resolveTimezoneValue,
  signInGoogle,
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
import EditorDialogHeader from "./EditorDialogHeader.vue"
import type { Event as EventModel } from "@/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import type { EventDraft } from "@/composables/event/types"
import { toTransportDateTimeStrings } from "@/types/transport"
import { buildEventEditorSchedule } from "@/composables/event/eventEditorSchedule"
import {
  buildSpecificTimesCreateDraft,
  buildSpecificTimesEditDraft,
} from "@/composables/event/specificTimesEditDraft"
import { withSpecificTimesEntryState } from "@/composables/event/specificTimesEntryState"
import {
  useEventEditorState,
  type EventEditorFormRef,
} from "@/composables/event/useEventEditorState"

interface FormRef extends EventEditorFormRef {
  validate: () => Promise<{ valid: boolean }> | boolean
}

interface NameFieldRef {
  blur: () => void
}

interface ElementWithRoot {
  $el?: HTMLElement
}

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
  "refresh-event": [
    payload?: {
      fromEditEvent?: boolean
      specificTimesEditDraft?: ReturnType<typeof buildSpecificTimesEditDraft>
    },
  ]
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
const emailInputKey = ref(0)
const cardText = ref<HTMLElement | ElementWithRoot | null>(null)
const cardTextElement = computed(() => {
  if (!cardText.value) return null
  if (cardText.value instanceof HTMLElement) return cardText.value
  return cardText.value.$el ?? null
})

const DEFAULT_TIME_INCREMENT = 15
const SUPPORTED_TIME_INCREMENTS = new Set([15, 30, 60])
const hasBlurredNameField = ref(false)
const isNameFieldFocused = ref(true)
const submitAttempted = ref(false)

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

const editorState = useEventEditorState({
  event: computed(() => props.event),
  edit: computed(() => props.edit),
  contactsPayload: computed(() => props.contactsPayload),
  formRef,
  initialNotificationsEnabled: true,
  initialStartOnMonday: prefersStartOnMonday(),
  onDraftHydrate: ({ specificTimesEnabled, startOnMonday }) => {
    specificTimesEnabled.value = props.contactsPayload.specificTimesEnabled ?? false
    startOnMonday.value =
      props.contactsPayload.startOnMonday ?? prefersStartOnMonday()
  },
  onEventHydrate: (
    {
      specificTimesEnabled,
      startOnMonday,
      collectEmails,
      timeIncrement,
    },
    event
  ) => {
    specificTimesEnabled.value = event.hasSpecificTimes ?? false
    startOnMonday.value = event.startOnMonday ?? startOnMonday.value
    collectEmails.value = event.collectEmails ?? false
    timeIncrement.value = normalizeTimeIncrement(event.timeIncrement)
  },
  onReset: ({ specificTimesEnabled, startOnMonday, timeIncrement }) => {
    specificTimesEnabled.value = false
    startOnMonday.value = prefersStartOnMonday()
    timeIncrement.value = DEFAULT_TIME_INCREMENT
  },
  captureExtraInitialState: ({
    specificTimesEnabled,
    collectEmails,
    timeIncrement,
    startOnMonday,
  }) => ({
    specificTimesEnabled: specificTimesEnabled.value,
    collectEmails: collectEmails.value,
    timeIncrement: timeIncrement.value,
    startOnMonday: startOnMonday.value,
  }),
  isExtraEdited: (
    { specificTimesEnabled, collectEmails, timeIncrement, startOnMonday },
    initial
  ) =>
    specificTimesEnabled.value !== initial.specificTimesEnabled ||
    collectEmails.value !== initial.collectEmails ||
    timeIncrement.value !== initial.timeIncrement ||
    startOnMonday.value !== initial.startOnMonday,
})

const {
  formValid,
  name,
  startTime,
  endTime,
  loading,
  selectedDays,
  selectedDaysStr,
  selectedDaysOfWeek,
  startOnMonday,
  notificationsEnabled,
  daysOnly,
  selectedDateOption,
  showEmailReminders,
  emails,
  collectEmails,
  blindAvailabilityEnabled,
  sendEmailAfterXResponsesEnabled,
  sendEmailAfterXResponses,
  specificTimesEnabled,
  timeIncrement,
  timezone,
  timezoneModified,
  hasMounted,
  nameRules,
  selectedDaysRules,
  dayOfWeekButtons,
  times,
  minCalendarDate,
  setTimezone,
  resetTimezone,
  getDayOfWeekButtonClass,
  reset: resetEditorState,
  resetToEventData: resetEditorStateToEventData,
  hasEventBeenEdited,
} = editorState

const hasName = computed(() => !!name.value.trim())
const hasSelectedDayCriteria = computed(() =>
  daysOnly.value || selectedDateOption.value === dateOptions.SPECIFIC
    ? selectedDays.value.length > 0
    : selectedDaysOfWeek.value.length > 0
)
const submitBlocked = computed(
  () => !hasName.value || !hasSelectedDayCriteria.value
)
const showSubmitError = computed(
  () => submitAttempted.value && !loading.value && !formValid.value
)
const showNameFieldError = computed(
  () =>
    !name.value.trim() &&
    hasBlurredNameField.value &&
    !isNameFieldFocused.value
)
const submitButtonStyle = computed<Record<string, string>>(() => ({
  backgroundColor: submitBlocked.value
    ? "var(--timeful-primary-action-disabled-bg)"
    : "var(--timeful-primary-action-bg)",
  color: submitBlocked.value
    ? "var(--timeful-primary-action-disabled-fg)"
    : "var(--timeful-primary-action-fg)",
  border: "none",
  borderRadius: "6px",
  paddingRight: "16px",
  paddingLeft: "16px",
  whiteSpace: "nowrap",
  lineHeight: submitBlocked.value ? "21px" : "normal",
}))
const addedEmails = computed(() => {
  if (Object.keys(props.contactsPayload).length > 0) {
    return props.contactsPayload.emails ?? []
  }

  return props.event?.remindees
    ? props.event.remindees
        .map(remindee => remindee.email)
        .filter((email): email is string => !!email)
    : []
})
const startTimeNum = computed({
  get: () => plainTimeToTimeNum(startTime.value),
  set: (num: number) => {
    startTime.value = timeNumToPlainTime(num)
  },
})
const endTimeNum = computed({
  get: () => plainTimeToTimeNum(endTime.value),
  set: (num: number) => {
    endTime.value = timeNumToPlainTime(num)
  },
})
const guestEvent = computed(() => isAnonymousOwnerEvent(props.event))
const timeIncrementItems = computed(() => [
  { title: "15 min", value: 15 },
  { title: "30 min", value: 30 },
  { title: "60 min", value: 60 },
])

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
  hasBlurredNameField.value = false
  isNameFieldFocused.value = true
  submitAttempted.value = false
  resetEditorState()
  emailInputKey.value += 1
}

const submit = async () => {
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return

  const schedule = buildEventEditorSchedule({
    daysOnly: daysOnly.value,
    daysOnlyType: eventTypes.SPECIFIC_DATES,
    selectedDateOption: selectedDateOption.value,
    selectedDays: selectedDays.value,
    selectedDaysOfWeek: selectedDaysOfWeek.value,
    startOnMonday: startOnMonday.value,
    startTime: startTime.value,
    endTime: endTime.value,
    timezoneValue: resolveTimezoneValue(timezone.value.value),
    timeIncrementMinutes: timeIncrement.value,
  })

  selectedDays.value = schedule.normalizedSelectedDays
  selectedDaysOfWeek.value = schedule.normalizedSelectedDaysOfWeek
  if (daysOnly.value) {
    specificTimesEnabled.value = false
  }

  loading.value = true

  const specificTimesEditDraft =
    props.edit && props.event
      ? buildSpecificTimesEditDraft({
          event: props.event,
          schedule,
          timeIncrementMinutes: timeIncrement.value,
          specificTimesEnabled: specificTimesEnabled.value,
        })
      : specificTimesEnabled.value
        ? buildSpecificTimesCreateDraft({
            schedule,
            timeIncrementMinutes: timeIncrement.value,
          })
      : undefined
  const canonicalEnabledSlots =
    specificTimesEditDraft?.enabledSlots ?? schedule.enabledSlots
  const canonicalActiveSlots =
    specificTimesEditDraft?.activeSlots ?? schedule.activeSlots
  const canonicalEventTimezone =
    specificTimesEditDraft?.eventTimezone ?? schedule.eventTimezone
  const canonicalSlotGeneration: typeof schedule.slotGeneration =
    specificTimesEditDraft?.slotGeneration?.startTimeLocal &&
    specificTimesEditDraft.slotGeneration.endTimeLocal &&
    specificTimesEditDraft.slotGeneration.timeIncrement
      ? {
          startTimeLocal: specificTimesEditDraft.slotGeneration.startTimeLocal,
          endTimeLocal: specificTimesEditDraft.slotGeneration.endTimeLocal,
          timeIncrement: specificTimesEditDraft.slotGeneration.timeIncrement,
        }
      : schedule.slotGeneration
  const canonicalTimedRecurrence: typeof schedule.timedRecurrence =
    specificTimesEditDraft?.timedRecurrence?.kind &&
    specificTimesEditDraft.timedRecurrence.selectedDays &&
    specificTimesEditDraft.timedRecurrence.selectedDaysOfWeek
      ? {
          kind: specificTimesEditDraft.timedRecurrence.kind,
          selectedDays: specificTimesEditDraft.timedRecurrence.selectedDays,
          selectedDaysOfWeek:
            specificTimesEditDraft.timedRecurrence.selectedDaysOfWeek,
          startOnMonday:
            specificTimesEditDraft.timedRecurrence.startOnMonday ?? false,
        }
      : schedule.timedRecurrence

  const payload = {
    enabledSlots: toTransportDateTimeStrings(canonicalEnabledSlots),
    activeSlots: toTransportDateTimeStrings(canonicalActiveSlots),
    times: toTransportDateTimeStrings(canonicalActiveSlots),
    eventTimezone: canonicalEventTimezone,
    slotGeneration: {
      startTimeLocal: canonicalSlotGeneration.startTimeLocal.toString(),
      endTimeLocal: canonicalSlotGeneration.endTimeLocal.toString(),
      timeIncrementMinutes: canonicalSlotGeneration.timeIncrement.total("minutes"),
    },
    timedRecurrence: {
      kind: canonicalTimedRecurrence.kind,
      selectedDays: canonicalTimedRecurrence.selectedDays.map((day) => day.toString()),
      selectedDaysOfWeek: canonicalTimedRecurrence.selectedDaysOfWeek,
      startOnMonday: canonicalTimedRecurrence.startOnMonday,
    },
    name: name.value,
    duration: schedule.duration.total("hours"),
    dates: toTransportDateTimeStrings(schedule.dates),
    hasSpecificTimes: specificTimesEnabled.value,
    notificationsEnabled: !authUser.value ? false : notificationsEnabled.value,
    blindAvailabilityEnabled: blindAvailabilityEnabled.value,
    daysOnly: daysOnly.value,
    remindees: emails.value,
    type: schedule.type,
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
    eventDuration: schedule.duration,
    eventDates: JSON.stringify(schedule.dates),
    eventHasSpecificTimes: specificTimesEnabled.value,
    eventNotificationsEnabled: !authUser.value
      ? false
      : notificationsEnabled.value,
    eventBlindAvailabilityEnabled: blindAvailabilityEnabled.value,
    eventDaysOnly: daysOnly.value,
    eventRemindees: emails.value,
    eventType: schedule.type,
    eventSendEmailAfterXResponses: sendEmailAfterXResponsesEnabled.value
      ? sendEmailAfterXResponses.value
      : -1,
    eventCollectEmails: collectEmails.value,
    eventStartOnMonday: startOnMonday.value,
    eventTimeIncrement: timeIncrement.value,
    eventTimezone: canonicalEventTimezone,
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
          state: specificTimesEnabled.value && specificTimesEditDraft
            ? withSpecificTimesEntryState({
                draft: specificTimesEditDraft,
              })
            : undefined,
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

        emit("refresh-event", {
          fromEditEvent: specificTimesEnabled.value,
          specificTimesEditDraft,
        })
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

function submitIfAllowed() {
  if (loading.value || submitBlocked.value) return
  submitAttempted.value = true
  void submit()
}

const requestContactsAccess = ({
  emails: requestEmails,
}: {
  emails: string[]
}) => {
  const payload = {
    emails: requestEmails,
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

const resetToEventData = () => {
  resetEditorStateToEventData()
  emailInputKey.value += 1
}

const trackTimezoneChange = (newTimezone: Timezone) => {
  posthog.capture("timezone_selected_in_new_event_dialog", {
    timezone: newTimezone.value,
  })
}

defineExpose({ reset, resetToEventData, hasEventBeenEdited })

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
  outline: 1px solid var(--timeful-error-foreground);
  border-radius: 3px;
}

.editor-dow-toggle {
  gap: 4px;
}

.editor-dow-button {
  color: rgba(0, 0, 0, 0.87);
}

.editor-dow-button--selected {
  background-color: var(--timeful-selection-bg);
  color: var(--timeful-selection-fg);
}

.new-event-submit-button .v-btn__content,
.new-event-submit-button .v-progress-circular,
.new-event-submit-button .v-icon {
  color: inherit;
}

.new-event-submit-error {
  color: var(--timeful-error-foreground);
}

.time-increment-select {
  --v-input-control-height: 26px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-padding-start: 0px;
  --v-field-padding-end: 0px;
}

.advanced-options-panel {
  color: var(--timeful-muted-foreground);
  letter-spacing: 0.1px;
  line-height: 22px;
}

.new-event-form .v-checkbox .v-selection-control {
  --v-selection-control-size: 32px;
}

.specific-times-checkbox .v-input__details,
.specific-times-checkbox .v-messages,
.specific-times-checkbox .v-messages__message {
  opacity: 1 !important;
}

.gated-feature-checkbox {
  --v-disabled-opacity: 1;
  opacity: 1 !important;
}

.gated-feature-checkbox .v-selection-control {
  opacity: 1 !important;
}

.gated-feature-checkbox .v-selection-control__input > .v-icon {
  color: var(--timeful-disabled-checkbox-icon) !important;
  opacity: 1 !important;
}

.gated-feature-checkbox .v-input__details,
.gated-feature-checkbox .v-messages,
.gated-feature-checkbox .v-messages__message {
  opacity: 1 !important;
}

.advanced-options-disabled-label {
  color: var(--timeful-disabled-foreground) !important;
}

.advanced-options-disabled-message {
  color: var(--timeful-muted-foreground) !important;
  line-height: 16px !important;
}

.advanced-options-disabled-copy {
  color: var(--timeful-emphasis-foreground) !important;
}

.advanced-options-sign-in-link {
  color: var(--timeful-selection-fg) !important;
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

.time-increment-select .v-field--variant-underlined .v-field__outline::before {
  border-bottom-color: var(--timeful-grid-line-color);
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

.time-range-select-item {
  align-items: center;
  color: rgba(0, 0, 0, 0.87);
  cursor: pointer;
  display: flex;
  min-height: 48px;
  padding: 0 16px;
}

.time-range-select-item--active {
  background-color: var(--timeful-selection-bg);
  color: var(--timeful-selection-fg);
}
</style>
