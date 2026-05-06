import type { Event } from "@/types"
import type { RawEvent } from "@/types/transport"
import { fromRawEvent } from "@/types/transport"
import { get, post } from "../fetch_utils"

export const archiveEvent = (eventId: string, archive: boolean) => {
  return post(`/events/${eventId}/archive`, {
    archive: archive,
  })
}

export const fetchUserEvents = async (): Promise<Event[]> =>
  (await get<RawEvent[]>("/user/events")).map(fromRawEvent)
