import type { Temporal } from "temporal-polyfill"
import type { CalendarOptions } from "@/composables/schedule_overlap/types"
import type { ZdtMap, ZdtSet } from "@/utils"
import type { SharedCalendarAccounts } from "@/composables/schedule_overlap/types"
import { generateEnabledCalendarsPayload } from "@/utils"
import type { RawCalendarOptions } from "@/types/transport"
import { toRawCalendarOptions } from "@/types/transport"

interface GuestPayload {
  name: string
  email?: string
}

export interface EventResponseSubmissionPayload {
  availability: Temporal.ZonedDateTime[]
  ifNeeded: Temporal.ZonedDateTime[]
  guest: boolean
  name?: string
  email?: string
}

export interface EncodedEventResponseSubmissionPayload {
  availability: number[]
  ifNeeded: number[]
  guest: boolean
  name?: string
  email?: string
}

export interface GroupResponseSubmissionPayload {
  guest?: false
  manualAvailability: Record<string, number[]>
  calendarOptions: RawCalendarOptions
  [key: string]: unknown
}

export interface SignUpBlockResponseSubmissionPayload {
  guest: boolean
  signUpBlockIds: string[]
  name?: string
  email?: string
}

export interface GroupAvailabilityPayloadBase {
  guest: boolean
  useCalendarAvailability: boolean
  enabledCalendars: Record<string, string[]>
}

export function toEventResponseSubmissionPayload(input: {
  availability: Temporal.ZonedDateTime[]
  ifNeeded: Temporal.ZonedDateTime[]
  authUserId?: string
  addingAvailabilityAsGuest: boolean
  guestPayload: GuestPayload
}): EventResponseSubmissionPayload {
  if (input.authUserId && !input.addingAvailabilityAsGuest) {
    return {
      availability: input.availability,
      ifNeeded: input.ifNeeded,
      guest: false,
    }
  }

  return {
    availability: input.availability,
    ifNeeded: input.ifNeeded,
    guest: true,
    name: input.guestPayload.name,
    email: input.guestPayload.email,
  }
}

export function toGroupResponseSubmissionPayload(input: {
  sharedCalendarAccounts: SharedCalendarAccounts
  manualAvailability: ZdtMap<ZdtSet>
  calendarOptions: CalendarOptions
}): GroupResponseSubmissionPayload {
  const payload = {
    ...generateEnabledCalendarsPayload(input.sharedCalendarAccounts),
  } as GroupAvailabilityPayloadBase & GroupResponseSubmissionPayload
  const encodedManualAvailability: Record<string, number[]> = {}

  for (const [day, instants] of input.manualAvailability.entries()) {
    encodedManualAvailability[day.toString()] = [...instants].map(
      (instant) => instant.epochMilliseconds
    )
  }

  payload.manualAvailability = encodedManualAvailability
  payload.calendarOptions = toRawCalendarOptions(input.calendarOptions)

  return payload
}

export function encodeEventResponseSubmissionPayload(
  payload: EventResponseSubmissionPayload
): EncodedEventResponseSubmissionPayload {
  return {
    availability: payload.availability.map((slot) => slot.epochMilliseconds),
    ifNeeded: payload.ifNeeded.map((slot) => slot.epochMilliseconds),
    guest: payload.guest,
    name: payload.name,
    email: payload.email,
  }
}

export function toSignUpBlockResponseSubmissionPayload(input: {
  signUpBlockId: string
  authUserId?: string
  guestPayload: GuestPayload
}): SignUpBlockResponseSubmissionPayload {
  if (input.authUserId) {
    return {
      guest: false,
      signUpBlockIds: [input.signUpBlockId],
    }
  }

  return {
    guest: true,
    signUpBlockIds: [input.signUpBlockId],
    name: input.guestPayload.name,
    email: input.guestPayload.email,
  }
}
