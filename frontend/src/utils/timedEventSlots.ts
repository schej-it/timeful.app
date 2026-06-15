import { durations, eventTypes, UTC } from "@/constants"
import type { Event } from "@/types"
import { Temporal } from "temporal-polyfill"

export interface TimedSlotGeneration {
  startTimeLocal: Temporal.PlainTime
  endTimeLocal: Temporal.PlainTime
  timeIncrement: Temporal.Duration
}

export interface TimedRecurrence {
  kind: "specific_dates" | "weekly"
  selectedDays: Temporal.PlainDate[]
  selectedDaysOfWeek: number[]
  startOnMonday: boolean
}

interface TimedContractShape {
  daysOnly?: boolean
  timedRecurrence?: unknown
  enabledSlots?: unknown
  activeSlots?: unknown
  eventTimezone?: unknown
  slotGeneration?: unknown
}

export const DEFAULT_EVENT_TIMEZONE = UTC

export const timedRecurrenceKindToEventType = (
  kind: TimedRecurrence["kind"] | undefined
): Event["type"] =>
  kind === "weekly" ? eventTypes.DOW : eventTypes.SPECIFIC_DATES

export const isTimedEventContractPayload = (event: TimedContractShape): boolean =>
  !event.daysOnly &&
  (
    event.timedRecurrence != null ||
    event.enabledSlots != null ||
    event.activeSlots != null ||
    event.eventTimezone != null ||
    event.slotGeneration != null
  )

export const hasCompleteTimedEventContract = (
  event: TimedContractShape
): boolean =>
  !event.daysOnly &&
  event.timedRecurrence != null &&
  event.enabledSlots != null &&
  event.activeSlots != null &&
  event.eventTimezone != null &&
  event.slotGeneration != null

export const sortAndUniqueSlots = (
  slots: Temporal.ZonedDateTime[] | undefined
): Temporal.ZonedDateTime[] => {
  if (!slots || slots.length === 0) {
    return []
  }

  const byInstant = new Map<string, Temporal.ZonedDateTime>()
  for (const slot of slots) {
    byInstant.set(slot.toInstant().toString(), slot.withTimeZone(UTC))
  }

  return [...byInstant.values()].sort((left, right) =>
    Temporal.ZonedDateTime.compare(left, right)
  )
}

export const timedSlotsEqual = (
  left: Temporal.ZonedDateTime[] | undefined,
  right: Temporal.ZonedDateTime[] | undefined
): boolean => {
  const normalizedLeft = sortAndUniqueSlots(left)
  const normalizedRight = sortAndUniqueSlots(right)

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every(
      (slot, index) =>
        slot.toInstant().epochMilliseconds ===
        normalizedRight[index].toInstant().epochMilliseconds
    )
  )
}

export const normalizeActiveSlots = ({
  enabledSlots,
  activeSlots,
}: {
  enabledSlots: Temporal.ZonedDateTime[] | undefined
  activeSlots: Temporal.ZonedDateTime[] | undefined
}): {
  enabledSlots: Temporal.ZonedDateTime[]
  activeSlots: Temporal.ZonedDateTime[]
} => {
  const normalizedEnabled = sortAndUniqueSlots(enabledSlots)
  const enabledInstants = new Set(
    normalizedEnabled.map((slot) => slot.toInstant().toString())
  )
  const normalizedActive = sortAndUniqueSlots(activeSlots).filter((slot) =>
    enabledInstants.has(slot.toInstant().toString())
  )

  return {
    enabledSlots: normalizedEnabled,
    activeSlots: normalizedActive,
  }
}

export const hasCanonicalTimedSlots = (
  event: Pick<Event, "daysOnly" | "enabledSlots" | "activeSlots">
): boolean =>
  !event.daysOnly &&
  ((event.enabledSlots?.length ?? 0) > 0 || (event.activeSlots?.length ?? 0) > 0)

const minutesToPlainTime = (minutes: number): Temporal.PlainTime =>
  Temporal.PlainTime.from({
    hour: Math.floor((minutes % (24 * 60)) / 60),
    minute: minutes % 60,
  })

const getDayOffsetFromAbsoluteMinutes = (absoluteMinutes: number): number =>
  Math.floor(absoluteMinutes / (24 * 60))

const isWrappedLocalWindow = ({
  startTimeLocal,
  endTimeLocal,
}: TimedSlotGeneration): boolean =>
  Temporal.PlainTime.compare(endTimeLocal, startTimeLocal) <= 0

export const getLocalSlotDomainDay = ({
  slot,
  timeZone,
  slotGeneration,
}: {
  slot: Temporal.ZonedDateTime
  timeZone: string
  slotGeneration?: TimedSlotGeneration
}): Temporal.PlainDate => {
  const localSlot = slot.withTimeZone(timeZone)
  if (
    !slotGeneration ||
    !isWrappedLocalWindow(slotGeneration) ||
    Temporal.PlainTime.compare(
      localSlot.toPlainTime(),
      slotGeneration.endTimeLocal
    ) >= 0
  ) {
    return localSlot.toPlainDate()
  }

  return localSlot.toPlainDate().subtract({ days: 1 })
}

const getSlotGenerationTimeIncrement = (
  event: Pick<Event, "slotGeneration" | "timeIncrement">
): Temporal.Duration =>
  event.slotGeneration?.timeIncrement ??
  event.timeIncrement ??
  durations.FIFTEEN_MINUTES

const getSlotGenerationStartTime = (
  event: Pick<Event, "slotGeneration" | "enabledSlots">
): Temporal.PlainTime =>
  event.slotGeneration?.startTimeLocal ??
  event.enabledSlots?.[0]?.toPlainTime() ??
  Temporal.PlainTime.from("09:00")

const getSlotGenerationEndTime = (
  event: Pick<Event, "slotGeneration" | "enabledSlots" | "timeIncrement">
): Temporal.PlainTime => {
  if (event.slotGeneration?.endTimeLocal) {
    return event.slotGeneration.endTimeLocal
  }

  const lastEnabledSlot = sortAndUniqueSlots(event.enabledSlots).at(-1)
  if (!lastEnabledSlot) {
    return Temporal.PlainTime.from("17:00")
  }

  return lastEnabledSlot
    .toPlainTime()
    .add(getSlotGenerationTimeIncrement(event))
}

export const getTimedSlotGeneration = (
  event: Pick<Event, "slotGeneration" | "enabledSlots" | "timeIncrement">
): TimedSlotGeneration => ({
  startTimeLocal: getSlotGenerationStartTime(event),
  endTimeLocal: getSlotGenerationEndTime(event),
  timeIncrement: getSlotGenerationTimeIncrement(event),
})

export const getTimedEventTimezone = (
  event: Pick<Event, "eventTimezone" | "timeSeed" | "enabledSlots" | "times">
): string =>
  event.eventTimezone ??
  event.timeSeed?.timeZoneId ??
  event.enabledSlots?.[0]?.timeZoneId ??
  event.times?.[0]?.timeZoneId ??
  DEFAULT_EVENT_TIMEZONE

export const getTimedRecurrence = (
  event: Pick<Event, "timedRecurrence" | "dates" | "type" | "startOnMonday">
): TimedRecurrence => ({
  kind: event.timedRecurrence?.kind ?? (
    event.type === eventTypes.SPECIFIC_DATES ? "specific_dates" : "weekly"
  ),
  selectedDays: [...(event.timedRecurrence?.selectedDays ?? event.dates ?? [])],
  selectedDaysOfWeek: [...(event.timedRecurrence?.selectedDaysOfWeek ?? [])],
  startOnMonday:
    event.timedRecurrence?.startOnMonday ?? event.startOnMonday ?? false,
})

export const getTimedSpecificDatePickedDays = (
  event: Pick<Event, "timedRecurrence" | "dates" | "type">
): Temporal.PlainDate[] =>
  getTimedRecurrence(event).kind === "specific_dates"
    ? [...getTimedRecurrence(event).selectedDays]
    : []

export const projectSlotsToLocalDays = (
  slots: Temporal.ZonedDateTime[] | undefined,
  timeZone: string,
  slotGeneration?: TimedSlotGeneration
): Temporal.PlainDate[] => {
  const daysByKey = new Map<string, Temporal.PlainDate>()
  for (const slot of sortAndUniqueSlots(slots)) {
    const day = getLocalSlotDomainDay({ slot, timeZone, slotGeneration })
    daysByKey.set(day.toString(), day)
  }

  return [...daysByKey.values()].sort((left, right) =>
    Temporal.PlainDate.compare(left, right)
  )
}

export const projectSlotsToMembershipDays = ({
  slots,
  timeZone,
  slotGeneration,
}: {
  slots: Temporal.ZonedDateTime[] | undefined
  timeZone: string
  slotGeneration?: TimedSlotGeneration
}): Temporal.PlainDate[] =>
  projectSlotsToLocalDays(slots, timeZone, slotGeneration)

export const mergeActiveSlotsByMembershipDay = ({
  priorEnabledSlots,
  priorActiveSlots,
  nextEnabledSlots,
  timeZone,
  slotGeneration,
  priorMembershipDays,
  nextMembershipDays,
}: {
  priorEnabledSlots: Temporal.ZonedDateTime[] | undefined
  priorActiveSlots: Temporal.ZonedDateTime[] | undefined
  nextEnabledSlots: Temporal.ZonedDateTime[] | undefined
  timeZone: string
  slotGeneration?: TimedSlotGeneration
  priorMembershipDays?: Temporal.PlainDate[]
  nextMembershipDays?: Temporal.PlainDate[]
}): Temporal.ZonedDateTime[] => {
  const normalizedNextEnabled = sortAndUniqueSlots(nextEnabledSlots)
  const preservedActive = normalizeActiveSlots({
    enabledSlots: normalizedNextEnabled,
    activeSlots: priorActiveSlots,
  }).activeSlots

  const previousDayKeys = new Set(
    (priorMembershipDays ??
      projectSlotsToMembershipDays({
        slots: priorEnabledSlots ?? priorActiveSlots,
        timeZone,
        slotGeneration,
      })
    ).map((day) => day.toString())
  )
  const addedDayKeys = new Set(
    (nextMembershipDays ??
      projectSlotsToMembershipDays({
        slots: normalizedNextEnabled,
        timeZone,
        slotGeneration,
      })
    )
      .map((day) => day.toString())
      .filter((dayKey) => !previousDayKeys.has(dayKey))
  )

  if (addedDayKeys.size === 0) {
    return preservedActive
  }

  return sortAndUniqueSlots([
    ...preservedActive,
    ...normalizedNextEnabled.filter((slot) =>
      addedDayKeys.has(
        getLocalSlotDomainDay({
          slot,
          timeZone,
          slotGeneration,
        }).toString()
      )
    ),
  ])
}

export const generateTimedSlotsForDay = ({
  day,
  timeZone,
  slotGeneration,
}: {
  day: Temporal.PlainDate
  timeZone: string
  slotGeneration: TimedSlotGeneration
}): Temporal.ZonedDateTime[] => {
  const slots: Temporal.ZonedDateTime[] = []
  let current = day.toZonedDateTime({
    timeZone,
    plainTime: slotGeneration.startTimeLocal,
  })
  const endDay = isWrappedLocalWindow(slotGeneration) ? day.add({ days: 1 }) : day
  const end = endDay.toZonedDateTime({
    timeZone,
    plainTime: slotGeneration.endTimeLocal,
  })

  while (Temporal.ZonedDateTime.compare(current, end) < 0) {
    slots.push(current.withTimeZone(UTC))
    current = current.add(slotGeneration.timeIncrement)
  }

  return sortAndUniqueSlots(slots)
}

export const getTimedSlotForMembershipDay = ({
  day,
  timeZone,
  absoluteMinutes,
}: {
  day: Temporal.PlainDate
  timeZone: string
  absoluteMinutes: number
}): Temporal.ZonedDateTime => {
  const dayOffset = getDayOffsetFromAbsoluteMinutes(absoluteMinutes)
  const normalizedMinutes =
    ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60)

  return day
    .add({ days: dayOffset })
    .toZonedDateTime({
      timeZone,
      plainTime: minutesToPlainTime(normalizedMinutes),
    })
    .withTimeZone(UTC)
}

export const buildTimedDateSeeds = (
  event: Pick<
    Event,
    | "daysOnly"
    | "enabledSlots"
    | "eventTimezone"
    | "slotGeneration"
    | "dates"
    | "timedRecurrence"
    | "type"
    | "timeSeed"
    | "timeIncrement"
  >
): Temporal.ZonedDateTime[] => {
  if (event.daysOnly) {
    return (event.dates ?? []).map((date) =>
      date.toZonedDateTime({ timeZone: UTC, plainTime: "00:00:00" })
    )
  }

  const pickedDays = getTimedSpecificDatePickedDays(event)
  if (pickedDays.length > 0) {
    const slotGeneration = getTimedSlotGeneration(event)
    const timeZone = getTimedEventTimezone(event)

    return pickedDays.map((day) =>
      day.toZonedDateTime({
        timeZone,
        plainTime: slotGeneration.startTimeLocal,
      })
    )
  }

  const enabledDays = projectSlotsToLocalDays(
    event.enabledSlots,
    getTimedEventTimezone(event),
    getTimedSlotGeneration(event)
  )
  if (enabledDays.length === 0) {
    return []
  }

  const slotGeneration = getTimedSlotGeneration(event)
  const timeZone = getTimedEventTimezone(event)

  return enabledDays.map((day) =>
    day.toZonedDateTime({
      timeZone,
      plainTime: slotGeneration.startTimeLocal,
    })
  )
}

export const getTimedSlotCoverage = (
  event: Pick<
    Event,
    "enabledSlots" | "eventTimezone" | "slotGeneration" | "timeIncrement"
  >
): { minTime: Temporal.PlainTime; maxTime: Temporal.PlainTime } | null => {
  const slots = sortAndUniqueSlots(event.enabledSlots)
  if (slots.length === 0) {
    return null
  }

  const timeZone = getTimedEventTimezone(event)
  const slotGeneration = getTimedSlotGeneration(event)
  const incrementMinutes = Math.round(slotGeneration.timeIncrement.total("minutes"))
  let minOffsetMinutes = Number.POSITIVE_INFINITY
  let maxOffsetMinutes = Number.NEGATIVE_INFINITY

  for (const slot of slots) {
    const localSlot = slot.withTimeZone(timeZone)
    const domainDay = getLocalSlotDomainDay({
      slot,
      timeZone,
      slotGeneration,
    })
    const domainStart = domainDay.toZonedDateTime({
      timeZone,
      plainTime: "00:00:00",
    })
    const startOffsetMinutes = Math.round(
      localSlot.since(domainStart).total("minutes")
    )
    minOffsetMinutes = Math.min(minOffsetMinutes, startOffsetMinutes)
    maxOffsetMinutes = Math.max(
      maxOffsetMinutes,
      startOffsetMinutes + incrementMinutes
    )
  }

  return {
    minTime: minutesToPlainTime(minOffsetMinutes),
    maxTime: minutesToPlainTime(maxOffsetMinutes),
  }
}
