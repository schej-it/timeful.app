import type { states } from "@/composables/schedule_overlap/types"
import type { Temporal } from "temporal-polyfill"

export interface ScheduleOverlapInstance {
  editing: boolean
  scheduling: boolean
  allowScheduleEvent: boolean
  unsavedChanges: boolean
  selectedGuestRespondent: string | undefined
  pageHasChanged: boolean
  hasPages: boolean
  respondents: { _id?: string; name?: string }[]
  state: string
  states: typeof states
  startEditing(): void
  stopEditing(): void
  setAvailabilityAutomatically(): void
  populateUserAvailability(userId: string): void
  submitAvailability(
    payload?: { name: string; email: string },
    sharedCalendarAccounts?: Record<string, unknown>
  ): Promise<void>
  submitNewSignUpBlocks(): Promise<boolean>
  deleteAvailability(name?: string): Promise<void>
  resetCurUserAvailability(): void
  resetSignUpForm(): void
  scheduleEvent(): void
  cancelScheduleEvent(): void
  confirmScheduleEvent(): void
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
  timezone?: { value?: string; [k: string]: unknown }
  specificTimesEnabled?: boolean
  startOnMonday?: boolean
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
  timezone?: { value?: string; [k: string]: unknown }
  specificTimesEnabled?: boolean
  startOnMonday?: boolean
}
