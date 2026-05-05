import type { SerializedEventDraft } from "@/composables/event/types"
import type { Temporal } from "temporal-polyfill"
import type {
  RawAttendee,
  RawBufferTimeOptions,
  RawCalendarAccount,
  RawCalendarEvent,
  RawCalendarOptions,
  RawEvent,
  RawFolder,
  RawLocation,
  RawRemindee,
  RawResponse,
  RawSignUpBlock,
  RawSignUpResponse,
  RawSubCalendar,
  RawUser,
  RawWorkingHoursOptions,
} from "./transport"

export type User = Omit<RawUser, "calendarAccounts" | "calendarOptions"> & {
  calendarAccounts?: Record<string, CalendarAccount>
  calendarOptions?: CalendarOptions
}

export type Event = Omit<
  RawEvent,
  "dates" | "times" | "duration" | "scheduledEvent" | "signUpBlocks" | "signUpResponses"
> & {
  dates?: Temporal.PlainDate[]
  timeSeed?: Temporal.ZonedDateTime
  times?: Temporal.ZonedDateTime[]
  startTime?: Temporal.PlainTime
  endTime?: Temporal.PlainTime
  duration?: Temporal.Duration
  scheduledEvent?: CalendarEvent
  signUpBlocks?: SignUpBlock[]
  signUpResponses?: Record<string, SignUpResponse>
}

export type Folder = RawFolder

export type Response = Omit<
  RawResponse,
  "availability" | "ifNeeded" | "manualAvailability" | "calendarOptions" | "user"
> & {
  availability?: Temporal.ZonedDateTime[]
  ifNeeded?: Temporal.ZonedDateTime[]
  manualAvailability?: Record<string, Temporal.ZonedDateTime[]>
  calendarOptions?: CalendarOptions
  user?: User
}

export type SignUpBlock = Omit<RawSignUpBlock, "startDate" | "endDate"> & {
  startDate?: Temporal.ZonedDateTime
  endDate?: Temporal.ZonedDateTime
}

export type SignUpResponse = Omit<RawSignUpResponse, "user"> & {
  user?: User
}

export type CalendarAccount = Omit<RawCalendarAccount, "subCalendars"> & {
  subCalendars?: Record<string, SubCalendar>
}

export type CalendarEvent = Omit<RawCalendarEvent, "startDate" | "endDate"> & {
  startDate?: Temporal.ZonedDateTime
  endDate?: Temporal.ZonedDateTime
}

export type CalendarOptions = Omit<
  RawCalendarOptions,
  "bufferTime" | "workingHours"
> & {
  bufferTime?: BufferTimeOptions
  workingHours?: WorkingHoursOptions
}

export type SubCalendar = RawSubCalendar
export type Location = RawLocation
export type Remindee = RawRemindee
export type Attendee = RawAttendee
export type BufferTimeOptions = RawBufferTimeOptions
export type WorkingHoursOptions = RawWorkingHoursOptions

export interface NewDialogOptions {
  show: boolean
  contactsPayload: SerializedEventDraft
  openNewGroup: boolean
  eventOnly: boolean
  folderId: string | null
}

export type { components, paths, operations } from "./api"
