import type { components } from "./api"
import { Temporal } from "temporal-polyfill"
import { fromEpochMillisecondsToZDT } from "@/utils"
import { UTC } from "@/constants"
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
import {
  buildTimedDateSeeds,
  getTimedEventTimezone,
  getTimedRecurrence,
  getTimedSlotGeneration,
  normalizeActiveSlots,
  projectSlotsToLocalDays,
  sortAndUniqueSlots,
} from "@/utils/timedEventSlots"
import { normalizeTimedResponseSlots } from "@/utils/timedResponseSlots"

type Schemas = components["schemas"]

export type RawUser = Schemas["models.User"] & {
  stripeCustomerId?: string
  isPremium?: boolean | null
}

export type RawEvent = Omit<
  Schemas["models.Event"],
  "dates" | "times" | "enabledSlots" | "activeSlots" | "timedRecurrence"
> & {
  dates?: RawInstantValue[]
  times?: RawInstantValue[]
  enabledSlots?: RawInstantValue[]
  activeSlots?: RawInstantValue[]
  timedRecurrence?: {
    kind?: "specific_dates" | "weekly"
    selectedDays?: string[]
    selectedDaysOfWeek?: number[]
    startOnMonday?: boolean
  }
}
export type RawFolder = Schemas["models.Folder"]
export type RawResponse = Schemas["models.Response"] & {
  guestId?: string
  guestEditPolicy?: "protected" | "open"
  guestOwnershipMode?: "legacy" | "token"
}
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

type RawInstantValue = number | string

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

const toEpochMilliseconds = (zonedDateTime: string): number =>
  Temporal.ZonedDateTime.from(zonedDateTime).epochMilliseconds

const fromRawInstantValue = (value: RawInstantValue): Temporal.ZonedDateTime => {
  if (typeof value === "number") {
    return fromEpochMillisecondsToZDT(value)
  }

  return Temporal.Instant.from(value).toZonedDateTimeISO("UTC")
}

const decodeRawInstantValues = (
  values: RawInstantValue[] | undefined
): Temporal.ZonedDateTime[] | undefined => {
  if (!values) {
    return undefined
  }

  return values.flatMap((value) => {
    try {
      return [fromRawInstantValue(value)]
    } catch {
      return []
    }
  })
}

const fromRawDurationHours = (
  rawDuration: number | null | undefined
): Temporal.Duration | undefined => {
  if (rawDuration == null) {
    return undefined
  }

  return Temporal.Duration.from(`PT${String(rawDuration)}H`)
}

const decodeRawSlotGeneration = (
  raw: RawEvent["slotGeneration"],
  fallbackTimeIncrementMinutes: number | null | undefined
) =>
  raw
    ? {
        startTimeLocal:
          raw.startTimeLocal != null
            ? Temporal.PlainTime.from(raw.startTimeLocal)
            : undefined,
        endTimeLocal:
          raw.endTimeLocal != null
            ? Temporal.PlainTime.from(raw.endTimeLocal)
            : undefined,
        timeIncrement:
          raw.timeIncrementMinutes != null
            ? Temporal.Duration.from({ minutes: raw.timeIncrementMinutes })
            : fallbackTimeIncrementMinutes != null
              ? Temporal.Duration.from({ minutes: fallbackTimeIncrementMinutes })
              : undefined,
      }
    : fallbackTimeIncrementMinutes != null
      ? {
          timeIncrement: Temporal.Duration.from({
            minutes: fallbackTimeIncrementMinutes,
          }),
        }
      : undefined

const decodeRawTimedRecurrence = (
  raw: RawEvent["timedRecurrence"]
) =>
  raw
    ? {
        kind: raw.kind,
        selectedDays: raw.selectedDays?.map((day) => Temporal.PlainDate.from(day)),
        selectedDaysOfWeek: raw.selectedDaysOfWeek,
        startOnMonday: raw.startOnMonday,
      }
    : undefined

const generateLegacyEnabledSlots = (
  raw: RawEvent,
  dateSeeds: Temporal.ZonedDateTime[] | undefined
): Temporal.ZonedDateTime[] => {
  if (raw.daysOnly) {
    return []
  }
  if (!dateSeeds || dateSeeds.length === 0 || raw.duration == null) {
    return []
  }

  const incrementMinutes = raw.timeIncrement ?? 15
  const increment = Temporal.Duration.from({ minutes: incrementMinutes })
  const duration = fromRawDurationHours(raw.duration)
  if (duration == null) {
    return []
  }

  const slots: Temporal.ZonedDateTime[] = []
  for (const seed of dateSeeds) {
    let current = seed.withTimeZone(UTC)
    const end = current.add(duration)
    while (Temporal.ZonedDateTime.compare(current, end) < 0) {
      slots.push(current)
      current = current.add(increment)
    }
  }

  return sortAndUniqueSlots(slots)
}

export const toTransportDateTimeStrings = (
  dateTimes: Temporal.ZonedDateTime[] | undefined
): string[] | undefined =>
  dateTimes?.map((dateTime) => dateTime.toInstant().toString())

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
  const dateSeeds = raw.dates?.map((value) => fromRawInstantValue(value))
  const decodedSlotGeneration = decodeRawSlotGeneration(
    raw.slotGeneration,
    raw.timeIncrement
  )
  const decodedEnabledSlots =
    decodeRawInstantValues(raw.enabledSlots) ??
    generateLegacyEnabledSlots(raw, dateSeeds)
  const decodedActiveSlots =
    decodeRawInstantValues(raw.activeSlots) ??
    decodeRawInstantValues(raw.times) ??
    decodedEnabledSlots
  const normalizedTimedSlots = normalizeActiveSlots({
    enabledSlots: decodedEnabledSlots,
    activeSlots: decodedActiveSlots,
  })
  const eventTimezone = raw.eventTimezone ?? getTimedEventTimezone({
    eventTimezone: raw.eventTimezone,
    timeSeed: dateSeeds?.[0],
    enabledSlots: normalizedTimedSlots.enabledSlots,
    times: normalizedTimedSlots.activeSlots,
  })
  const timedRecurrence =
    decodeRawTimedRecurrence(raw.timedRecurrence) ??
    (raw.daysOnly
      ? undefined
      : {
          kind: raw.type === "specific_dates" || !raw.type ? "specific_dates" : "weekly",
          selectedDays: projectSlotsToLocalDays(
            normalizedTimedSlots.enabledSlots,
            eventTimezone
          ),
          selectedDaysOfWeek:
            raw.type === "dow" || raw.type === "group"
              ? [...new Set((dateSeeds ?? []).map((seed) => seed.dayOfWeek))]
              : [],
          startOnMonday: raw.startOnMonday,
        })
  const compatibilityDateSeeds =
    dateSeeds && dateSeeds.length > 0
      ? dateSeeds
      : buildTimedDateSeeds({
          daysOnly: raw.daysOnly,
          enabledSlots: normalizedTimedSlots.enabledSlots,
          eventTimezone,
          slotGeneration: decodedSlotGeneration,
          dates: timedRecurrence?.selectedDays,
          timeSeed: undefined,
          timeIncrement:
            raw.timeIncrement != null
              ? Temporal.Duration.from({ minutes: raw.timeIncrement })
              : undefined,
        })

  return {
    ...raw,
    dates: compatibilityDateSeeds.map((seed) => seed.toPlainDate()),
    timeSeed: compatibilityDateSeeds[0],
    times: normalizedTimedSlots.activeSlots,
    duration: fromRawDurationHours(raw.duration),
    timeIncrement:
      decodedSlotGeneration?.timeIncrement ??
      (raw.timeIncrement != null
        ? Temporal.Duration.from({ minutes: raw.timeIncrement })
        : undefined),
    enabledSlots: normalizedTimedSlots.enabledSlots,
    activeSlots: normalizedTimedSlots.activeSlots,
    eventTimezone,
    slotGeneration: decodedSlotGeneration,
    timedRecurrence,
    scheduledEvent: raw.scheduledEvent
      ? fromRawCalendarEvent(raw.scheduledEvent)
      : undefined,
    responses: raw.responses
      ? Object.fromEntries(
          Object.entries(raw.responses).map(([id, response]) => [
            id,
            fromRawResponse(response as RawResponse),
          ])
        )
      : undefined,
    signUpBlocks: raw.signUpBlocks?.map((block) => fromRawSignUpBlock(block)),
    signUpResponses: raw.signUpResponses
      ? Object.fromEntries(
          Object.entries(raw.signUpResponses).map(([id, response]) => [
            id,
            fromRawSignUpResponse(response),
          ])
        )
      : undefined,
  }
}

export function toRawEvent(event: Event): RawEvent {
  const timedRecurrence = getTimedRecurrence(event)
  const slotGeneration = getTimedSlotGeneration(event)
  const eventTimezone = getTimedEventTimezone(event)
  const activeSlots = sortAndUniqueSlots(event.activeSlots ?? event.times)
  const enabledSlots = sortAndUniqueSlots(event.enabledSlots)

  return {
    ...event,
    dates: toEventMembershipTimeSeed(event.dates, event.timeSeed)?.map(toEpochMilliseconds),
    times: activeSlots.map((instant) => instant.epochMilliseconds),
    duration: event.duration?.total("hours"),
    timeIncrement: event.timeIncrement?.total("minutes"),
    enabledSlots: toTransportDateTimeStrings(
      enabledSlots.length > 0 ? enabledSlots : activeSlots
    ),
    activeSlots: toTransportDateTimeStrings(activeSlots),
    eventTimezone,
    slotGeneration: {
      startTimeLocal: slotGeneration.startTimeLocal.toString(),
      endTimeLocal: slotGeneration.endTimeLocal.toString(),
      timeIncrementMinutes: slotGeneration.timeIncrement.total("minutes"),
    },
    timedRecurrence: {
      kind: timedRecurrence.kind,
      selectedDays: timedRecurrence.selectedDays.map((day) => day.toString()),
      selectedDaysOfWeek: timedRecurrence.selectedDaysOfWeek,
      startOnMonday: timedRecurrence.startOnMonday,
    },
    scheduledEvent: event.scheduledEvent
      ? toRawCalendarEvent(event.scheduledEvent)
      : undefined,
    responses: event.responses
      ? Object.fromEntries(
          Object.entries(event.responses).map(([id, response]) => [
            id,
            toRawResponse(response),
          ])
        )
      : undefined,
    signUpBlocks: event.signUpBlocks?.map((block) => toRawSignUpBlock(block)),
    signUpResponses: event.signUpResponses
      ? Object.fromEntries(
          Object.entries(event.signUpResponses).map(([id, response]) => [
            id,
            toRawSignUpResponse(response),
          ])
        )
      : undefined,
  }
}

export const toEventDateStrings = (
  event: Pick<Event, "dates" | "timeSeed">
): string[] | undefined =>
  toTransportDateTimeStrings(
    toEventMembershipTimeSeed(event.dates, event.timeSeed)?.map((dateTime) =>
      Temporal.ZonedDateTime.from(dateTime)
    )
  )

export function fromRawResponse(raw: RawResponse): Response {
  const normalizedSlots = normalizeTimedResponseSlots({
    availability: decodeRawInstantValues(raw.availability),
    ifNeeded: decodeRawInstantValues(raw.ifNeeded),
  })

  return {
    ...raw,
    availability: normalizedSlots.availability,
    ifNeeded: normalizedSlots.ifNeeded,
    manualAvailability: raw.manualAvailability
      ? Object.fromEntries(
          Object.entries(raw.manualAvailability).map(([date, values]) => [
            date,
            decodeRawInstantValues(values) ?? [],
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
      raw.startDate != null ? fromRawInstantValue(raw.startDate) : undefined,
    endDate:
      raw.endDate != null ? fromRawInstantValue(raw.endDate) : undefined,
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
      raw.startDate != null ? fromRawInstantValue(raw.startDate) : undefined,
    endDate:
      raw.endDate != null ? fromRawInstantValue(raw.endDate) : undefined,
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
