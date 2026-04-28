import { post } from "../fetch_utils"

export const archiveEvent = (eventId: string, archive: boolean) => {
  return post(`/events/${eventId}/archive`, {
    archive: archive,
  })
}
