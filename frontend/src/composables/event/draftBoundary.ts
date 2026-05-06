import { durations, hoursPlainTime } from "@/constants"
import type {
  EventDraft,
  SerializedEventDraft,
  SerializedTimezone,
} from "@/composables/event/types"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  getFixedOffsetTimeZoneId,
  reviveSavedTimezoneOffset,
} from "@/utils/timezone_utils"
import { plainTimeToTimeNum, timeNumToPlainTime } from "@/utils"
import { Temporal } from "temporal-polyfill"

type JsonRecord = Record<string, unknown>

export const EMPTY_EVENT_DRAFT: EventDraft = {}

export function hasEventDraftData(draft: EventDraft | undefined): boolean {
  return Boolean(draft && Object.keys(draft).length > 0)
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonRecord<T extends object>(value: unknown, fallback: T): T {
  if (!value) return fallback

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      return isJsonRecord(parsed) ? (parsed as T) : fallback
    } catch {
      return fallback
    }
  }

  return isJsonRecord(value) ? (value as T) : fallback
}

export function normalizeRouteTimezone(
  rawTimezone: SerializedTimezone | Timezone | undefined
): Timezone | undefined {
  if (!rawTimezone) return undefined

  const offset = reviveSavedTimezoneOffset(rawTimezone.offset)
  const value =
    typeof rawTimezone.value === "string" ? rawTimezone.value : undefined
  const label =
    typeof rawTimezone.label === "string" ? rawTimezone.label : undefined
  const gmtString =
    typeof rawTimezone.gmtString === "string" ? rawTimezone.gmtString : undefined

  if (!value && !offset) return undefined

  return {
    value: value ?? (offset ? getFixedOffsetTimeZoneId(offset) : ""),
    offset: offset ?? durations.ZERO,
    label: label ?? value ?? "",
    gmtString: gmtString ?? "",
  }
}

export function serializeRouteTimezone(timezone: Timezone | undefined): string {
  if (!timezone) {
    return JSON.stringify({})
  }

  return JSON.stringify({
    value: timezone.value,
    label: timezone.label,
    gmtString: timezone.gmtString,
    offset: timezone.offset.toString(),
  })
}

export function fromSerializedEventDraft(
  rawDraft: SerializedEventDraft | undefined
): EventDraft {
  if (!rawDraft) return EMPTY_EVENT_DRAFT
  const draft: EventDraft = {}
  const startTime = rawDraft.startTime as unknown
  const endTime = rawDraft.endTime as unknown
  const selectedDays = rawDraft.selectedDays as unknown

  if (rawDraft.emails) draft.emails = rawDraft.emails
  if (rawDraft.name != null) draft.name = rawDraft.name
  if (rawDraft.startTime != null) {
    draft.startTime =
      startTime instanceof Temporal.PlainTime
        ? startTime
        : timeNumToPlainTime(rawDraft.startTime)
  }
  if (rawDraft.endTime != null) {
    draft.endTime =
      endTime instanceof Temporal.PlainTime
        ? endTime
        : timeNumToPlainTime(rawDraft.endTime)
  }
  if (rawDraft.daysOnly != null) draft.daysOnly = rawDraft.daysOnly
  if (rawDraft.selectedDateOption != null) {
    draft.selectedDateOption = rawDraft.selectedDateOption
  }
  if (rawDraft.selectedDaysOfWeek) {
    draft.selectedDaysOfWeek = rawDraft.selectedDaysOfWeek
  }
  if (rawDraft.selectedDays) {
    draft.selectedDays = (selectedDays as Array<string | Temporal.PlainDate>).map((day) =>
      day instanceof Temporal.PlainDate ? day : Temporal.PlainDate.from(day)
    )
  }
  if (rawDraft.notificationsEnabled != null) {
    draft.notificationsEnabled = rawDraft.notificationsEnabled
  }
  const timezone = normalizeRouteTimezone(rawDraft.timezone)
  if (timezone) draft.timezone = timezone
  if (rawDraft.specificTimesEnabled != null) {
    draft.specificTimesEnabled = rawDraft.specificTimesEnabled
  }
  if (rawDraft.startOnMonday != null) draft.startOnMonday = rawDraft.startOnMonday

  return draft
}

export function toSerializedEventDraft(
  draft: EventDraft | undefined
): SerializedEventDraft {
  if (!draft) return {}

  const normalizedTimezone = getDraftTimezone(draft)
  const serializedDraft: SerializedEventDraft = {}

  if (draft.emails) serializedDraft.emails = draft.emails
  if (draft.name != null) serializedDraft.name = draft.name
  if (draft.startTime != null) {
    serializedDraft.startTime = plainTimeToTimeNum(getDraftStartTime(draft))
  }
  if (draft.endTime != null) {
    serializedDraft.endTime = plainTimeToTimeNum(getDraftEndTime(draft))
  }
  if (draft.daysOnly != null) serializedDraft.daysOnly = draft.daysOnly
  if (draft.selectedDateOption != null) {
    serializedDraft.selectedDateOption = draft.selectedDateOption
  }
  if (draft.selectedDaysOfWeek) {
    serializedDraft.selectedDaysOfWeek = draft.selectedDaysOfWeek
  }
  if (draft.selectedDays != null) {
    serializedDraft.selectedDays = getDraftSelectedDays(draft).map((day) =>
      day.toString()
    )
  }
  if (draft.notificationsEnabled != null) {
    serializedDraft.notificationsEnabled = draft.notificationsEnabled
  }
  if (normalizedTimezone) {
    serializedDraft.timezone = {
      value: normalizedTimezone.value,
      label: normalizedTimezone.label,
      gmtString: normalizedTimezone.gmtString,
      offset: normalizedTimezone.offset.toString(),
    }
  }
  if (draft.specificTimesEnabled != null) {
    serializedDraft.specificTimesEnabled = draft.specificTimesEnabled
  }
  if (draft.startOnMonday != null) {
    serializedDraft.startOnMonday = draft.startOnMonday
  }

  return serializedDraft
}

export function serializeRouteContactsPayload(
  payload: EventDraft | undefined
): string {
  return JSON.stringify(toSerializedEventDraft(payload))
}

export function parseRouteContactsPayload(value: unknown): EventDraft {
  return fromSerializedEventDraft(parseJsonRecord<SerializedEventDraft>(value, {}))
}

export function parseRouteTimezone(value: unknown): Timezone | undefined {
  return normalizeRouteTimezone(
    parseJsonRecord<SerializedTimezone>(value, {})
  )
}

export function getDraftStartTime(
  draft: EventDraft,
  fallback: Temporal.PlainTime = hoursPlainTime.NINE
): Temporal.PlainTime {
  return draft.startTime ?? fallback
}

export function getDraftEndTime(
  draft: EventDraft,
  fallback: Temporal.PlainTime = hoursPlainTime.SEVENTEEN
): Temporal.PlainTime {
  return draft.endTime ?? fallback
}

export function getDraftSelectedDays(draft: EventDraft): Temporal.PlainDate[] {
  return draft.selectedDays ?? []
}

export function getDraftTimezone(draft: EventDraft): Timezone | undefined {
  return draft.timezone
}
