import {
  dateOptions,
  durations,
  eventTypes,
  UTC,
  type DateOptionType,
} from "@/constants"
import { getWrappedTimeRangeDuration } from "@/utils"
import { generateTimedSlotsForDay } from "@/utils/timedEventSlots"
import { Temporal } from "temporal-polyfill"

interface EventEditorScheduleInput {
  daysOnly: boolean
  daysOnlyType: string
  selectedDateOption: DateOptionType
  selectedDays: Temporal.PlainDate[]
  selectedDaysOfWeek: number[]
  startOnMonday: boolean
  startTime: Temporal.PlainTime
  endTime: Temporal.PlainTime
  timezoneValue: string
  timeIncrementMinutes?: number
}

export interface EventEditorScheduleResult {
  duration: Temporal.Duration
  dates: Temporal.ZonedDateTime[]
  type: string
  normalizedSelectedDays: Temporal.PlainDate[]
  normalizedSelectedDaysOfWeek: number[]
  enabledSlots: Temporal.ZonedDateTime[]
  activeSlots: Temporal.ZonedDateTime[]
  eventTimezone: string
  slotGeneration: {
    startTimeLocal: Temporal.PlainTime
    endTimeLocal: Temporal.PlainTime
    timeIncrement: Temporal.Duration
  }
  timedRecurrence: {
    kind: "specific_dates" | "weekly"
    selectedDays: Temporal.PlainDate[]
    selectedDaysOfWeek: number[]
    startOnMonday: boolean
  }
}

export function buildEventEditorSchedule(
  input: EventEditorScheduleInput
): EventEditorScheduleResult {
  const normalizedSelectedDays = [...input.selectedDays].sort((left, right) =>
    Temporal.PlainDate.compare(left, right)
  )
  let duration = getWrappedTimeRangeDuration(input.startTime, input.endTime)

  if (input.daysOnly) {
    duration = durations.ZERO
    return {
      duration,
      type: input.daysOnlyType,
      dates: normalizedSelectedDays.map(day =>
        day.toZonedDateTime({ timeZone: UTC, plainTime: "00:00" })
      ),
      normalizedSelectedDays,
      normalizedSelectedDaysOfWeek: [],
      enabledSlots: [],
      activeSlots: [],
      eventTimezone: UTC,
      slotGeneration: {
        startTimeLocal: input.startTime,
        endTimeLocal: input.endTime,
        timeIncrement: durations.FIFTEEN_MINUTES,
      },
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: normalizedSelectedDays,
        selectedDaysOfWeek: [],
        startOnMonday: input.startOnMonday,
      },
    }
  }

  const slotGeneration = {
    startTimeLocal: input.startTime,
    endTimeLocal: input.endTime,
    timeIncrement: Temporal.Duration.from({
      minutes: input.timeIncrementMinutes ?? 15,
    }),
  }

  const generateSlotsForDay = (day: Temporal.PlainDate) =>
    generateTimedSlotsForDay({
      day,
      timeZone: input.timezoneValue,
      slotGeneration,
    })

  if (input.selectedDateOption === dateOptions.SPECIFIC) {
    const enabledSlots = normalizedSelectedDays.flatMap((day) =>
      generateSlotsForDay(day)
    )
    return {
      duration,
      type: eventTypes.SPECIFIC_DATES,
      dates: normalizedSelectedDays.map(day =>
        day.toZonedDateTime({
          timeZone: input.timezoneValue,
          plainTime: input.startTime,
        })
      ),
      normalizedSelectedDays,
      normalizedSelectedDaysOfWeek: [],
      enabledSlots,
      activeSlots: [...enabledSlots],
      eventTimezone: input.timezoneValue,
      slotGeneration,
      timedRecurrence: {
        kind: "specific_dates",
        selectedDays: normalizedSelectedDays,
        selectedDaysOfWeek: [],
        startOnMonday: input.startOnMonday,
      },
    }
  }

  const normalizedSelectedDaysOfWeek = [...input.selectedDaysOfWeek]
    .sort((left, right) => left - right)
    .filter(dayIndex => (input.startOnMonday ? dayIndex !== 0 : dayIndex !== 7))

  const now = Temporal.Now.zonedDateTimeISO(input.timezoneValue)
  const currentDayOfWeek = now.dayOfWeek
  const dates = normalizedSelectedDaysOfWeek.map(dayIndex => {
    const targetDayOfWeek = dayIndex === 7 ? 7 : dayIndex
    let daysUntil = targetDayOfWeek - currentDayOfWeek
    if (daysUntil < 0) daysUntil += 7

    return now
      .add({ days: daysUntil })
      .toPlainDate()
      .toZonedDateTime({
        timeZone: input.timezoneValue,
        plainTime: input.startTime,
      })
  })

  return {
    duration,
    dates,
    type: eventTypes.DOW,
    normalizedSelectedDays,
    normalizedSelectedDaysOfWeek,
    enabledSlots: dates.flatMap((date) => generateSlotsForDay(date.toPlainDate())),
    activeSlots: dates.flatMap((date) => generateSlotsForDay(date.toPlainDate())),
    eventTimezone: input.timezoneValue,
    slotGeneration,
    timedRecurrence: {
      kind: "weekly",
      selectedDays: [],
      selectedDaysOfWeek: normalizedSelectedDaysOfWeek,
      startOnMonday: input.startOnMonday,
    },
  }
}
