import type { RawCalendarEvent } from "@/types/transport"
import { fromRawCalendarEvent } from "@/types/transport"
import { get } from "@/utils/fetch_utils"
import {
  fetchCalendarAvailabilitiesTransportMap,
  fetchCalendarEventsTransportMap,
  type CalendarAvailabilityQueryEvent,
  type CalendarAvailabilityRequestOptions,
  type CalendarAvailabilitiesTransportMap,
  type CalendarEventsTransportEntry,
  type CalendarEventsTransportMap,
} from "@/utils/services/CalendarAvailabilityService"
import type {
  NormalizedCalendarEvent,
  CalendarEventsMap,
  CalendarEventsMapEntry,
} from "@/composables/schedule_overlap/types"
import type { Temporal } from "temporal-polyfill"

const normalizeCalendarEventError = (error: unknown): string | undefined => {
  if (typeof error === "string") return error
  if (error == null || error === false) return undefined
  if (
    typeof error === "boolean" ||
    typeof error === "number" ||
    typeof error === "bigint"
  ) {
    return String(error)
  }
  return "Unknown calendar error"
}

const toNormalizedCalendarEvent = (
  rawEvent: RawCalendarEvent
): NormalizedCalendarEvent | null => {
  const event = fromRawCalendarEvent(rawEvent)
  if (!event.startDate || !event.endDate) return null

  return {
    ...event,
    startDate: event.startDate,
    endDate: event.endDate,
  }
}

export const fromCalendarEventsTransportEntry = (
  entry?: CalendarEventsTransportEntry
): CalendarEventsMapEntry => ({
  calendarEvents: entry?.calendarEvents?.flatMap((event) => {
    const normalizedEvent = toNormalizedCalendarEvent(event)
    return normalizedEvent ? [normalizedEvent] : []
  }),
  error: normalizeCalendarEventError(entry?.error),
})

export const fromCalendarEventsTransportMap = (
  map: CalendarEventsTransportMap
): CalendarEventsMap =>
  Object.fromEntries(
    Object.entries(map).map(([calendarId, entry]) => [
      calendarId,
      fromCalendarEventsTransportEntry(entry),
    ])
  )

export const fromCalendarAvailabilitiesTransportMap = (
  map: CalendarAvailabilitiesTransportMap
): Record<string, NormalizedCalendarEvent[]> =>
  Object.fromEntries(
    Object.entries(map).map(([userId, events]) => [
      userId,
      (events ?? []).flatMap((event) => {
        const normalizedEvent = toNormalizedCalendarEvent(event)
        return normalizedEvent ? [normalizedEvent] : []
      }),
    ])
  )

export const fetchCalendarEventsMap = async (
  event: CalendarAvailabilityQueryEvent,
  options: CalendarAvailabilityRequestOptions = {}
): Promise<CalendarEventsMap> => {
  const result = await fetchCalendarEventsTransportMap(event, options)
  return fromCalendarEventsTransportMap(result)
}

export const fetchCalendarAvailabilities = async (
  event: CalendarAvailabilityQueryEvent,
  options: CalendarAvailabilityRequestOptions = {}
): Promise<Record<string, NormalizedCalendarEvent[]>> => {
  const result = await fetchCalendarAvailabilitiesTransportMap(event, options)
  return fromCalendarAvailabilitiesTransportMap(result)
}

export const fetchUserCalendarEventsMap = async ({
  timeMin,
  timeMax,
}: {
  timeMin: Temporal.Instant
  timeMax: Temporal.Instant
}): Promise<CalendarEventsMap> => {
  const result = await get<CalendarEventsTransportMap>(
    `/user/calendars?timeMin=${timeMin.toString()}&timeMax=${timeMax.toString()}`
  )

  return fromCalendarEventsTransportMap(result)
}
