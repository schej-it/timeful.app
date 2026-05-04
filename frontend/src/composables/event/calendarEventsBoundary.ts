import type {
  components,
} from "@/types"
import type { RawCalendarEvent } from "@/types/transport"
import { fromRawCalendarEvent } from "@/types/transport"
import type {
  CalendarEventLite,
  CalendarEventsMap,
  CalendarEventsMapEntry,
} from "@/composables/schedule_overlap/types"

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

const toCalendarEventLite = (
  rawEvent: RawCalendarEvent
): CalendarEventLite | null => {
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
    const normalizedEvent = toCalendarEventLite(event)
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
): Record<string, CalendarEventLite[]> =>
  Object.fromEntries(
    Object.entries(map).map(([userId, events]) => [
      userId,
      (events ?? []).flatMap((event) => {
        const normalizedEvent = toCalendarEventLite(event)
        return normalizedEvent ? [normalizedEvent] : []
      }),
    ])
  )
