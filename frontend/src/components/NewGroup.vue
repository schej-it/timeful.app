<template>
  <v-card
    :flat="dialog"
    :class="{ 'tw-py-4': !dialog, 'tw-flex-1': dialog }"
    class="tw-relative tw-flex tw-max-w-[28rem] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-transition-all"
  >
    <v-card-title class="tw-mb-2 tw-flex tw-gap-2 tw-px-4 sm:tw-px-8">
      <div>
        <div class="tw-mb-1">
          {{ edit ? "Edit group" : "New group" }}
        </div>
        <div
          v-if="dialog && showHelp"
          class="tw-text-xs tw-font-normal tw-italic tw-text-dark-gray"
        >
          Ideal for viewing weekly calendar availability
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
          <template #header>Availability groups</template>
          <div class="mb-4">
            Use availability groups to see group members' weekly calendar
            availabilities from Google Calendar. Your actual calendar events
            will NOT be visible to others.
          </div>
        </HelpDialog>
      </template>
    </v-card-title>
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
          solo
          :rules="nameRules"
          required
          @keyup.enter="blurNameField"
        />

        <div>
          <div class="tw-mb-2 tw-text-lg tw-text-black">Time range</div>
          <div class="tw-flex tw-items-baseline tw-justify-center tw-space-x-2">
            <v-select
              v-model="startTime"
              :items="times"
              hide-details
              solo
            ></v-select>
            <div>to</div>
            <v-select
              v-model="endTime"
              :items="times"
              hide-details
              solo
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

        <EmailInput
          ref="emailInput"
          :added-emails="addedEmails"
          @update:emails="(newEmails) => { emails = newEmails as string[] }"
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
            text
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
                  v-model="timezone"
                  label="Timezone"
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
          class="tw-mt-4 tw-bg-green"
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
  timeNumToTimeString,
  dateToTimeNum,
  signInGoogle,
  getDateWithTimezone,
} from "@/utils"
import { useMainStore } from "@/stores/main"
import { eventTypes, dayIndexToDayString, authTypes } from "@/constants"
import { posthog } from "@/plugins/posthog"
import HelpDialog from "./HelpDialog.vue"
import TimezoneSelector from "./schedule_overlap/TimezoneSelector.vue"
import EmailInput from "./event/EmailInput.vue"
import type { Event } from "@/types"
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

interface EmailInputRef { reset: () => void }
interface NameFieldRef { blur: () => void }
interface ContactsPayload {
  emails?: string[]
  name?: string
  startTime?: number
  endTime?: number
  selectedDaysOfWeek?: number[]
  startOnMonday?: boolean
}

const props = withDefaults(
  defineProps<{
    event?: Event
    edit?: boolean
    dialog?: boolean
    showHelp?: boolean
    contactsPayload?: ContactsPayload
    folderId?: string | null
  }>(),
  {
    event: undefined,
    edit: false,
    dialog: true,
    showHelp: false,
    contactsPayload: () => ({}),
    folderId: null,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  "update:formEmpty": [empty: boolean]
}>()

const router = useRouter()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const formRef = ref<FormRef | null>(null)
const nameField = ref<NameFieldRef | null>(null)
const emailInput = ref<EmailInputRef | null>(null)

const formValid = ref(true)
const name = ref("")
const startTime = ref(9)
const endTime = ref(17)
const loading = ref(false)
const selectedDaysOfWeek = ref<number[]>([])
const startOnMonday = ref(false)
const emails = ref<string[]>([])

const showAdvancedOptions = ref(false)
const timezone = ref<Timezone>({ value: "", label: "", gmtString: "", offset: 0 })

const helpDialog = ref(false)
const initialEventData = ref<{
  name: string
  startTime: number
  endTime: number
  selectedDaysOfWeek: number[]
  emails: string[]
}>({
  name: "",
  startTime: 9,
  endTime: 17,
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
const formEmpty = computed(
  () =>
    name.value === "" &&
    emails.value.length === 0 &&
    selectedDaysOfWeek.value.length === 0
)
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
  if (Object.keys(props.contactsPayload).length > 0)
    return props.contactsPayload.emails ?? []
  return otherEventAttendees.value
})

onMounted(() => {
  if (Object.keys(props.contactsPayload).length > 0) {
    name.value = props.contactsPayload.name ?? ""
    startTime.value = props.contactsPayload.startTime ?? 9
    endTime.value = props.contactsPayload.endTime ?? 17
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
  startTime.value = 9
  endTime.value = 17
  selectedDaysOfWeek.value = []

  formRef.value?.resetValidation()
}

const submit = async () => {
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return

  let duration = endTime.value - startTime.value
  if (duration < 0) duration += 24

  const dates: Date[] = []
  const startTimeString = timeNumToTimeString(startTime.value)
  selectedDaysOfWeek.value.sort((a, b) => a - b)
  selectedDaysOfWeek.value = selectedDaysOfWeek.value.filter((dayIndex) => {
    return startOnMonday.value ? dayIndex !== 0 : dayIndex !== 7
  })
  for (const dayIndex of selectedDaysOfWeek.value) {
    const day = dayIndexToDayString[dayIndex]
    const date = dayjs.tz(`${day} ${startTimeString}`, timezone.value.value)
    const refOffset = date.utcOffset()
    const currentOffset = dayjs().tz(timezone.value.value).utcOffset()
    dates.push(date.subtract(currentOffset - refOffset, "minutes").toDate())
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

        emit("update:modelValue", false)
        reset()
        window.location.reload()
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

const requestContactsAccess = ({ emails: requestEmails }: { emails: (string | { email: string })[] }) => {
  // Convert Remindee[] (which can be strings or Contact objects) to string[]
  const emailStrings = requestEmails.map(e => typeof e === 'string' ? e : e.email)
  const payload = {
    emails: emailStrings,
    name: name.value,
    startTime: startTime.value,
    endTime: endTime.value,
    selectedDaysOfWeek: selectedDaysOfWeek.value,
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

    startTime.value = Math.floor(
      dateToTimeNum(getDateWithTimezone((props.event.dates ?? [])[0]), true)
    )
    startTime.value %= 24

    endTime.value = (startTime.value + (props.event.duration ?? 0)) % 24
    startOnMonday.value = props.event.startOnMonday ?? false

    const days: number[] = []
    for (let date of props.event.dates ?? []) {
      const d = getDateWithTimezone(date)
      if (startOnMonday.value && d.getUTCDay() === 0) days.push(7)
      else days.push(d.getUTCDay())
    }
    selectedDaysOfWeek.value = days

    emails.value = otherEventAttendees.value
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
