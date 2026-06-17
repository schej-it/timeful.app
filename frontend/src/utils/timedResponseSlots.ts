import type { Temporal } from "temporal-polyfill"
import { sortAndUniqueSlots } from "./timedEventSlots"

export const normalizeTimedResponseSlots = ({
  availability,
  ifNeeded,
}: {
  availability?: Temporal.ZonedDateTime[]
  ifNeeded?: Temporal.ZonedDateTime[]
}): {
  availability: Temporal.ZonedDateTime[]
  ifNeeded: Temporal.ZonedDateTime[]
} => {
  const normalizedAvailability = sortAndUniqueSlots(availability)
  const availabilityInstants = new Set(
    normalizedAvailability.map((slot) => slot.toInstant().toString())
  )
  const normalizedIfNeeded = sortAndUniqueSlots(ifNeeded).filter(
    (slot) => !availabilityInstants.has(slot.toInstant().toString())
  )

  return {
    availability: normalizedAvailability,
    ifNeeded: normalizedIfNeeded,
  }
}
