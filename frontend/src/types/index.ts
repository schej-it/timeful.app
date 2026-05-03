import type { components } from "./api"
import { Temporal } from "temporal-polyfill"
import type { SerializedEventDraft } from "@/composables/event/types"
import { fromEpochMillisecondsToZDT } from "@/utils"

type Schemas = components["schemas"]

// ============================================================================
// Raw API Types (from backend - numbers for epoch milliseconds)
// These match what the server actually sends/receives
// ============================================================================

export type RawUser = Schemas["models.User"] & {
  stripeCustomerId?: string
  isPremium?: boolean | null
}

export type RawEvent = Schemas["models.Event"]
export type RawFolder = Schemas["models.Folder"]
export type RawResponse = Schemas["models.Response"]
export type RawSignUpBlock = Schemas["models.SignUpBlock"]
export type RawSignUpResponse = Schemas["models.SignUpResponse"]
export type RawCalendarAccount = Schemas["models.CalendarAccount"]
export type RawCalendarEvent = Schemas["models.CalendarEvent"]
export type RawCalendarOptions = Schemas["models.CalendarOptions"]
export type RawSubCalendar = Schemas["models.SubCalendar"]
export type RawLocation = Schemas["models.Location"]
export type RawRemindee = Schemas["models.Remindee"]
export type RawAttendee = Schemas["models.Attendee"]
export type RawBufferTimeOptions = Schemas["models.BufferTimeOptions"]
export type RawWorkingHoursOptions = Schemas["models.WorkingHoursOptions"]

// ============================================================================
// Application Types (using Temporal for type safety)
// These are used throughout the frontend codebase
// ============================================================================

export type User = RawUser

// Event with Temporal date fields
export type Event = Omit<
  RawEvent,
  "dates" | "times" | "duration" | "scheduledEvent" | "signUpBlocks"
> & {
  // TODO PlainDate?
  dates?: Temporal.ZonedDateTime[]
  times?: Temporal.ZonedDateTime[]
  startTime?: Temporal.PlainTime
  endTime?: Temporal.PlainTime
  duration?: Temporal.Duration
  scheduledEvent?: CalendarEvent
  signUpBlocks?: SignUpBlock[]
}

export type Folder = RawFolder

// Response with Temporal date fields
export type Response = Omit<
  RawResponse,
  "availability" | "ifNeeded" | "manualAvailability"
> & {
  availability?: Temporal.ZonedDateTime[]
  ifNeeded?: Temporal.ZonedDateTime[]
  manualAvailability?: Record<string, Temporal.ZonedDateTime[]>
}

// SignUpBlock with Temporal date fields
export type SignUpBlock = Omit<RawSignUpBlock, "startDate" | "endDate"> & {
  startDate?: Temporal.ZonedDateTime
  endDate?: Temporal.ZonedDateTime
}

export type SignUpResponse = RawSignUpResponse
export type CalendarAccount = RawCalendarAccount

// CalendarEvent with Temporal date fields
export type CalendarEvent = Omit<RawCalendarEvent, "startDate" | "endDate"> & {
  startDate?: Temporal.ZonedDateTime
  endDate?: Temporal.ZonedDateTime
}

export type CalendarOptions = RawCalendarOptions
export type SubCalendar = RawSubCalendar
export type Location = RawLocation
export type Remindee = RawRemindee
export type Attendee = RawAttendee
export type BufferTimeOptions = RawBufferTimeOptions
export type WorkingHoursOptions = RawWorkingHoursOptions

// ============================================================================
// Adapter Functions: Convert between Raw API types and Application types
// ============================================================================

/** Convert RawEvent to Event */
export function fromRawEvent(raw: RawEvent): Event {
  return {
    ...raw,
    dates: raw.dates?.map((ms) => fromEpochMillisecondsToZDT(ms)),
    times: raw.times?.map((ms) => fromEpochMillisecondsToZDT(ms)),
    duration:
      raw.duration != null
        ? Temporal.Duration.from({ hours: raw.duration })
        : undefined,
    scheduledEvent: raw.scheduledEvent
      ? fromRawCalendarEvent(raw.scheduledEvent)
      : undefined,
    signUpBlocks: raw.signUpBlocks?.map((block) => fromRawSignUpBlock(block)),
  }
}

/** Convert Event back to RawEvent */
export function toRawEvent(event: Event): RawEvent {
  return {
    ...event,
    dates: event.dates?.map((instant) => instant.epochMilliseconds),
    times: event.times?.map((instant) => instant.epochMilliseconds),
    duration: event.duration?.total("hours"),
    scheduledEvent: event.scheduledEvent
      ? toRawCalendarEvent(event.scheduledEvent)
      : undefined,
    signUpBlocks: event.signUpBlocks?.map((block) => toRawSignUpBlock(block)),
  }
}

/** Convert RawResponse to Response with Temporal arrays */
export function fromRawResponse(raw: RawResponse): Response {
  return {
    ...raw,
    availability: raw.availability?.map((ms) => fromEpochMillisecondsToZDT(ms)),
    ifNeeded: raw.ifNeeded?.map((ms) => fromEpochMillisecondsToZDT(ms)),
    manualAvailability: raw.manualAvailability
      ? Object.fromEntries(
          Object.entries(raw.manualAvailability).map(([date, msArray]) => [
            date,
            msArray.map((ms) => fromEpochMillisecondsToZDT(ms)),
          ])
        )
      : undefined,
  }
}

/** Convert Response back to RawResponse */
export function toRawResponse(response: Response): RawResponse {
  return {
    ...response,
    availability: response.availability?.map(
      (instant) => instant.epochMilliseconds
    ),
    ifNeeded: response.ifNeeded?.map((instant) => instant.epochMilliseconds),
    manualAvailability: response.manualAvailability
      ? Object.fromEntries(
          Object.entries(response.manualAvailability).map(
            ([date, instantArray]) => [
              date,
              instantArray.map((instant) => instant.epochMilliseconds),
            ]
          )
        )
      : undefined,
  }
}

/** Convert RawSignUpBlock to SignUpBlock with Temporal dates */
export function fromRawSignUpBlock(raw: RawSignUpBlock): SignUpBlock {
  return {
    ...raw,
    startDate: raw.startDate != null ? fromEpochMillisecondsToZDT(raw.startDate) : undefined,
    endDate: raw.endDate != null ? fromEpochMillisecondsToZDT(raw.endDate) : undefined,
  }
}

/** Convert SignUpBlock back to RawSignUpBlock */
export function toRawSignUpBlock(block: SignUpBlock): RawSignUpBlock {
  return {
    ...block,
    startDate: block.startDate?.epochMilliseconds,
    endDate: block.endDate?.epochMilliseconds,
  }
}

/** Convert RawCalendarEvent to CalendarEvent with Temporal dates */
export function fromRawCalendarEvent(raw: RawCalendarEvent): CalendarEvent {
  return {
    ...raw,
    startDate: raw.startDate != null ? fromEpochMillisecondsToZDT(raw.startDate) : undefined,
    endDate: raw.endDate != null ? fromEpochMillisecondsToZDT(raw.endDate) : undefined,
  }
}

/** Convert CalendarEvent back to RawCalendarEvent */
export function toRawCalendarEvent(event: CalendarEvent): RawCalendarEvent {
  return {
    ...event,
    startDate: event.startDate?.epochMilliseconds,
    endDate: event.endDate?.epochMilliseconds,
  }
}

// App-local types
export interface NewDialogOptions {
  show: boolean
  contactsPayload: SerializedEventDraft
  openNewGroup: boolean
  eventOnly: boolean
  folderId: string | null
}

export type { components, paths, operations } from "./api"
