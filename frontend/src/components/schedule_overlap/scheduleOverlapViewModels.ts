import type { AvailabilityType } from "@/constants"
import type {
  CalendarEventsMap,
  CalendarEventsByDay,
  DayItem,
  FetchedResponse,
  MonthDayItem,
  NormalizedCalendarEvent,
  ParsedResponses,
  RowCol,
  ScheduleOverlapEvent,
  ScheduleOverlapState,
  ScheduledEvent,
  SignUpBlockLite,
  TimeItem,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { CalendarAccountEntry } from "@/components/settings/CalendarAccounts.vue"
import type { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import type { ZdtMap } from "@/utils"
import type {
  ClassStyle,
  OverlaidAvailabilityBlock,
} from "./scheduleOverlapRendering"

export interface ScheduleOverlapToolRowActions {
  updateCurTimezone: (value: Timezone) => void
  updateTimeType: (value: string) => void
  updateMobileNumDays: (value: number) => void
  updateShowBestTimes: (value: boolean) => void
  updateHideIfNeeded: (value: boolean) => void
  updateStartCalendarOnMonday: (value: boolean) => void
  updateWeekOffset: (value: number) => void
  toggleShowEventOptions: () => void
  scheduleEvent: (e?: MouseEvent) => void
  cancelScheduleEvent: (e?: MouseEvent) => void
  confirmScheduleEvent: (useGcal: boolean) => void
}

export interface ScheduleOverlapDaysOnlyGridActions {
  prevPage: (e?: Event) => void
  nextPage: (e?: Event) => void
  resetCurTimeslot: () => void
  closeHint: () => void
}

export interface ScheduleOverlapTimeGridActions {
  prevPage: (e?: Event) => void
  nextPage: (e?: Event) => void
  calendarScroll: (event: Event) => void
  resetCurTimeslot: () => void
  closeHint: () => void
  signUpForBlock: (block: SignUpBlockLite) => void
}

export interface ScheduleOverlapRespondentsPanelViewModel {
  event: ScheduleOverlapEvent
  eventId: string
  days: unknown[]
  times: unknown[]
  curDate?: Temporal.ZonedDateTime
  curRespondent: string
  curRespondents: string[]
  curTimeslot: { dayIndex: number; timeIndex: number }
  curTimeslotAvailability: Record<string, boolean>
  respondents: User[]
  parsedResponses: ParsedResponses
  isOwner: boolean
  isGroup: boolean
  attendees?: { email: string; declined?: boolean }[]
  responsesFormatted: ZdtMap<Set<string>>
  timezone: Timezone
  showCalendarEvents: boolean
  showBestTimes: boolean
  hideIfNeeded: boolean
  showEventOptions: boolean
  guestAddedAvailability: boolean
  addingAvailabilityAsGuest: boolean
}

export interface ScheduleOverlapSidebarViewModel {
  event: ScheduleOverlapEvent
  state: ScheduleOverlapState
  isSignUp: boolean
  isOwner: boolean
  isGroup: boolean
  isPhone: boolean
  authUser: {
    firstName?: string
    lastName?: string
    calendarAccounts?: Record<string, CalendarAccountEntry>
  } | null
  alreadyRespondedToSignUpForm: boolean
  signUpBlocks: SignUpBlockLite[]
  signUpBlocksToAdd: SignUpBlockLite[]
  numTempTimes: number
  curGuestId?: string
  userHasResponded: boolean
  addingAvailabilityAsGuest: boolean
  canEditGuestName: boolean
  newGuestName: string
  editGuestNameDialog: boolean
  availabilityType: AvailabilityType
  showOverlayAvailabilityToggle: boolean
  overlayAvailability: boolean
  calendarPermissionGranted: boolean
  calendarEventsMap: CalendarEventsMap
  sharedCalendarAccounts: Record<string, CalendarAccountEntry>
  showCalendarOptions: boolean
  showEditOptions: boolean
  calendarOptionsDialog: boolean
  bufferTime: { enabled: boolean; time: number }
  workingHours: { enabled: boolean; startTime: number; endTime: number }
  curTimezone: Timezone
  deleteAvailabilityDialog: boolean
  showAds: boolean
  rightSideWidth: string
  respondentsPanel: ScheduleOverlapRespondentsPanelViewModel
}

export interface ScheduleOverlapMobileOverlayViewModel {
  bottomOffset: string
  hintTextShown: boolean
  hintText: string
  isGroup: boolean
  editing: boolean
  isSignUp: boolean
  availabilityType: AvailabilityType
  isWeekly: boolean
  calendarPermissionGranted: boolean
  weekOffset: number
  event: ScheduleOverlapEvent
  showStickyRespondents: boolean
  respondentsPanel: ScheduleOverlapRespondentsPanelViewModel
  state: ScheduleOverlapState
  numTempTimes: number
}

export interface ScheduleOverlapToolRowViewModel {
  event: ScheduleOverlapEvent
  state: ScheduleOverlapState
  states: Record<string, ScheduleOverlapState>
  actions: ScheduleOverlapToolRowActions
  curTimezone: Timezone
  startCalendarOnMonday: boolean
  showBestTimes: boolean
  hideIfNeeded: boolean
  isWeekly: boolean
  calendarPermissionGranted: boolean
  weekOffset: number
  timezoneReferenceDate: Temporal.ZonedDateTime
  numResponses: number
  mobileNumDays: number
  allowScheduleEvent: boolean
  showEventOptions: boolean
  timeType: string
}

export interface ScheduleOverlapDaysOnlyGridViewModel {
  event: ScheduleOverlapEvent
  actions: ScheduleOverlapDaysOnlyGridActions
  curMonthText: string
  hasPrevPage: boolean
  hasNextPage: boolean
  daysOfWeek: string[]
  monthDays: MonthDayItem[]
  dayTimeslotClassStyle: ClassStyle[]
  dayTimeslotVon: Record<string, () => void>[]
  isPhone: boolean
  hintTextShown: boolean
  hintText: string
  calendarOnly: boolean
  toolRow: ScheduleOverlapToolRowViewModel
}

export interface ScheduleOverlapTimeGridViewModel {
  event: ScheduleOverlapEvent
  actions: ScheduleOverlapTimeGridActions
  calendarOnly: boolean
  hasPrevPage: boolean
  hasNextPage: boolean
  splitTimes: TimeItem[][]
  times: TimeItem[]
  timeslotHeight: number
  days: DayItem[]
  isSpecificDates: boolean
  isGroup: boolean
  sampleCalendarEventsByDay: unknown
  showLoader: boolean
  loadingCalendarEvents: boolean
  editing: boolean
  alwaysShowCalendarEvents: boolean
  showCalendarEvents: boolean
  calendarEventsByDay: CalendarEventsByDay
  state: ScheduleOverlapState
  states: Record<string, ScheduleOverlapState>
  page: number
  maxDaysPerPage: number
  dragStart: RowCol | null
  curScheduledEvent: ScheduledEvent | null
  scheduledEventStyle: Record<string, string>
  signUpBlockBeingDraggedStyle: Record<string, string>
  newSignUpBlockName: string
  isSignUp: boolean
  signUpBlocksByDay: SignUpBlockLite[][]
  signUpBlocksToAddByDay: SignUpBlockLite[][]
  overlayAvailability: boolean
  overlaidAvailability: OverlaidAvailabilityBlock[][]
  timeslotClassStyle: ClassStyle[]
  timeslotVon: Record<string, () => void>[]
  noEventNames: boolean
  hintTextShown: boolean
  hintText: string
  isPhone: boolean
  max: number
  respondentsLength: number
  fetchedResponses: Record<string, FetchedResponse | undefined>
  loadingResponsesLoading: boolean
  toolRow: ScheduleOverlapToolRowViewModel
  getRenderedTimeBlockStyle: (
    block: NormalizedCalendarEvent | OverlaidAvailabilityBlock
  ) => Record<string, string>
  getSignUpBlockStyle: (block: SignUpBlockLite) => Record<string, string>
}
