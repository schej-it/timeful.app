import { eventTypes } from "@/constants"
import type { Event } from "@/types"
import type { components } from "@/types/api"
import type { RawCalendarEvent } from "@/types/transport"
import type { Temporal } from "temporal-polyfill"
import { getEventDateSeeds } from "../eventDateRules"
import { get } from "../fetch_utils"
import { dateToDowDate, getRenderedWeekStart } from "../scheduleDateRules"

export interface CalendarAvailabilityQueryOptions {
  weekOffset?: number
  renderedWeekStart?: Temporal.ZonedDateTime
}

export interface CalendarAvailabilityRequestOptions
  extends CalendarAvailabilityQueryOptions {
  eventId?: string
}

export type CalendarAvailabilityQueryEvent = Pick<
  Event,
  "type" | "dates" | "timeSeed" | "startOnMonday"
>

export interface CalendarAvailabilityQueryWindow {
  timeMin: Temporal.ZonedDateTime
  timeMax: Temporal.ZonedDateTime
}

export interface CalendarEventsTransportEntry
  extends Omit<
    components["schemas"]["calendar.CalendarEventsWithError"],
    "calendarEvents"
  > {
  calendarEvents?: RawCalendarEvent[]
}

export type CalendarEventsTransportMap = Record<
  string,
  CalendarEventsTransportEntry | undefined
>

export type CalendarAvailabilitiesTransportMap = Record<
  string,
  RawCalendarEvent[] | undefined
>

export const getCalendarAvailabilityQueryWindow = (
  event: CalendarAvailabilityQueryEvent,
  {
    weekOffset = 0,
    renderedWeekStart,
  }: CalendarAvailabilityQueryOptions = {}
): CalendarAvailabilityQueryWindow | null => {
  const eventDateSeeds = getEventDateSeeds(event)
  if (eventDateSeeds.length === 0) {
    return null
  }

  if (event.type === eventTypes.SPECIFIC_DATES) {
    return {
      timeMin: eventDateSeeds[0],
      timeMax: eventDateSeeds[eventDateSeeds.length - 1].add({ days: 2 }),
    }
  }

  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    const projectedWeekStart =
      renderedWeekStart ?? getRenderedWeekStart(weekOffset, event.startOnMonday)
    const firstDate = dateToDowDate(
      eventDateSeeds,
      eventDateSeeds[0],
      weekOffset,
      true,
      event.startOnMonday,
      projectedWeekStart
    )
    const lastDate = dateToDowDate(
      eventDateSeeds,
      eventDateSeeds[eventDateSeeds.length - 1],
      weekOffset,
      true,
      event.startOnMonday,
      projectedWeekStart
    )

    return {
      timeMin: firstDate.subtract({ days: 2 }),
      timeMax: lastDate.add({ days: 2 }),
    }
  }

  return null
}

const isTransportObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isRawCalendarEvent = (value: unknown): value is RawCalendarEvent =>
  isTransportObject(value)

const toRawCalendarEvents = (value: unknown): RawCalendarEvent[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is RawCalendarEvent => isRawCalendarEvent(item))
    : undefined

const toCalendarEventsTransportEntry = (
  value: unknown
): CalendarEventsTransportEntry | undefined => {
  if (!isTransportObject(value)) {
    return undefined
  }

  return {
    ...value,
    calendarEvents: toRawCalendarEvents(value.calendarEvents),
  }
}

const toCalendarEventsTransportMap = (
  value: unknown
): CalendarEventsTransportMap => {
  if (!isTransportObject(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([calendarId, entry]) => [
      calendarId,
      toCalendarEventsTransportEntry(entry),
    ])
  )
}

const toCalendarAvailabilitiesTransportMap = (
  value: unknown
): CalendarAvailabilitiesTransportMap => {
  if (!isTransportObject(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([userId, events]) => [
      userId,
      toRawCalendarEvents(events),
    ])
  )
}

export const fetchCalendarEventsTransportMap = async (
  event: CalendarAvailabilityQueryEvent,
  options: CalendarAvailabilityRequestOptions = {}
): Promise<CalendarEventsTransportMap> => {
  const queryWindow = getCalendarAvailabilityQueryWindow(event, options)
  if (!queryWindow) {
    return {}
  }

  const route = options.eventId
    ? `/events/${options.eventId}/calendar-availabilities`
    : "/user/calendars"

  const result = await get(
    `${route}?timeMin=${queryWindow.timeMin.toString()}&timeMax=${queryWindow.timeMax.toString()}`
  )

  return toCalendarEventsTransportMap(result)
}

export const fetchCalendarAvailabilitiesTransportMap = async (
  event: CalendarAvailabilityQueryEvent,
  options: CalendarAvailabilityRequestOptions = {}
): Promise<CalendarAvailabilitiesTransportMap> => {
  const queryWindow = getCalendarAvailabilityQueryWindow(event, options)
  if (!queryWindow) {
    return {}
  }

  const route = options.eventId
    ? `/events/${options.eventId}/calendar-availabilities`
    : "/user/calendars"

  const result = await get(
    `${route}?timeMin=${queryWindow.timeMin.toString()}&timeMax=${queryWindow.timeMax.toString()}`
  )

  return toCalendarAvailabilitiesTransportMap(result)
}
