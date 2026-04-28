import type { Temporal } from "temporal-polyfill"
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

export interface RowCol {
  row: number
  col: number
}

export interface DayItem {
  dayText: string
  dateString: string
  dateObject: Temporal.ZonedDateTime
  isConsecutive?: boolean
  excludeTimes?: boolean
}

// TODO
export interface MonthDayItem {
  date: number | ""
  time: Temporal.ZonedDateTime
  dateObject: Temporal.ZonedDateTime
  included: boolean
}

export interface TimeItem {
  hoursOffset: Temporal.Duration
  text?: string
  id?: string
}

export interface ScheduledEvent {
  row: number
  col: number
  numRows: number
}

// TODO rename to SignUpBlockLike?
export interface SignUpBlockLite {
  _id: string
  capacity: number
  name: string
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  hoursOffset: Temporal.Duration
  hoursLength: Temporal.Duration
  responses?: { userId?: string; signUpBlockIds?: string[] }[]
  [key: string]: unknown
}

export interface Timezone {
  value: string
  offset: Temporal.Duration
  label: string
  gmtString: string
}

export type EventLike = Event & Record<string, unknown>

// TODO
export interface CalendarOptions {
  bufferTime: { enabled: boolean; time: number }
  workingHours: { enabled: boolean; startTime: number; endTime: number }
}

// TODO rename to CalendarEventLike

export interface CalendarEventLite {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  free?: boolean
  calendarId?: string
  hoursOffset?: Temporal.Duration
  hoursLength?: Temporal.Duration
  [k: string]: unknown
}

// Type for processed calendar events where dates are guaranteed to be ZonedDateTime objects
export interface ProcessedCalendarEvent
  extends Omit<CalendarEventLite, "startDate" | "endDate"> {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
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
  availability: Set<Temporal.ZonedDateTime>
  ifNeeded?: Set<Temporal.ZonedDateTime>
  enabledCalendars?: Record<string, string[]>
  calendarOptions?: CalendarOptions
}

export type ParsedResponses = Record<string, ParsedResponse>

/** Map of Temporal.ZonedDateTime to set of user IDs who are available at that time */
export type ResponsesFormatted = Map<Temporal.ZonedDateTime, Set<string>>
