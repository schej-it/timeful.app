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
              :event="event"
              :cur-month-text="curMonthText"
              :has-prev-page="hasPrevPage"
              :has-next-page="hasNextPage"
              :days-of-week="daysOfWeek"
              :month-days="monthDays"
              :day-timeslot-class-style="dayTimeslotClassStyle"
              :day-timeslot-von="dayTimeslotVon"
              :is-phone="isPhone"
              :hint-text-shown="hintTextShown"
              :hint-text="hintText"
              :calendar-only="calendarOnly"
              :tool-row="toolRowViewModel"
              @prev-page="prevPage"
              @next-page="nextPage"
              @reset-cur-timeslot="resetCurTimeslot"
              @close-hint="closeHint"
              @toggle-show-event-options="toggleShowEventOptions"
              @update:week-offset="(val) => $emit('update:weekOffset', val)"
              @schedule-event="scheduleEvent"
              @cancel-schedule-event="cancelScheduleEvent"
              @confirm-schedule-event="confirmScheduleEvent"
            />
            <template v-else>
              <ScheduleOverlapTimeGrid
                :event="event"
                :calendar-only="calendarOnly"
                :has-prev-page="hasPrevPage"
                :has-next-page="hasNextPage"
                :split-times="splitTimes"
                :times="times"
                :timeslot-height="timeslotHeight"
                :days="days"
                :is-specific-dates="isSpecificDates"
                :is-group="isGroup"
                :sample-calendar-events-by-day="sampleCalendarEventsByDay"
                :show-loader="showLoader"
                :loading-calendar-events="loadingCalendarEvents"
                :editing="editing"
                :always-show-calendar-events="alwaysShowCalendarEvents"
                :show-calendar-events="showCalendarEvents"
                :calendar-events-by-day="calendarEventsByDay"
                :state="state"
                :states="states"
                :page="page"
                :max-days-per-page="maxDaysPerPage"
                :drag-start="dragStart"
                :cur-scheduled-event="curScheduledEvent"
                :scheduled-event-style="scheduledEventStyle"
                :sign-up-block-being-dragged-style="signUpBlockBeingDraggedStyle"
                :new-sign-up-block-name="newSignUpBlockName"
                :is-sign-up="isSignUp"
                :sign-up-blocks-by-day="signUpBlocksByDay"
                :sign-up-blocks-to-add-by-day="signUpBlocksToAddByDay"
                :overlay-availability="overlayAvailability"
                :overlaid-availability="overlaidAvailability"
                :timeslot-class-style="timeslotClassStyle"
                :timeslot-von="timeslotVon"
                :no-event-names="noEventNames"
                :hint-text-shown="hintTextShown"
                :hint-text="hintText"
                :is-phone="isPhone"
                :max="max"
                :respondents-length="respondents.length"
                :fetched-responses="fetchedResponses"
                :loading-responses-loading="loadingResponses.loading"
                :tool-row="toolRowViewModel"
                :get-rendered-time-block-style="getRenderedTimeBlockStyleForTemplate"
                :get-sign-up-block-style="getSignUpBlockStyle"
                @prev-page="prevPage"
                @next-page="nextPage"
                @calendar-scroll="onCalendarScroll"
                @reset-cur-timeslot="resetCurTimeslot"
                @close-hint="closeHint"
                @toggle-show-event-options="toggleShowEventOptions"
                @update:week-offset="(val) => $emit('update:weekOffset', val)"
                @schedule-event="scheduleEvent"
                @cancel-schedule-event="cancelScheduleEvent"
                @confirm-schedule-event="confirmScheduleEvent"
                @sign-up-for-block="
                  (block) =>
                    handleSignUpBlockClick(block, (selectedBlock) =>
                      $emit('signUpForBlock', selectedBlock)
                    )
                "
              />
            </template>
          </div>

          <!-- Right hand side content -->

          <ScheduleOverlapSidebar
            v-if="!calendarOnly"
            ref="sidebarRef"
            :sidebar="sidebarViewModel"
            @save-temp-times="saveTempTimes"
            @open-edit-guest-name-dialog="openEditGuestNameDialog"
            @save-guest-name="saveGuestName"
            @update:new-guest-name="newGuestName = $event"
            @update:edit-guest-name-dialog="editGuestNameDialog = $event"
            @update:availability-type="availabilityType = $event"
            @toggle-calendar-account="toggleCalendarAccount"
            @toggle-sub-calendar-account="toggleSubCalendarAccount"
            @update-overlay-availability="updateOverlayAvailability"
            @toggle-show-edit-options="toggleShowEditOptions"
            @update:calendar-options-dialog="calendarOptionsDialog = $event"
            @update:buffer-time="bufferTime = $event"
            @update:working-hours="workingHours = $event"
            @update:delete-availability-dialog="deleteAvailabilityDialog = $event"
            @delete-availability="handleDeleteAvailability"
            @update-sign-up-block="editSignUpBlock"
            @delete-sign-up-block="deleteSignUpBlock"
            @sign-up-for-block="$emit('signUpForBlock', $event)"
            @update:show-calendar-events="showCalendarEvents = $event"
            @update:show-best-times="showBestTimes = $event"
            @update:hide-if-needed="hideIfNeeded = $event"
            @toggle-show-event-options="toggleShowEventOptions"
            @add-availability="$emit('addAvailability')"
            @add-availability-as-guest="$emit('addAvailabilityAsGuest')"
            @mouse-over-respondent="mouseOverRespondent"
            @mouse-leave-respondent="mouseLeaveRespondent"
            @click-respondent="clickRespondent"
            @edit-guest-availability="editGuestAvailability"
            @refresh-event="refreshEvent"
          />
        </div>

        <ToolRow
          v-if="isPhone && !calendarOnly"
          class="tw-px-4"
          :tool-row="toolRowViewModel"
          @update:cur-timezone="curTimezone = $event"
          @update:show-best-times="showBestTimes = $event"
          @update:hide-if-needed="hideIfNeeded = $event"
          @update:start-calendar-on-monday="startCalendarOnMonday = $event"
          @update:mobile-num-days="mobileNumDays = $event"
          @update:time-type="updateTimeType"
          @toggle-show-event-options="toggleShowEventOptions"
          @update:week-offset="(val) => $emit('update:weekOffset', val)"
          @schedule-event="scheduleEvent"
          @cancel-schedule-event="cancelScheduleEvent"
          @confirm-schedule-event="confirmScheduleEvent"
        />

        <ScheduleOverlapMobileOverlay
          v-if="isPhone && !calendarOnly"
          :overlay="mobileOverlayViewModel"
          @close-hint="closeHint"
          @update:availability-type="availabilityType = $event"
          @update:week-offset="(val) => $emit('update:weekOffset', val)"
          @update:show-calendar-events="showCalendarEvents = $event"
          @update:show-best-times="showBestTimes = $event"
          @update:hide-if-needed="hideIfNeeded = $event"
          @toggle-show-event-options="toggleShowEventOptions"
          @add-availability="$emit('addAvailability')"
          @add-availability-as-guest="$emit('addAvailabilityAsGuest')"
          @mouse-over-respondent="mouseOverRespondent"
          @mouse-leave-respondent="mouseLeaveRespondent"
          @click-respondent="clickRespondent"
          @edit-guest-availability="editGuestAvailability"
          @refresh-event="refreshEvent"
          @save-temp-times="saveTempTimes"
        />
      </div>
    </Tooltip>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watchEffect } from "vue"
import { useDisplay } from "vuetify"
import { Temporal } from "temporal-polyfill"
import {
  post,
  ZdtSet,
} from "@/utils"
import {
  availabilityTypes, eventTypes, guestUserId, UTC, type AvailabilityType
} from "@/constants"
import { useMainStore } from "@/stores/main"
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
import { useScheduleOverlapUI } from "@/composables/schedule_overlap/useScheduleOverlapUI"
import { useScheduleOverlapController } from "./useScheduleOverlapController"
import {
  states,
} from "@/composables/schedule_overlap/types"
import type {
  FetchedResponse, RowCol, Timezone, ScheduleOverlapState, ScheduleOverlapEvent, NormalizedCalendarEvent, CalendarEventsByDay, CalendarEventsMap,
  SignUpBlockLite,
} from "@/composables/schedule_overlap/types"
import type {
  ScheduleOverlapMobileOverlayViewModel,
  ScheduleOverlapRespondentsPanelViewModel,
  ScheduleOverlapSidebarViewModel,
  ScheduleOverlapToolRowViewModel,
} from "./scheduleOverlapViewModels"

// ── Props / Emits ──────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    event: ScheduleOverlapEvent
    ownerIsPremium?: boolean
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
    initialTimezone: () => ({} as Timezone),
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
}>()

// ── Store / Vuetify ────────────────────────────────────────────────────
const mainStore = useMainStore()
const { smAndDown } = useDisplay()
const isPhone = computed(() => smAndDown.value)
const isSignUp = computed(() => Boolean(props.event.isSignUpForm))
const isGroup = computed(() => props.event.type === eventTypes.GROUP)
const isOwner = computed(() => mainStore.authUser?._id === props.event.ownerId)
const _isGuestEvent = computed(() => props.event.ownerId === guestUserId)
const authUser = computed(() => mainStore.authUser)

const eventRef = computed(() => props.event)
const weekOffsetRef = computed(() => props.weekOffset)

const guestNameKey = computed(() => `${String(props.event._id)}.guestName`)
const guestName = computed<string | undefined>(() => (localStorage[guestNameKey.value] as string | undefined) ?? undefined)

const curTimezone = ref<Timezone>(props.initialTimezone)
const state = ref<ScheduleOverlapState>(states.BEST_TIMES)
const showBestTimes = ref<boolean>(
  localStorage.showBestTimes === undefined
    ? false
    : localStorage.showBestTimes === "true"
)
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
const sidebarRef = ref<{
  scrollToSignUpBlock?: (id: string) => void
  optionsSectionEl?: HTMLElement | null
  respondentsPanelEl?: HTMLElement | null
} | null>(null)
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
  guestName,
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
    Boolean(guestName.value?.length && guestName.value in avail.parsedResponses.value)
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
  getDateFromRowCol, setTimeslotSize, onResize, onCalendarScroll, getLocalTimezone: _getLocalTimezone,
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
  showEditOptions, showEventOptions, showCalendarEvents,
  overlayAvailability, deleteAvailabilityDialog, calendarOptionsDialog, editGuestNameDialog,
  newGuestName, tooltipContent, optionsVisible: _optionsVisible, scrolledToRespondents: _scrolledToRespondents,
  delayedShowStickyRespondents, delayedShowStickyRespondentsTimeout, hintState: _hintState, curRespondent,
  curRespondents, editing, scheduling: _scheduling, curRespondentsSet, rightSideWidth,
  showStickyRespondents: _showStickyRespondents,
  hintStateLocalStorageKey: _hintStateLocalStorageKey, hintText, hintClosed: _hintClosed, hintTextShown, showOverlayAvailabilityToggle,
  selectedGuestRespondent: _selectedGuestRespondent, canEditGuestName, mouseOverRespondent, mouseLeaveRespondent,
  clickRespondent, deselectRespondents, isGuest: _isGuest, checkElementsVisible, onScroll,
  toggleShowEditOptions, toggleShowEventOptions, onShowBestTimesChange,
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
  startDrag,
  moveDrag,
  endDrag,
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
    !props.ownerIsPremium &&
    !mainStore.isPremiumUser &&
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

const respondentsPanel = computed<ScheduleOverlapRespondentsPanelViewModel>(() => ({
  event: props.event,
  eventId: props.event._id ?? "",
  days: allDays.value,
  times: times.value,
  curDate: getDateFromRowCol(curTimeslot.value.row, curTimeslot.value.col) ?? undefined,
  curRespondent: curRespondent.value,
  curRespondents: curRespondents.value,
  curTimeslot: {
    dayIndex: curTimeslot.value.col,
    timeIndex: curTimeslot.value.row,
  },
  curTimeslotAvailability: curTimeslotAvailability.value,
  respondents: respondents.value,
  parsedResponses: parsedResponses.value,
  isOwner: isOwner.value,
  isGroup: isGroup.value,
  attendees: formattedAttendees.value,
  responsesFormatted: responsesFormatted.value,
  timezone: curTimezone.value,
  showCalendarEvents: showCalendarEvents.value,
  showBestTimes: showBestTimes.value,
  hideIfNeeded: hideIfNeeded.value,
  showEventOptions: showEventOptions.value,
  guestAddedAvailability: guestAddedAvailability.value,
  addingAvailabilityAsGuest: props.addingAvailabilityAsGuest,
}))

const sidebarViewModel = computed<ScheduleOverlapSidebarViewModel>(() => ({
  event: props.event,
  state: state.value,
  isSignUp: isSignUp.value,
  isOwner: isOwner.value,
  isGroup: isGroup.value,
  isPhone: isPhone.value,
  authUser: authUser.value,
  alreadyRespondedToSignUpForm: alreadyRespondedToSignUpForm.value,
  signUpBlocks: signUpBlocksByDay.value.flat(),
  signUpBlocksToAdd: signUpBlocksToAddByDay.value.flat(),
  numTempTimes: tempTimes.value.size,
  curGuestId: props.curGuestId,
  userHasResponded: userHasResponded.value,
  addingAvailabilityAsGuest: props.addingAvailabilityAsGuest,
  canEditGuestName: canEditGuestName.value,
  newGuestName: newGuestName.value,
  editGuestNameDialog: editGuestNameDialog.value,
  availabilityType: availabilityType.value,
  showOverlayAvailabilityToggle: showOverlayAvailabilityToggle.value,
  overlayAvailability: overlayAvailability.value,
  calendarPermissionGranted: props.calendarPermissionGranted,
  calendarEventsMap: props.calendarEventsMap,
  sharedCalendarAccounts: sharedCalendarAccounts.value,
  showCalendarOptions: showCalendarOptions.value,
  showEditOptions: showEditOptions.value,
  calendarOptionsDialog: calendarOptionsDialog.value,
  bufferTime: bufferTime.value,
  workingHours: workingHours.value,
  curTimezone: curTimezone.value,
  deleteAvailabilityDialog: deleteAvailabilityDialog.value,
  showAds: showAds.value,
  rightSideWidth: rightSideWidth.value,
  respondentsPanel: respondentsPanel.value,
}))

const mobileOverlayViewModel = computed<ScheduleOverlapMobileOverlayViewModel>(
  () => ({
    bottomOffset: showAds.value ? "calc(4rem + 115px)" : "4rem",
    hintTextShown: hintTextShown.value,
    hintText: hintText.value,
    isGroup: isGroup.value,
    editing: editing.value,
    isSignUp: isSignUp.value,
    availabilityType: availabilityType.value,
    isWeekly: isWeekly.value,
    calendarPermissionGranted: props.calendarPermissionGranted,
    weekOffset: props.weekOffset,
    event: props.event,
    showStickyRespondents: delayedShowStickyRespondents.value,
    respondentsPanel: respondentsPanel.value,
    state: state.value,
    numTempTimes: tempTimes.value.size,
  })
)

const toolRowViewModel = computed<ScheduleOverlapToolRowViewModel>(() => ({
  event: props.event,
  state: state.value,
  states,
  curTimezone: curTimezone.value,
  startCalendarOnMonday: startCalendarOnMonday.value,
  showBestTimes: showBestTimes.value,
  hideIfNeeded: hideIfNeeded.value,
  isWeekly: isWeekly.value,
  calendarPermissionGranted: props.calendarPermissionGranted,
  weekOffset: props.weekOffset,
  timezoneReferenceDate: timezoneReferenceDate.value,
  numResponses: respondents.value.length,
  mobileNumDays: mobileNumDays.value,
  allowScheduleEvent: allowScheduleEvent.value,
  showEventOptions: showEventOptions.value,
  timeType: timeType.value,
}))

const overlaidAvailability = computed(() => {
  return buildOverlaidAvailability({
    daysLength: days.value.length,
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    getDateFromRowCol,
    dragging: dragging.value,
    inDragRange,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
  })
})

const timeslotClassStyle = computed(() => {
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

const timeslotVon = computed(() => {
  const vons: Record<string, () => void>[] = []
  for (let d = 0; d < days.value.length; ++d)
    for (let t = 0; t < times.value.length; ++t)
      vons.push(getTimeslotVon(t, d))
  return vons
})

const dayTimeslotVon = computed(() =>
  monthDays.value.map((_day, i) => getTimeslotVon(Math.floor(i / 7), i % 7))
)

function updateTimeType(value: string) {
  timeType.value = value as typeof timeType.value
}

function getTimeslotVon(row: number, col: number): Record<string, () => void> {
  if (!props.interactable) return {}
  return {
    click: () => {
      if (timeslotSelected.value) {
        if (row === curTimeslot.value.row && col === curTimeslot.value.col) {
          timeslotSelected.value = false
        }
      } else if (
        state.value !== states.EDIT_AVAILABILITY &&
        (userHasResponded.value || guestAddedAvailability.value)
      ) {
        timeslotSelected.value = true
      }
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
          const date = getDateFromRowCol(row, col)
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
  return getTimeBlockStyle({
    timeBlock,
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    timeslotHeight: timeslotHeight.value,
  })
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
  if (mainStore.authUser) {
    emit("addAvailabilityAsGuest")
  } else {
    startEditing()
  }
  void nextTick(() => {
    populateUserAvailability(id)
    emit("setCurGuestId", id)
  })
}

function handleDeleteAvailability() {
  emit('deleteAvailability')
  deleteAvailabilityDialog.value = false
}

function openEditGuestNameDialog() {
  newGuestName.value = props.curGuestId
  editGuestNameDialog.value = true
}

async function saveGuestName() {
  const name = newGuestName.value.trim()
  if (name.length === 0) {
    mainStore.showError("Guest name cannot be empty")
    return
  }
  if (name === props.curGuestId) {
    editGuestNameDialog.value = false
    return
  }
  try {
    await post(`/events/${props.event._id ?? ""}/rename-user`, {
      oldName: props.curGuestId,
      newName: name,
    })
    localStorage[guestNameKey.value] = name
    mainStore.showInfo("Guest name updated successfully")
    editGuestNameDialog.value = false
    emit("setCurGuestId", name)
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
  states,
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
.animate-bg-color {
  transition: background-color 0.25s ease-in-out;
}

.break {
  flex-basis: 100%;
  height: 0;
}
</style>

<style>
/* Make timezone select element the same width as content */
#timezone-select {
  width: 5px;
}
</style>
