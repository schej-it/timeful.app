import type { Temporal } from "temporal-polyfill"
import type { CalendarOptions } from "@/composables/schedule_overlap/types"
import type { ZdtMap, ZdtSet } from "@/utils"
import type { SharedCalendarAccounts } from "@/composables/schedule_overlap/types"
import { generateEnabledCalendarsPayload } from "@/utils"
import type { RawCalendarOptions } from "@/types/transport"
import {
  toRawCalendarOptions,
  toTransportDateTimeStrings,
} from "@/types/transport"
import { validateGuestName } from "@/utils/guestName"

interface GuestPayload {
  name: string
  email?: string
  guestId?: string
  guestEditToken?: string
  guestEditPolicy?: "protected" | "open"
}

export interface EventResponseSubmissionPayload {
  availability: Temporal.ZonedDateTime[]
  ifNeeded: Temporal.ZonedDateTime[]
  guest: boolean
  name?: string
  email?: string
  guestId?: string
  guestEditToken?: string
  guestEditPolicy?: "protected" | "open"
}

export interface EncodedEventResponseSubmissionPayload {
  availability: string[]
  ifNeeded: string[]
  guest: boolean
  name?: string
  email?: string
  guestId?: string
  guestEditToken?: string
  guestEditPolicy?: "protected" | "open"
}

export interface GuestResponseCredentials {
  name?: string
  guestId: string
  guestEditToken: string
  guestEditPolicy: "protected" | "open"
  guestOwnershipMode: "token"
}

export interface GuestResponseMutationResult {
  guestCredentials?: GuestResponseCredentials
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

  const guestName = validateGuestName(input.guestPayload.name).normalizedName

  return {
    availability: input.availability,
    ifNeeded: input.ifNeeded,
    guest: true,
    name: guestName,
    email: input.guestPayload.email,
    guestId: input.guestPayload.guestId,
    guestEditToken: input.guestPayload.guestEditToken,
    guestEditPolicy: input.guestPayload.guestEditPolicy,
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
  const guestName = validateGuestName(payload.name).normalizedName

  return {
    availability: toTransportDateTimeStrings(payload.availability) ?? [],
    ifNeeded: toTransportDateTimeStrings(payload.ifNeeded) ?? [],
    guest: payload.guest,
    name: guestName,
    email: payload.email,
    guestId: payload.guestId,
    guestEditToken: payload.guestEditToken,
    guestEditPolicy: payload.guestEditPolicy,
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

  const guestName = validateGuestName(input.guestPayload.name).normalizedName

  return {
    guest: true,
    signUpBlockIds: [input.signUpBlockId],
    name: guestName,
    email: input.guestPayload.email,
  }
}
