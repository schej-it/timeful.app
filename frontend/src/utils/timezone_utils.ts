import type { Timezone } from "@/composables/schedule_overlap/types"
import { allTimezones } from "@/constants"
import { Temporal } from "temporal-polyfill"

export interface SavedTimezoneShape {
  value?: string
  offset?: string
}

type StorageReader = Pick<Storage, "getItem">

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
  storage: StorageReader | undefined
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
  storage: StorageReader | undefined =
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

export const buildTimezonesForReferenceDate = (
  referenceDate: Temporal.ZonedDateTime
): Timezone[] => {
  return Object.entries(allTimezones)
    .map((zone): Timezone | null => {
      try {
        const zdt = referenceDate.withTimeZone(zone[0])
        const offsetMinutes = Math.round(
          zdt.offsetNanoseconds / (1000 * 1000 * 1000 * 60)
        )

        return {
          value: zone[0],
          label: zone[1],
          gmtString: formatTimezoneGmtString(offsetMinutes),
          offset: Temporal.Duration.from({ minutes: offsetMinutes }),
        }
      } catch (error: unknown) {
        console.error(error)
        return null
      }
    })
    .filter((timezone): timezone is Timezone => timezone !== null)
    .sort((a, b) => a.offset.total("minutes") - b.offset.total("minutes"))
}

export const resolveBrowserTimezoneSelection = (
  timezones: Timezone[],
  referenceDate: Temporal.ZonedDateTime,
  browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): Timezone | undefined => {
  if (!browserTimezone) {
    return undefined
  }

  let match = timezones.find((timezone) => timezone.value === browserTimezone)
  if (match) {
    return match
  }

  const janDate = Temporal.ZonedDateTime.from("2024-01-15T12:00:00[America/New_York]")
    .withTimeZone(browserTimezone)
  const julDate = Temporal.ZonedDateTime.from("2024-07-15T12:00:00[America/New_York]")
    .withTimeZone(browserTimezone)
  const janOffset = Math.round(
    janDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60)
  )
  const julOffset = Math.round(
    julDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60)
  )

  match = timezones.find((timezone) => {
    const januaryTimezoneDate = Temporal.ZonedDateTime.from(
      "2024-01-15T12:00:00[America/New_York]"
    ).withTimeZone(timezone.value)
    const julyTimezoneDate = Temporal.ZonedDateTime.from(
      "2024-07-15T12:00:00[America/New_York]"
    ).withTimeZone(timezone.value)
    const januaryOffset = Math.round(
      januaryTimezoneDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60)
    )
    const julyOffset = Math.round(
      julyTimezoneDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60)
    )

    return januaryOffset === janOffset && julyOffset === julOffset
  })

  if (match) {
    return match
  }

  const browserReferenceDate = referenceDate.withTimeZone(browserTimezone)
  const offsetMinutes = Math.round(
    browserReferenceDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60)
  )

  return timezones.find(
    (timezone) => timezone.offset.total("minutes") === offsetMinutes
  )
}

export const resolveSavedTimezoneSelection = (
  timezones: Timezone[],
  storage: StorageReader | undefined
): Timezone | undefined => {
  const savedTimezone = normalizeOptionalTimezone(readSavedTimezone(storage))
  if (!savedTimezone) {
    return undefined
  }

  const matchedTimezone = timezones.find(
    (timezone) => timezone.value === savedTimezone.value
  )
  if (matchedTimezone) {
    return matchedTimezone
  }

  if (
    !savedTimezone.value.startsWith("+") &&
    !savedTimezone.value.startsWith("-")
  ) {
    return undefined
  }

  return normalizeTimezone({
    value: savedTimezone.value,
    offset: savedTimezone.offset,
    label: savedTimezone.label,
    gmtString:
      savedTimezone.gmtString ||
      formatTimezoneGmtString(savedTimezone.offset.total("minutes")),
  })
}

export const resolveInitialTimezoneSelection = (
  referenceDate: Temporal.ZonedDateTime,
  storage: StorageReader | undefined =
    typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage,
  browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): Timezone => {
  const timezones = buildTimezonesForReferenceDate(referenceDate)

  return (
    resolveSavedTimezoneSelection(timezones, storage) ??
    resolveBrowserTimezoneSelection(timezones, referenceDate, browserTimezone) ??
    normalizeTimezone(undefined)
  )
}
