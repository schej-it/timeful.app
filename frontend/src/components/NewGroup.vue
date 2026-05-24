<template>
  <v-card
    :flat="dialog"
    :class="{ 'tw-py-4': !dialog, 'tw-flex-1': dialog }"
    class="tw-relative tw-flex tw-max-w-[28rem] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-transition-all"
  >
    <EditorDialogHeader
      :title="edit ? 'Edit group' : 'New group'"
      subtitle="Ideal for viewing weekly calendar availability"
      help-header="Availability groups"
      :dialog="dialog"
      :show-help="showHelp"
      :hide-dialog-actions="hideDialogActions"
      @close="emit('update:modelValue', false)"
    >
      <template #help-content>
        <div class="mb-4">
          Use availability groups to see group members' weekly calendar
          availabilities from Google Calendar. Your actual calendar events
          will NOT be visible to others.
        </div>
      </template>
    </EditorDialogHeader>
    <v-card-text class="tw-flex-1 tw-overflow-auto tw-px-4 tw-py-1 sm:tw-px-8">
      <v-form
        ref="formRef"
        v-model="formValid"
        class="tw-flex tw-flex-col tw-space-y-6"
        lazy-validation
        :disabled="loading"
      >
        <v-text-field
          ref="nameField"
          v-model="name"
          placeholder="Name your group..."
          hide-details="auto"
          variant="solo"
          class="timeful-solo-field"
          :rules="nameRules"
          required
          @keyup.enter="blurNameField"
        />

        <div>
          <div class="tw-mb-2 tw-text-lg tw-text-black">Time range</div>
          <div class="tw-flex tw-items-baseline tw-justify-center tw-space-x-2">
            <v-select
              v-model="startTime"
              class="timeful-solo-field"
              :items="times"
              hide-details
              variant="solo"
            ></v-select>
            <div>to</div>
            <v-select
              v-model="endTime"
              class="timeful-solo-field"
              :items="times"
              hide-details
              variant="solo"
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

        <EmailInput
          :key="emailInputKey"
          :added-emails="addedEmails"
          @update:emails="(newEmails) => { emails = newEmails }"
          @request-contacts-access="requestContactsAccess"
        >
          <template #header>
            <div class="tw-mb-2 tw-text-lg tw-text-black">Members</div>
          </template>
        </EmailInput>

        <div>
          <v-btn
            class="tw-justify-start tw-pl-0"
            block
            variant="text"
            @click="showAdvancedOptions = !showAdvancedOptions"
            ><span class="tw-mr-1">Advanced options</span>
            <v-icon :class="`tw-rotate-${showAdvancedOptions ? '180' : '0'}`"
              >mdi-chevron-down</v-icon
            ></v-btn
          >
          <v-expand-transition>
            <div v-show="showAdvancedOptions">
              <div class="tw-my-2">
                <TimezoneSelector
                  :model-value="timezone"
                  :modified="timezoneModified"
                  label="Timezone"
                  @update:model-value="(value) => { setTimezone(value) }"
                  @reset="resetTimezone"
                />
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
          class="timeful-elevated-button tw-mt-4 tw-bg-green"
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

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import {
  post,
  put,
  getWrappedTimeRangeDuration,
  getEventMembershipDayOfWeekValues,
  getEventTimeSeed,
  resolveTimezoneValue,
  signInGoogle,
  getDateWithTimezone,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { eventTypes, authTypes, durations, hoursPlainTime } from "@/constants"
import { posthog } from "@/plugins/posthog"
import EditorDialogHeader from "./EditorDialogHeader.vue"
import TimezoneSelector from "./schedule_overlap/TimezoneSelector.vue"
import EmailInput from "./event/EmailInput.vue"
import type { Event } from "@/types"
import { Temporal } from "temporal-polyfill"
import type { EventDraft } from "@/composables/event/types"
import {
  getDraftEndTime,
  getDraftStartTime,
  hasEventDraftData,
} from "@/composables/event/draftBoundary"
import { useOwnedTimezone } from "@/composables/timezone/useOwnedTimezone"

interface FormRef {
  validate: () => Promise<{ valid: boolean }> | boolean
  resetValidation: () => void
}

interface NameFieldRef { blur: () => void }

const props = withDefaults(
  defineProps<{
    event?: Event
    edit?: boolean
    dialog?: boolean
    showHelp?: boolean
    contactsPayload?: EventDraft
    folderId?: string | null
    hideDialogActions?: boolean
  }>(),
  {
    event: undefined,
    edit: false,
    dialog: true,
    showHelp: false,
    contactsPayload: () => ({}),
    folderId: null,
    hideDialogActions: false,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  "update:formEmpty": [empty: boolean]
  "refresh-event": [payload?: { fromEditEvent?: boolean }]
}>()

const router = useRouter()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const formRef = ref<FormRef | null>(null)
const nameField = ref<NameFieldRef | null>(null)
const emailInputKey = ref(0)

const formValid = ref(true)
const name = ref("")
const startTime = ref(hoursPlainTime.NINE)
const endTime = ref(hoursPlainTime.SEVENTEEN)
const loading = ref(false)
const selectedDaysOfWeek = ref<number[]>([])
const startOnMonday = ref(false)
const emails = ref<string[]>([])

const showAdvancedOptions = ref(false)
const {
  timezone,
  modified: timezoneModified,
  setTimezone,
  resetTimezone,
} = useOwnedTimezone()

const initialEventData = ref<{
  name: string
  startTime: Temporal.PlainTime
  endTime: Temporal.PlainTime
  selectedDaysOfWeek: number[]
  emails: string[]
}>({
  name: "",
  startTime: hoursPlainTime.NINE,
  endTime: hoursPlainTime.SEVENTEEN,
  selectedDaysOfWeek: [],
  emails: [],
})

const nameRules = computed(() => [
  (v: string) => !!v || "Group name is required",
])
const selectedDaysRules = computed(() => [
  (selectedDays: number[]) =>
    selectedDays.length > 0 || "Please select at least one day",
])
const dayOfWeekButtons = computed(() => [
  ...(!startOnMonday.value ? [{ key: "sun-start", label: "Sun", value: 0 }] : []),
  { key: "mon", label: "Mon", value: 1 },
  { key: "tue", label: "Tue", value: 2 },
  { key: "wed", label: "Wed", value: 3 },
  { key: "thu", label: "Thu", value: 4 },
  { key: "fri", label: "Fri", value: 5 },
  { key: "sat", label: "Sat", value: 6 },
  ...(startOnMonday.value ? [{ key: "sun-end", label: "Sun", value: 7 }] : []),
])
const formEmpty = computed(
  () =>
    name.value === "" &&
    emails.value.length === 0 &&
    selectedDaysOfWeek.value.length === 0
)
const getDayOfWeekButtonClass = (dayIndex: number) => ({
  "editor-dow-button": true,
  "editor-dow-button--selected": selectedDaysOfWeek.value.includes(dayIndex),
})
const times = computed(() => {
  const t: { text: string; value: number }[] = []
  for (let h = 1; h < 12; ++h) t.push({ text: `${String(h)} am`, value: h })
  for (let h = 0; h < 12; ++h)
    t.push({ text: `${String(h == 0 ? 12 : h)} pm`, value: h + 12 })
  t.push({ text: "12 am", value: 0 })
  return t
})
const otherEventAttendees = computed(() =>
  props.event?.attendees
    ? props.event.attendees
        .map((a) => a.email)
        .filter((email): email is string => !!email && email !== authUser.value?.email)
    : []
)
const addedEmails = computed(() => {
  if (hasEventDraftData(props.contactsPayload))
    return props.contactsPayload.emails ?? []
  return otherEventAttendees.value
})

onMounted(() => {
  if (hasEventDraftData(props.contactsPayload)) {
    name.value = props.contactsPayload.name ?? ""
    startTime.value = getDraftStartTime(props.contactsPayload)
    endTime.value = getDraftEndTime(props.contactsPayload)
    selectedDaysOfWeek.value = props.contactsPayload.selectedDaysOfWeek ?? []
    startOnMonday.value = props.contactsPayload.startOnMonday ?? false

    formRef.value?.resetValidation()
  }
})

const blurNameField = () => {
  nameField.value?.blur()
}
const reset = () => {
  name.value = ""
  startTime.value = hoursPlainTime.NINE
  endTime.value = hoursPlainTime.SEVENTEEN
  selectedDaysOfWeek.value = []
  emailInputKey.value += 1

  formRef.value?.resetValidation()
}

const submit = async () => {
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return
  const timezoneValue = resolveTimezoneValue(timezone.value.value)

  const duration = getWrappedTimeRangeDuration(startTime.value, endTime.value)

  const dates: Temporal.ZonedDateTime[] = []
  selectedDaysOfWeek.value.sort((a, b) => a - b)
  selectedDaysOfWeek.value = selectedDaysOfWeek.value.filter((dayIndex) => {
    return startOnMonday.value ? dayIndex !== 0 : dayIndex !== 7
  })
  for (const dayIndex of selectedDaysOfWeek.value) {
    // For group events, we need to find the next occurrence of this day
    
    // Get current date in the specified timezone
    const now = Temporal.Now.zonedDateTimeISO(timezoneValue)
    const currentDayOfWeek = now.dayOfWeek // 1-7 (Mon-Sun)
    const targetDayOfWeek = dayIndex === 7 ? 7 : dayIndex // Convert from Sunday-based to Monday-based
    
    // Calculate days until next occurrence
    let daysUntil = targetDayOfWeek - currentDayOfWeek
    if (daysUntil < 0) daysUntil += 7
    
    const targetDate = now.add({ days: daysUntil }).toPlainDate()
    const targetZDT = targetDate.toZonedDateTime({ 
      timeZone: timezoneValue,
      plainTime: startTime.value
    })
    dates.push(targetZDT)
  }

  loading.value = true

  const groupName = name.value
  const type = eventTypes.GROUP
  const attendees = emails.value
  const startMon = startOnMonday.value

  if (!props.edit) {
    post<{ eventId: string; shortId?: string }>("/events", {
      name: groupName,
      duration,
      dates,
      attendees,
      type,
      startOnMonday: startMon,
      creatorPosthogId: posthog.get_distinct_id(),
    })
      .then(async ({ eventId, shortId }) => {
        if (authUser.value) {
          await mainStore.setEventFolder({ eventId, folderId: props.folderId })
        }
        void router.push({
          name: "group",
          params: { groupId: shortId ?? eventId },
        })
        emit("update:modelValue", false)

        posthog.capture("Availability group created", {
          eventId,
          eventName: groupName,
          eventDuration: duration,
          eventDates: JSON.stringify(dates),
          eventAttendees: attendees,
          eventType: type,
          eventStartOnMonday: startMon,
        })
      })
      .catch((err: unknown) => {
        mainStore.showError(
          "There was a problem creating that group! Please try again later."
        )
        console.error(err)
      })
      .finally(() => {
        loading.value = false
      })
  } else if (props.event) {
    put(`/events/${props.event._id ?? ""}`, {
      name: groupName,
      duration,
      dates,
      attendees,
      type,
      startOnMonday: startMon,
    })
      .then(() => {
        posthog.capture("Availability group edited", {
          eventId: props.event?._id,
          eventName: groupName,
          eventDuration: duration,
          eventDates: JSON.stringify(dates),
          eventAttendees: attendees,
          eventType: type,
          eventStartOnMonday: startMon,
        })

        emit("refresh-event", {
          fromEditEvent: false,
        })
      })
      .catch(() => {
        mainStore.showError(
          "There was a problem editing this group! Please try again later."
        )
      })
      .finally(() => {
        loading.value = false
      })
  }
}

const requestContactsAccess = ({ emails: requestEmails }: { emails: string[] }) => {
  const payload = {
    emails: requestEmails,
    name: name.value,
    startTime: startTime.value,
    endTime: endTime.value,
    selectedDaysOfWeek: selectedDaysOfWeek.value,
    startOnMonday: startOnMonday.value,
    timezone: timezone.value,
  }
  signInGoogle({
    state: {
      type: authTypes.EVENT_CONTACTS,
      eventId: props.event ? props.event.shortId ?? props.event._id : "",
      openNewGroup: true,
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
      startTime.value = getDateWithTimezone(eventDate).toPlainTime()

      const durationHours = props.event.duration ?? durations.ZERO
      endTime.value = startTime.value.add(durationHours)
    }
    startOnMonday.value = props.event.startOnMonday ?? false

    selectedDaysOfWeek.value = getEventMembershipDayOfWeekValues(
      props.event.dates
    )

    emails.value = otherEventAttendees.value
  }
}
const resetToEventData = () => {
  updateFieldsFromEvent()
  emailInputKey.value += 1
}
const setInitialEventData = () => {
  initialEventData.value = {
    name: name.value,
    startTime: startTime.value,
    endTime: endTime.value,
    selectedDaysOfWeek: [...selectedDaysOfWeek.value],
    emails: [...emails.value],
  }
}
const hasEventBeenEdited = () => {
  return (
    name.value !== initialEventData.value.name ||
    startTime.value !== initialEventData.value.startTime ||
    endTime.value !== initialEventData.value.endTime ||
    JSON.stringify(selectedDaysOfWeek.value) !==
      JSON.stringify(initialEventData.value.selectedDaysOfWeek) ||
    JSON.stringify(emails.value) !==
      JSON.stringify(initialEventData.value.emails)
  )
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
watch(formEmpty, (val) => {
  emit("update:formEmpty", val)
})
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
