import type { HistoryState } from "vue-router"
import { Temporal } from "temporal-polyfill"
import { toTransportDateTimeStrings } from "@/types/transport"
import type { SpecificTimesEditDraft } from "./specificTimesEditDraft"

const SPECIFIC_TIMES_ENTRY_STATE_KEY = "timefulSpecificTimesEntry"

interface SpecificTimesEntryDraftState {
  dates?: string[]
  timeSeed?: string
  durationMinutes?: number
  enabledSlots?: string[]
  activeSlots?: string[]
  eventTimezone?: string
  timedRecurrence?: {
    kind?: "specific_dates" | "weekly"
    selectedDays?: string[]
    selectedDaysOfWeek?: number[]
    startOnMonday?: boolean
  }
  slotGeneration?: {
    startTimeLocal?: string
    endTimeLocal?: string
    timeIncrementMinutes?: number
  }
  timeIncrementMinutes: number
  resetExistingTimes?: boolean
}

export interface SpecificTimesEntryState {
  mode: "create"
  draft: SpecificTimesEntryDraftState
}

const serializeSpecificTimesEditDraft = (
  draft: SpecificTimesEditDraft
): SpecificTimesEntryDraftState => ({
  dates: draft.dates?.map((date) => date.toString()),
  timeSeed: draft.timeSeed?.toString(),
  durationMinutes: draft.duration?.total("minutes"),
  enabledSlots: toTransportDateTimeStrings(draft.enabledSlots ?? []),
  activeSlots: toTransportDateTimeStrings(draft.activeSlots ?? []),
  eventTimezone: draft.eventTimezone,
  timedRecurrence: draft.timedRecurrence
    ? {
        kind: draft.timedRecurrence.kind,
        selectedDays: draft.timedRecurrence.selectedDays?.map((day) => day.toString()),
        selectedDaysOfWeek: draft.timedRecurrence.selectedDaysOfWeek,
        startOnMonday: draft.timedRecurrence.startOnMonday,
      }
    : undefined,
  slotGeneration: draft.slotGeneration
    ? {
        startTimeLocal: draft.slotGeneration.startTimeLocal?.toString(),
        endTimeLocal: draft.slotGeneration.endTimeLocal?.toString(),
        timeIncrementMinutes: draft.slotGeneration.timeIncrement?.total("minutes"),
      }
    : undefined,
  timeIncrementMinutes: draft.timeIncrementMinutes,
  resetExistingTimes: draft.resetExistingTimes,
})

const deserializeSpecificTimesEditDraft = (
  draft: SpecificTimesEntryDraftState
): SpecificTimesEditDraft => ({
  dates: draft.dates?.map((date) => Temporal.PlainDate.from(date)),
  timeSeed: draft.timeSeed
    ? Temporal.Instant.from(draft.timeSeed).toZonedDateTimeISO("UTC")
    : undefined,
  duration:
    typeof draft.durationMinutes === "number"
      ? Temporal.Duration.from({ minutes: draft.durationMinutes })
      : undefined,
  enabledSlots: draft.enabledSlots?.map((slot) =>
    Temporal.Instant.from(slot).toZonedDateTimeISO("UTC")
  ),
  activeSlots: draft.activeSlots?.map((slot) =>
    Temporal.Instant.from(slot).toZonedDateTimeISO("UTC")
  ),
  eventTimezone: draft.eventTimezone,
  timedRecurrence: draft.timedRecurrence
    ? {
        kind: draft.timedRecurrence.kind,
        selectedDays: draft.timedRecurrence.selectedDays?.map((day) =>
          Temporal.PlainDate.from(day)
        ),
        selectedDaysOfWeek: draft.timedRecurrence.selectedDaysOfWeek,
        startOnMonday: draft.timedRecurrence.startOnMonday,
      }
    : undefined,
  slotGeneration: draft.slotGeneration
    ? {
        startTimeLocal: draft.slotGeneration.startTimeLocal
          ? Temporal.PlainTime.from(draft.slotGeneration.startTimeLocal)
          : undefined,
        endTimeLocal: draft.slotGeneration.endTimeLocal
          ? Temporal.PlainTime.from(draft.slotGeneration.endTimeLocal)
          : undefined,
        timeIncrement:
          typeof draft.slotGeneration.timeIncrementMinutes === "number"
            ? Temporal.Duration.from({
                minutes: draft.slotGeneration.timeIncrementMinutes,
              })
            : undefined,
      }
    : undefined,
  timeIncrementMinutes: draft.timeIncrementMinutes,
  resetExistingTimes: draft.resetExistingTimes,
})

const isSpecificTimesEntryState = (
  value: unknown
): value is SpecificTimesEntryState => {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as {
    mode?: unknown
    draft?: unknown
  }

  return candidate.mode === "create" && candidate.draft != null
}

export const hasSpecificTimesEntryState = (): boolean => {
  const historyState = window.history.state as Record<string, unknown> | null
  return isSpecificTimesEntryState(
    historyState?.[SPECIFIC_TIMES_ENTRY_STATE_KEY]
  )
}

export const consumeSpecificTimesEntryState = ():
  | { mode: "create"; draft: SpecificTimesEditDraft }
  | undefined => {
  const historyState = window.history.state as Record<string, unknown> | null
  const rawEntry = historyState?.[SPECIFIC_TIMES_ENTRY_STATE_KEY]
  if (!isSpecificTimesEntryState(rawEntry)) {
    return undefined
  }

  const { [SPECIFIC_TIMES_ENTRY_STATE_KEY]: _discardedEntry, ...nextHistoryState } =
    historyState ?? {}
  window.history.replaceState(nextHistoryState, document.title)

  return {
    mode: "create",
    draft: deserializeSpecificTimesEditDraft(rawEntry.draft),
  }
}

export const withSpecificTimesEntryState = ({
  state,
  draft,
}: {
  state?: HistoryState
  draft: SpecificTimesEditDraft
}): HistoryState =>
  ({
    ...(state ?? {}),
    [SPECIFIC_TIMES_ENTRY_STATE_KEY]: {
      mode: "create",
      draft: serializeSpecificTimesEditDraft(draft),
    },
  }) as unknown as HistoryState
