import { Temporal } from "temporal-polyfill"
import { UTC, eventTypes } from "@/constants"
import { getWrappedTimeRangeDuration, processEvent } from "@/utils"
import type { Event } from "@/types"
import {
  getLocalSlotDomainDay,
  getTimedEventTimezone,
  getTimedRecurrence,
  getTimedSlotGeneration,
  hasCanonicalTimedSlots,
  normalizeActiveSlots,
  projectSlotsToLocalDays,
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

const getDateKeys = (dates: Temporal.PlainDate[] | undefined): string[] =>
  (dates ?? []).map((date) => date.toString())

const datesMatch = (
  left: Temporal.PlainDate[] | undefined,
  right: Temporal.PlainDate[]
): boolean => {
  const leftKeys = getDateKeys(left)
  const rightKeys = getDateKeys(right)

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index])
  )
}

const timeIncrementMatches = (
  event: Event,
  timeIncrementMinutes: number
): boolean =>
  Math.round(getTimedSlotGeneration(event).timeIncrement.total("minutes")) ===
  timeIncrementMinutes

const selectedDaysMatch = (
  event: Event,
  schedule: EventEditorScheduleResult
): boolean => {
  const recurrence = getTimedRecurrence(event)
  if (recurrence.kind !== schedule.timedRecurrence.kind) {
    return false
  }

  if (recurrence.kind === "specific_dates") {
    const eventSelectedDays =
      recurrence.selectedDays.length > 0
        ? recurrence.selectedDays
        : projectSlotsToLocalDays(
            event.enabledSlots ?? event.activeSlots,
            getTimedEventTimezone(event),
            getTimedSlotGeneration(event)
          )
    return datesMatch(eventSelectedDays, schedule.timedRecurrence.selectedDays)
  }

  return (
    recurrence.startOnMonday === schedule.timedRecurrence.startOnMonday &&
    JSON.stringify(recurrence.selectedDaysOfWeek) ===
      JSON.stringify(schedule.timedRecurrence.selectedDaysOfWeek)
  )
}

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
  const timezoneChanged = getTimedEventTimezone(event) !== schedule.eventTimezone
  const sameSelectedDays = selectedDaysMatch(event, schedule)
  const enabledSlotsSource =
    slotWindowMatches && (timezoneChanged || sameSelectedDays)
      ? event.enabledSlots ?? event.activeSlots ?? event.times ?? schedule.enabledSlots
      : slotWindowMatches
        ? [
            ...(event.enabledSlots ?? event.activeSlots ?? event.times ?? []),
            ...schedule.enabledSlots,
          ]
        : schedule.enabledSlots

  if (!specificTimesEnabled) {
    const nonSpecificDateKeys = new Set(
      schedule.normalizedSelectedDays.map((d) => d.toString())
    )
    const nonSpecificFilteredSlots = schedule.enabledSlots.filter((slot) => {
      const localDay = getLocalSlotDomainDay({
        slot,
        timeZone: schedule.eventTimezone,
        slotGeneration: schedule.slotGeneration,
      })
      return nonSpecificDateKeys.has(localDay.toString())
    })
    const normalizedSlots = normalizeActiveSlots({
      enabledSlots: nonSpecificFilteredSlots,
      activeSlots: nonSpecificFilteredSlots,
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
  const projectedSelectedDays =
    timezoneChanged && schedule.timedRecurrence.kind === "specific_dates"
      ? projectSlotsToLocalDays(
          enabledSlotsSource,
          schedule.eventTimezone,
          schedule.slotGeneration
        )
      : schedule.normalizedSelectedDays
  const projectedDateKeys = new Set(
    projectedSelectedDays.map((d) => d.toString())
  )
  const filteredEnabledSlots = enabledSlotsSource.filter((slot) => {
    const localDay = getLocalSlotDomainDay({
      slot,
      timeZone: schedule.eventTimezone,
      slotGeneration: schedule.slotGeneration,
    })
    return projectedDateKeys.has(localDay.toString())
  })
  const normalizedSlots = normalizeActiveSlots({
    enabledSlots: filteredEnabledSlots,
    activeSlots: resetExistingTimes
      ? []
      : event.activeSlots ?? event.times ?? schedule.activeSlots,
  })

  return {
    dates: [...projectedSelectedDays],
    timeSeed: schedule.dates[0]?.withTimeZone(UTC),
    duration: schedule.duration,
    enabledSlots: normalizedSlots.enabledSlots,
    activeSlots: normalizedSlots.activeSlots,
    eventTimezone: schedule.eventTimezone,
    timedRecurrence:
      preservedTimedRecurrence.kind === "specific_dates"
        ? {
            ...preservedTimedRecurrence,
            selectedDays: projectedSelectedDays,
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
  activeSlots: [],
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
      draft.timedRecurrence?.kind === "weekly"
        ? eventTypes.SPECIFIC_DATES
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
