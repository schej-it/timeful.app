import { Temporal } from "temporal-polyfill"
import type {
  Attendee,
  CalendarAccount,
  CalendarEvent,
  CalendarOptions as InternalCalendarOptions,
  Event,
  Location,
  Response,
  SignUpBlockWithResponses,
  SignUpResponse,
} from "@/types"
import type { ZdtMap, ZdtSet } from "@/utils"

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
export const SPLIT_GAP_WIDTH = 1
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

export const getScheduledEventFromDragRange = (
  dragStart: RowCol,
  dragCur: RowCol
): ScheduledEvent | null => {
  const row = Math.min(dragStart.row, dragCur.row)
  const numRows = Math.abs(dragCur.row - dragStart.row) + 1

  if (numRows <= 0) {
    return null
  }

  return {
    col: dragStart.col,
    row,
    numRows,
  }
}

export interface SharedSubCalendarSelection {
  enabled: boolean
}

export interface SharedCalendarAccountSelection {
  enabled: boolean
  subCalendars: Record<string, SharedSubCalendarSelection>
}

export type SharedCalendarAccounts = Record<
  string,
  SharedCalendarAccountSelection
>

export type ScheduleOverlapResponse = Response
export type ScheduleOverlapSignUpResponse = SignUpResponse

export interface ScheduleOverlapSignUpBlock
  extends Omit<
    SignUpBlockWithResponses,
    "startDate" | "endDate" | "_id" | "capacity" | "name"
  > {
  _id: string
  capacity: number
  name: string
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  hoursOffset: Temporal.Duration
  hoursLength: Temporal.Duration
}

export interface Timezone {
  value: string
  offset: Temporal.Duration
  label: string
  gmtString: string
}

export type ScheduleOverlapEvent = Omit<
  Event,
  "responses" | "signUpBlocks" | "signUpResponses"
> & {
  responses?: Record<string, ScheduleOverlapResponse>
  signUpBlocks?: ScheduleOverlapSignUpBlock[]
  signUpResponses?: Record<string, SignUpResponse>
  attendees?: Attendee[]
  location?: Location
}

export const toScheduleOverlapEvent = (
  event: Event
): ScheduleOverlapEvent => ({
  ...event,
  responses: event.responses,
  signUpBlocks: event.signUpBlocks?.flatMap((block) => {
    if (
      !(block.startDate instanceof Temporal.ZonedDateTime) ||
      !(block.endDate instanceof Temporal.ZonedDateTime)
    ) {
      return []
    }
    return [{
      _id: block._id ?? "",
      capacity: block.capacity ?? 0,
      name: block.name ?? "",
      startDate: block.startDate,
      endDate: block.endDate,
      hoursOffset: Temporal.Duration.from({ minutes: 0 }),
      hoursLength: Temporal.Duration.from({ minutes: 0 }),
    }]
  }),
  signUpResponses: event.signUpResponses,
  attendees: event.attendees,
})

export type SignUpBlockLite = ScheduleOverlapSignUpBlock

export const toSharedCalendarAccounts = (
  calendarAccounts?: Record<string, CalendarAccount>
): SharedCalendarAccounts =>
  Object.fromEntries(
    Object.entries(calendarAccounts ?? {}).map(([accountId, account]) => [
      accountId,
      {
        enabled: false,
        subCalendars: Object.fromEntries(
          Object.keys(account.subCalendars ?? {}).map((subCalendarId) => [
            subCalendarId,
            { enabled: false },
          ])
        ),
      },
    ])
  )

export interface CalendarOptions {
  bufferTime: { enabled: boolean; time: number }
  workingHours: { enabled: boolean; startTime: number; endTime: number }
}

export const normalizeCalendarOptions = (
  calendarOptions?: InternalCalendarOptions
): CalendarOptions => ({
  bufferTime: {
    enabled: calendarOptions?.bufferTime?.enabled ?? false,
    time: calendarOptions?.bufferTime?.time ?? 15,
  },
  workingHours: {
    enabled: calendarOptions?.workingHours?.enabled ?? false,
    startTime: calendarOptions?.workingHours?.startTime ?? 9,
    endTime: calendarOptions?.workingHours?.endTime ?? 17,
  },
})

export interface NormalizedCalendarEvent
  extends Omit<CalendarEvent, "startDate" | "endDate"> {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  hoursOffset?: Temporal.Duration
  hoursLength?: Temporal.Duration
}

// Type for processed calendar events where dates are guaranteed to be ZonedDateTime objects
export interface ProcessedCalendarEvent
  extends Omit<NormalizedCalendarEvent, "startDate" | "endDate"> {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
}

export type CalendarEventsByDay = NormalizedCalendarEvent[][]

export interface CalendarEventsMapEntry {
  calendarEvents?: NormalizedCalendarEvent[]
  error?: string
}

export type CalendarEventsMap = Record<string, CalendarEventsMapEntry>

export interface ParsedResponse {
  user: { _id: string; firstName?: string; email?: string; lastName?: string }
  availability: ZdtSet
  ifNeeded?: ZdtSet
  enabledCalendars?: Record<string, string[]>
  calendarOptions?: CalendarOptions
}

export type ParsedResponses = Record<string, ParsedResponse>

/** Map of Temporal.ZonedDateTime to set of user IDs who are available at that time */
export type ResponsesFormatted = ZdtMap<Set<string>>

export type FetchedResponse = Response
