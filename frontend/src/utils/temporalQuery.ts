import type { Temporal } from "temporal-polyfill"

export const toQueryInstantString = (
  value: Temporal.Instant | Temporal.ZonedDateTime
): string => {
  if ("toInstant" in value) {
    return value.toInstant().toString()
  }

  return value.toString()
}
