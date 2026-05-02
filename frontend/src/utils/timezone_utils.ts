import { Temporal } from "temporal-polyfill"
import { getFixedOffsetTimeZoneId } from "./date_utils"

export interface SavedTimezoneShape {
  value?: string
  offset?: Temporal.Duration | string
}

export const resolveSavedTimezoneValue = (
  savedTimezone: SavedTimezoneShape | null | undefined
): string | undefined => {
  if (savedTimezone?.value && typeof savedTimezone.value === "string") {
    return savedTimezone.value
  }

  if (!savedTimezone?.offset) {
    return undefined
  }

  const offset =
    typeof savedTimezone.offset === "string"
      ? Temporal.Duration.from(savedTimezone.offset)
      : savedTimezone.offset

  return getFixedOffsetTimeZoneId(offset)
}

export const resolveTimezoneValue = (
  providedTimezone?: string,
  storage: Storage | undefined =
    typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage,
  browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || Temporal.Now.timeZoneId()
): string => {
  if (providedTimezone) {
    return providedTimezone
  }

  if (!storage) {
    return browserTimezone
  }

  try {
    const timezoneStr = storage.getItem("timezone")
    if (timezoneStr) {
      const parsed = JSON.parse(timezoneStr) as SavedTimezoneShape
      const savedTimezoneValue = resolveSavedTimezoneValue(parsed)
      if (savedTimezoneValue) {
        return savedTimezoneValue
      }
    }
  } catch {
    // Fall back to the browser timezone when saved timezone data is invalid.
  }

  return browserTimezone
}
