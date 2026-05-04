import type { AvailabilityType } from "@/constants"
import type {
  CalendarEventsMap,
  EventLike,
  ParsedResponses,
  ScheduleOverlapState,
  SignUpBlockLite,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { CalendarAccountEntry } from "@/components/settings/CalendarAccounts.vue"
import type { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import type { ZdtMap } from "@/utils"

export interface ScheduleOverlapRespondentsPanelViewModel {
  event: EventLike
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
  event: EventLike
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
  event: EventLike
  showStickyRespondents: boolean
  respondentsPanel: ScheduleOverlapRespondentsPanelViewModel
  state: ScheduleOverlapState
  numTempTimes: number
}

export interface ScheduleOverlapToolRowViewModel {
  event: EventLike
  state: ScheduleOverlapState
  states: Record<string, ScheduleOverlapState>
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
