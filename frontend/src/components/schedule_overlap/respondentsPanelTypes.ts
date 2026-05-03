import type { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import type { ZdtMap } from "@/utils"
import type {
  EventLike,
  ParsedResponses,
  Timezone,
} from "@/composables/schedule_overlap/types"

export interface ScheduleOverlapRespondentsPanelViewModel {
  event: EventLike
  eventId: string
  days: unknown[]
  times: unknown[]
  curDate?: Temporal.ZonedDateTime
  curRespondent: string
  curRespondents: string[]
  curTimeslot: { dayIndex: number; timeIndex: number }
  curTimeslotAvailability: Record<string, boolean>
  respondents: User[]
  parsedResponses: ParsedResponses
  isOwner: boolean
  isGroup: boolean
  attendees?: { email: string; declined?: boolean }[]
  responsesFormatted: ZdtMap<Set<string>>
  timezone: Timezone
  showCalendarEvents: boolean
  showBestTimes: boolean
  hideIfNeeded: boolean
  showEventOptions: boolean
  guestAddedAvailability: boolean
  addingAvailabilityAsGuest: boolean
}
