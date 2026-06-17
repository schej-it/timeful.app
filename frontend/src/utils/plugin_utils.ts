/**
 * Plugin API utilities for communicating with external plugins
 */

import { Temporal } from "temporal-polyfill"
import { eventTypes } from "@/constants"
import { convertToUTC } from "./dateBoundaryAdapters"
import { resolveTimezoneValue } from "./timezone_utils"

export interface PluginSetSlotEntry {
  start: string
  end: string
  status?: string
}

export interface NormalizedPluginSetSlotEntry extends PluginSetSlotEntry {
  parsedStart: Temporal.ZonedDateTime
  parsedEnd: Temporal.ZonedDateTime
}

export const resolvePluginTimezoneValue = (
  providedTimezone?: string,
  storage: Storage | undefined =
    typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage,
  browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || Temporal.Now.timeZoneId()
): string => resolveTimezoneValue(providedTimezone, storage, browserTimezone)

export const normalizePluginSetSlots = (
  slots: PluginSetSlotEntry[],
  timezoneValue: string,
  eventType?: string
):
  | { ok: true; slots: NormalizedPluginSetSlotEntry[] }
  | { ok: false; error: string } => {
  const normalizedSlots: NormalizedPluginSetSlotEntry[] = []

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    let parsedStart: Temporal.ZonedDateTime
    let parsedEnd: Temporal.ZonedDateTime

    try {
      parsedStart = convertToUTC(slot.start, timezoneValue)
      parsedEnd = convertToUTC(slot.end, timezoneValue)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        error: `Failed to parse time at index ${String(i)}: ${msg}`,
      }
    }

    if (eventType === eventTypes.DOW) {
      parsedStart = parsedStart.add({ hours: 1 })
      parsedEnd = parsedEnd.add({ hours: 1 })
    }

    if (parsedEnd.epochMilliseconds <= parsedStart.epochMilliseconds) {
      return {
        ok: false,
        error: `End time must be after start time at index ${String(i)}`,
      }
    }

    normalizedSlots.push({
      ...slot,
      parsedStart,
      parsedEnd,
    })
  }

  return { ok: true, slots: normalizedSlots }
}

/** Sends an error response to a plugin */
export const sendPluginError = (
  requestId: string,
  command: string,
  errorMessage: string
): void => {
  window.postMessage(
    {
      type: "FILL_CALENDAR_EVENT_RESPONSE",
      command,
      requestId,
      ok: false,
      error: {
        message: errorMessage,
      },
    },
    "*"
  )
}

/** Sends a success response to a plugin */
export const sendPluginSuccess = (
  requestId: string,
  command: string,
  payload: unknown = null
): void => {
  const response: Record<string, unknown> = {
    type: "FILL_CALENDAR_EVENT_RESPONSE",
    command,
    requestId,
    ok: true,
  }

  if (payload !== null) {
    response.payload = payload
  }

  window.postMessage(response, "*")
}

/** Validates that a plugin message has the required structure */
export const isValidPluginMessage = (
  event: MessageEvent | null | undefined
): boolean => {
  const data = event?.data as { type?: unknown } | undefined
  return data?.type === "FILL_CALENDAR_EVENT"
}
