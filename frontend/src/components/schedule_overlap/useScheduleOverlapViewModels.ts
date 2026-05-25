import { computed, type ComputedRef, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import type { AvailabilityType } from "@/constants"
import type {
  CalendarEventsByDay,
  CalendarEventsMap,
  DayItem,
  FetchedResponse,
  MonthDayItem,
  ParsedResponses,
  RenderedTimeGridRow,
  RowCol,
  ScheduleOverlapEvent,
  ScheduleOverlapState,
  ScheduledEvent,
  SignUpBlockLite,
  TimeItem,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { CalendarAccountEntry } from "@/components/settings/CalendarAccounts.vue"
import type {
  ScheduleOverlapDaysOnlyGridActions,
  ScheduleOverlapDaysOnlyGridViewModel,
  ScheduleOverlapMobileOverlayViewModel,
  ScheduleOverlapRespondentsPanelViewModel,
  ScheduleOverlapSidebarViewModel,
  ScheduleOverlapTimeGridActions,
  ScheduleOverlapTimeGridViewModel,
  ScheduleOverlapToolRowActions,
  ScheduleOverlapToolRowViewModel,
} from "./scheduleOverlapViewModels"
import type {
  ClassStyle,
  OverlaidAvailabilityBlock,
} from "./scheduleOverlapRendering"
import type { User } from "@/types"
import type { ZdtMap } from "@/utils"

interface UseScheduleOverlapViewModelsOptions {
  event: ComputedRef<ScheduleOverlapEvent>
  state: Ref<ScheduleOverlapState>
  states: Record<string, ScheduleOverlapState>
  isSignUp: ComputedRef<boolean>
  isOwner: ComputedRef<boolean>
  isGroup: ComputedRef<boolean>
  isPhone: ComputedRef<boolean>
  authUser: ComputedRef<{
    firstName?: string
    lastName?: string
    calendarAccounts?: Record<string, CalendarAccountEntry>
  } | null>
  alreadyRespondedToSignUpForm: Ref<boolean>
  signUpBlocksByDay: Ref<SignUpBlockLite[][]>
  signUpBlocksToAddByDay: Ref<SignUpBlockLite[][]>
  tempTimes: Ref<{ size: number }>
  curGuestId: ComputedRef<string>
  guestResponseLookupKey: ComputedRef<string>
  userHasResponded: Ref<boolean>
  addingAvailabilityAsGuest: ComputedRef<boolean>
  canEditGuestName: ComputedRef<boolean>
  newGuestName: Ref<string>
  editGuestNameDialog: Ref<boolean>
  availabilityType: Ref<AvailabilityType>
  showOverlayAvailabilityToggle: ComputedRef<boolean>
  overlayAvailability: Ref<boolean>
  calendarPermissionGranted: ComputedRef<boolean>
  calendarEventsMap: ComputedRef<CalendarEventsMap>
  sharedCalendarAccounts: Ref<Record<string, CalendarAccountEntry>>
  showCalendarOptions: ComputedRef<boolean>
  showEditOptions: Ref<boolean>
  calendarOptionsDialog: Ref<boolean>
  bufferTime: Ref<{ enabled: boolean; time: number }>
  workingHours: Ref<{ enabled: boolean; startTime: number; endTime: number }>
  curTimezone: Ref<Timezone>
  deleteAvailabilityDialog: Ref<boolean>
  showAds: ComputedRef<boolean>
  rightSideWidth: ComputedRef<string>
  allDays: Ref<unknown[]>
  times: Ref<TimeItem[]>
  getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | Temporal.PlainDate | null
  curTimeslot: Ref<RowCol>
  curRespondent: Ref<string>
  curRespondents: Ref<string[]>
  curTimeslotAvailability: Ref<Record<string, boolean>>
  respondents: ComputedRef<User[]>
  parsedResponses: ComputedRef<ParsedResponses>
  attendees: ComputedRef<{ email: string; declined?: boolean }[] | undefined>
  responsesFormatted: Ref<ZdtMap<Set<string>>>
  showCalendarEvents: Ref<boolean>
  showBestTimes: Ref<boolean>
  hideIfNeeded: Ref<boolean>
  showAllHours: Ref<boolean>
  showEventOptions: Ref<boolean>
  guestAddedAvailability: ComputedRef<boolean>
  editing: ComputedRef<boolean>
  isWeekly: Ref<boolean>
  weekOffset: ComputedRef<number>
  delayedShowStickyRespondents: Ref<boolean>
  toolRowActions: ComputedRef<ScheduleOverlapToolRowActions>
  timezoneModified: Ref<boolean>
  startCalendarOnMonday: Ref<boolean>
  timezoneReferenceDate: Ref<Temporal.ZonedDateTime>
  mobileNumDays: Ref<number>
  allowScheduleEvent: Ref<boolean>
  timeType: Ref<string>
  daysOnlyGridActions: ComputedRef<ScheduleOverlapDaysOnlyGridActions>
  curMonthText: Ref<string>
  hasPrevPage: Ref<boolean>
  hasNextPage: Ref<boolean>
  daysOfWeek: Ref<string[]>
  monthDays: Ref<MonthDayItem[]>
  dayTimeslotClassStyle: ComputedRef<ClassStyle[]>
  dayTimeslotVon: ComputedRef<Record<string, () => void>[]>
  calendarOnly: ComputedRef<boolean>
  timedGridActions: ComputedRef<ScheduleOverlapTimeGridActions>
  splitTimes: Ref<TimeItem[][]>
  timeslotHeight: Ref<number>
  renderedRows: ComputedRef<RenderedTimeGridRow[]>
  days: Ref<DayItem[]>
  isSpecificDates: Ref<boolean>
  sampleCalendarEventsByDay: ComputedRef<CalendarEventsByDay>
  showLoader: ComputedRef<boolean>
  loadingCalendarEvents: ComputedRef<boolean>
  alwaysShowCalendarEvents: ComputedRef<boolean>
  calendarEventsByDay: Ref<CalendarEventsByDay>
  page: Ref<number>
  maxDaysPerPage: Ref<number>
  dragStart: Ref<RowCol | null>
  curScheduledEvent: Ref<ScheduledEvent | null>
  scheduledEventStyle: Ref<Record<string, string>>
  signUpBlockBeingDraggedStyle: Ref<Record<string, string>>
  newSignUpBlockName: Ref<string>
  overlaidAvailability: ComputedRef<OverlaidAvailabilityBlock[][]>
  timeslotClassStyle: ComputedRef<ClassStyle[]>
  timeslotVon: ComputedRef<Record<string, () => void>[]>
  noEventNames: ComputedRef<boolean>
  hintTextShown: ComputedRef<boolean>
  hintText: ComputedRef<string>
  max: Ref<number>
  fetchedResponses: Ref<Record<string, FetchedResponse | undefined>>
  loadingResponsesLoading: ComputedRef<boolean>
  getRenderedTimeBlockStyle: (
    block: { hoursOffset?: Temporal.Duration; hoursLength?: Temporal.Duration }
  ) => Record<string, string>
  getSignUpBlockStyle: (block: SignUpBlockLite) => Record<string, string>
}

export function useScheduleOverlapViewModels(
  opts: UseScheduleOverlapViewModelsOptions
) {
  const respondentsPanel = computed<ScheduleOverlapRespondentsPanelViewModel>(
    () => ({
      event: opts.event.value,
      eventId: opts.event.value._id ?? "",
      curGuestId: opts.curGuestId.value,
      guestResponseLookupKey: opts.guestResponseLookupKey.value,
      days: opts.allDays.value,
      times: opts.times.value,
      curDate: (() => {
        const curDate = opts.getDateFromRowCol(
          opts.curTimeslot.value.row,
          opts.curTimeslot.value.col
        )
        return curDate instanceof Temporal.ZonedDateTime ? curDate : undefined
      })(),
      curRespondent: opts.curRespondent.value,
      curRespondents: opts.curRespondents.value,
      curTimeslot: {
        dayIndex: opts.curTimeslot.value.col,
        timeIndex: opts.curTimeslot.value.row,
      },
      curTimeslotAvailability: opts.curTimeslotAvailability.value,
      respondents: opts.respondents.value,
      parsedResponses: opts.parsedResponses.value,
      isOwner: opts.isOwner.value,
      isGroup: opts.isGroup.value,
      attendees: opts.attendees.value,
      responsesFormatted: opts.responsesFormatted.value,
      timezone: opts.curTimezone.value,
      showCalendarEvents: opts.showCalendarEvents.value,
      showBestTimes: opts.showBestTimes.value,
      hideIfNeeded: opts.hideIfNeeded.value,
      showAllHours: opts.showAllHours.value,
      showEventOptions: opts.showEventOptions.value,
      guestAddedAvailability: opts.guestAddedAvailability.value,
      addingAvailabilityAsGuest: opts.addingAvailabilityAsGuest.value,
    })
  )

  const sidebarViewModel = computed<ScheduleOverlapSidebarViewModel>(() => ({
    event: opts.event.value,
    state: opts.state.value,
    isSignUp: opts.isSignUp.value,
    isOwner: opts.isOwner.value,
    isGroup: opts.isGroup.value,
    isPhone: opts.isPhone.value,
    authUser: opts.authUser.value,
    alreadyRespondedToSignUpForm: opts.alreadyRespondedToSignUpForm.value,
    signUpBlocks: opts.signUpBlocksByDay.value.flat(),
    signUpBlocksToAdd: opts.signUpBlocksToAddByDay.value.flat(),
    numTempTimes: opts.tempTimes.value.size,
    curGuestId: opts.curGuestId.value,
    userHasResponded: opts.userHasResponded.value,
    addingAvailabilityAsGuest: opts.addingAvailabilityAsGuest.value,
    canEditGuestName: opts.canEditGuestName.value,
    newGuestName: opts.newGuestName.value,
    editGuestNameDialog: opts.editGuestNameDialog.value,
    availabilityType: opts.availabilityType.value,
    showOverlayAvailabilityToggle: opts.showOverlayAvailabilityToggle.value,
    overlayAvailability: opts.overlayAvailability.value,
    calendarPermissionGranted: opts.calendarPermissionGranted.value,
    calendarEventsMap: opts.calendarEventsMap.value,
    sharedCalendarAccounts: opts.sharedCalendarAccounts.value,
    showCalendarOptions: opts.showCalendarOptions.value,
    showEditOptions: opts.showEditOptions.value,
    calendarOptionsDialog: opts.calendarOptionsDialog.value,
    bufferTime: opts.bufferTime.value,
    workingHours: opts.workingHours.value,
    curTimezone: opts.curTimezone.value,
    deleteAvailabilityDialog: opts.deleteAvailabilityDialog.value,
    showAds: opts.showAds.value,
    rightSideWidth: opts.rightSideWidth.value,
    respondentsPanel: respondentsPanel.value,
  }))

  const mobileOverlayViewModel = computed<ScheduleOverlapMobileOverlayViewModel>(
    () => ({
      bottomOffset: opts.showAds.value ? "calc(4rem + 115px)" : "4rem",
      hintTextShown: opts.hintTextShown.value,
      hintText: opts.hintText.value,
      isGroup: opts.isGroup.value,
      editing: opts.editing.value,
      isSignUp: opts.isSignUp.value,
      availabilityType: opts.availabilityType.value,
      isWeekly: opts.isWeekly.value,
      calendarPermissionGranted: opts.calendarPermissionGranted.value,
      weekOffset: opts.weekOffset.value,
      event: opts.event.value,
      showStickyRespondents: opts.delayedShowStickyRespondents.value,
      respondentsPanel: respondentsPanel.value,
      state: opts.state.value,
      numTempTimes: opts.tempTimes.value.size,
    })
  )

  const toolRowViewModel = computed<ScheduleOverlapToolRowViewModel>(() => ({
    event: opts.event.value,
    state: opts.state.value,
    states: opts.states,
    actions: opts.toolRowActions.value,
    curTimezone: opts.curTimezone.value,
    timezoneModified: opts.timezoneModified.value,
    startCalendarOnMonday: opts.startCalendarOnMonday.value,
    showBestTimes: opts.showBestTimes.value,
    hideIfNeeded: opts.hideIfNeeded.value,
    showAllHours: opts.showAllHours.value,
    isWeekly: opts.isWeekly.value,
    calendarPermissionGranted: opts.calendarPermissionGranted.value,
    weekOffset: opts.weekOffset.value,
    timezoneReferenceDate: opts.timezoneReferenceDate.value,
    numResponses: opts.respondents.value.length,
    mobileNumDays: opts.mobileNumDays.value,
    allowScheduleEvent: opts.allowScheduleEvent.value,
    showEventOptions: opts.showEventOptions.value,
    timeType: opts.timeType.value,
  }))

  const daysOnlyGridViewModel =
    computed<ScheduleOverlapDaysOnlyGridViewModel>(() => ({
      event: opts.event.value,
      actions: opts.daysOnlyGridActions.value,
      curMonthText: opts.curMonthText.value,
      hasPrevPage: opts.hasPrevPage.value,
      hasNextPage: opts.hasNextPage.value,
      daysOfWeek: opts.daysOfWeek.value,
      monthDays: opts.monthDays.value,
      dayTimeslotClassStyle: opts.dayTimeslotClassStyle.value,
      dayTimeslotVon: opts.dayTimeslotVon.value,
      isPhone: opts.isPhone.value,
      hintTextShown: opts.hintTextShown.value,
      hintText: opts.hintText.value,
      calendarOnly: opts.calendarOnly.value,
      toolRow: toolRowViewModel.value,
    }))

  const timedGridViewModel = computed<ScheduleOverlapTimeGridViewModel>(() => ({
    event: opts.event.value,
    actions: opts.timedGridActions.value,
    calendarOnly: opts.calendarOnly.value,
    hasPrevPage: opts.hasPrevPage.value,
    hasNextPage: opts.hasNextPage.value,
    splitTimes: opts.splitTimes.value,
    times: opts.times.value,
    renderedRows: opts.renderedRows.value,
    timeslotHeight: opts.timeslotHeight.value,
    days: opts.days.value,
    isSpecificDates: opts.isSpecificDates.value,
    isGroup: opts.isGroup.value,
    sampleCalendarEventsByDay: opts.sampleCalendarEventsByDay.value,
    showLoader: opts.showLoader.value,
    loadingCalendarEvents: opts.loadingCalendarEvents.value,
    editing: opts.editing.value,
    alwaysShowCalendarEvents: opts.alwaysShowCalendarEvents.value,
    showCalendarEvents: opts.showCalendarEvents.value,
    calendarEventsByDay: opts.calendarEventsByDay.value,
    state: opts.state.value,
    states: opts.states,
    page: opts.page.value,
    maxDaysPerPage: opts.maxDaysPerPage.value,
    dragStart: opts.dragStart.value,
    curScheduledEvent: opts.curScheduledEvent.value,
    scheduledEventStyle: opts.scheduledEventStyle.value,
    signUpBlockBeingDraggedStyle: opts.signUpBlockBeingDraggedStyle.value,
    newSignUpBlockName: opts.newSignUpBlockName.value,
    isSignUp: opts.isSignUp.value,
    signUpBlocksByDay: opts.signUpBlocksByDay.value,
    signUpBlocksToAddByDay: opts.signUpBlocksToAddByDay.value,
    overlayAvailability: opts.overlayAvailability.value,
    overlaidAvailability: opts.overlaidAvailability.value,
    timeslotClassStyle: opts.timeslotClassStyle.value,
    timeslotVon: opts.timeslotVon.value,
    noEventNames: opts.noEventNames.value,
    hintTextShown: opts.hintTextShown.value,
    hintText: opts.hintText.value,
    isPhone: opts.isPhone.value,
    max: opts.max.value,
    respondentsLength: opts.respondents.value.length,
    fetchedResponses: opts.fetchedResponses.value,
    loadingResponsesLoading: opts.loadingResponsesLoading.value,
    toolRow: toolRowViewModel.value,
    getRenderedTimeBlockStyle: opts.getRenderedTimeBlockStyle,
    getSignUpBlockStyle: opts.getSignUpBlockStyle,
  }))

  return {
    respondentsPanel,
    sidebarViewModel,
    mobileOverlayViewModel,
    toolRowViewModel,
    daysOnlyGridViewModel,
    timedGridViewModel,
  }
}
