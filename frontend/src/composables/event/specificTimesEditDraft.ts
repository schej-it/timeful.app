import { Temporal } from "temporal-polyfill"
import { UTC } from "@/constants"
import { getWrappedTimeRangeDuration, processEvent } from "@/utils"
import type { Event } from "@/types"
import {
  getTimedRecurrence,
  getTimedSlotGeneration,
  hasCanonicalTimedSlots,
  mergeActiveSlotsByMembershipDay,
  normalizeActiveSlots,
  timedRecurrenceKindToEventType,
} from "@/utils/timedEventSlots"
import type { EventEditorScheduleResult } from "./eventEditorSchedule"

export interface SpecificTimesEditDraft {
  dates?: Temporal.PlainDate[]
  timeSeed?: Temporal.ZonedDateTime
  duration?: Temporal.Duration
  enabledSlots?: Temporal.ZonedDateTime[]
  activeSlots?: Temporal.ZonedDateTime[]
  eventTimezone?: string
  timedRecurrence?: Event["timedRecurrence"]
  slotGeneration?: Event["slotGeneration"]
  timeIncrementMinutes: number
  resetExistingTimes?: boolean
}

const timeIncrementMatches = (
  event: Event,
  timeIncrementMinutes: number
): boolean =>
  Math.round(getTimedSlotGeneration(event).timeIncrement.total("minutes")) ===
  timeIncrementMinutes

const slotGenerationMatches = (
  event: Event,
  schedule: EventEditorScheduleResult
): boolean => {
  const eventSlotGeneration = getTimedSlotGeneration(event)
  return (
    eventSlotGeneration.startTimeLocal.equals(
      schedule.slotGeneration.startTimeLocal
    ) &&
    eventSlotGeneration.endTimeLocal.equals(schedule.slotGeneration.endTimeLocal) &&
    eventSlotGeneration.timeIncrement.total("minutes") ===
      schedule.slotGeneration.timeIncrement.total("minutes")
  )
}

const hasCanonicalTimedState = (event: Event): boolean =>
  !event.daysOnly &&
  (
    hasCanonicalTimedSlots(event) ||
    event.eventTimezone != null ||
    event.slotGeneration != null ||
    event.timedRecurrence != null
  )

export const buildSpecificTimesEditDraft = ({
  event,
  schedule,
  timeIncrementMinutes,
  specificTimesEnabled,
}: {
  event?: Event
  schedule: EventEditorScheduleResult
  timeIncrementMinutes: number
  specificTimesEnabled: boolean
}): SpecificTimesEditDraft | undefined => {
  if (!event) {
    return undefined
  }

  const preservedTimedRecurrence =
    schedule.timedRecurrence.kind === "weekly" &&
    schedule.timedRecurrence.selectedDays.length === 0
      ? {
          ...schedule.timedRecurrence,
          selectedDays: getTimedRecurrence(event).selectedDays,
        }
      : schedule.timedRecurrence
  const slotWindowMatches =
    timeIncrementMatches(event, timeIncrementMinutes) &&
    slotGenerationMatches(event, schedule)
  if (!specificTimesEnabled) {
    const normalizedSlots = normalizeActiveSlots({
      enabledSlots: schedule.enabledSlots,
      activeSlots: schedule.enabledSlots,
    })

    return {
      dates: [...schedule.normalizedSelectedDays],
      timeSeed: schedule.dates[0]?.withTimeZone(UTC),
      duration: schedule.duration,
      enabledSlots: normalizedSlots.enabledSlots,
      activeSlots: normalizedSlots.activeSlots,
      eventTimezone: schedule.eventTimezone,
      timedRecurrence: preservedTimedRecurrence,
      slotGeneration: schedule.slotGeneration,
      timeIncrementMinutes,
      resetExistingTimes: false,
    }
  }

  const resetExistingTimes =
    !hasCanonicalTimedState(event) ||
    !slotWindowMatches
  const nextActiveSlots = resetExistingTimes
    ? schedule.enabledSlots
    : mergeActiveSlotsByMembershipDay({
        priorEnabledSlots: event.enabledSlots ?? event.activeSlots ?? event.times,
        priorActiveSlots: event.activeSlots ?? event.times ?? schedule.activeSlots,
        nextEnabledSlots: schedule.enabledSlots,
        timeZone: schedule.eventTimezone,
        slotGeneration: schedule.slotGeneration,
        priorMembershipDays:
          getTimedRecurrence(event).kind === "specific_dates"
            ? getTimedRecurrence(event).selectedDays
            : undefined,
        nextMembershipDays:
          preservedTimedRecurrence.kind === "specific_dates"
            ? schedule.normalizedSelectedDays
            : undefined,
      })
  const normalizedSlots = normalizeActiveSlots({
    enabledSlots: schedule.enabledSlots,
    activeSlots: nextActiveSlots,
  })

  return {
    dates: [...schedule.normalizedSelectedDays],
    timeSeed: schedule.dates[0]?.withTimeZone(UTC),
    duration: schedule.duration,
    enabledSlots: normalizedSlots.enabledSlots,
    activeSlots: normalizedSlots.activeSlots,
    eventTimezone: schedule.eventTimezone,
    timedRecurrence:
      preservedTimedRecurrence.kind === "specific_dates"
        ? {
            ...preservedTimedRecurrence,
            selectedDays: schedule.normalizedSelectedDays,
          }
        : preservedTimedRecurrence,
    slotGeneration: schedule.slotGeneration,
    timeIncrementMinutes,
    resetExistingTimes,
  }
}

export const buildSpecificTimesCreateDraft = ({
  schedule,
  timeIncrementMinutes,
}: {
  schedule: EventEditorScheduleResult
  timeIncrementMinutes: number
}): SpecificTimesEditDraft => ({
  dates: [...schedule.normalizedSelectedDays],
  timeSeed: schedule.dates[0]?.withTimeZone(UTC),
  duration: schedule.duration,
  enabledSlots: [...schedule.enabledSlots],
  activeSlots: [...schedule.enabledSlots],
  eventTimezone: schedule.eventTimezone,
  timedRecurrence: schedule.timedRecurrence,
  slotGeneration: schedule.slotGeneration,
  timeIncrementMinutes,
  resetExistingTimes: true,
})

export const applySpecificTimesEditDraft = ({
  event,
  draft,
}: {
  event: Event
  draft: SpecificTimesEditDraft
}): Event => {
  const normalizedSlots = normalizeActiveSlots({
    enabledSlots: draft.enabledSlots ?? event.enabledSlots,
    activeSlots: draft.activeSlots ?? event.activeSlots ?? event.times,
  })
  const nextEvent: Event = {
    ...event,
    type:
      draft.timedRecurrence != null
        ? timedRecurrenceKindToEventType(draft.timedRecurrence.kind)
        : event.type,
    dates: draft.timedRecurrence?.selectedDays ?? draft.dates,
    timeSeed:
      draft.enabledSlots?.[0]?.withTimeZone(UTC) ?? draft.timeSeed ?? event.timeSeed,
    duration:
      scheduleDurationFromSlotGeneration(draft.slotGeneration) ??
      draft.duration ??
      event.duration,
    timeIncrement: Temporal.Duration.from({
      minutes: draft.timeIncrementMinutes,
    }),
    enabledSlots: normalizedSlots.enabledSlots,
    activeSlots: normalizedSlots.activeSlots,
    eventTimezone: draft.eventTimezone ?? event.eventTimezone,
    slotGeneration: draft.slotGeneration ?? event.slotGeneration,
    timedRecurrence: draft.timedRecurrence ?? event.timedRecurrence,
    times:
      draft.resetExistingTimes === true
        ? []
        : normalizedSlots.activeSlots,
  }

  processEvent(nextEvent)

  return nextEvent
}

const scheduleDurationFromSlotGeneration = (
  slotGeneration: Event["slotGeneration"]
): Temporal.Duration | undefined =>
  slotGeneration?.startTimeLocal != null &&
  slotGeneration.endTimeLocal != null
    ? getWrappedTimeRangeDuration(
        slotGeneration.startTimeLocal,
        slotGeneration.endTimeLocal
      )
    : undefined
