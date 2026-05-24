import { computed, nextTick, onMounted, ref, watch, type ComputedRef, type Ref } from "vue"
import {
  dateOptions,
  eventTypes,
  hoursPlainTime,
  type DateOptionType,
} from "@/constants"
import type { EventDraft } from "@/composables/event/types"
import { useOwnedTimezone } from "@/composables/timezone/useOwnedTimezone"
import type { Timezone } from "@/composables/schedule_overlap/types"
import type { Event } from "@/types"
import {
  getDateWithTimezone,
  getEventMembershipDayOfWeekValues,
  getEventMembershipPlainDates,
  getEventTimeSeed,
  getTimeOptions,
  resolveInitialTimezoneSelection,
} from "@/utils"
import {
  getDraftEndTime,
  getDraftSelectedDays,
  getDraftStartTime,
  getDraftTimezone,
  hasEventDraftData,
} from "./draftBoundary"
import { Temporal } from "temporal-polyfill"

export interface EventEditorFormRef {
  resetValidation: () => void
}

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type EventEditorExtraSnapshot = Record<string, unknown>

interface EventEditorStateOptions {
  event: MaybeRef<Event | undefined>
  edit: MaybeRef<boolean>
  contactsPayload: MaybeRef<EventDraft | undefined>
  formRef: Ref<EventEditorFormRef | null>
  initialNotificationsEnabled?: boolean
  initialStartOnMonday?: boolean
  onDraftHydrate?: (ctx: EventEditorState) => void
  onEventHydrate?: (ctx: EventEditorState, event: Event) => void
  onReset?: (ctx: EventEditorState) => void
  captureExtraInitialState?: (ctx: EventEditorState) => EventEditorExtraSnapshot
  isExtraEdited?: (
    ctx: EventEditorState,
    initial: EventEditorExtraSnapshot
  ) => boolean
}

type EventEditorInitialSnapshot = {
  name: string
  startTime: Temporal.PlainTime
  endTime: Temporal.PlainTime
  daysOnly: boolean
  selectedDays: Temporal.PlainDate[]
  selectedDaysOfWeek: number[]
  selectedDateOption: DateOptionType
  notificationsEnabled: boolean
  emails: string[]
  blindAvailabilityEnabled: boolean
  sendEmailAfterXResponsesEnabled: boolean
  sendEmailAfterXResponses: number
} & EventEditorExtraSnapshot

const createTodayIsoDate = () => Temporal.Now.plainDateISO().toString()

const arraySnapshotEquals = (left: unknown[], right: unknown[]) =>
  JSON.stringify(left) === JSON.stringify(right)

export interface EventEditorState {
  formValid: Ref<boolean>
  name: Ref<string>
  startTime: Ref<Temporal.PlainTime>
  endTime: Ref<Temporal.PlainTime>
  loading: Ref<boolean>
  selectedDays: Ref<Temporal.PlainDate[]>
  selectedDaysStr: ComputedRef<string[]>
  selectedDaysOfWeek: Ref<number[]>
  startOnMonday: Ref<boolean>
  notificationsEnabled: Ref<boolean>
  daysOnly: Ref<boolean>
  selectedDateOption: Ref<DateOptionType>
  showEmailReminders: Ref<boolean>
  emails: Ref<string[]>
  showAdvancedOptions: Ref<boolean>
  collectEmails: Ref<boolean>
  blindAvailabilityEnabled: Ref<boolean>
  sendEmailAfterXResponsesEnabled: Ref<boolean>
  sendEmailAfterXResponses: Ref<number>
  specificTimesEnabled: Ref<boolean>
  timeIncrement: Ref<number>
  timezone: Ref<Timezone>
  timezoneModified: Ref<boolean>
  hasMounted: Ref<boolean>
  initialEventData: Ref<EventEditorInitialSnapshot>
  nameRules: ComputedRef<((value: string) => true | string)[]>
  selectedDaysRules: ComputedRef<((value: unknown[]) => true | string)[]>
  dayOfWeekButtons: ComputedRef<{ key: string; label: string; value: number }[]>
  times: ComputedRef<ReturnType<typeof getTimeOptions>>
  minCalendarDate: ComputedRef<string>
  setTimezone: (value: Timezone) => void
  resetTimezone: () => void
  getDayOfWeekButtonClass: (dayIndex: number) => Record<string, boolean>
  toggleEmailReminders: (delayed?: boolean) => void
  applyEventData: () => void
  reset: () => void
  resetToEventData: () => void
  setInitialEventData: () => void
  hasEventBeenEdited: () => boolean
}

export function useEventEditorState(
  options: EventEditorStateOptions
): EventEditorState {
  const event = computed(() => options.event.value)
  const edit = computed(() => options.edit.value)
  const contactsPayload = computed(() => options.contactsPayload.value)
  const initialNotificationsEnabled = options.initialNotificationsEnabled ?? false
  const initialStartOnMonday = options.initialStartOnMonday ?? false

  const formValid = ref(true)
  const name = ref("")
  const startTime = ref<Temporal.PlainTime>(hoursPlainTime.NINE)
  const endTime = ref<Temporal.PlainTime>(hoursPlainTime.SEVENTEEN)
  const loading = ref(false)
  const selectedDays = ref<Temporal.PlainDate[]>([])
  const selectedDaysStr = computed<string[]>({
    get: () => selectedDays.value.map(day => day.toString()),
    set: value => {
      selectedDays.value = value.map(day => Temporal.PlainDate.from(day))
    },
  })
  const selectedDaysOfWeek = ref<number[]>([])
  const startOnMonday = ref(initialStartOnMonday)
  const notificationsEnabled = ref(initialNotificationsEnabled)
  const daysOnly = ref(false)
  const selectedDateOption = ref<DateOptionType>(dateOptions.SPECIFIC)
  const showEmailReminders = ref(false)
  const emails = ref<string[]>([])
  const showAdvancedOptions = ref(false)
  const collectEmails = ref(false)
  const blindAvailabilityEnabled = ref(false)
  const sendEmailAfterXResponsesEnabled = ref(false)
  const sendEmailAfterXResponses = ref(3)
  const specificTimesEnabled = ref(false)
  const timeIncrement = ref(15)
  const { timezone, modified: timezoneModified, setTimezone, resetTimezone } =
    useOwnedTimezone()
  const hasMounted = ref(false)
  const initialEventData = ref<EventEditorInitialSnapshot>({
    name: "",
    startTime: hoursPlainTime.NINE,
    endTime: hoursPlainTime.SEVENTEEN,
    daysOnly: false,
    selectedDays: [],
    selectedDaysOfWeek: [],
    selectedDateOption: dateOptions.SPECIFIC,
    notificationsEnabled: initialNotificationsEnabled,
    emails: [],
    blindAvailabilityEnabled: false,
    sendEmailAfterXResponsesEnabled: false,
    sendEmailAfterXResponses: 3,
  })

  const state: EventEditorState = {
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
    showAdvancedOptions,
    collectEmails,
    blindAvailabilityEnabled,
    sendEmailAfterXResponsesEnabled,
    sendEmailAfterXResponses,
    specificTimesEnabled,
    timeIncrement,
    timezone,
    timezoneModified,
    hasMounted,
    initialEventData,
    nameRules: computed(() => [(value: string) => !!value || "Event name is required"]),
    selectedDaysRules: computed(() => [
      (value: unknown[]) => value.length > 0 || "Please select at least one day",
    ]),
    dayOfWeekButtons: computed(() => [
      ...(!startOnMonday.value
        ? [{ key: "sun-start", label: "Sun", value: 0 }]
        : []),
      { key: "mon", label: "Mon", value: 1 },
      { key: "tue", label: "Tue", value: 2 },
      { key: "wed", label: "Wed", value: 3 },
      { key: "thu", label: "Thu", value: 4 },
      { key: "fri", label: "Fri", value: 5 },
      { key: "sat", label: "Sat", value: 6 },
      ...(startOnMonday.value
        ? [{ key: "sun-end", label: "Sun", value: 7 }]
        : []),
    ]),
    times: computed(() => getTimeOptions()),
    minCalendarDate: computed(() => (edit.value ? "" : createTodayIsoDate())),
    setTimezone,
    resetTimezone,
    getDayOfWeekButtonClass: (dayIndex: number) => ({
      "editor-dow-button": true,
      "editor-dow-button--selected": selectedDaysOfWeek.value.includes(dayIndex),
    }),
    toggleEmailReminders,
    applyEventData,
    reset,
    resetToEventData,
    setInitialEventData,
    hasEventBeenEdited,
  }

  function toggleEmailReminders(delayed = false) {
    if (delayed) {
      setTimeout(() => {
        showEmailReminders.value = !showEmailReminders.value
      }, 300)
      return
    }

    showEmailReminders.value = !showEmailReminders.value
  }

  function applyDraftData() {
    const draft = contactsPayload.value
    if (draft == null || !hasEventDraftData(draft)) return

    toggleEmailReminders(true)
    name.value = draft.name ?? ""
    startTime.value = getDraftStartTime(draft)
    endTime.value = getDraftEndTime(draft)
    daysOnly.value = draft.daysOnly ?? false
    selectedDateOption.value = (draft.selectedDateOption ?? dateOptions.SPECIFIC) as DateOptionType
    selectedDaysOfWeek.value = draft.selectedDaysOfWeek ?? []
    selectedDays.value = getDraftSelectedDays(draft)
    notificationsEnabled.value =
      draft.notificationsEnabled ?? initialNotificationsEnabled
    timezone.value =
      getDraftTimezone(draft) ??
      resolveInitialTimezoneSelection(Temporal.Now.zonedDateTimeISO())

    options.onDraftHydrate?.(state)
    options.formRef.value?.resetValidation()
  }

  function applyEventData() {
    const currentEvent = event.value
    if (!currentEvent) return

    name.value = currentEvent.name ?? ""

    const eventDate = getEventTimeSeed(currentEvent)
    if (eventDate != null) {
      const zonedDateTime = getDateWithTimezone(eventDate)
      startTime.value = zonedDateTime.toPlainTime()
      endTime.value = startTime.value.add(currentEvent.duration ?? Temporal.Duration.from({}))
    }

    notificationsEnabled.value = currentEvent.notificationsEnabled ?? false
    blindAvailabilityEnabled.value = currentEvent.blindAvailabilityEnabled ?? false
    daysOnly.value = currentEvent.daysOnly ?? false

    if (
      currentEvent.sendEmailAfterXResponses != null &&
      currentEvent.sendEmailAfterXResponses > 0
    ) {
      sendEmailAfterXResponsesEnabled.value = true
      sendEmailAfterXResponses.value = currentEvent.sendEmailAfterXResponses
    } else {
      sendEmailAfterXResponsesEnabled.value = false
      sendEmailAfterXResponses.value = 3
    }

    if (currentEvent.daysOnly) {
      selectedDateOption.value = dateOptions.SPECIFIC
      selectedDays.value = getEventMembershipPlainDates(currentEvent.dates)
      selectedDaysOfWeek.value = []
    } else if (currentEvent.type === eventTypes.SPECIFIC_DATES) {
      selectedDateOption.value = dateOptions.SPECIFIC
      selectedDays.value = getEventMembershipPlainDates(currentEvent.dates)
      selectedDaysOfWeek.value = []
    } else {
      selectedDateOption.value = dateOptions.DOW
      selectedDaysOfWeek.value = getEventMembershipDayOfWeekValues(currentEvent.dates)
      selectedDays.value = []
    }

    options.onEventHydrate?.(state, currentEvent)
  }

  function reset() {
    name.value = ""
    startTime.value = hoursPlainTime.NINE
    endTime.value = hoursPlainTime.SEVENTEEN
    selectedDays.value = []
    selectedDaysOfWeek.value = []
    notificationsEnabled.value = initialNotificationsEnabled
    daysOnly.value = false
    selectedDateOption.value = dateOptions.SPECIFIC
    startOnMonday.value = initialStartOnMonday
    emails.value = []
    showAdvancedOptions.value = false
    blindAvailabilityEnabled.value = false
    sendEmailAfterXResponsesEnabled.value = false
    sendEmailAfterXResponses.value = 3
    collectEmails.value = false
    options.onReset?.(state)
    options.formRef.value?.resetValidation()
  }

  function resetToEventData() {
    applyEventData()
  }

  function setInitialEventData() {
    initialEventData.value = {
      name: name.value,
      startTime: startTime.value,
      endTime: endTime.value,
      daysOnly: daysOnly.value,
      selectedDays: [...selectedDays.value],
      selectedDaysOfWeek: [...selectedDaysOfWeek.value],
      selectedDateOption: selectedDateOption.value,
      notificationsEnabled: notificationsEnabled.value,
      emails: [...emails.value],
      blindAvailabilityEnabled: blindAvailabilityEnabled.value,
      sendEmailAfterXResponsesEnabled: sendEmailAfterXResponsesEnabled.value,
      sendEmailAfterXResponses: sendEmailAfterXResponses.value,
      ...(options.captureExtraInitialState?.(state) ?? {}),
    }
  }

  function hasEventBeenEdited() {
    const initial = initialEventData.value
    return (
      name.value !== initial.name ||
      startTime.value !== initial.startTime ||
      endTime.value !== initial.endTime ||
      selectedDateOption.value !== initial.selectedDateOption ||
      !arraySnapshotEquals(selectedDays.value, initial.selectedDays) ||
      !arraySnapshotEquals(selectedDaysOfWeek.value, initial.selectedDaysOfWeek) ||
      daysOnly.value !== initial.daysOnly ||
      notificationsEnabled.value !== initial.notificationsEnabled ||
      !arraySnapshotEquals(emails.value, initial.emails) ||
      blindAvailabilityEnabled.value !== initial.blindAvailabilityEnabled ||
      sendEmailAfterXResponsesEnabled.value !==
        initial.sendEmailAfterXResponsesEnabled ||
      sendEmailAfterXResponses.value !== initial.sendEmailAfterXResponses ||
      (options.isExtraEdited?.(state, initial) ?? false)
    )
  }

  onMounted(() => {
    applyDraftData()
    void nextTick(() => {
      hasMounted.value = true
    })
  })

  watch(
    () => event.value,
    () => {
      applyEventData()
      setInitialEventData()
    },
    { immediate: true }
  )

  watch(selectedDateOption, () => {
    if (selectedDateOption.value === dateOptions.SPECIFIC) {
      selectedDaysOfWeek.value = []
      return
    }

    selectedDays.value = []
  })

  return state
}
