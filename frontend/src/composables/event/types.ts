import type { states } from "@/composables/schedule_overlap/types"

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
  submitAvailability(payload?: { name: string; email: string }, sharedCalendarAccounts?: Record<string, unknown>): Promise<void>
  submitNewSignUpBlocks(): Promise<boolean>
  deleteAvailability(name?: string): Promise<void>
  resetCurUserAvailability(): void
  resetSignUpForm(): void
  scheduleEvent(): void
  cancelScheduleEvent(): void
  confirmScheduleEvent(): void
  getAllValidTimeRanges(): Map<number, { row: number; col: number; startTime: Date; endTime: Date }>
}
