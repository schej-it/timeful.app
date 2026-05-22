import type { Timezone } from "@/composables/schedule_overlap/types"
import { Temporal } from "temporal-polyfill"

export interface SavedTimezoneShape {
  value?: string
  offset?: string
}

export interface TimezoneLike {
  value?: string
  offset?: string | Temporal.Duration
  label?: string
  gmtString?: string
}

const ZERO_TIMEZONE_OFFSET = Temporal.Duration.from({ minutes: 0 })

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

export const formatTimezoneGmtString = (offsetMinutes: number): string => {
  const hours = Math.trunc(offsetMinutes / 60)
  const minutes = Math.abs(offsetMinutes % 60)
  const hr = `${String(hours)}:${String(minutes).padStart(2, "0")}`

  return `(GMT${hr.includes("-") ? hr : `+${hr}`})`
}

export const reviveSavedTimezoneOffset = (
  offset: TimezoneLike["offset"]
): Temporal.Duration | undefined => {
  if (offset instanceof Temporal.Duration) {
    return offset
  }

  if (typeof offset !== "string" || !offset) {
    return undefined
  }

  try {
    return Temporal.Duration.from(offset)
  } catch {
    return undefined
  }
}

const hasTimezoneBoundaryData = (
  timezone: TimezoneLike | Timezone | null | undefined
): boolean => {
  if (typeof timezone?.value === "string" && timezone.value) {
    return true
  }

  return reviveSavedTimezoneOffset(timezone?.offset) !== undefined
}

export const normalizeTimezone = (
  timezone: TimezoneLike | Timezone | null | undefined
): Timezone => {
  const offset = reviveSavedTimezoneOffset(timezone?.offset) ?? ZERO_TIMEZONE_OFFSET
  const value =
    typeof timezone?.value === "string" && timezone.value
      ? timezone.value
      : getFixedOffsetTimeZoneId(offset)
  const label =
    typeof timezone?.label === "string" && timezone.label
      ? timezone.label
      : value
  const gmtString =
    typeof timezone?.gmtString === "string" && timezone.gmtString
      ? timezone.gmtString
      : formatTimezoneGmtString(offset.total("minutes"))

  return {
    value,
    offset,
    label,
    gmtString,
  }
}

export const normalizeOptionalTimezone = (
  timezone: TimezoneLike | Timezone | null | undefined
): Timezone | undefined => {
  if (!hasTimezoneBoundaryData(timezone)) {
    return undefined
  }

  return normalizeTimezone(timezone)
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
  return normalizeOptionalTimezone(savedTimezone)?.value
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
