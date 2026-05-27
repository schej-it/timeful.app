import { eventTypes } from "@/constants"
import type { Event, Response } from "@/types"
import {
  convertUTCSlotsToLocalISO,
  dateToDowDate,
  getEventDateSeeds,
  getRenderedWeekStart,
} from "@/utils"
import { getResponseDisplayName } from "@/utils/guestName"
import type { Temporal } from "temporal-polyfill"

type PluginEventWeekRangeInput = Pick<Event, "type" | "dates" | "startOnMonday">

export interface PluginResponseMetadata {
  name?: string
  email?: string
  user?: {
    firstName?: string
    lastName?: string
    email?: string
  }
}

export interface PluginResponseInput {
  response?: Response
  responseMetadata?: PluginResponseMetadata
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
  const eventDates = getEventDateSeeds(event)
  if (eventDates.length === 0) return null

  let timeMin = eventDates[0]
  let timeMax = eventDates[eventDates.length - 1].add({ days: 1 })

  if (event.type === eventTypes.GROUP || event.type === eventTypes.DOW) {
    const targetWeekStart =
      renderedWeekStart ?? getRenderedWeekStart(weekOffset, event.startOnMonday)
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
  responses?: Record<string, PluginResponseInput>
  timezoneValue: string
  eventType?: string
}): Record<string, PluginSlotEntry> => {
  const responses = input.responses ?? {}
  const { timezoneValue, eventType } = input
  const allSlots: Record<string, PluginSlotEntry> = {}

  for (const [userId, pluginResponse] of Object.entries(responses)) {
    const response = pluginResponse.response
    if (!response) continue

    const metadataUser = pluginResponse.responseMetadata?.user
    const displayName = getResponseDisplayName({
      name: pluginResponse.responseMetadata?.name,
      user: metadataUser,
    })
    const metadataEmail =
      metadataUser?.email ?? pluginResponse.responseMetadata?.email ?? ""
    const [name, email] =
      displayName.length > 0
        ? [displayName, metadataEmail]
        : response.name && response.name.length > 0
        ? [response.name, response.email ?? ""]
        : [userId, ""]

    let availability = convertUTCSlotsToLocalISO(
      response.availability,
      timezoneValue
    )
    let ifNeeded = convertUTCSlotsToLocalISO(response.ifNeeded, timezoneValue)

    if (eventType === eventTypes.DOW) {
      const subtractOneHour = (slot: Temporal.ZonedDateTime) =>
        slot.withTimeZone(timezoneValue).subtract({ hours: 1 })
      availability = availability.map(subtractOneHour)
      ifNeeded = ifNeeded.map(subtractOneHour)
    }

    allSlots[userId] = { name, email, availability, ifNeeded }
  }

  return allSlots
}
