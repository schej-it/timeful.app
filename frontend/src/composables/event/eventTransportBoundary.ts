import { get } from "@/utils"
import type { Event, Response } from "@/types"
import type { RawEvent, RawResponse } from "@/types/transport"
import { fromRawEvent, fromRawResponse } from "@/types/transport"

export async function fetchEventById(eventId: string): Promise<Event> {
  const rawEvent = await get<RawEvent>(`/events/${eventId}`)
  return fromRawEvent(rawEvent)
}

export async function fetchEventFromPath(path: string): Promise<Event> {
  const rawEvent = await get<RawEvent>(path)
  return fromRawEvent(rawEvent)
}

export async function fetchEventResponses(
  url: string
): Promise<Record<string, Response>> {
  const rawResponses = await get<Record<string, RawResponse>>(url)

  return Object.fromEntries(
    Object.entries(rawResponses).map(([userId, rawResponse]) => [
      userId,
      fromRawResponse(rawResponse),
    ])
  )
}
