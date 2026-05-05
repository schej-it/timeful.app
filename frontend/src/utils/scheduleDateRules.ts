import { durations, eventTypes, UTC } from "@/constants"
import type { Timezone } from "@/composables/schedule_overlap/types"
import type { Event } from "@/types"
import { Temporal } from "temporal-polyfill"
import {
  dateCompare,
  dateGt,
  isDateBetweenInclusive,
  rangeContainsInclusive,
} from "./dateRanges"
import type { ZonedDateTime } from "./temporalPrimitives"
import { zdtKey } from "./temporalPrimitives"
import { getDateInTimezone, toZDT } from "./timezoneDateRules"

export type EventLike = Pick<
  Event,
  "type" | "dates" | "daysOnly" | "startOnMonday" | "duration"
>

export interface TimeBlock {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  id?: string
  [key: string]: unknown
}

/** Returns the unique day-start datetimes for specific-times events */
export const getSpecificTimesDayStarts = (
  eventDates: ZonedDateTime[],
  curTimezone: Timezone
): { dateObject: Temporal.ZonedDateTime; isConsecutive: boolean }[] => {
  const days: { dateObject: Temporal.ZonedDateTime; isConsecutive: boolean }[] =
    []
  const datesSoFar = new Set<bigint>()
  let prevDay: Temporal.ZonedDateTime | undefined = undefined

  for (const eventDate of eventDates) {
    const localZDT = getDateInTimezone(eventDate, curTimezone)
    const startOfDayZDT = localZDT.with({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0,
    })

    const startOfDayKey = zdtKey(startOfDayZDT)
    if (!datesSoFar.has(startOfDayKey)) {
      datesSoFar.add(startOfDayKey)

      let isConsecutive = true
      if (prevDay) {
        const expectedNext = prevDay.add({ days: 1 })
        isConsecutive = expectedNext.equals(startOfDayZDT)
      }

      days.push({
        dateObject: startOfDayZDT,
        isConsecutive,
      })

      prevDay = startOfDayZDT
    }
  }

  return days
}

/**
 * Returns a date, transformed to be in the same week of the dows array.
 * `reverse` determines whether to do the opposite calculation (dow date to date)
 */
export const dateToDowDate = (
  dows: ZonedDateTime[],
  date: ZonedDateTime,
  weekOffset: number,
  reverse = false,
  startOnMonday = false,
  renderedWeekStart?: Temporal.ZonedDateTime
): Temporal.ZonedDateTime => {
  const sortedDows = [...dows].sort((date1, date2) => {
    const zdt1 = toZDT(date1, UTC)
    const zdt2 = toZDT(date2, UTC)
    let day1 = zdt1.dayOfWeek
    let day2 = zdt2.dayOfWeek
    if (!startOnMonday) {
      day1 = day1 % 7
      day2 = day2 % 7
    }
    return day1 - day2
  })

  const dowZDT = toZDT(sortedDows[0], UTC)
  const dowWeekStart = dowZDT.subtract({
    days: startOnMonday ? dowZDT.dayOfWeek - 1 : dowZDT.dayOfWeek % 7,
  })

  const adjustedCurWeekStart =
    renderedWeekStart ?? getRenderedWeekStart(weekOffset, startOnMonday)

  const alignedWeekStart = adjustedCurWeekStart.with({
    hour: dowWeekStart.hour,
    minute: dowWeekStart.minute,
    second: dowWeekStart.second,
    millisecond: dowWeekStart.millisecond,
  })

  let dayOffset = Math.round(
    alignedWeekStart.since(dowWeekStart, { largestUnit: "days" }).total("days")
  )

  if (reverse) {
    dayOffset *= -1
  }

  return toZDT(date, UTC).subtract({ days: dayOffset })
}

export const getRenderedWeekStart = (
  weekOffset: number,
  startOnMonday = false,
  referenceDate: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(UTC)
): Temporal.ZonedDateTime =>
  referenceDate
    .subtract({
      days: startOnMonday
        ? referenceDate.dayOfWeek - 1
        : referenceDate.dayOfWeek % 7,
    })
    .add({ weeks: weekOffset })

/**
 * Returns a time block object based on the date object and the hours offset and length
 */
export const getTimeBlock = (
  date: ZonedDateTime,
  hoursOffset: Temporal.Duration,
  hoursLength: Temporal.Duration
): { startDate: Temporal.ZonedDateTime; endDate: Temporal.ZonedDateTime } => {
  const zdt = toZDT(date)
  const startZDT = zdt.add(hoursOffset)
  const endZDT = startZDT.add(hoursLength)

  return {
    startDate: startZDT,
    endDate: endZDT,
  }
}

/**
  Returns an array of a user's calendar events split by date for a given event
*/
export const splitTimeBlocksByDay = <
  T extends {
    id?: string | number
    startDate: Temporal.ZonedDateTime
    endDate: Temporal.ZonedDateTime
  }
>(
  event: EventLike,
  timeBlocks: T[],
  weekOffset = 0,
  timezoneOffset?: Temporal.Duration,
  renderedWeekStart?: Temporal.ZonedDateTime
): T[][] => {
  return processTimeBlocks(
    event.dates ?? [],
    event.duration ?? durations.ZERO,
    timeBlocks,
    event.type,
    weekOffset,
    event.startOnMonday,
    timezoneOffset,
    renderedWeekStart
  )
}

/** Takes an array of time blocks and returns a new array separated by day and with hoursOffset and hoursLength properties */
export const processTimeBlocks = <
  T extends {
    id?: string | number
    startDate: Temporal.ZonedDateTime
    endDate: Temporal.ZonedDateTime
  }
>(
  dates: ZonedDateTime[],
  duration: Temporal.Duration,
  timeBlocks: T[],
  eventType: string = eventTypes.SPECIFIC_DATES,
  weekOffset = 0,
  startOnMonday = false,
  timezoneOffset: Temporal.Duration = durations.ZERO,
  renderedWeekStart?: Temporal.ZonedDateTime
): T[][] => {
  const tzOffset = timezoneOffset
  const projectedWeekStart =
    eventType === eventTypes.DOW || eventType === eventTypes.GROUP
      ? renderedWeekStart ?? getRenderedWeekStart(weekOffset, startOnMonday)
      : undefined
  let blocks: T[] = timeBlocks.map((timeBlock) => ({ ...timeBlock }))
  blocks = blocks.map((block) => {
    if (eventType === eventTypes.DOW || eventType === eventTypes.GROUP) {
      block.startDate = dateToDowDate(
        dates,
        block.startDate,
        weekOffset,
        false,
        startOnMonday,
        projectedWeekStart
      )
      block.endDate = dateToDowDate(
        dates,
        block.endDate,
        weekOffset,
        false,
        startOnMonday,
        projectedWeekStart
      )
    }
    return block
  })
  blocks.sort((a, b) => dateCompare(a.startDate, b.startDate))

  const datesSoFar = new Set<bigint>()
  const timeBlocksByDay: T[][] = []
  for (let index = 0; index < dates.length; ++index) {
    timeBlocksByDay[index] = []
    datesSoFar.add(zdtKey(dates[index]))
  }

  let dayIndex = 0
  for (const date of dates) {
    if (blocks.length === 0) break

    const start = toZDT(date)
    const end = start.add(duration)

    const localDayStart = start.subtract(tzOffset)
    const localDayEnd = end.subtract(tzOffset)

    while (blocks.length > 0 && dateGt(end, blocks[0].startDate)) {
      let [calendarEvent] = blocks.splice(0, 1)

      const calStart = calendarEvent.startDate
      const calEnd = calendarEvent.endDate

      const startDateWithinRange = isDateBetweenInclusive(calStart, start, end)
      const endDateWithinRange = isDateBetweenInclusive(calEnd, start, end)
      const rangeWithinCalendarEvent =
        rangeContainsInclusive(calStart, calEnd, start, end)

      if (
        startDateWithinRange ||
        endDateWithinRange ||
        rangeWithinCalendarEvent
      ) {
        const rangeStartWithinCalendarEvent =
          isDateBetweenInclusive(start, calStart, calEnd)
        const rangeEndWithinCalendarEvent =
          isDateBetweenInclusive(end, calStart, calEnd)

        if (rangeStartWithinCalendarEvent) {
          calendarEvent = {
            ...calendarEvent,
            startDate: start,
          }
        }
        if (rangeEndWithinCalendarEvent) {
          const calendarEventToAdd = {
            ...calendarEvent,
            startDate: end,
          }
          blocks.splice(0, 0, calendarEventToAdd)
          blocks.sort((a, b) => dateCompare(a.startDate, b.startDate))
          calendarEvent = {
            ...calendarEvent,
            endDate: end,
          }
        }

        const updatedCalStartInstant = calendarEvent.startDate
        const updatedCalEndInstant = calendarEvent.endDate

        const hoursOffset =
          (updatedCalStartInstant.epochMilliseconds - start.epochMilliseconds) /
          (1000 * 60 * 60)
        const hoursLength =
          (updatedCalEndInstant.epochMilliseconds -
            updatedCalStartInstant.epochMilliseconds) /
          (1000 * 60 * 60)

        if (hoursLength === 0) continue

        const localStartZDT = updatedCalStartInstant
          .withTimeZone(UTC)
          .subtract(tzOffset)
        const localEndZDT = updatedCalEndInstant.withTimeZone(UTC).subtract(tzOffset)

        const localStartDate = localStartZDT.toPlainDate()
        const localEndDate = localEndZDT.toPlainDate()

        if (!localStartDate.equals(localEndDate)) {
          const splitZDT = localStartZDT
            .with({
              hour: 0,
              minute: 0,
              second: 0,
              millisecond: 0,
            })
            .add({ days: 1 })
          const splitInstant = splitZDT

          const firstHoursLength =
            (splitInstant.epochMilliseconds -
              updatedCalStartInstant.epochMilliseconds) /
            (1000 * 60 * 60)
          const secondHoursLength =
            (updatedCalEndInstant.epochMilliseconds -
              splitInstant.epochMilliseconds) /
            (1000 * 60 * 60)

          timeBlocksByDay[dayIndex].push({
            ...calendarEvent,
            id:
              (typeof calendarEvent.id === "string" ? calendarEvent.id : "") +
              "-1",
            endDate: splitInstant,
            hoursOffset,
            hoursLength: firstHoursLength,
          })
          if (dayIndex + 1 >= timeBlocksByDay.length) {
            timeBlocksByDay.push([])
          }
          timeBlocksByDay[dayIndex + 1].push({
            ...calendarEvent,
            id:
              (typeof calendarEvent.id === "string" ? calendarEvent.id : "") +
              "-2",
            startDate: splitInstant,
            hoursOffset: hoursOffset + firstHoursLength,
            hoursLength: secondHoursLength,
          })
          continue
        }

        const localStartPlain = localStartZDT.toPlainDate()
        if (!localDayStart.toPlainDate().equals(localStartPlain)) {
          if (dayIndex + 1 >= timeBlocksByDay.length) {
            timeBlocksByDay.push([])
          }
          timeBlocksByDay[dayIndex + 1].push({
            ...calendarEvent,
            hoursOffset,
            hoursLength,
          })
          continue
        }

        timeBlocksByDay[dayIndex].push({
          ...calendarEvent,
          hoursOffset,
          hoursLength,
        })
      }
    }

    const localDayStartUTCPlain = localDayStart.withTimeZone(UTC).toPlainDate()
    const localDayEndUTCPlain = localDayEnd.withTimeZone(UTC).toPlainDate()
    if (!localDayStartUTCPlain.equals(localDayEndUTCPlain)) {
      const nextDate = start.add({ days: 1 })
      if (!datesSoFar.has(zdtKey(nextDate))) {
        timeBlocksByDay.push([])
        dayIndex++
      }
    }
    dayIndex++
  }

  return timeBlocksByDay
}

export const getCalendarAccountKey = (
  email: string,
  calendarType: string
): string => {
  return `${email}_${calendarType}`
}
