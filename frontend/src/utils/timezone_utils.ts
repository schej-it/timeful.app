import { Temporal } from "temporal-polyfill"

export interface SavedTimezoneShape {
  value?: string
  offset?: Temporal.Duration | string
}

export const getFixedOffsetTimeZoneId = (
  offset: Temporal.Duration
): string => {
  const offsetMinutes = offset.total("minutes")
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`
}

export const reviveSavedTimezoneOffset = (
  offset: SavedTimezoneShape["offset"]
): Temporal.Duration | undefined => {
  if (!offset) {
    return undefined
  }

  return typeof offset === "string" ? Temporal.Duration.from(offset) : offset
}

export const parseSavedTimezone = (
  serializedTimezone: string | null | undefined
): SavedTimezoneShape | undefined => {
  if (!serializedTimezone) {
    return undefined
  }

  try {
    return JSON.parse(serializedTimezone) as SavedTimezoneShape
  } catch {
    return undefined
  }
}

export const readSavedTimezone = (
  storage: Storage | undefined
): SavedTimezoneShape | undefined => {
  if (!storage) {
    return undefined
  }

  return parseSavedTimezone(storage.getItem("timezone"))
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

  const offset = reviveSavedTimezoneOffset(savedTimezone.offset)
  if (!offset) {
    return undefined
  }

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

  const savedTimezoneValue = resolveSavedTimezoneValue(readSavedTimezone(storage))
  if (savedTimezoneValue) {
    return savedTimezoneValue
  }

  return browserTimezone
}
