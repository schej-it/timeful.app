import type { components } from "./api"
import { Temporal } from "temporal-polyfill"
import { fromEpochMillisecondsToZDT } from "@/utils"
import type {
  Attendee,
  BufferTimeOptions,
  CalendarAccount,
  CalendarEvent,
  CalendarOptions,
  Event,
  Folder,
  Location,
  Remindee,
  Response,
  SignUpBlock,
  SignUpResponse,
  SubCalendar,
  User,
  WorkingHoursOptions,
} from "./index"

type Schemas = components["schemas"]

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

const toEventMembershipTimeSeed = (
  dates?: Temporal.PlainDate[],
  timeSeed?: Temporal.ZonedDateTime
): string[] | undefined => {
  if (!dates || dates.length === 0) {
    return undefined
  }

  if (!timeSeed) {
    return dates.map((date) =>
      date.toZonedDateTime({ timeZone: "UTC", plainTime: "00:00:00" }).toString()
    )
  }

  const plainTime = timeSeed.toPlainTime()
  const timeZone = timeSeed.timeZoneId

  return dates.map((date) =>
    date.toZonedDateTime({ timeZone, plainTime }).toString()
  )
}

export function fromRawBufferTimeOptions(
  raw?: RawBufferTimeOptions
): BufferTimeOptions | undefined {
  return raw ? { ...raw } : undefined
}

export function toRawBufferTimeOptions(
  options?: BufferTimeOptions
): RawBufferTimeOptions | undefined {
  return options ? { ...options } : undefined
}

export function fromRawWorkingHoursOptions(
  raw?: RawWorkingHoursOptions
): WorkingHoursOptions | undefined {
  return raw ? { ...raw } : undefined
}

export function toRawWorkingHoursOptions(
  options?: WorkingHoursOptions
): RawWorkingHoursOptions | undefined {
  return options ? { ...options } : undefined
}

export function fromRawSubCalendar(raw: RawSubCalendar): SubCalendar {
  return { ...raw }
}

export function toRawSubCalendar(calendar: SubCalendar): RawSubCalendar {
  return { ...calendar }
}

export function fromRawCalendarAccount(
  raw: RawCalendarAccount
): CalendarAccount {
  return {
    ...raw,
    subCalendars: raw.subCalendars
      ? Object.fromEntries(
          Object.entries(raw.subCalendars).map(([id, calendar]) => [
            id,
            fromRawSubCalendar(calendar),
          ])
        )
      : undefined,
  }
}

export function toRawCalendarAccount(
  account: CalendarAccount
): RawCalendarAccount {
  return {
    ...account,
    subCalendars: account.subCalendars
      ? Object.fromEntries(
          Object.entries(account.subCalendars).map(([id, calendar]) => [
            id,
            toRawSubCalendar(calendar),
          ])
        )
      : undefined,
  }
}

export function fromRawCalendarOptions(
  raw: RawCalendarOptions
): CalendarOptions {
  return {
    ...raw,
    bufferTime: fromRawBufferTimeOptions(raw.bufferTime),
    workingHours: fromRawWorkingHoursOptions(raw.workingHours),
  }
}

export function toRawCalendarOptions(
  options: CalendarOptions
): RawCalendarOptions {
  return {
    ...options,
    bufferTime: toRawBufferTimeOptions(options.bufferTime),
    workingHours: toRawWorkingHoursOptions(options.workingHours),
  }
}

export function fromRawUser(raw: RawUser): User {
  return {
    ...raw,
    calendarAccounts: raw.calendarAccounts
      ? Object.fromEntries(
          Object.entries(raw.calendarAccounts).map(([id, account]) => [
            id,
            fromRawCalendarAccount(account),
          ])
        )
      : undefined,
    calendarOptions: raw.calendarOptions
      ? fromRawCalendarOptions(raw.calendarOptions)
      : undefined,
  }
}

export function toRawUser(user: User): RawUser {
  return {
    ...user,
    calendarAccounts: user.calendarAccounts
      ? Object.fromEntries(
          Object.entries(user.calendarAccounts).map(([id, account]) => [
            id,
            toRawCalendarAccount(account),
          ])
        )
      : undefined,
    calendarOptions: user.calendarOptions
      ? toRawCalendarOptions(user.calendarOptions)
      : undefined,
  }
}

export function fromRawFolder(raw: RawFolder): Folder {
  return { ...raw }
}

export function toRawFolder(folder: Folder): RawFolder {
  return { ...folder }
}

export function fromRawEvent(raw: RawEvent): Event {
  const dateSeeds = raw.dates?.map((ms) => fromEpochMillisecondsToZDT(ms))

  return {
    ...raw,
    dates: dateSeeds?.map((seed) => seed.toPlainDate()),
    timeSeed: dateSeeds?.[0],
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

export function toRawEvent(event: Event): RawEvent {
  return {
    ...event,
    dates: toEventMembershipTimeSeed(event.dates, event.timeSeed)?.map((date) =>
      Date.parse(date)
    ),
    times: event.times?.map((instant) => instant.epochMilliseconds),
    duration: event.duration?.total("hours"),
    scheduledEvent: event.scheduledEvent
      ? toRawCalendarEvent(event.scheduledEvent)
      : undefined,
    signUpBlocks: event.signUpBlocks?.map((block) => toRawSignUpBlock(block)),
  }
}

export const toEventDateStrings = (event: Pick<Event, "dates" | "timeSeed">): string[] | undefined =>
  toEventMembershipTimeSeed(event.dates, event.timeSeed)

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
    calendarOptions: raw.calendarOptions
      ? fromRawCalendarOptions(raw.calendarOptions)
      : undefined,
    user: raw.user ? fromRawUser(raw.user) : undefined,
  }
}

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
    calendarOptions: response.calendarOptions
      ? toRawCalendarOptions(response.calendarOptions)
      : undefined,
    user: response.user ? toRawUser(response.user) : undefined,
  }
}

export function fromRawSignUpBlock(raw: RawSignUpBlock): SignUpBlock {
  return {
    ...raw,
    startDate:
      raw.startDate != null ? fromEpochMillisecondsToZDT(raw.startDate) : undefined,
    endDate:
      raw.endDate != null ? fromEpochMillisecondsToZDT(raw.endDate) : undefined,
  }
}

export function toRawSignUpBlock(block: SignUpBlock): RawSignUpBlock {
  return {
    ...block,
    startDate: block.startDate?.epochMilliseconds,
    endDate: block.endDate?.epochMilliseconds,
  }
}

export function fromRawSignUpResponse(raw: RawSignUpResponse): SignUpResponse {
  return {
    ...raw,
    user: raw.user ? fromRawUser(raw.user) : undefined,
  }
}

export function toRawSignUpResponse(
  response: SignUpResponse
): RawSignUpResponse {
  return {
    ...response,
    user: response.user ? toRawUser(response.user) : undefined,
  }
}

export function fromRawCalendarEvent(raw: RawCalendarEvent): CalendarEvent {
  return {
    ...raw,
    startDate:
      raw.startDate != null ? fromEpochMillisecondsToZDT(raw.startDate) : undefined,
    endDate:
      raw.endDate != null ? fromEpochMillisecondsToZDT(raw.endDate) : undefined,
  }
}

export function toRawCalendarEvent(event: CalendarEvent): RawCalendarEvent {
  return {
    ...event,
    startDate: event.startDate?.epochMilliseconds,
    endDate: event.endDate?.epochMilliseconds,
  }
}

export function fromRawLocation(raw: RawLocation): Location {
  return { ...raw }
}

export function toRawLocation(location: Location): RawLocation {
  return { ...location }
}

export function fromRawRemindee(raw: RawRemindee): Remindee {
  return { ...raw }
}

export function toRawRemindee(remindee: Remindee): RawRemindee {
  return { ...remindee }
}

export function fromRawAttendee(raw: RawAttendee): Attendee {
  return { ...raw }
}

export function toRawAttendee(attendee: Attendee): RawAttendee {
  return { ...attendee }
}

export type { components, paths, operations } from "./api"
