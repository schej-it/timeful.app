import { eventTypes } from "@/constants"
import type { Event } from "@/types"
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

type CalendarAvailabilityQueryEvent = Pick<
  Event,
  "type" | "dates" | "timeSeed" | "startOnMonday"
>

export interface CalendarAvailabilityQueryWindow {
  timeMin: Temporal.ZonedDateTime
  timeMax: Temporal.ZonedDateTime
}

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

export const getCalendarEventsMap = async (
  event: CalendarAvailabilityQueryEvent,
  options: CalendarAvailabilityRequestOptions = {}
): Promise<unknown> => {
  const queryWindow = getCalendarAvailabilityQueryWindow(event, options)
  if (!queryWindow) {
    return Promise.resolve([])
  }

  const route = options.eventId
    ? `/events/${options.eventId}/calendar-availabilities`
    : "/user/calendars"

  return get(
    `${route}?timeMin=${queryWindow.timeMin.toString()}&timeMax=${queryWindow.timeMax.toString()}`
  )
}
