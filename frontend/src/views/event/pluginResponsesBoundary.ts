import { eventTypes } from "@/constants"
import type { Event } from "@/types"
import type { RawResponse } from "@/types/transport"
import { fromRawResponse } from "@/types/transport"
import {
  convertUTCSlotsToLocalISO,
  dateToDowDate,
  getRenderedWeekStart,
  timezoneObservesDST,
} from "@/utils"
import type { Temporal } from "temporal-polyfill"

type PluginEventWeekRangeInput = Pick<Event, "type" | "dates" | "startOnMonday">

interface EventResponseMetadata {
  name?: string
  email?: string
  user?: {
    firstName?: string
    lastName?: string
    email?: string
  }
}

export interface PluginEvent extends Event {
  responses?: Record<string, EventResponseMetadata>
  hasResponded?: boolean
}

export interface PluginEventTimeRange {
  timeMin: Temporal.ZonedDateTime
  timeMax: Temporal.ZonedDateTime
}

export interface PluginSlotEntry {
  name: string
  email: string
  availability: Temporal.ZonedDateTime[]
  ifNeeded: Temporal.ZonedDateTime[]
}

export const getPluginEventTimeRange = (
  event: PluginEventWeekRangeInput,
  weekOffset: number,
  renderedWeekStart?: Temporal.ZonedDateTime
): PluginEventTimeRange | null => {
  const eventDates = event.dates ?? []
  if (eventDates.length === 0) return null

  let timeMin = eventDates[0]
  let timeMax = eventDates[eventDates.length - 1].add({ days: 1 })

  if (event.type === eventTypes.GROUP || event.type === eventTypes.DOW) {
    const targetWeekStart =
      renderedWeekStart ??
      getRenderedWeekStart(weekOffset, event.startOnMonday)
    timeMin = dateToDowDate(
      eventDates,
      timeMin,
      weekOffset,
      true,
      event.startOnMonday,
      targetWeekStart
    )
    timeMax = dateToDowDate(
      eventDates,
      timeMax,
      weekOffset,
      true,
      event.startOnMonday,
      targetWeekStart
    )
  }

  return { timeMin, timeMax }
}

export const normalizePluginResponses = (input: {
  rawResponses: Record<string, RawResponse>
  eventResponses?: Record<string, EventResponseMetadata>
  timezoneValue: string
  eventType?: string
}): Record<string, PluginSlotEntry> => {
  const { rawResponses, eventResponses, timezoneValue, eventType } = input
  const allSlots: Record<string, PluginSlotEntry> = {}

  for (const userId of Object.keys(rawResponses)) {
    const response = fromRawResponse(rawResponses[userId])
    const [name, email] =
      response.name && response.name.length > 0
        ? [response.name, response.email ?? ""]
        : (() => {
            const eventResponse = eventResponses?.[userId]
            if (eventResponse?.user) {
              const user = eventResponse.user
              return [
                `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                user.email ?? "",
              ]
            }
            return [userId, ""]
          })()

    let availability = convertUTCSlotsToLocalISO(
      response.availability,
      timezoneValue
    )
    let ifNeeded = convertUTCSlotsToLocalISO(response.ifNeeded, timezoneValue)

    if (eventType === eventTypes.DOW && timezoneObservesDST(timezoneValue)) {
      const subtractOneHour = (slot: Temporal.ZonedDateTime) =>
        slot.withTimeZone(timezoneValue).subtract({ hours: 1 })
      availability = availability.map(subtractOneHour)
      ifNeeded = ifNeeded.map(subtractOneHour)
    }

    allSlots[userId] = { name, email, availability, ifNeeded }
  }

  return allSlots
}
