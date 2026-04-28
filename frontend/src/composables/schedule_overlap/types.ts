import type { Event } from "@/types"

export const states = {
  HEATMAP: "heatmap",
  SINGLE_AVAILABILITY: "single_availability",
  SUBSET_AVAILABILITY: "subset_availability",
  BEST_TIMES: "best_times",
  EDIT_AVAILABILITY: "edit_availability",
  EDIT_SIGN_UP_BLOCKS: "edit_sign_up_blocks",
  SCHEDULE_EVENT: "schedule_event",
  SET_SPECIFIC_TIMES: "set_specific_times",
} as const
export type ScheduleOverlapState = (typeof states)[keyof typeof states]

export const DRAG_TYPES = {
  ADD: "add",
  REMOVE: "remove",
} as const
export type DragType = (typeof DRAG_TYPES)[keyof typeof DRAG_TYPES]

export const SPLIT_GAP_HEIGHT = 40
export const SPLIT_GAP_WIDTH = 20
export const HOUR_HEIGHT = 60

export interface RowCol { row: number; col: number }

export interface DayItem {
  dayText: string
  dateString: string
  dateObject: Date
  isConsecutive?: boolean
  excludeTimes?: boolean
}

export interface MonthDayItem {
  date: number | ""
  time: number
  dateObject: Date
  included: boolean
}

export interface TimeItem {
  hoursOffset: number
  text?: string
  id?: string
}

export interface ScheduledEvent {
  row: number
  col: number
  numRows: number
}

export interface SignUpBlockLite {
  _id: string
  capacity: number
  name: string
  startDate: Date | string
  endDate: Date | string
  hoursOffset: number
  hoursLength: number
  responses?: { userId?: string; signUpBlockIds?: string[] }[]
  [key: string]: unknown
}

export interface Timezone { value: string; label: string; gmtString: string; offset: number }

export type EventLike = Event & Record<string, unknown>

export interface CalendarOptions {
  bufferTime: { enabled: boolean; time: number }
  workingHours: { enabled: boolean; startTime: number; endTime: number }
}

export interface CalendarEventLite {
  // Loader emits ISO strings; `processTimeBlocks` (called by `splitTimeBlocksByDay`)
  // converts to `Date` before consumers access `.getTime()`.
  // After processing, these are always Date objects at runtime.
  startDate: Date | string
  endDate: Date | string
  free?: boolean
  calendarId?: string
  hoursOffset?: number
  hoursLength?: number
  [k: string]: unknown
}

// Type for processed calendar events where dates are guaranteed to be Date objects
export interface ProcessedCalendarEvent extends Omit<CalendarEventLite, 'startDate' | 'endDate'> {
  startDate: Date
  endDate: Date
}

export type CalendarEventsByDay = CalendarEventLite[][]

// Legacy type aliases for compatibility during migration
export type CalendarEntry = CalendarEventLite
export type CalendarEventsEntry = CalendarEventsMapEntry

export interface CalendarEventsMapEntry {
  calendarEvents?: CalendarEventLite[]
  error?: string
}

export type CalendarEventsMap = Record<string, CalendarEventsMapEntry>

export interface ParsedResponse {
  user: { _id: string; firstName?: string; email?: string } & Record<
    string,
    unknown
  >
  availability: Set<number>
  ifNeeded?: Set<number>
  enabledCalendars?: Record<string, string[]>
  calendarOptions?: CalendarOptions
}

export type ParsedResponses = Record<string, ParsedResponse>

export type ResponsesFormatted = Map<number, Set<string>>
