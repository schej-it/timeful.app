import { Temporal } from "temporal-polyfill"
import type {
  Attendee,
  CalendarEvent,
  Event,
  Response,
  RawEvent,
  RawSignUpBlock,
  SignUpBlock,
} from "@/types"
import { fromRawSignUpBlock } from "@/types"
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
type RawEventResponses = NonNullable<RawEvent["responses"]>
type RawSignUpResponses = NonNullable<RawEvent["signUpResponses"]>

export type ScheduleOverlapResponse = RawEventResponses[string]
export type ScheduleOverlapSignUpResponse = RawSignUpResponses[string]

export interface ScheduleOverlapSignUpBlock
  extends Omit<SignUpBlock, "startDate" | "endDate" | "_id" | "capacity" | "name"> {
  _id: string
  capacity: number
  name: string
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  hoursOffset: Temporal.Duration
  hoursLength: Temporal.Duration
  responses?: ScheduleOverlapSignUpResponse[]
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
  responses?: RawEventResponses
  signUpBlocks?: ScheduleOverlapSignUpBlock[]
  signUpResponses?: RawSignUpResponses
  attendees?: Attendee[]
  location?: string
  shortId?: string
}

export const toScheduleOverlapEvent = (
  event: Event
): ScheduleOverlapEvent => ({
  ...event,
  signUpBlocks: event.signUpBlocks?.flatMap((block) => {
    const normalizedBlock: SignUpBlock =
      typeof block.startDate === "number" || typeof block.endDate === "number"
        ? fromRawSignUpBlock(block as RawSignUpBlock)
        : block
    if (
      !(normalizedBlock.startDate instanceof Temporal.ZonedDateTime) ||
      !(normalizedBlock.endDate instanceof Temporal.ZonedDateTime)
    ) {
      return []
    }
    return [{
      _id: normalizedBlock._id ?? "",
      capacity: normalizedBlock.capacity ?? 0,
      name: normalizedBlock.name ?? "",
      startDate: normalizedBlock.startDate,
      endDate: normalizedBlock.endDate,
      hoursOffset: Temporal.Duration.from({ minutes: 0 }),
      hoursLength: Temporal.Duration.from({ minutes: 0 }),
    }]
  }),
})

export type EventLike = ScheduleOverlapEvent
export type SignUpBlockLite = ScheduleOverlapSignUpBlock

export interface CalendarOptions {
  bufferTime: { enabled: boolean; time: number }
  workingHours: { enabled: boolean; startTime: number; endTime: number }
}

export const normalizeCalendarOptions = (
  calendarOptions?: RawEventResponses[string]["calendarOptions"]
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

// TODO rename to CalendarEventLike

export interface CalendarEventLite
  extends Omit<CalendarEvent, "startDate" | "endDate"> {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  hoursOffset?: Temporal.Duration
  hoursLength?: Temporal.Duration
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
