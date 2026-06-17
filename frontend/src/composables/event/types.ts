import type {
  SharedCalendarAccounts,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { StoredGuestOwnership } from "@/composables/schedule_overlap/scheduleOverlapStorage"
import type { Temporal } from "temporal-polyfill"

export interface ScheduleOverlapInstance {
  editing: boolean
  scheduling: boolean
  allowScheduleEvent: boolean
  respondentSaveAllowed: boolean
  unsavedChanges: boolean
  curTimezone: Timezone
  selectedGuestRespondent: string | undefined
  ownedGuestResponses: StoredGuestOwnership[]
  pageHasChanged: boolean
  hasPages: boolean
  respondents: { _id?: string; name?: string }[]
  state: string
  showBestTimes: boolean
  hideIfNeeded: boolean
  showAllHours: boolean
  showCalendarEvents: boolean
  startCalendarOnMonday: boolean
  startEditing(): void
  stopEditing(): void
  updateShowBestTimes(value: boolean): void
  updateHideIfNeeded(value: boolean): void
  updateShowAllHours(value: boolean): void
  updateShowCalendarEvents(value: boolean): void
  updateStartCalendarOnMonday(value: boolean): void
  clearSelectedGuestOwnership(): void
  selectGuestOwnership(lookupKey?: string): void
  editOwnedGuestAvailability(lookupKey: string): void
  setAvailabilityAutomatically(): void
  populateUserAvailability(userId: string, options?: { animate?: boolean }): void
  submitAvailability(
    payload?: { name: string; email: string },
    sharedCalendarAccounts?: SharedCalendarAccounts
  ): Promise<boolean>
  submitNewSignUpBlocks(): Promise<boolean>
  deleteAvailability(name?: string): Promise<void>
  resetCurUserAvailability(): void
  resetSignUpForm(): void
  scheduleEvent(): void
  cancelScheduleEvent(): void
  confirmScheduleEvent(googleCalendar?: boolean): void
  getAllValidTimeRanges(): Map<
    number,
    {
      row: number
      col: number
      startTime: Temporal.ZonedDateTime
      endTime: Temporal.ZonedDateTime
    }
  >
}

export interface EventDraft {
  emails?: string[]
  name?: string
  startTime?: Temporal.PlainTime
  endTime?: Temporal.PlainTime
  daysOnly?: boolean
  selectedDateOption?: string
  selectedDaysOfWeek?: number[]
  selectedDays?: Temporal.PlainDate[]
  notificationsEnabled?: boolean
  timezone?: Timezone
  specificTimesEnabled?: boolean
  startOnMonday?: boolean
}

export interface SerializedTimezone {
  value?: string
  offset?: string
  label?: string
  gmtString?: string
}

export interface SerializedEventDraft {
  emails?: string[]
  name?: string
  startTime?: number
  endTime?: number
  daysOnly?: boolean
  selectedDateOption?: string
  selectedDaysOfWeek?: number[]
  selectedDays?: string[]
  notificationsEnabled?: boolean
  timezone?: SerializedTimezone
  specificTimesEnabled?: boolean
  startOnMonday?: boolean
}
