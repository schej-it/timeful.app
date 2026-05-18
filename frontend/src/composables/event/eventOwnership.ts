import { guestUserId } from "@/constants"
import type { Event, User } from "@/types"

type EventOwnerCarrier = Pick<Event, "ownerId"> | null | undefined
type AuthUserCarrier = Pick<User, "_id"> | null | undefined

export function isAnonymousOwnerId(ownerId: string | null | undefined): boolean {
  return !ownerId || ownerId === guestUserId
}

export function isAnonymousOwnerEvent(event: EventOwnerCarrier): boolean {
  return isAnonymousOwnerId(event?.ownerId)
}

export function getRealOwnerId(event: EventOwnerCarrier): string | undefined {
  const ownerId = event?.ownerId
  return isAnonymousOwnerId(ownerId) ? undefined : ownerId
}

export function isRealOwnedEvent(event: EventOwnerCarrier): boolean {
  return Boolean(getRealOwnerId(event))
}

export function isSignedInOwner(
  event: EventOwnerCarrier,
  authUser: AuthUserCarrier
): boolean {
  const ownerId = getRealOwnerId(event)
  return Boolean(ownerId && authUser?._id === ownerId)
}

export function canEditAvailabilityAsCurrentViewer(
  event: EventOwnerCarrier,
  authUser: AuthUserCarrier
): boolean {
  return isAnonymousOwnerEvent(event) || isSignedInOwner(event, authUser)
}

export function canEditEventMetadata(
  event: EventOwnerCarrier,
  authUser: AuthUserCarrier
): boolean {
  return isRealOwnedEvent(event) && isSignedInOwner(event, authUser)
}
