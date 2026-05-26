<template>
  <span>
    <Tooltip :content="tooltipContent">
      <div class="tw-select-none tw-py-4" style="-webkit-touch-callout: none">
        <div class="tw-flex tw-flex-col sm:tw-flex-row">
          <div
            class="tw-flex tw-grow tw-pl-4"
            :class="isSignUp ? '' : 'tw-pr-4'"
          >
            <ScheduleOverlapDaysOnlyGrid
              v-if="event.daysOnly"
              :days-only-grid="daysOnlyGridViewModel"
            />
            <template v-else>
              <ScheduleOverlapTimeGrid :timed-grid="timedGridViewModel" />
            </template>
          </div>

          <!-- Right hand side content -->

          <ScheduleOverlapSidebar
            v-if="!calendarOnly"
            ref="sidebarRef"
            :sidebar="sidebarViewModel"
            v-on="sidebarListeners"
          />
        </div>

        <ToolRow
          v-if="isPhone && !calendarOnly"
          class="tw-px-4"
          :tool-row="toolRowViewModel"
        />

        <ScheduleOverlapMobileOverlay
          v-if="isPhone && !calendarOnly"
          :overlay="mobileOverlayViewModel"
          v-on="mobileOverlayListeners"
        />
      </div>
    </Tooltip>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, watchEffect } from "vue"
import { useDisplay } from "vuetify"
import { Temporal } from "temporal-polyfill"
import {
  post,
  ZdtSet,
  getTimezoneReferenceDateForEvent,
  normalizeOptionalTimezone,
  zdtSetHas,
} from "@/utils"
import {
  availabilityTypes, eventTypes, UTC, type AvailabilityType
} from "@/constants"
import {
  isAnonymousOwnerEvent,
  isSignedInOwner,
} from "@/composables/event/eventOwnership"
import { useMainStore } from "@/stores/main"
import { freemiumEnabled } from "@/utils/freemium"
import ScheduleOverlapDaysOnlyGrid from "./ScheduleOverlapDaysOnlyGrid.vue"
import ScheduleOverlapMobileOverlay from "./ScheduleOverlapMobileOverlay.vue"
import ScheduleOverlapSidebar from "./ScheduleOverlapSidebar.vue"
import ScheduleOverlapTimeGrid from "./ScheduleOverlapTimeGrid.vue"
import ToolRow from "./ToolRow.vue"
import Tooltip from "../Tooltip.vue"
import {
  buildDayGridTimeslotClassStyles,
  buildOverlaidAvailability,
  buildTimeGridTimeslotClassStyles,
  formatTooltipContent,
  getSignUpBlockStyle,
  getTimeBlockStyle,
} from "./scheduleOverlapRendering"
import { useCalendarGrid } from "@/composables/schedule_overlap/useCalendarGrid"
import { useCalendarEvents } from "@/composables/schedule_overlap/useCalendarEvents"
import { useAvailabilityData } from "@/composables/schedule_overlap/useAvailabilityData"
import { useDragPaint } from "@/composables/schedule_overlap/useDragPaint"
import { useEventScheduling } from "@/composables/schedule_overlap/useEventScheduling"
import { useSignUpForm } from "@/composables/schedule_overlap/useSignUpForm"
import {
  canGuestEditResponse,
  useScheduleOverlapUI,
} from "@/composables/schedule_overlap/useScheduleOverlapUI"
import { useOwnedTimezone } from "@/composables/timezone/useOwnedTimezone"
import { useScheduleOverlapController } from "./useScheduleOverlapController"
import { useScheduleOverlapPreferences } from "./useScheduleOverlapPreferences"
import { useScheduleOverlapViewModels } from "./useScheduleOverlapViewModels"
import {
  states,
  COLLAPSED_HOURS_ROW_HEIGHT,
  MIN_COLLAPSIBLE_HIDDEN_SPAN_HOURS,
} from "@/composables/schedule_overlap/types"
import type {
  FetchedResponse, RenderedTimeGridRow, RenderedTimeGridRowCell, RowCol, Timezone, ScheduleOverlapState, ScheduleOverlapEvent, NormalizedCalendarEvent, CalendarEventsByDay, CalendarEventsMap,
  ScheduleOverlapResponse,
  SignUpBlockLite,
} from "@/composables/schedule_overlap/types"
import type {
  ScheduleOverlapDaysOnlyGridActions,
  ScheduleOverlapTimeGridActions,
  ScheduleOverlapToolRowActions,
} from "./scheduleOverlapViewModels"
import type { ScheduleOverlapSidebarExposed as ScheduleOverlapSidebarContract } from "./scheduleOverlapContracts"
import {
  appendGuestIdentityQuery,
  readShowAllHoursPreference,
  writeShowAllHoursPreference,
} from "@/composables/schedule_overlap/scheduleOverlapStorage"

// ── Props / Emits ──────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    event: ScheduleOverlapEvent
    ownerIsPremium?: boolean
    ownerPremiumChecked?: boolean
    fromEditEvent?: boolean
    loadingCalendarEvents?: boolean
    calendarEventsMap?: CalendarEventsMap
    sampleCalendarEventsByDay?: CalendarEventsByDay
    calendarPermissionGranted?: boolean
    weekOffset?: number
    alwaysShowCalendarEvents?: boolean
    noEventNames?: boolean
    calendarOnly?: boolean
    interactable?: boolean
    showSnackbar?: boolean
    animateTimeslotAlways?: boolean
    showHintText?: boolean
    curGuestId?: string
    addingAvailabilityAsGuest?: boolean
    initialTimezone?: Timezone
    calendarAvailabilities?: Record<string, NormalizedCalendarEvent[]>
  }>(),
  {
    ownerIsPremium: false,
    ownerPremiumChecked: false,
    fromEditEvent: false,
    loadingCalendarEvents: false,
    calendarEventsMap: () => ({}),
    calendarPermissionGranted: false,
    weekOffset: 0,
    alwaysShowCalendarEvents: false,
    noEventNames: false,
    sampleCalendarEventsByDay: () => [],
    calendarOnly: false,
    interactable: true,
    showSnackbar: true,
    animateTimeslotAlways: false,
    showHintText: true,
    curGuestId: "",
    addingAvailabilityAsGuest: false,
    initialTimezone: undefined,
    calendarAvailabilities: () => ({}),
  }
)

const emit = defineEmits<{
  "update:weekOffset": [n: number]
  highlightAvailabilityBtn: []
  addAvailabilityAsGuest: []
  setCurGuestId: [id: string]
  refreshEvent: []
  signUpForBlock: [block: SignUpBlockLite]
  addAvailability: []
  deleteAvailability: []
  guestAvailabilityDeleted: [userId: string]
}>()

// ── Store / Vuetify ────────────────────────────────────────────────────
const mainStore = useMainStore()
const { smAndDown } = useDisplay()
const isPhone = computed(() => smAndDown.value)
const isSignUp = computed(() => Boolean(props.event.isSignUpForm))
const isGroup = computed(() => props.event.type === eventTypes.GROUP)
const isOwner = computed(() => isSignedInOwner(props.event, mainStore.authUser))
const _isGuestEvent = computed(() => isAnonymousOwnerEvent(props.event))
const authUser = computed(() => mainStore.authUser)

const eventRef = computed(() => props.event)
const weekOffsetRef = computed(() => props.weekOffset)
const scheduleTimezoneReferenceDate = computed(() =>
  getTimezoneReferenceDateForEvent(props.event, props.weekOffset)
)
const {
  guestNameKey,
  guestOwnership,
  guestName,
  guestResponseLookupKey,
  showBestTimes,
  setGuestName,
  setGuestOwnership,
  clearStoredGuestOwnership,
} = useScheduleOverlapPreferences({
  eventId: computed(() => props.event._id ?? ""),
})
const showAllHours = ref(readShowAllHoursPreference())
watch(showAllHours, (value) => {
  writeShowAllHoursPreference(value)
})

const {
  timezone: curTimezone,
  modified: timezoneModified,
  setTimezone: setCurTimezone,
  resetTimezone: resetCurTimezone,
} = useOwnedTimezone({
  initialTimezone: computed(() => normalizeOptionalTimezone(props.initialTimezone)),
  referenceDate: scheduleTimezoneReferenceDate,
})
const state = ref<ScheduleOverlapState>(states.BEST_TIMES)
const defaultState = computed<ScheduleOverlapState>(() =>
  showBestTimes.value ? states.BEST_TIMES : states.HEATMAP
)
const availabilityType = ref<AvailabilityType>(availabilityTypes.AVAILABLE)
const allowDrag = computed(
  () =>
    state.value === states.EDIT_AVAILABILITY ||
    state.value === states.EDIT_SIGN_UP_BLOCKS ||
    state.value === states.SCHEDULE_EVENT ||
    state.value === states.SET_SPECIFIC_TIMES
)
const dragging = ref(false)
const dragStart = ref<RowCol | null>(null)
const dragCur = ref<RowCol | null>(null)
const fetchedResponses = ref<Record<string, FetchedResponse | undefined>>({})
const loadingResponses = ref({
  loading: false,
  lastFetched: Temporal.Now.instant().toZonedDateTimeISO(UTC),
})

// Template refs
const sidebarRef = ref<ScheduleOverlapSidebarContract | null>(null)
const optionsSectionRef = ref<HTMLElement | null>(null)
const respondentsListRef = ref<HTMLElement | null>(null)

watchEffect(() => {
  optionsSectionRef.value = sidebarRef.value?.optionsSectionEl ?? null
  respondentsListRef.value = sidebarRef.value?.respondentsPanelEl ?? null
})

// ── 1. useCalendarGrid ─────────────────────────────────────────────────
const grid = useCalendarGrid({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  state,
  isPhone,
})

const nextPage = (e?: Event) => {
  ;(e as MouseEvent | undefined)?.stopImmediatePropagation()
  grid.nextPage(e ?? new Event('click'), (n) => { emit("update:weekOffset", n); })
}
const prevPage = (e?: Event) => {
  ;(e as MouseEvent | undefined)?.stopImmediatePropagation()
  grid.prevPage(e ?? new Event('click'), (n) => { emit("update:weekOffset", n); })
}
const emitWeekOffsetUpdate = (value: number) => {
  emit("update:weekOffset", value)
}

const emitSignUpForBlock = (block: SignUpBlockLite) => {
  emit("signUpForBlock", block)
}
// ── 2. useCalendarEvents ───────────────────────────────────────────────
const calEvents = useCalendarEvents({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  calendarEventsMap: computed(
    () => props.calendarEventsMap
  ),
  sampleCalendarEventsByDay: computed(() => props.sampleCalendarEventsByDay),
  calendarAvailabilities: computed(
    () => props.calendarAvailabilities
  ),
  addingAvailabilityAsGuest: computed(() => props.addingAvailabilityAsGuest),
  calendarOnly: computed(() => props.calendarOnly),
  allDays: grid.allDays,
  times: grid.times,
  timeslotDuration: grid.timeslotDuration,
  timezoneOffset: grid.timezoneOffset,
  isGroup,
  guestOwnership,
  getDateFromDayTimeIndex: grid.getDateFromDayTimeIndex,
  fetchedResponses,
  loadingResponses,
})

// ── 3. useAvailabilityData ─────────────────────────────────────────────
const avail = useAvailabilityData({
  event: eventRef,
  weekOffset: weekOffsetRef,
  state,
  fetchedResponses,
  loadingResponses,
  curGuestId: computed(() => props.curGuestId),
  addingAvailabilityAsGuest: computed(() => props.addingAvailabilityAsGuest),
  showSnackbar: computed(() => props.showSnackbar),
  calendarPermissionGranted: computed(() => props.calendarPermissionGranted),
  loadingCalendarEvents: computed(() => props.loadingCalendarEvents),
  allDays: grid.allDays,
  days: grid.days,
  times: grid.times,
  splitTimes: grid.splitTimes,
  timeslotDuration: grid.timeslotDuration,
  page: grid.page,
  maxDaysPerPage: grid.maxDaysPerPage,
  isGroup,
  isOwner,
  guestNameKey,
  guestName,
  guestOwnership,
  guestResponseLookupKey,
  setGuestName,
  setGuestOwnership,
  clearStoredGuestOwnership,
  getDateFromRowCol: grid.getDateFromRowCol,
  calendarEventsByDay: calEvents.calendarEventsByDay,
  groupCalendarEventsByDay: calEvents.groupCalendarEventsByDay,
  bufferTime: calEvents.bufferTime,
  workingHours: calEvents.workingHours,
  getAvailabilityFromCalendarEvents: calEvents.getAvailabilityFromCalendarEvents,
  refreshEvent: () => { emit("refreshEvent"); },
})

// ── 4. useEventScheduling ──────────────────────────────────────────────
const eventSched = useEventScheduling({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  state,
  defaultState,
  splitTimes: grid.splitTimes,
  timeslotDuration: grid.timeslotDuration,
  timeslotHeight: grid.timeslotHeight,
  timezoneOffset: grid.timezoneOffset,
  isWeekly: grid.isWeekly,
  isGroup,
  isSpecificTimes: grid.isSpecificTimes,
  getDateFromRowCol: grid.getDateFromRowCol,
  getMinMaxHoursFromTimes: grid.getMinMaxHoursFromTimes,
  dragging,
  dragStart,
  dragCur,
  tempTimes: avail.tempTimes,
  respondents: avail.respondents,
})

// ── 5. useSignUpForm ───────────────────────────────────────────────────
const signUpForm = useSignUpForm({
  event: eventRef,
  isSignUp,
  days: grid.days,
  isOwner,
  dragStart,
})

// ── 6. useDragPaint ────────────────────────────────────────────────────
const drag = useDragPaint({
  event: eventRef,
  state,
  isSignUp,
  weekOffset: weekOffsetRef,
  dragging,
  dragStart,
  dragCur,
  splitTimes: grid.splitTimes,
  times: grid.times,
  days: grid.days,
  monthDays: grid.monthDays,
  monthDayIncluded: grid.monthDayIncluded,
  columnOffsets: grid.columnOffsets,
  timeslot: grid.timeslot,
  availability: avail.availability,
  ifNeeded: avail.ifNeeded,
  tempTimes: avail.tempTimes,
  availabilityType,
  signUpBlocksByDay: signUpForm.signUpBlocksByDay,
  signUpBlocksToAddByDay: signUpForm.signUpBlocksToAddByDay,
  manualAvailability: avail.manualAvailability,
  curScheduledEvent: eventSched.curScheduledEvent,
  maxSignUpBlockRowSize: signUpForm.maxSignUpBlockRowSize,
  allowDrag,
  getDateFromRowCol: grid.getDateFromRowCol,
  getAvailabilityForColumn: avail.getAvailabilityForColumn,
  createSignUpBlock: signUpForm.createSignUpBlock,
  scrollToSignUpBlock: (id: string) => sidebarRef.value?.scrollToSignUpBlock?.(id),
})

// ── 7. useScheduleOverlapUI ────────────────────────────────────────────
const guestAddedAvailability = computed(
  () =>
    Boolean(
      guestResponseLookupKey.value?.length &&
        guestResponseLookupKey.value in avail.parsedResponses.value
    )
)

const ui = useScheduleOverlapUI({
  isPhone,
  isSignUp,
  isGroup,
  showHintText: computed(() => props.showHintText),
  state,
  showBestTimes,
  defaultState,
  allowDrag,
  availabilityType,
  parsedResponses: avail.parsedResponses,
  curTimeslot: avail.curTimeslot,
  endDrag: drag.endDrag,
  timeslotSelected: avail.timeslotSelected,
  curTimeslotAvailability: avail.curTimeslotAvailability,
  respondents: avail.respondents,
  curGuestId: computed(() => props.curGuestId),
  guestName,
  guestResponseLookupKey,
  guestAddedAvailability,
  optionsSectionRef,
  respondentsListRef,
})

// ── Destructure composable returns for template access ─────────────────
const {
  page, mobileNumDays, pageHasChanged, timeslot: _timeslot, calendarScrollLeft: _calendarScrollLeft, calendarMaxScroll: _calendarMaxScroll,
  timeType, startCalendarOnMonday, isSpecificDates, isWeekly, isSpecificTimes,
  daysOfWeek, timezoneOffset, timezoneReferenceDate, dayOffset: _dayOffset, timeslotDuration, timeslotHeight,
  specificTimesSet: _specificTimesSet, splitTimes, times, allDays, days, monthDays, monthDayIncluded,
  curMonthText, columnOffsets: _columnOffsets, showLeftZigZag: _showLeftZigZag, showRightZigZag: _showRightZigZag, hasNextPage, hasPrevPage, hasPages: _hasPages,
  maxDaysPerPage, isColConsecutive, getDateFromDayHoursOffset: _getDateFromDayHoursOffset, getDateFromDayTimeIndex: _getDateFromDayTimeIndex,
  getDisplayDateFromRowCol, getDateFromRowCol, setTimeslotSize, onResize, onCalendarScroll, getLocalTimezone: _getLocalTimezone,
  getMinMaxHoursFromTimes: _getMinMaxHoursFromTimes,
} = grid

const {
  sharedCalendarAccounts, bufferTime, workingHours, hasRefreshedAuthUser: _hasRefreshedAuthUser,
  calendarEventsByDay, groupCalendarEventsByDay: _groupCalendarEventsByDay, initSharedCalendarAccounts,
  toggleCalendarAccount: _toggleCalendarAccount, toggleSubCalendarAccount: _toggleSubCalendarAccount, getAvailabilityFromCalendarEvents: _getAvailabilityFromCalendarEvents,
  fetchResponses, refreshAuthUser: _refreshAuthUser,
} = calEvents

// Wrapper functions to handle optional payload fields from CalendarAccounts component
const toggleCalendarAccount = (payload: { email?: string; calendarType?: string; enabled: boolean }) => {
  if (payload.email && payload.calendarType) {
    _toggleCalendarAccount({ email: payload.email, calendarType: payload.calendarType, enabled: payload.enabled })
  }
}

const toggleSubCalendarAccount = (payload: { email?: string; calendarType?: string; subCalendarId: string | number; enabled: boolean }) => {
  if (payload.email && payload.calendarType) {
    _toggleSubCalendarAccount({ email: payload.email, calendarType: payload.calendarType, subCalendarId: String(payload.subCalendarId), enabled: payload.enabled })
  }
}

const {
  availability, ifNeeded, tempTimes, availabilityAnimEnabled, availabilityAnimTimeouts: _availabilityAnimTimeouts,
  unsavedChanges, hideIfNeeded, manualAvailability: _manualAvailability,
  responsesFormatted, curTimeslot, curTimeslotAvailability, timeslotSelected,
  availabilityArray: _availabilityArray, ifNeededArray: _ifNeededArray, parsedResponses, respondents, userHasResponded, max,
  getRespondentsForHoursOffset: _getRespondentsForHoursOffset, getResponsesFormatted, populateUserAvailability,
  resetCurUserAvailability, resetCurTimeslot, animateAvailability: _animateAvailability, stopAvailabilityAnim,
  setAvailabilityAutomatically: _setAvailabilityAutomatically, reanimateAvailability, isTouched: _isTouched, getAvailabilityForColumn: _getAvailabilityForColumn,
  getManualAvailabilityDow: _getManualAvailabilityDow, curRespondentsMaxFor, showAvailability, submitAvailability: _submitAvailability,
  deleteAvailability: _deleteAvailability, getAllValidTimeRanges: _getAllValidTimeRanges,
} = avail

const {
  curScheduledEvent, allowScheduleEvent, scheduledEventStyle, signUpBlockBeingDraggedStyle,
  scheduleEvent, cancelScheduleEvent, confirmScheduleEvent, saveTempTimes,
} = eventSched

const {
  signUpBlocksByDay, signUpBlocksToAddByDay, newSignUpBlockName, maxSignUpBlockRowSize: _maxSignUpBlockRowSize,
  alreadyRespondedToSignUpForm, createSignUpBlock: _createSignUpBlock, editSignUpBlock, deleteSignUpBlock,
  resetSignUpForm: _resetSignUpForm, resetSignUpBlocksToAddByDay: _resetSignUpBlocksToAddByDay, submitNewSignUpBlocks: _submitNewSignUpBlocks, handleSignUpBlockClick,
} = signUpForm

const {
  dragType, normalizeXY: _normalizeXY, clampRow: _clampRow, clampCol: _clampCol,
  getRowColFromXY: _getRowColFromXY, inDragRange, startDrag, moveDrag, endDrag,
} = drag

const {
  showEditOptions, showCalendarEvents,
  overlayAvailability, deleteAvailabilityDialog, calendarOptionsDialog, editGuestNameDialog,
  newGuestName, tooltipContent, optionsVisible: _optionsVisible, scrolledToRespondents: _scrolledToRespondents,
  delayedShowStickyRespondents, delayedShowStickyRespondentsTimeout, hintState: _hintState, curRespondent,
  curRespondents, editing, scheduling: _scheduling, curRespondentsSet, rightSideWidth,
  showStickyRespondents: _showStickyRespondents,
  hintStateLocalStorageKey: _hintStateLocalStorageKey, hintText, hintClosed: _hintClosed, hintTextShown, showOverlayAvailabilityToggle,
  selectedGuestRespondent: _selectedGuestRespondent, canEditGuestName, mouseOverRespondent, mouseLeaveRespondent,
  clickRespondent, deselectRespondents, isGuest: _isGuest, checkElementsVisible, onScroll,
  toggleShowEditOptions, onShowBestTimesChange,
  updateOverlayAvailability, closeHint,
} = ui

useScheduleOverlapController({
  event: eventRef,
  fromEditEvent: computed(() => props.fromEditEvent),
  calendarOnly: computed(() => props.calendarOnly),
  weekOffset: weekOffsetRef,
  isGroup,
  isSpecificTimes,
  showBestTimes,
  state,
  availability,
  parsedResponses,
  respondents,
  curTimeslotAvailability,
  unsavedChanges,
  hideIfNeeded,
  page,
  allDays,
  mobileNumDays,
  tempTimes,
  calendarEventsByDay,
  bufferTime,
  workingHours,
  curScheduledEvent,
  delayedShowStickyRespondents,
  delayedShowStickyRespondentsTimeout,
  showStickyRespondents: ui.showStickyRespondents,
  authUser,
  setTimeslotSize,
  onResize,
  onScroll,
  deselectRespondents,
  resetSignUpForm: _resetSignUpForm,
  resetCurUserAvailability,
  initSharedCalendarAccounts,
  fetchResponses,
  reanimateAvailability,
  getResponsesFormatted,
  populateUserAvailability,
  checkElementsVisible,
  onShowBestTimesChange,
})

// ── Local computed ──────────────────────────────────────────────────────
const showAds = computed(
  () =>
    freemiumEnabled &&
    props.ownerPremiumChecked &&
    !props.ownerIsPremium &&
    !mainStore.viewerHasPremiumAccess &&
    state.value !== states.SET_SPECIFIC_TIMES
)

const showLoader = computed(
  () =>
    ((isGroup.value || props.alwaysShowCalendarEvents || editing.value) &&
      props.loadingCalendarEvents) ||
    loadingResponses.value.loading
)

const showCalendarOptions = computed(
  () =>
    !props.addingAvailabilityAsGuest &&
    props.calendarPermissionGranted &&
    (isGroup.value || !userHasResponded.value)
)

const curRespondentsMax = computed(() =>
  curRespondentsMaxFor(curRespondentsSet.value, allDays.value)
)

const formattedAttendees = computed(() =>
  props.event.attendees as { email: string; declined?: boolean }[] | undefined
)

function formatAbsoluteMinutes(absoluteMinutes: number | undefined): string {
  if (typeof absoluteMinutes !== "number") {
    return ""
  }

  const normalizedMinutes =
    ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function ceilToHourMinutes(absoluteMinutes: number): number {
  return Math.ceil(absoluteMinutes / 60) * 60
}

function floorToHourMinutes(absoluteMinutes: number): number {
  return Math.floor(absoluteMinutes / 60) * 60
}

interface PageSlot {
  id: string
  kind: "timeslot" | "filler"
  startMinutes: number
  endMinutes: number
  baseRowIndex?: number
}

interface CollapsedPageSegment {
  id: string
  hiddenStartIndex: number
  hiddenEndIndex: number
  startMinutes: number
  endMinutes: number
}

const specificTimeAvailabilityByVisibleDay = computed<Map<number, ZdtSet>>(() => {
  const availabilityByVisibleDay = new Map<number, ZdtSet>()

  if (!isSpecificTimes.value) {
    return availabilityByVisibleDay
  }

  const totalBaseRows = splitTimes.value[0].length + splitTimes.value[1].length
  for (let visibleDayIndex = 0; visibleDayIndex < days.value.length; visibleDayIndex += 1) {
    const availableDates = new ZdtSet()

    for (let baseRowIndex = 0; baseRowIndex < totalBaseRows; baseRowIndex += 1) {
      const date = getBaseRowScheduleDate(baseRowIndex, visibleDayIndex)
      if (date && zdtSetHas(_specificTimesSet.value, date)) {
        availableDates.add(date)
      }
    }

    if (availableDates.size > 0) {
      availabilityByVisibleDay.set(visibleDayIndex, availableDates)
    }
  }

  return availabilityByVisibleDay
})

function getBaseRowTimeItem(baseRowIndex: number) {
  const firstSplitLength = splitTimes.value[0].length
  return baseRowIndex < firstSplitLength
    ? splitTimes.value[0][baseRowIndex]
    : splitTimes.value[1][baseRowIndex - firstSplitLength]
}

function getBaseRowScheduleDate(
  baseRowIndex: number,
  visibleDayIndex: number
): Temporal.ZonedDateTime | null {
  const time = getBaseRowTimeItem(baseRowIndex)
  const absoluteDayIndex = page.value * maxDaysPerPage.value + visibleDayIndex
  const hasSecondSplit = splitTimes.value[1].length > 0
  const isFirstSplit = baseRowIndex < splitTimes.value[0].length

  let adjustedDayIndex = absoluteDayIndex
  if (hasSecondSplit) {
    if (isFirstSplit) {
      adjustedDayIndex = absoluteDayIndex - 1
    } else if (absoluteDayIndex === allDays.value.length - 1) {
      return null
    }
  }

  if (adjustedDayIndex < 0 || adjustedDayIndex >= allDays.value.length) {
    return null
  }

  const day = allDays.value[adjustedDayIndex]
  if (day.excludeTimes) {
    return null
  }

  return grid.getDateFromDayHoursOffset(adjustedDayIndex, time.hoursOffset)
}

function isDateAvailableForSettingAvailability(
  date: Temporal.ZonedDateTime,
  visibleDayIndex: number
): boolean {
  if (!isSpecificTimes.value) {
    return true
  }

  return (
    specificTimeAvailabilityByVisibleDay.value.get(visibleDayIndex)?.has(date) ??
    false
  )
}

function isBaseRowUnavailableOnEveryVisibleDay(baseRowIndex: number): boolean {
  for (let visibleDayIndex = 0; visibleDayIndex < days.value.length; visibleDayIndex += 1) {
    const date = getBaseRowScheduleDate(baseRowIndex, visibleDayIndex)
    if (date && isDateAvailableForSettingAvailability(date, visibleDayIndex)) {
      return false
    }
  }

  return true
}

const pageSlots = computed<PageSlot[]>(() => {
  const slots: PageSlot[] = []
  const slotMinutes = Math.round(timeslotDuration.value.total("minutes"))
  const firstSplitLength = splitTimes.value[0].length
  const totalBaseRows = firstSplitLength + splitTimes.value[1].length

  for (let baseRowIndex = 0; baseRowIndex < firstSplitLength; baseRowIndex += 1) {
    const time = splitTimes.value[0][baseRowIndex]
    const startMinutes = time.absoluteMinutes ?? 0
    slots.push({
      id: `time-${String(baseRowIndex)}`,
      kind: "timeslot",
      startMinutes,
      endMinutes: startMinutes + slotMinutes,
      baseRowIndex,
    })
  }

  if (splitTimes.value[1].length > 0 && firstSplitLength > 0) {
    const wrapStartMinutes =
      (splitTimes.value[0][firstSplitLength - 1].absoluteMinutes ?? 0) + slotMinutes
    const wrapEndMinutes = splitTimes.value[1][0].absoluteMinutes ?? wrapStartMinutes

    for (
      let absoluteMinutes = wrapStartMinutes;
      absoluteMinutes < wrapEndMinutes;
      absoluteMinutes += slotMinutes
    ) {
      slots.push({
        id: `filler-${String(absoluteMinutes)}`,
        kind: "filler",
        startMinutes: absoluteMinutes,
        endMinutes: absoluteMinutes + slotMinutes,
      })
    }
  }

  for (let baseRowIndex = firstSplitLength; baseRowIndex < totalBaseRows; baseRowIndex += 1) {
    const time = splitTimes.value[1][baseRowIndex - firstSplitLength]
    const startMinutes = time.absoluteMinutes ?? 0
    slots.push({
      id: `time-${String(baseRowIndex)}`,
      kind: "timeslot",
      startMinutes,
      endMinutes: startMinutes + slotMinutes,
      baseRowIndex,
    })
  }

  return slots
})

const collapsedPageSegments = computed<CollapsedPageSegment[]>(() => {
  if (!canCollapseTimes.value) {
    return []
  }

  const slotMinutes = Math.round(timeslotDuration.value.total("minutes"))
  const minimumSlotsToCollapse = Math.ceil(
    (MIN_COLLAPSIBLE_HIDDEN_SPAN_HOURS * 60) / slotMinutes
  )
  const slots = pageSlots.value
  const greyFlags = slots.map((slot) =>
    slot.kind === "filler"
      ? true
      : isBaseRowUnavailableOnEveryVisibleDay(slot.baseRowIndex ?? -1)
  )
  const segments: CollapsedPageSegment[] = []

  const buildCollapsedSegmentFromRun = (
    runStartIndex: number,
    runEndIndex: number
  ): CollapsedPageSegment | null => {
    const runStartMinutes = slots[runStartIndex]?.startMinutes
    const runEndMinutes = slots[runEndIndex - 1]?.endMinutes

    if (
      typeof runStartMinutes !== "number" ||
      typeof runEndMinutes !== "number"
    ) {
      return null
    }

    const collapsedStartMinutes = ceilToHourMinutes(runStartMinutes)
    const collapsedEndMinutes = floorToHourMinutes(runEndMinutes)
    if (collapsedEndMinutes <= collapsedStartMinutes) {
      return null
    }

    const hiddenStartIndex = slots.findIndex(
      (slot, slotIndex) =>
        slotIndex >= runStartIndex && slotIndex < runEndIndex &&
        slot.startMinutes === collapsedStartMinutes
    )
    const hiddenEndIndex = slots.findIndex(
      (slot, slotIndex) =>
        slotIndex >= runStartIndex && slotIndex < runEndIndex &&
        slot.endMinutes === collapsedEndMinutes
    )

    if (hiddenStartIndex === -1 || hiddenEndIndex === -1) {
      return null
    }

    if (hiddenEndIndex + 1 - hiddenStartIndex < minimumSlotsToCollapse) {
      return null
    }

    return {
      id: `collapsed-${String(collapsedStartMinutes)}-${String(collapsedEndMinutes)}`,
      hiddenStartIndex,
      hiddenEndIndex: hiddenEndIndex + 1,
      startMinutes: collapsedStartMinutes,
      endMinutes: collapsedEndMinutes,
    }
  }

  let runStartIndex: number | null = null

  const flushRun = (runEndIndex: number) => {
    if (runStartIndex == null) {
      return
    }

    const isInteriorRun =
      runStartIndex > 0 &&
      runEndIndex < slots.length &&
      !greyFlags[runStartIndex - 1] &&
      !greyFlags[runEndIndex]

    if (isInteriorRun) {
      const segment = buildCollapsedSegmentFromRun(runStartIndex, runEndIndex)
      if (segment) {
        segments.push(segment)
      }
    }

    runStartIndex = null
  }

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    if (greyFlags[slotIndex]) {
      runStartIndex ??= slotIndex
      continue
    }

    flushRun(slotIndex)
  }

  flushRun(slots.length)
  return segments
})

const overlaidAvailability = computed(() => {
  return buildOverlaidAvailability({
    daysLength: days.value.length,
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    timeslotDuration: timeslotDuration.value,
    getDateFromRowCol,
    dragging: dragging.value,
    inDragRange,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
  })
})

const baseTimeslotClassStyle = computed(() => {
  if (isSignUp.value) {
    return Array.from(
      { length: days.value.length * times.value.length },
      () => ({ class: "tw-bg-light-gray ", style: {} })
    )
  }

  return buildTimeGridTimeslotClassStyles({
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    getDateFromRowCol,
    state: state.value,
    overlayAvailability: overlayAvailability.value,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
    tempTimes: tempTimes.value,
    responsesFormatted: responsesFormatted.value,
    parsedResponses: parsedResponses.value,
    curRespondent: curRespondent.value,
    curRespondents: curRespondents.value,
    curRespondentsSet: curRespondentsSet.value,
    respondents: respondents.value,
    curRespondentsMax: curRespondentsMax.value,
    max: max.value,
    defaultState: defaultState.value,
    userHasResponded: userHasResponded.value,
    curGuestId: props.curGuestId,
    authUserId: mainStore.authUser?._id,
    inDragRange,
    animateTimeslotAlways: props.animateTimeslotAlways,
    availabilityAnimEnabled: availabilityAnimEnabled.value,
    timeslotHeight: timeslotHeight.value,
    timezoneOffset: timezoneOffset.value,
    curTimeslot: curTimeslot.value,
    editing: editing.value,
    isColConsecutive,
    daysLength: days.value.length,
    firstSplitLength: splitTimes.value[0].length,
    lastRow: splitTimes.value[0].length + splitTimes.value[1].length - 1,
  })
})

const dayTimeslotClassStyle = computed(() =>
  buildDayGridTimeslotClassStyles({
    monthDays: monthDays.value.map((day) => day.dateObject),
    state: state.value,
    overlayAvailability: overlayAvailability.value,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
    tempTimes: tempTimes.value,
    responsesFormatted: responsesFormatted.value,
    parsedResponses: parsedResponses.value,
    curRespondent: curRespondent.value,
    curRespondents: curRespondents.value,
    curRespondentsSet: curRespondentsSet.value,
    respondents: respondents.value,
    curRespondentsMax: curRespondentsMax.value,
    max: max.value,
    defaultState: defaultState.value,
    userHasResponded: userHasResponded.value,
    curGuestId: props.curGuestId,
    authUserId: mainStore.authUser?._id,
    inDragRange,
    monthDayIncluded: monthDayIncluded.value,
    curTimeslot: curTimeslot.value,
    lastMonthRow: Math.floor(monthDays.value.length / 7),
  })
)

const baseTimeslotVon = computed(() => {
  const vons: Record<string, () => void>[] = []
  for (let d = 0; d < days.value.length; ++d)
    for (let t = 0; t < times.value.length; ++t)
      vons.push(getTimeslotVon(t, d))
  return vons
})

const expandedCollapsedSpanIds = ref<Set<string>>(new Set())
const canCollapseTimes = computed(
  () =>
    !props.event.daysOnly &&
    state.value !== states.EDIT_AVAILABILITY &&
    state.value !== states.EDIT_SIGN_UP_BLOCKS &&
    state.value !== states.SCHEDULE_EVENT &&
    state.value !== states.SET_SPECIFIC_TIMES &&
    !showAllHours.value
)

const collapseCandidateSpanIds = computed<Set<string>>(() => {
  return new Set(collapsedPageSegments.value.map((segment) => segment.id))
})

const renderedRows = computed<RenderedTimeGridRow[]>(() => {
  const rows: RenderedTimeGridRow[] = []

  const pushTimeslotRow = (baseRowIndex: number, rowTop: number) => {
    const timeItem = getBaseRowTimeItem(baseRowIndex)
    const cells: RenderedTimeGridRowCell[] = []
    for (let dayIndex = 0; dayIndex < days.value.length; dayIndex += 1) {
      const cellIndex = dayIndex * times.value.length + baseRowIndex
      cells.push({
        class: baseTimeslotClassStyle.value[cellIndex]?.class ?? "",
        style: baseTimeslotClassStyle.value[cellIndex]?.style ?? {},
        von: baseTimeslotVon.value[cellIndex] ?? {},
      })
    }
    rows.push({
      id: `time-${String(baseRowIndex)}`,
      kind: "timeslot",
      height: timeslotHeight.value,
      rowTop,
      timeText: timeItem.text,
      baseRowIndex,
      cells,
    })
  }

  const pushFillerRow = (slot: PageSlot, rowTop: number) => {
    const cells: RenderedTimeGridRowCell[] = Array.from({ length: days.value.length }, () => ({
      class: "tw-bg-light-gray-stroke",
      style: { height: `${String(timeslotHeight.value)}px` },
      von: {},
    }))
    rows.push({
      id: slot.id,
      kind: "filler",
      height: timeslotHeight.value,
      rowTop,
      timeText: slot.startMinutes % 60 === 0 ? formatAbsoluteMinutes(slot.startMinutes) : undefined,
      cells,
    })
  }

  const appendCollapsedRow = (
    id: string,
    startMinutes: number,
    endMinutes: number,
    rowTop: number
  ): number => {
    rows.push({
      id,
      kind: "collapsed",
      height: COLLAPSED_HOURS_ROW_HEIGHT,
      rowTop,
      startLabel: formatAbsoluteMinutes(startMinutes),
      endLabel: formatAbsoluteMinutes(endMinutes),
    })
    return rowTop + COLLAPSED_HOURS_ROW_HEIGHT
  }

  const collapsedSegmentByStartIndex = new Map<number, CollapsedPageSegment>()
  for (const segment of collapsedPageSegments.value) {
    if (!expandedCollapsedSpanIds.value.has(segment.id)) {
      collapsedSegmentByStartIndex.set(segment.hiddenStartIndex, segment)
    }
  }

  let rowTop = 0

  for (let slotIndex = 0; slotIndex < pageSlots.value.length; slotIndex += 1) {
    const collapsedSegment = collapsedSegmentByStartIndex.get(slotIndex)
    if (collapsedSegment) {
      rowTop = appendCollapsedRow(
        collapsedSegment.id,
        collapsedSegment.startMinutes,
        collapsedSegment.endMinutes,
        rowTop
      )
      slotIndex = collapsedSegment.hiddenEndIndex - 1
      continue
    }

    const slot = pageSlots.value[slotIndex]
    if (slot.kind === "timeslot" && typeof slot.baseRowIndex === "number") {
      pushTimeslotRow(slot.baseRowIndex, rowTop)
    } else {
      pushFillerRow(slot, rowTop)
    }
    rowTop += timeslotHeight.value
  }

  return rows
})

const timeslotClassStyle = computed(() =>
  renderedRows.value.flatMap((row) =>
    row.cells?.map((cell) => ({ class: cell.class, style: cell.style })) ?? []
  )
)

const timeslotVon = computed(() =>
  renderedRows.value.flatMap((row) => row.cells?.map((cell) => cell.von) ?? [])
)

watch(collapseCandidateSpanIds, (validIds) => {
  const nextIds = [...expandedCollapsedSpanIds.value].filter((id) =>
    validIds.has(id)
  )
  if (
    nextIds.length === expandedCollapsedSpanIds.value.size &&
    nextIds.every((id) => expandedCollapsedSpanIds.value.has(id))
  ) {
    return
  }
  expandedCollapsedSpanIds.value = new Set(nextIds)
})

function updateShowAllHours(value: boolean) {
  showAllHours.value = value
  if (value) {
    expandedCollapsedSpanIds.value = new Set()
  }
}

function toggleCollapsedSpan(id: string) {
  const next = new Set(expandedCollapsedSpanIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedCollapsedSpanIds.value = next
}

const dayTimeslotVon = computed(() =>
  monthDays.value.map((_day, i) => getTimeslotVon(Math.floor(i / 7), i % 7))
)

function updateTimeType(value: string) {
  timeType.value = value as typeof timeType.value
}

function updateNewGuestName(value: string) {
  newGuestName.value = value
}

function updateEditGuestNameDialog(value: boolean) {
  editGuestNameDialog.value = value
}

function updateAvailabilityType(value: AvailabilityType) {
  availabilityType.value = value
}

function updateCalendarOptionsDialog(value: boolean) {
  calendarOptionsDialog.value = value
}

function updateBufferTime(value: typeof bufferTime.value) {
  bufferTime.value = value
}

function updateWorkingHours(value: typeof workingHours.value) {
  workingHours.value = value
}

function updateDeleteAvailabilityDialog(value: boolean) {
  deleteAvailabilityDialog.value = value
}

function updateShowCalendarEvents(value: boolean) {
  showCalendarEvents.value = value
}

function updateShowBestTimes(value: boolean) {
  showBestTimes.value = value
}

function updateHideIfNeeded(value: boolean) {
  hideIfNeeded.value = value
}

function emitAddAvailability() {
  emit("addAvailability")
}

function emitAddAvailabilityAsGuest() {
  emit("addAvailabilityAsGuest")
}

const toolRowActions = computed<ScheduleOverlapToolRowActions>(() => ({
  updateCurTimezone: (value) => {
    setCurTimezone(value)
  },
  resetCurTimezone,
  updateTimeType,
  updateMobileNumDays: (value) => {
    mobileNumDays.value = value
  },
  updateShowBestTimes: (value) => {
    showBestTimes.value = value
  },
  updateHideIfNeeded: (value) => {
    hideIfNeeded.value = value
  },
  updateShowAllHours,
  updateStartCalendarOnMonday: (value) => {
    startCalendarOnMonday.value = value
  },
  updateWeekOffset: emitWeekOffsetUpdate,
  scheduleEvent,
  cancelScheduleEvent,
  confirmScheduleEvent,
}))

const sharedRespondentListeners = {
  mouseOverRespondent,
  mouseLeaveRespondent,
  clickRespondent,
  editGuestAvailability,
  guestAvailabilityDeleted: handleGuestAvailabilityDeleted,
}

const sharedDisplayListeners = {
  "update:showCalendarEvents": updateShowCalendarEvents,
  "update:showBestTimes": updateShowBestTimes,
  "update:hideIfNeeded": updateHideIfNeeded,
  "update:showAllHours": updateShowAllHours,
}

const sharedParentRelayListeners = {
  addAvailability: emitAddAvailability,
  addAvailabilityAsGuest: emitAddAvailabilityAsGuest,
  refreshEvent,
}

const sidebarListeners = {
  saveTempTimes,
  openEditGuestNameDialog,
  saveGuestName,
  "update:newGuestName": updateNewGuestName,
  "update:editGuestNameDialog": updateEditGuestNameDialog,
  "update:availabilityType": updateAvailabilityType,
  toggleCalendarAccount,
  toggleSubCalendarAccount,
  updateOverlayAvailability,
  toggleShowEditOptions,
  "update:calendarOptionsDialog": updateCalendarOptionsDialog,
  "update:bufferTime": updateBufferTime,
  "update:workingHours": updateWorkingHours,
  "update:deleteAvailabilityDialog": updateDeleteAvailabilityDialog,
  deleteAvailability: handleDeleteAvailability,
  updateSignUpBlock: editSignUpBlock,
  deleteSignUpBlock: deleteSignUpBlock,
  signUpForBlock: emitSignUpForBlock,
  ...sharedDisplayListeners,
  ...sharedParentRelayListeners,
  ...sharedRespondentListeners,
}

const mobileOverlayListeners = {
  closeHint,
  "update:availabilityType": updateAvailabilityType,
  "update:weekOffset": emitWeekOffsetUpdate,
  ...sharedDisplayListeners,
  ...sharedParentRelayListeners,
  ...sharedRespondentListeners,
  saveTempTimes,
}

const daysOnlyGridActions = computed<ScheduleOverlapDaysOnlyGridActions>(() => ({
  prevPage,
  nextPage,
  startDrag,
  moveDrag,
  endDrag,
  resetCurTimeslot,
  closeHint,
}))

const timedGridActions = computed<ScheduleOverlapTimeGridActions>(() => ({
  prevPage,
  nextPage,
  calendarScroll: onCalendarScroll,
  startDrag,
  moveDrag,
  endDrag,
  resetCurTimeslot,
  closeHint,
  signUpForBlock: (block) => {
    handleSignUpBlockClick(block, emitSignUpForBlock)
  },
  toggleCollapsedSpan,
}))

const {
  sidebarViewModel,
  mobileOverlayViewModel,
  toolRowViewModel,
  daysOnlyGridViewModel,
  timedGridViewModel,
} = useScheduleOverlapViewModels({
  event: eventRef,
  state,
  states,
  isSignUp,
  isOwner,
  isGroup,
  isPhone,
  authUser,
  alreadyRespondedToSignUpForm,
  signUpBlocksByDay,
  signUpBlocksToAddByDay,
  tempTimes,
  curGuestId: computed(() => props.curGuestId),
  guestResponseLookupKey: computed(() => guestResponseLookupKey.value ?? ""),
  userHasResponded,
  addingAvailabilityAsGuest: computed(() => props.addingAvailabilityAsGuest),
  canEditGuestName,
  newGuestName,
  editGuestNameDialog,
  availabilityType,
  showOverlayAvailabilityToggle,
  overlayAvailability,
  calendarPermissionGranted: computed(() => props.calendarPermissionGranted),
  calendarEventsMap: computed(() => props.calendarEventsMap),
  sharedCalendarAccounts,
  showCalendarOptions,
  showEditOptions,
  calendarOptionsDialog,
  bufferTime,
  workingHours,
  curTimezone,
  deleteAvailabilityDialog,
  showAds,
  rightSideWidth,
  allDays,
  times,
  getDateFromRowCol,
  curTimeslot,
  curRespondent,
  curRespondents,
  curTimeslotAvailability,
  respondents,
  parsedResponses,
  attendees: formattedAttendees,
  responsesFormatted,
  showCalendarEvents,
  showBestTimes,
  hideIfNeeded,
  showAllHours,
  guestAddedAvailability,
  editing,
  isWeekly,
  weekOffset: computed(() => props.weekOffset),
  delayedShowStickyRespondents,
  toolRowActions,
  timezoneModified,
  startCalendarOnMonday,
  timezoneReferenceDate,
  mobileNumDays,
  allowScheduleEvent,
  timeType,
  daysOnlyGridActions,
  curMonthText,
  hasPrevPage,
  hasNextPage,
  daysOfWeek,
  monthDays,
  dayTimeslotClassStyle,
  dayTimeslotVon,
  calendarOnly: computed(() => props.calendarOnly),
  timedGridActions,
  splitTimes,
  timeslotHeight,
  renderedRows,
  days,
  isSpecificDates,
  sampleCalendarEventsByDay: computed(() => props.sampleCalendarEventsByDay),
  showLoader,
  loadingCalendarEvents: computed(() => props.loadingCalendarEvents),
  alwaysShowCalendarEvents: computed(() => props.alwaysShowCalendarEvents),
  calendarEventsByDay,
  page,
  maxDaysPerPage,
  dragStart,
  curScheduledEvent,
  scheduledEventStyle,
  signUpBlockBeingDraggedStyle,
  newSignUpBlockName,
  overlaidAvailability,
  timeslotClassStyle,
  timeslotVon,
  noEventNames: computed(() => props.noEventNames),
  hintTextShown,
  hintText,
  max,
  fetchedResponses,
  loadingResponsesLoading: computed(() => loadingResponses.value.loading),
  getRenderedTimeBlockStyle: getRenderedTimeBlockStyleForTemplate,
  getSignUpBlockStyle,
})

function getTimeslotVon(row: number, col: number): Record<string, () => void> {
  if (!props.interactable) return {}
  return {
    click: () => {
      showAvailability(row, col)
    },
    mousedown: () => {
      if (
        state.value === defaultState.value &&
        ((!isPhone.value &&
          !(userHasResponded.value || guestAddedAvailability.value)) ||
          respondents.value.length === 0)
      ) {
        emit("highlightAvailabilityBtn")
      }
    },
    mouseover: () => {
      if (!timeslotSelected.value) {
        showAvailability(row, col)
        if (!props.event.daysOnly) {
          const date =
            getDateFromRowCol(row, col) ?? getDisplayDateFromRowCol(row, col)
          if (date) {
            tooltipContent.value = formatTooltipContent({
              date,
              curTimezone: curTimezone.value,
              timeslotDuration: timeslotDuration.value,
              timeType: timeType.value,
              isSpecificDates: grid.isSpecificDates.value,
            })
          }
        }
      }
    },
    mouseleave: () => {
      tooltipContent.value = ""
    },
  }
}

function getRenderedTimeBlockStyleForTemplate(
  timeBlock: { hoursOffset?: Temporal.Duration; hoursLength?: Temporal.Duration }
): Record<string, string> {
  const style = getTimeBlockStyle({
    timeBlock,
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    timeslotHeight: timeslotHeight.value,
  })
  const baseRowIndex = [...splitTimes.value[0], ...splitTimes.value[1]].findIndex(
    (time) =>
      time.hoursOffset.total("minutes") ===
      (timeBlock.hoursOffset?.total("minutes") ?? 0)
  )
  if (baseRowIndex === -1) {
    return style
  }

  const renderedRow = renderedRows.value.find(
    (row) => row.kind === "timeslot" && row.baseRowIndex === baseRowIndex
  )
  if (!renderedRow) {
    return style
  }

  style.top = `${String(renderedRow.rowTop)}px`
  return style
}

function startEditing() {
  state.value = isSignUp.value ? states.EDIT_SIGN_UP_BLOCKS : states.EDIT_AVAILABILITY
  availabilityType.value = availabilityTypes.AVAILABLE
  availability.value = new ZdtSet()
  ifNeeded.value = new ZdtSet()
  if (mainStore.authUser && !props.addingAvailabilityAsGuest) {
    resetCurUserAvailability()
  }
  void nextTick(() => (unsavedChanges.value = false))
  pageHasChanged.value = false
}

function _stopEditing() {
  state.value = defaultState.value
  stopAvailabilityAnim()
  availabilityType.value = availabilityTypes.AVAILABLE
  overlayAvailability.value = false
}

function refreshEvent() {
  emit("refreshEvent")
}

function editGuestAvailability(id: string) {
  if (
    mainStore.authUser ||
    !canGuestEditResponse(avail.parsedResponses.value[id], guestResponseLookupKey.value)
  ) {
    return
  }
  startEditing()
  void nextTick(() => {
    populateUserAvailability(id)
    emit("setCurGuestId", id)
  })
}

function handleDeleteAvailability() {
  emit('deleteAvailability')
  deleteAvailabilityDialog.value = false
}

function handleGuestAvailabilityDeleted(userId: string) {
  if (userId.length === 0) return
  if (props.curGuestId === userId) {
    emit("setCurGuestId", "")
    _stopEditing()
  }
  emit("guestAvailabilityDeleted", userId)
}

function openEditGuestNameDialog() {
  newGuestName.value =
    props.event.responses?.[props.curGuestId]?.name ?? props.curGuestId
  editGuestNameDialog.value = true
}

function getRenamedGuestSelectionKey(
  renamedGuestName: string,
  currentResponse?: ScheduleOverlapResponse,
  guestCredentials?: {
    guestId: string
  }
) {
  const tokenGuestId = guestCredentials?.guestId ?? currentResponse?.guestId
  if (tokenGuestId && tokenGuestId.length > 0) {
    return tokenGuestId
  }
  return renamedGuestName
}

async function saveGuestName() {
  const name = newGuestName.value.trim()
  const currentGuestName =
    props.event.responses?.[props.curGuestId]?.name ?? props.curGuestId
  if (name.length === 0) {
    mainStore.showError("Guest name cannot be empty")
    return
  }
  if (name === currentGuestName) {
    editGuestNameDialog.value = false
    return
  }
  try {
    const currentResponse = props.event.responses?.[props.curGuestId]
    const response = await post<{
      guestCredentials?: {
        name?: string
        guestId: string
        guestEditToken: string
        guestEditPolicy: "protected" | "open"
        guestOwnershipMode: "token"
      }
    }>(
      appendGuestIdentityQuery(
        `/events/${props.event._id ?? ""}/rename-user`,
        guestOwnership.value,
        guestName.value ?? null
      ),
      {
        oldName: currentGuestName,
        newName: name,
        guestId: currentResponse?.guestId,
        guestEditToken:
          props.curGuestId === guestResponseLookupKey.value
            ? guestOwnership.value?.guestEditToken
            : undefined,
      }
    )
    if (response.guestCredentials) {
      setGuestOwnership({
        name,
        guestId: response.guestCredentials.guestId,
        guestEditToken: response.guestCredentials.guestEditToken,
        guestEditPolicy: response.guestCredentials.guestEditPolicy,
        guestOwnershipMode: response.guestCredentials.guestOwnershipMode,
      })
    }
    setGuestName(name)
    mainStore.showInfo("Guest name updated successfully")
    editGuestNameDialog.value = false
    emit(
      "setCurGuestId",
      getRenamedGuestSelectionKey(name, currentResponse, response.guestCredentials)
    )
    refreshEvent()
  } catch (err: unknown) {
    const e = err as { parsed?: { error?: string }; message?: string }
    mainStore.showError(e.parsed?.error ?? e.message ?? "Failed to update guest name")
  }
}

defineExpose({
  editing,
  scheduling: _scheduling,
  allowScheduleEvent,
  unsavedChanges,
  selectedGuestRespondent: _selectedGuestRespondent,
  pageHasChanged,
  hasPages: _hasPages,
  respondents,
  state,
  startEditing,
  stopEditing: _stopEditing,
  setAvailabilityAutomatically: _setAvailabilityAutomatically,
  populateUserAvailability,
  submitAvailability: _submitAvailability,
  submitNewSignUpBlocks: _submitNewSignUpBlocks,
  deleteAvailability: _deleteAvailability,
  resetCurUserAvailability,
  resetSignUpForm: _resetSignUpForm,
  scheduleEvent,
  cancelScheduleEvent,
  confirmScheduleEvent,
  getAllValidTimeRanges: _getAllValidTimeRanges,
})
</script>

<style scoped>
.break {
  flex-basis: 100%;
  height: 0;
}
</style>

<style>
@keyframes schedule-overlap-bg-blink {
  0% {
    opacity: 0.8;
  }

  100% {
    opacity: 1;
  }
}

.animate-bg-color {
  animation: schedule-overlap-bg-blink 0.35s ease-in-out 0s 4 alternate;
  transition: background-color 0.25s ease-in-out;
}

/* Make timezone select element the same width as content */
#timezone-select {
  width: 5px;
}
</style>
