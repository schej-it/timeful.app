import { eventTypes, timeTypes, dayIndexToDayString } from "@/constants"
import { get } from "./fetch_utils"
import { isBetween } from "./general_utils"
import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)
/*
  Date utils
*/

export type DateLike = Date | string | number
type Timezone = { value?: string; offset?: number } | Record<string, never>
interface StoredTimezone { value?: string; offset?: number }

export interface EventLike {
  type?: string
  dates?: number[]
  daysOnly?: boolean
  startOnMonday?: boolean
  duration?: number
}

export interface TimeBlock {
  startDate: Date | string | number
  endDate: Date | string | number
  id?: string
  [key: string]: unknown
}

/** Returns a string representation of the given date, i.e. May 14th is "5/14" */
export const getDateString = (date: DateLike, utc = false): string => {
  date = new Date(date)
  if (utc) {
    return `${String(date.getUTCMonth() + 1)}/${String(date.getUTCDate())}`
  }
  return `${String(date.getMonth() + 1)}/${String(date.getDate())}`
}

/** Returns a string in the format "Mon, 9/23, 10 AM - 12 PM PDT" given a start date and end date */
export const getStartEndDateString = (
  startDate: Date,
  endDate: Date
): string => {
  const startDay = startDate.toLocaleString("en-US", { weekday: "short" })
  const startMonth = startDate.toLocaleString("en-US", { month: "short" })
  const startDayOfMonth = startDate.toLocaleString("en-US", { day: "numeric" })
  const startTime = startDate.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
  })
  const endTime = endDate.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  })

  return `${startDay}, ${startMonth} ${startDayOfMonth}, ${startTime} - ${endTime}`
}

/** Returns an ISO formatted date string */
export const getISODateString = (date: DateLike, utc = false): string => {
  date = new Date(date)
  if (utc) {
    return date.toISOString().substring(0, 10)
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Returns a string representing date range from date1 to date2, i.e. "5/14 - 5/27" */
export const getDateRangeString = (
  date1: DateLike,
  date2: DateLike,
  utc = false
): string => {
  date1 = new Date(date1)
  date2 = new Date(date2)

  // Correct date2 if time is 12am (because ending at 12am doesn't begin the next day)
  if ((utc && date2.getUTCHours() == 0) || (!utc && date2.getHours() == 0)) {
    date2 = getDateDayOffset(date2, -1)
  }

  return getDateString(date1, utc) + " - " + getDateString(date2, utc)
}

/** Returns a string representing the date range for the provided event */
export const getDateRangeStringForEvent = (event: EventLike): string => {
  if (!event.dates || event.dates.length === 0) return ""
  
  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    let s = ""

    const dayAbbreviations = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (const dateNum of event.dates) {
      const date = getDateWithTimezone(dateNum)

      const abbr = dayAbbreviations[date.getUTCDay()]
      s += abbr + ", "
    }
    s = s.substring(0, s.length - 2)
    return s
  } else if (event.daysOnly) {
    return (
      getDateString(event.dates[0], true) +
      " - " +
      getDateString(event.dates[event.dates.length - 1], true)
    )
  } else if (event.type === eventTypes.SPECIFIC_DATES) {
    const startDate = getDateWithTimezone(new Date(event.dates[0]))
    const endDate = getDateWithTimezone(
      new Date(event.dates[event.dates.length - 1])
    )
    return getDateRangeString(startDate, endDate, true)
  }

  return ""
}

/** Returns a a new date, offset by the timezone in local storage if it exists, offset by local timezone if not */
export const getDateWithTimezone = (date: DateLike): Date => {
  date = new Date(date)

  const rawTz = localStorage.getItem("timezone")
  const timezone: StoredTimezone | null = rawTz
    ? (JSON.parse(rawTz) as StoredTimezone)
    : null

  if (timezone) {
    date.setTime(date.getTime() + (timezone.offset ?? 0) * 60 * 1000)
  } else {
    date.setTime(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000)
  }

  return date
}

/** Returns a new date object with the given date (e.g. 5/2/2022) and the specified time (e.g. "11:30") */
export const getDateWithTime = (date: DateLike, timeString: string): Date => {
  date = new Date(date)

  const { hours, minutes } = splitTime(timeString)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  )
}

/** Returns a new date object with the given date (e.g. 5/2/2022) and the specified timeNum (e.g. 11.5) */
export const getDateWithTimeNum = (
  date: DateLike,
  timeNum: number,
  utc = false
): Date => {
  date = new Date(date)

  const hours = Math.floor(timeNum)
  const minutes = (timeNum - hours) * 60
  if (!utc) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes
    )
  } else {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hours,
        minutes
      )
    )
  }
}

/** Returns a date object from the given mongodb objectId */
export const dateFromObjectId = function (objectId: string): Date {
  return new Date(parseInt(objectId.substring(0, 8), 16) * 1000)
}

/** Takes a time string (e.g. 13:30) and splits it into hours and minutes, returning an object of the form { hours, minutes } */
export const splitTime = (
  timeString: string
): { hours: number; minutes: number } => {
  const [hours, minutes] = timeString.split(":")
  return { hours: parseInt(hours), minutes: parseInt(minutes) }
}

/** Takes a timeNum (e.g. 9.5) and splits it into hours and minutes, returning an object of the form { hours, minutes } */
export const splitTimeNum = (
  timeNum: number
): { hours: number; minutes: number } => {
  const hours = Math.floor(timeNum)
  const minutes = Math.floor((timeNum - hours) * 60)
  return { hours, minutes }
}

/** Returns the specified date offset by the given number of days (can be positive or negative) */
export const getDateDayOffset = (date: DateLike, offset: number): Date => {
  date = new Date(date)
  return new Date(date.getTime() + offset * 24 * 60 * 60 * 1000)
}

/** Returns the specified date offset by the given number of hours */
export const getDateHoursOffset = (
  date: DateLike,
  hoursOffset: number
): Date => {
  const { hours, minutes } = splitTimeNum(hoursOffset)
  const newDate = new Date(date)
  newDate.setHours(newDate.getHours() + hours)
  newDate.setMinutes(newDate.getMinutes() + minutes)
  return newDate
}

/** Returns the date used to derive timezone offsets for the current event view */
export const getTimezoneReferenceDateForEvent = (
  event: EventLike,
  weekOffset = 0
): Date => {
  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    const referenceDate = new Date()
    referenceDate.setDate(referenceDate.getDate() + weekOffset * 7)
    referenceDate.setHours(12, 0, 0, 0)
    return referenceDate
  }

  if (event.dates && event.dates.length > 0) {
    return new Date(event.dates[0])
  }

  return new Date()
}

/** Returns the timezone offset for a timezone at a specific date */
export const getTimezoneOffsetForDate = (
  curTimezone: Timezone,
  referenceDate: DateLike
): number => {
  if (!("offset" in curTimezone)) {
    return new Date(referenceDate).getTimezoneOffset()
  }

  if (!curTimezone.value) {
    return (curTimezone.offset ?? 0) * -1
  }

  return dayjs(referenceDate).tz(curTimezone.value).utcOffset() * -1
}

/** Returns the timezone offset used by ScheduleOverlap for the current event view */
export const getScheduleTimezoneOffset = (
  event: EventLike,
  curTimezone: Timezone,
  weekOffset = 0
): number => {
  return getTimezoneOffsetForDate(
    curTimezone,
    getTimezoneReferenceDateForEvent(event, weekOffset)
  )
}
const getDateInTimezone = (date: DateLike, curTimezone: Timezone) => {
  if (curTimezone.value) {
    return dayjs(date).tz(curTimezone.value)
  }

  if ("offset" in curTimezone) {
    return dayjs(date).utcOffset(curTimezone.offset ?? 0)
  }

  return dayjs(date)
}

/** Returns the unique day-start datetimes for specific-times events */
export const getSpecificTimesDayStarts = (
  eventDates: DateLike[],
  curTimezone: Timezone
): { dateObject: Date; isConsecutive: boolean }[] => {
  const days: { dateObject: Date; isConsecutive: boolean }[] = []
  const datesSoFar = new Set<number>()
  let prevDay: dayjs.Dayjs | null = null

  for (const eventDate of eventDates) {
    const localDate = getDateInTimezone(eventDate, curTimezone)
      .startOf("day")
      .toDate()

    if (!datesSoFar.has(localDate.getTime())) {
      datesSoFar.add(localDate.getTime())

      let isConsecutive = true
      if (prevDay) {
        isConsecutive = prevDay
          .add(1, "day")
          .isSame(getDateInTimezone(localDate, curTimezone), "day")
      }

      days.push({
        dateObject: localDate,
        isConsecutive,
      })

      prevDay = getDateInTimezone(localDate, curTimezone)
    }
  }

  return days
}

/**
 * Returns a date, transformed to be in the same week of the dows array.
 * `reverse` determines whether to do the opposite calculation (dow date to date)
 */
export const dateToDowDate = (
  dows: DateLike[],
  date: DateLike,
  weekOffset: number,
  reverse = false,
  startOnMonday = false
): Date => {
  // Sort dows to make sure first date is not Saturday when there are multiple dates
  // (as such is the case when an event is created in Tokyo and you're answering in Mountain View)
  // This fixes the dayOffset calculation so that events are displayed in the correct week
  dows = [...dows].sort((date1, date2) => {
    let day1 = new Date(date1).getUTCDay()
    let day2 = new Date(date2).getUTCDay()
    if (startOnMonday) {
      if (day1 === 0) day1 = 7
      if (day2 === 0) day2 = 7
    }
    return day1 - day2
  })

  // Get Sunday of the week containing the dows
  const dowSunday = new Date(dows[0])
  dowSunday.setUTCDate(dowSunday.getUTCDate() - dowSunday.getUTCDay())

  // Get Sunday of the current week offset by weekOffset
  const curSunday = new Date()
  curSunday.setUTCDate(curSunday.getUTCDate() - curSunday.getUTCDay())
  curSunday.setUTCDate(curSunday.getUTCDate() + 7 * weekOffset)
  curSunday.setUTCHours(dowSunday.getUTCHours())
  curSunday.setUTCMinutes(dowSunday.getUTCMinutes())
  curSunday.setUTCSeconds(dowSunday.getUTCSeconds())
  curSunday.setUTCMilliseconds(dowSunday.getUTCMilliseconds())

  // Get the amount of days between both of the sundays
  let dayOffset = Math.round(
    (curSunday.getTime() - dowSunday.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Reverse calculation if necessary
  if (reverse) {
    dayOffset *= -1
  }

  // Offset date by the amount of days between the two sundays
  date = new Date(date)
  date.setUTCDate(date.getUTCDate() - dayOffset)

  return date
}

/** Converts a timeNum (e.g. 13) to a timeText (e.g. "1 pm") */
export const timeNumToTimeText = (timeNum: number, hour12 = true): string => {
  const hours = Math.floor(timeNum)
  const minutesDecimal = timeNum - hours
  const minutesString =
    minutesDecimal > 0
      ? `:${String(Math.floor(minutesDecimal * 60)).padStart(2, "0")}`
      : ""

  if (hour12) {
    if (timeNum >= 0 && timeNum < 1) return `12${minutesString} am`
    else if (timeNum < 12) return `${String(hours)}${minutesString} am`
    else if (timeNum >= 12 && timeNum < 13) return `12${minutesString} pm`
    return `${String(hours - 12)}${minutesString} pm`
  }

  return `${String(hours)}:${minutesString.length > 0 ? minutesString : "00"}`
}

/** Converts a timeNum (e.g. 9.5) to a timeString (e.g. 09:30:00) */
export const timeNumToTimeString = (timeNum: number): string => {
  const hours = Math.floor(timeNum)
  const minutesDecimal = timeNum - hours
  const paddedHours = String(hours).padStart(2, "0")
  const paddedMinutes = String(Math.floor(minutesDecimal * 60)).padStart(2, "0")

  return `${paddedHours}:${paddedMinutes}:00`
}

/** Converts a date to a timeNum (e.g. 9.5) */
export const dateToTimeNum = (date: DateLike, utc = false): number => {
  date = new Date(date)
  if (utc) {
    return date.getUTCHours() + date.getUTCMinutes() / 60
  }
  return date.getHours() + date.getMinutes() / 60
}

/** Clamps the date to the given time, type can either be "upper" or "lower" */
export const clampDateToTimeNum = (
  date: Date,
  timeNum: number,
  type: "upper" | "lower"
): Date => {
  const diff = dateToTimeNum(date) - timeNum
  if (type === "upper" && diff < 0) {
    return getDateWithTimeNum(date, timeNum)
  } else if (type === "lower" && diff > 0) {
    return getDateWithTimeNum(date, timeNum)
  }

  // Return original date
  return date
}

/** Returns negative if date1 < date2, positive if date2 > date1, and 0 if date1 == date2 */
export const dateCompare = (date1: DateLike, date2: DateLike): number => {
  date1 = new Date(date1)
  date2 = new Date(date2)
  return date1.getTime() - date2.getTime()
}

/** Returns whether the given date is between startDate and endDate */
export const isDateBetween = (
  date: DateLike,
  startDate: DateLike,
  endDate: DateLike
): boolean => {
  const d = new Date(date).getTime()
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  return d >= start && d <= end
}

/** Returns the number of days in the given month */
export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate()
}

/** returns -1 if a is before b, 1 if a is after b, 0 otherwise */
export const compareDateDay = (a: DateLike, b: DateLike): number => {
  a = new Date(a)
  b = new Date(b)
  if (a.getFullYear() !== b.getFullYear()) {
    return a.getFullYear() - b.getFullYear()
  } else if (a.getMonth() !== b.getMonth()) {
    return a.getMonth() - b.getMonth()
  } else {
    return a.getDate() - b.getDate()
  }
}

/**
Returns whether the given timeNum is between date1 and date2
such that date1.getHour() <= timeNum <= date2.getHour(), accounting
for the possibility that date1 and date2 might be on separate days
*/
export const isTimeNumBetweenDates = (
  timeNum: number,
  date1: Date,
  date2: Date
): boolean => {
  const hour1 = date1.getHours()
  const hour2 = date2.getHours()

  if (hour1 <= hour2) {
    return hour1 <= timeNum && timeNum <= hour2
  } else {
    return (
      (hour1 <= timeNum && timeNum < 24) || (0 <= timeNum && timeNum <= hour2)
    )
  }
}

/** Returns whether date is in between startDate and startDate + duration (in hours) */
export const isDateInRange = (
  date: Date,
  startDate: Date,
  duration: number
): boolean => {
  const endDate = new Date(startDate)
  endDate.setHours(endDate.getHours() + duration)
  return startDate <= date && date <= endDate
}

/** Converts a utc time int to a local time int based on the timezoneOffset */
export const utcTimeToLocalTime = (
  timeNum: number,
  timezoneOffset: number = new Date().getTimezoneOffset()
): number => {
  let localTimeNum = timeNum - timezoneOffset / 60
  localTimeNum %= 24
  if (localTimeNum < 0) localTimeNum += 24

  return localTimeNum
}

/** Converts a timestamp from a specified timezone to UTC */
export const convertToUTC = (
  dateTimeString: string,
  timezoneValue: string
): Date => {
  // Parse the date string (assumed to be in ISO format without timezone, e.g., "2026-01-03T09:00:00")
  // Treat it as being in the determined timezone
  try {
    const dateInTimezone = dayjs.tz(dateTimeString, timezoneValue)
    if (!dateInTimezone.isValid()) {
      throw new Error(`Invalid date string: ${dateTimeString}`)
    }
    // Convert to UTC
    return dateInTimezone.utc().toDate()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to convert timezone: ${message}. Timezone: ${timezoneValue}`,
      { cause: err }
    )
  }
}

/** Checks if a date/time falls within an event's date and time range */
export const isTimeWithinEventRange = (
  dateTime: DateLike,
  eventDates: DateLike[],
  eventStartTime: number,
  eventDuration: number
): boolean => {
  const slotDate = new Date(dateTime)
  const slotDateOnly = new Date(
    slotDate.getUTCFullYear(),
    slotDate.getUTCMonth(),
    slotDate.getUTCDate()
  )

  // Check if slot's date matches any event date
  let matchingEventDate: Date | null = null
  for (const eventDate of eventDates) {
    const eventDateObj = new Date(eventDate)
    const eventDateOnly = new Date(
      eventDateObj.getUTCFullYear(),
      eventDateObj.getUTCMonth(),
      eventDateObj.getUTCDate()
    )
    if (slotDateOnly.getTime() === eventDateOnly.getTime()) {
      matchingEventDate = eventDateObj
      break
    }
  }

  if (!matchingEventDate) {
    return false
  }

  // Check if slot's time falls within event's time range for this date
  const eventStartDateTime = new Date(matchingEventDate)
  eventStartDateTime.setUTCHours(Math.floor(eventStartTime))
  eventStartDateTime.setUTCMinutes((eventStartTime % 1) * 60)

  const eventEndDateTime = new Date(eventStartDateTime)
  eventEndDateTime.setUTCHours(
    eventEndDateTime.getUTCHours() + Math.floor(eventDuration)
  )
  eventEndDateTime.setUTCMinutes(
    eventEndDateTime.getUTCMinutes() + (eventDuration % 1) * 60
  )

  return (
    slotDate.getTime() >= eventStartDateTime.getTime() &&
    slotDate.getTime() <= eventEndDateTime.getTime()
  )
}

/** Converts an array of UTC date slots to ISO string format in a specified timezone */
export const convertUTCSlotsToLocalISO = (
  slots: DateLike[] | null | undefined,
  timezoneValue: string | null = null
): string[] => {
  if (!slots || !Array.isArray(slots)) return []

  return slots.map((slot) => {
    try {
      const date = dayjs.utc(slot)
      if (!date.isValid()) {
        throw new Error(`Invalid UTC timestamp: ${String(slot)}`)
      }
      // If no timezone provided, return UTC (with Z)
      if (!timezoneValue) {
        return date.format("YYYY-MM-DDTHH:mm:ss[Z]")
      }
      // Convert to specified timezone and return without timezone suffix
      return date.tz(timezoneValue).format("YYYY-MM-DDTHH:mm:ss")
    } catch {
      if (slot instanceof Date) {
        return slot.toISOString()
      }
      return new Date(slot).toISOString()
    }
  })
}

/** Returns a string representing the current timezone */
export const getCurrentTimezone = (): string => {
  return new Date()
    .toLocaleTimeString("en-us", { timeZoneName: "short" })
    .split(" ")[2]
}

/** Returns the preferred locale of the user
 * Source: https://stackoverflow.com/questions/673905/how-can-i-determine-a-users-locale-within-the-browser
 */
export const getLocale = (): string => {
  return navigator.languages[0] ?? navigator.language
}

/** Returns whether the user prefers 12h time */
export const userPrefers12h = (): boolean => {
  return (
    Intl.DateTimeFormat(getLocale(), { hour: "numeric" }).resolvedOptions()
      .hour12 ?? true
  )
}

/** Returns an array of time options based on whether user prefers 12h or 24h */
export const getTimeOptions = (): {
  text: string
  time: number
  value: number
}[] => {
  const prefers12h = !localStorage.timeType
    ? userPrefers12h()
    : localStorage.timeType === timeTypes.HOUR12

  const times: { text: string; time: number; value: number }[] = []
  if (prefers12h) {
    times.push({ text: "12 am", time: 0, value: 0 })
    for (let h = 1; h < 12; ++h) {
      times.push({ text: `${String(h)} am`, time: h, value: h })
    }
    for (let h = 0; h < 12; ++h) {
      times.push({ text: `${String(h == 0 ? 12 : h)} pm`, time: h + 12, value: h + 12 })
    }
    times.push({ text: "12 am", time: 0, value: 24 })

    return times
  }

  for (let h = 0; h < 24; ++h) {
    times.push({ text: `${String(h)}:00`, time: h, value: h })
  }
  times.push({ text: "0:00", time: 0, value: 24 })
  return times
}

/**
  Returns an object of the users' calendar events for each calendar account for the given event, filtering for events
  only between the time ranges of the event and clamping calendar events that extend beyond the time
  ranges
  weekOffset specifies the amount of weeks forward or backward to display events for (only used for weekly Timefuls)
*/
export const getCalendarEventsMap = async (
  event: EventLike,
  { weekOffset = 0, eventId = "" }: { weekOffset?: number; eventId?: string }
): Promise<unknown> => {
  let timeMin: string | undefined
  let timeMax: string | undefined
  if (!event.dates || event.dates.length === 0) {
    return Promise.resolve([])
  }
  
  if (event.type === eventTypes.SPECIFIC_DATES) {
    // Get all calendar events between the first date and the last date in dates
    timeMin = new Date(event.dates[0]).toISOString()
    timeMax = getDateDayOffset(
      new Date(event.dates[event.dates.length - 1]),
      2
    ).toISOString()
  } else if (
    event.type === eventTypes.DOW ||
    event.type === eventTypes.GROUP
  ) {
    // Get all calendar events for the current week offsetted by weekOffset
    const firstDate = dateToDowDate(
      event.dates,
      event.dates[0],
      weekOffset,
      true,
      event.startOnMonday
    )
    const lastDate = dateToDowDate(
      event.dates,
      event.dates[event.dates.length - 1],
      weekOffset,
      true,
      event.startOnMonday
    )
    timeMin = getDateDayOffset(firstDate, -2).toISOString()
    timeMax = getDateDayOffset(lastDate, 2).toISOString()
  }

  // Fetch calendar events from Google Calendar
  let calendarEventsMap
  if (eventId.length === 0) {
    calendarEventsMap = await get(
      `/user/calendars?timeMin=${timeMin ?? ""}&timeMax=${timeMax ?? ""}`
    )
  } else {
    calendarEventsMap = await get(
      `/events/${eventId}/calendar-availabilities?timeMin=${timeMin ?? ""}&timeMax=${timeMax ?? ""}`
    )
  }

  return calendarEventsMap
}

/**
 * Returns a time block object based on the date object and the hours offset and length
 */
export const getTimeBlock = (
  date: Date,
  hoursOffset: number,
  hoursLength: number
): { startDate: Date; endDate: Date } => {
  const startDate = new Date(date.getTime() + hoursOffset * 60 * 60 * 1000)
  const endDate = new Date(startDate.getTime() + hoursLength * 60 * 60 * 1000)
  return {
    startDate: startDate,
    endDate: endDate,
  }
}

/**
  Returns an array of a user's calendar events split by date for a given event
*/
export const splitTimeBlocksByDay = <T extends { startDate: Date | string | number; endDate: Date | string | number; [key: string]: unknown }>(
  event: EventLike,
  timeBlocks: T[],
  weekOffset = 0,
  timezoneOffset: number | null = null
): T[][] => {
  return processTimeBlocks(
    event.dates ?? [],
    event.duration ?? 0,
    timeBlocks,
    event.type,
    weekOffset,
    event.startOnMonday,
    timezoneOffset
  )
}

/** Takes an array of time blocks and returns a new array separated by day and with hoursOffset and hoursLength properties */
export const processTimeBlocks = <T extends { startDate: Date | string | number; endDate: Date | string | number; [key: string]: unknown }>(
  dates: DateLike[],
  duration: number,
  timeBlocks: T[],
  eventType: string = eventTypes.SPECIFIC_DATES,
  weekOffset = 0,
  startOnMonday = false,
  timezoneOffset: number | null = 0
): T[][] => {
  const tzOffset = timezoneOffset ?? 0
  // Put timeBlocks into the correct format
  let blocks: T[] = JSON.parse(JSON.stringify(timeBlocks)) as T[] // Make a copy so we don't mutate original array
  blocks = blocks.map((e) => {
    if (eventType === eventTypes.DOW || eventType === eventTypes.GROUP) {
      e.startDate = dateToDowDate(
        dates,
        e.startDate,
        weekOffset,
        false,
        startOnMonday
      )
      e.endDate = dateToDowDate(
        dates,
        e.endDate,
        weekOffset,
        false,
        startOnMonday
      )
    } else {
      e.startDate = new Date(e.startDate)
      e.endDate = new Date(e.endDate)
    }
    return e
  })
  blocks.sort((a, b) =>
    dateCompare(a.startDate, b.startDate)
  )

  // Format array of calendar events by day
  const datesSoFar = new Set<number>()
  const timeBlocksByDay: T[][] = []
  for (let i = 0; i < dates.length; ++i) {
    timeBlocksByDay[i] = []
    const date = new Date(dates[i])
    datesSoFar.add(date.getTime())
  }

  // Iterate through all dates and add calendar events to array
  let i = 0
  for (const date of dates) {
    if (blocks.length == 0) break

    const start = new Date(date)
    const end = new Date(start)
    end.setHours(start.getHours() + duration)

    const localDayStart = new Date(start.getTime() - tzOffset * 60 * 1000)
    const localDayEnd = new Date(end.getTime() - tzOffset * 60 * 1000)

    // Keep iterating through calendar events until it's empty or there are no more events for the current date
    while (blocks.length > 0 && end > (blocks[0].startDate as Date)) {
      let [calendarEvent] = blocks.splice(0, 1)

      // Check if calendar event overlaps with event time ranges
      const startDateWithinRange = isBetween(
        calendarEvent.startDate as Date,
        start,
        end
      )
      const endDateWithinRange = isBetween(
        calendarEvent.endDate as Date,
        start,
        end
      )
      const rangeWithinCalendarEvent =
        isBetween(
          start,
          calendarEvent.startDate as Date,
          calendarEvent.endDate as Date
        ) &&
        isBetween(
          end,
          calendarEvent.startDate as Date,
          calendarEvent.endDate as Date
        )
      if (
        startDateWithinRange ||
        endDateWithinRange ||
        rangeWithinCalendarEvent
      ) {
        const rangeStartWithinCalendarEvent = isBetween(
          start,
          calendarEvent.startDate as Date,
          calendarEvent.endDate as Date
        )
        const rangeEndWithinCalendarEvent = isBetween(
          end,
          calendarEvent.startDate as Date,
          calendarEvent.endDate as Date
        )
        if (rangeStartWithinCalendarEvent) {
          // Clamp calendarEvent start
          calendarEvent = { ...calendarEvent, startDate: start }
        }
        if (rangeEndWithinCalendarEvent) {
          // If the calendar event potentially goes to the next day, we need to add a new time block for it (this is mostly for all day events spanning multiple days)
          const calendarEventToAdd = { ...calendarEvent, startDate: end }
          blocks.splice(0, 0, calendarEventToAdd)
          blocks.sort((a, b) =>
            dateCompare(a.startDate, b.startDate)
          )
          // Clamp calendarEvent end
          calendarEvent = { ...calendarEvent, endDate: end }
        }

        // The number of hours since start time
        const hoursOffset =
          ((calendarEvent.startDate as Date).getTime() - start.getTime()) /
          (1000 * 60 * 60)

        // The length of the event in hours
        const hoursLength =
          ((calendarEvent.endDate as Date).getTime() -
            (calendarEvent.startDate as Date).getTime()) /
          (1000 * 60 * 60)

        // Don't display event if the event is 0 hours long
        if (hoursLength == 0) continue

        // Check if the event goes into the next day
        // Format the UTC date to be in the selected timezone
        const localStart = new Date(
          (calendarEvent.startDate as Date).getTime() - tzOffset * 60 * 1000
        )
        const localEnd = new Date(
          (calendarEvent.endDate as Date).getTime() - tzOffset * 60 * 1000
        )
        if (localStart.getUTCDate() !== localEnd.getUTCDate()) {
          // The event goes into the next day. Split the event into two time blocks
          const splitDate = new Date(localStart)
          splitDate.setUTCDate(splitDate.getUTCDate() + 1)
          splitDate.setUTCHours(0, 0, 0, 0)
          splitDate.setTime(splitDate.getTime() + tzOffset * 60 * 1000)
          const firstTimeBlock = {
            ...calendarEvent,
            id: (typeof calendarEvent.id === 'string' ? calendarEvent.id : "") + "-1",
            endDate: splitDate,
            hoursOffset: hoursOffset,
            hoursLength: hoursLength,
          }
          const firstHoursLength =
            ((firstTimeBlock.endDate).getTime() -
              (firstTimeBlock.startDate as Date).getTime()) /
            (1000 * 60 * 60)
          const secondTimeBlock = {
            ...calendarEvent,
            id: (typeof calendarEvent.id === 'string' ? calendarEvent.id : "") + "-2",
            startDate: splitDate,
            hoursOffset: hoursOffset + firstHoursLength,
            hoursLength: hoursLength - firstHoursLength,
          }
          const secondHoursLength =
            ((secondTimeBlock.endDate as Date).getTime() -
              (secondTimeBlock.startDate).getTime()) /
            (1000 * 60 * 60)
          timeBlocksByDay[i].push({
            ...firstTimeBlock,
            hoursOffset: hoursOffset,
            hoursLength: firstHoursLength,
          })
          if (i + 1 >= timeBlocksByDay.length) {
            timeBlocksByDay.push([])
          }
          timeBlocksByDay[i + 1].push({
            ...secondTimeBlock,
            hoursOffset: hoursOffset + firstHoursLength,
            hoursLength: secondHoursLength,
          })
          continue
        } else if (localDayStart.getUTCDate() !== localStart.getUTCDate()) {
          // The event starts on the next day. move the event to the next day
          if (i + 1 >= timeBlocksByDay.length) {
            timeBlocksByDay.push([])
          }
          timeBlocksByDay[i + 1].push({
            ...calendarEvent,
            hoursOffset,
            hoursLength,
          })
          continue
        }

        timeBlocksByDay[i].push({
          ...calendarEvent,
          hoursOffset,
          hoursLength,
        })
      }
    }

    // Check if the start and end of the current day are on different days in this timezone
    if (localDayStart.getUTCDate() !== localDayEnd.getUTCDate()) {
      const nextDate = new Date(start)
      nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      if (!datesSoFar.has(nextDate.getTime())) {
        // The start and end of the current day are on different days in this timezone, append a new index to the timeBlocksByDay array
        timeBlocksByDay.push([])
        i += 1
      }
    }
    i++
  }

  return timeBlocksByDay
}

export const getCalendarAccountKey = (
  email: string,
  calendarType: string
): string => {
  return `${email}_${calendarType}`
}

export const stdTimezoneOffset = (date: Date): number => {
  const jan = new Date(date.getFullYear(), 0, 1)
  const jul = new Date(date.getFullYear(), 6, 1)
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
}

export const doesDstExist = (date: Date): boolean => {
  return date.getTimezoneOffset() !== stdTimezoneOffset(date)
}

export const isDstObserved = (date: Date): boolean => {
  return date.getTimezoneOffset() < stdTimezoneOffset(date)
}

/** Returns true if the given IANA timezone observes daylight saving time */
export const timezoneObservesDST = (ianaTimezone: string): boolean => {
  if (!ianaTimezone) return false
  const jan = dayjs.tz("2024-01-15 12:00", ianaTimezone)
  const jul = dayjs.tz("2024-07-15 12:00", ianaTimezone)
  return jan.utcOffset() !== jul.utcOffset()
}

interface DOWSlot {
  start: string
  end: string
  status?: string
}

type DOWValidationResult = { valid: false; error: string } | null

/** Validates a DOW (Days of Week) event payload */
export const validateDOWPayload = (
  slots: DOWSlot[],
  skipSameDayCheck = false
): DOWValidationResult => {
  if (!Array.isArray(slots)) {
    return { valid: false, error: "Slots must be an array" }
  }

  // Empty array is valid (clears all availability)
  if (slots.length === 0) {
    return null
  }

  // Create a Set of valid DOW dates for fast lookup
  const validDOWDates = new Set<string>(dayIndexToDayString)

  // Time format regex: YYYY-MM-DDTHH:mm:ss
  const timeFormatRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]

    const iStr = String(i)

    // Validate slot has required fields
    if (!slot.start || !slot.end) {
      return {
        valid: false,
        error: `Slot at index ${iStr} is missing required 'start' or 'end' field`,
      }
    }

    if (typeof slot.start !== "string" || typeof slot.end !== "string") {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid 'start' or 'end' type (must be strings)`,
      }
    }

    // Validate time format
    if (!timeFormatRegex.test(slot.start) || !timeFormatRegex.test(slot.end)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid time format. Expected format: YYYY-MM-DDTHH:mm:ss (e.g., "2018-06-18T09:00:00")`,
      }
    }

    // Parse the date/time strings
    const startMatch = timeFormatRegex.exec(slot.start)
    const endMatch = timeFormatRegex.exec(slot.end)

    if (!startMatch || !endMatch) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid time format`,
      }
    }

    // Extract date and time components
    const startYear = parseInt(startMatch[1], 10)
    const startMonth = parseInt(startMatch[2], 10)
    const startDay = parseInt(startMatch[3], 10)
    const startHour = parseInt(startMatch[4], 10)
    const startMinute = parseInt(startMatch[5], 10)
    const startSecond = parseInt(startMatch[6], 10)

    const endYear = parseInt(endMatch[1], 10)
    const endMonth = parseInt(endMatch[2], 10)
    const endDay = parseInt(endMatch[3], 10)
    const endHour = parseInt(endMatch[4], 10)
    const endMinute = parseInt(endMatch[5], 10)
    const endSecond = parseInt(endMatch[6], 10)

    // Validate time components are within valid ranges
    if (
      startHour < 0 ||
      startHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      startSecond < 0 ||
      startSecond > 59
    ) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid start time: hours must be 0-23, minutes and seconds must be 0-59`,
      }
    }

    // Validate end time: hours 0-24, but if hour is 24, minutes and seconds must be 00:00
    if (endHour < 0 || endHour > 24) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid end time: hours must be 0-24`,
      }
    }

    if (endHour === 24) {
      if (endMinute !== 0 || endSecond !== 0) {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid end time: if hour is 24, minutes and seconds must be 00:00`,
        }
      }
    } else {
      if (
        endMinute < 0 ||
        endMinute > 59 ||
        endSecond < 0 ||
        endSecond > 59
      ) {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid end time: minutes and seconds must be 0-59`,
        }
      }
    }

    // Format date part (YYYY-MM-DD) for validation
    const startDateStr = `${String(startYear)}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`
    const endDateStr = `${String(endYear)}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`

    // Validate dates belong to hardcoded DOW dates
    if (!validDOWDates.has(startDateStr)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid start date: ${startDateStr}. Must be one of the hardcoded DOW dates: ${Array.from(validDOWDates).join(", ")}`,
      }
    }

    if (!validDOWDates.has(endDateStr)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid end date: ${endDateStr}. Must be one of the hardcoded DOW dates: ${Array.from(validDOWDates).join(", ")}`,
      }
    }

    // Validate that start and end are on the same day
    // Skip this check if skipSameDayCheck is true (e.g., when timezone conversion may cause day boundary crossing)
    if (!skipSameDayCheck && startDateStr !== endDateStr) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has start and end times on different days (${startDateStr} vs ${endDateStr}). Start and end must be on the same day of the week.`,
      }
    }

    // Validate that start time is before end time
    // Handle 24:00:00 as end of day (convert to next day 00:00:00 for comparison)
    let endTimeString = slot.end
    if (endHour === 24) {
      // Convert 24:00:00 to next day 00:00:00 for proper comparison
      const endDate = dayjs(slot.end.substring(0, 10)) // Get just the date part
      endTimeString = endDate.add(1, "day").format("YYYY-MM-DDTHH:mm:ss")
    }

    const startDateTime = dayjs(slot.start)
    const endDateTime = dayjs(endTimeString)

    if (!startDateTime.isValid() || !endDateTime.isValid()) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid date/time values that cannot be parsed`,
      }
    }

    if (
      endDateTime.isBefore(startDateTime) ||
      endDateTime.isSame(startDateTime)
    ) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has end time that is before or equal to start time`,
      }
    }

    // Validate status field if present
    if (slot.status !== undefined) {
      if (slot.status !== "available" && slot.status !== "if-needed") {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid status '${slot.status}'. Must be 'available' or 'if-needed'`,
        }
      }
    }
  }

  // All validations passed
  return null
}
