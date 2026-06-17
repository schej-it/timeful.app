<template>
  <v-card
    :flat="dialog"
    :class="{ 'tw-py-4': !dialog, 'tw-flex-1': dialog }"
    class="tw-relative tw-flex tw-max-w-[28rem] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-transition-all"
  >
    <EditorDialogHeader
      :title="edit ? 'Edit sign up' : 'New sign up'"
      subtitle="Ideal for events with sign up slots"
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
          class="timeful-solo-field"
          :rules="nameRules"
          required
          @keyup.enter="blurNameField"
        />

        <div>
          <v-expand-transition>
            <div v-if="!daysOnly">
              <div class="tw-mb-2 tw-text-lg tw-text-black">
                What times might work?
              </div>
              <div class="time-range-row tw-mb-6 tw-flex tw-justify-center tw-space-x-2">
                <v-select
                  :model-value="startTime"
                  :items="times"
                  class="time-range-select timeful-solo-field"
                  item-color="green"
                  return-object
                  hide-details
                  :menu-props="{ minWidth: 176, maxWidth: 176 }"
                  variant="solo"
                  @update:model-value="(t: any) => (startTime = t.time ?? t)"
                ></v-select>
                <div class="time-range-separator">to</div>
                <v-select
                  :model-value="endTime"
                  :items="times"
                  class="time-range-select timeful-solo-field"
                  item-color="green"
                  return-object
                  hide-details
                  :menu-props="{ minWidth: 176, maxWidth: 176 }"
                  variant="solo"
                  @update:model-value="(t: any) => (endTime = t.time ?? t)"
                ></v-select>
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
            class="timeful-solo-field tw-mb-4"
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
                  class="editor-dow-toggle"
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

        <v-checkbox v-model="notificationsEnabled" hide-details class="tw-mt-2">
          <template #label>
            <span class="tw-text-sm tw-text-very-dark-gray"
              >Email me each time someone signs up</span
            >
          </template>
        </v-checkbox>

        <v-checkbox v-model="collectEmails">
          <template #label>
            <span class="tw-text-sm tw-text-very-dark-gray">
              Collect email address on sign up
            </span>
          </template>
        </v-checkbox>

        <div class="tw-flex tw-flex-col tw-gap-2">
          <ExpandableSection
            v-model="showAdvancedOptions"
            label="Advanced options"
            :auto-scroll="dialog"
          >
            <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2">
              <v-checkbox
                v-if="authUser"
                v-model="blindAvailabilityEnabled"
                messages="Only show attendees to sign up creator"
              >
                <template #label>
                  <span class="tw-text-sm tw-text-black">
                    Hide attendees from each other
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
                v-else
                disabled
                messages="Only show responses to event creator. "
                false-icon="mdi-checkbox-blank-off-outline"
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
                      ><template v-if="signInEnabled">
                        <a @click="emit('signIn')">Sign in</a>
                        to use this feature
                      </template>
                      <template v-else>Requires sign-in, which is disabled in this build</template>
                    </span>
                  </div>
                </template>
              </v-checkbox>
              <TimezoneSelector
                :model-value="timezone"
                :modified="timezoneModified"
                label="Timezone"
                @update:model-value="(val) => { setTimezone(val) }"
                @reset="resetTimezone"
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
          class="timeful-elevated-button tw-mt-4 tw-bg-green"
          @click="submit"
        >
          {{ edit ? "Save edits" : "Create event" }}
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
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { dateOptions, eventTypes } from "@/constants"
import { post, put, resolveTimezoneValue } from "@/utils"
import { signInEnabled } from "@/utils/signInAvailability"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import TimezoneSelector from "./schedule_overlap/TimezoneSelector.vue"
import EditorDialogHeader from "./EditorDialogHeader.vue"
import DatePicker from "@/components/DatePicker.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"
import ExpandableSection from "./ExpandableSection.vue"
import type { Event } from "@/types"
import type { EventDraft } from "@/composables/event/types"
import {
  buildEventEditorSchedule,
} from "@/composables/event/eventEditorSchedule"
import { toEventPatchPayload } from "@/composables/event/eventMutationBoundary"
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
    event?: Event
    edit?: boolean
    dialog?: boolean
    contactsPayload?: EventDraft
    showHelp?: boolean
    hideDialogActions?: boolean
  }>(),
  {
    event: undefined,
    edit: false,
    dialog: true,
    contactsPayload: () => ({}),
    showHelp: false,
    hideDialogActions: false,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  "refresh-event": [payload?: { fromEditEvent?: boolean }]
  signIn: []
}>()

const router = useRouter()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const formRef = ref<FormRef | null>(null)
const nameField = ref<NameFieldRef | null>(null)
const cardText = ref<HTMLElement | ElementWithRoot | null>(null)
const cardTextElement = computed(() => {
  if (!cardText.value) return null
  if (cardText.value instanceof HTMLElement) return cardText.value
  return cardText.value.$el ?? null
})

const editorState = useEventEditorState({
  event: computed(() => props.event),
  edit: computed(() => props.edit),
  contactsPayload: computed(() => props.contactsPayload),
  formRef,
  onEventHydrate: ({ startOnMonday }, event) => {
    if (event.startOnMonday) {
      startOnMonday.value = true
    }
  },
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
  emails,
  showAdvancedOptions,
  collectEmails,
  blindAvailabilityEnabled,
  sendEmailAfterXResponsesEnabled,
  sendEmailAfterXResponses,
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
  reset,
  resetToEventData,
  hasEventBeenEdited,
} = editorState

const blurNameField = () => {
  nameField.value?.blur()
}

const submit = async () => {
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return
  const schedule = buildEventEditorSchedule({
    daysOnly: daysOnly.value,
    daysOnlyType: (eventTypes as Record<string, string>).SIGNUP,
    selectedDateOption: selectedDateOption.value,
    selectedDays: selectedDays.value,
    selectedDaysOfWeek: selectedDaysOfWeek.value,
    startOnMonday: startOnMonday.value,
    startTime: startTime.value,
    endTime: endTime.value,
    timezoneValue: resolveTimezoneValue(timezone.value.value),
  })

  selectedDays.value = schedule.normalizedSelectedDays
  selectedDaysOfWeek.value = schedule.normalizedSelectedDaysOfWeek
  const membershipDates = schedule.dates.map((date) => date.toPlainDate())
  const membershipTimeSeed = schedule.dates[0]

  loading.value = true

  const payload = {
    ...toEventPatchPayload({
      name: name.value,
      duration: schedule.duration,
      type: schedule.type as Event["type"],
      dates: membershipDates,
      timeSeed: membershipTimeSeed,
      enabledSlots: schedule.enabledSlots,
      activeSlots: schedule.activeSlots,
      times: schedule.activeSlots,
      eventTimezone: schedule.eventTimezone,
      slotGeneration: schedule.slotGeneration,
      timedRecurrence: schedule.timedRecurrence,
      notificationsEnabled: notificationsEnabled.value,
      blindAvailabilityEnabled: blindAvailabilityEnabled.value,
      daysOnly: daysOnly.value,
      remindees: emails.value,
      sendEmailAfterXResponses: sendEmailAfterXResponsesEnabled.value
        ? sendEmailAfterXResponses.value
        : -1,
      collectEmails: collectEmails.value,
      startOnMonday: startOnMonday.value,
      creatorPosthogId: posthog.get_distinct_id(),
    }),
    name: name.value,
    notificationsEnabled: notificationsEnabled.value,
    blindAvailabilityEnabled: blindAvailabilityEnabled.value,
    daysOnly: daysOnly.value,
    isSignUpForm: true,
    collectEmails: collectEmails.value,
  }

  const posthogPayload: Record<string, unknown> = {
    eventName: name.value,
    eventDuration: schedule.duration,
    eventDates: JSON.stringify(schedule.dates),
    eventNotificationsEnabled: notificationsEnabled.value,
    eventBlindAvailabilityEnabled: blindAvailabilityEnabled.value,
    eventDaysOnly: daysOnly.value,
    eventRemindees: emails.value,
    eventType: schedule.type,
    eventIsSignUpForm: true,
    eventSendEmailAfterXResponses: sendEmailAfterXResponsesEnabled.value
      ? sendEmailAfterXResponses.value
      : -1,
    eventCollectEmails: collectEmails.value,
    eventStartOnMonday: startOnMonday.value,
  }

  if (!props.edit) {
    post<{ eventId: string; shortId?: string }>("/events", payload)
      .then(({ eventId, shortId }) => {
        void router.push({
          name: "signUp",
          params: {
            signUpId: shortId ?? eventId,
          },
        })

        emit("update:modelValue", false)
        reset()

        posthogPayload.eventId = eventId
        posthog.capture("Sign up form created", posthogPayload)
      })
      .catch(() => {
        mainStore.showError(
          "There was a problem creating that event! Please try again later."
        )
      })
      .finally(() => {
        loading.value = false
      })
  } else if (props.event) {
    put(`/events/${props.event._id ?? ""}`, payload)
      .then(() => {
        posthogPayload.eventId = props.event?._id
        posthog.capture("Sign up form edited", posthogPayload)

        emit("refresh-event", {
          fromEditEvent: false,
        })
      })
      .catch(() => {
        mainStore.showError(
          "There was a problem editing this event! Please try again later."
        )
      })
      .finally(() => {
        loading.value = false
      })
  }
}

defineExpose({ reset, resetToEventData, hasEventBeenEdited })
</script>

<style>
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
</style>

<style>
.email-me-after-text-field input {
  padding: 0px !important;
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
