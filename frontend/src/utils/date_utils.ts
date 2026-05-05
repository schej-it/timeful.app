/**
 * Date utilities - Using Temporal API exclusively
 *
 * This file uses Temporal API for all date/time operations.
 * The Temporal API provides better timezone support, immutability, and clearer APIs.
 *
 * Key principles:
 * - All internal operations use Temporal.ZonedDateTime or Temporal.ZonedDateTime
 * - No Date | string | number unions - strict Temporal typing throughout
 * - Conversion at boundaries handled by adapter functions from types/index.ts
 */

import type { Temporal } from "temporal-polyfill"
import type { EventLike as EventDateRulesEventLike } from "./eventDateRules"

/*
  Date utils
*/

// Use the application Event type which already has Temporal.ZonedDateTime[] dates
export type EventLike = EventDateRulesEventLike

export type { PlainDate, PlainTime, ZonedDateTime } from "./temporalPrimitives"
export {
  compareDuration,
  durationEquals,
  fromEpochMillisecondsToZDT,
  parseTemporalEpochKey,
  zdtEquals,
  zdtKey,
  zdtMapGet,
  zdtMapGetOrInsert,
  zdtMapHas,
  ZdtMap,
  zdtSetDelete,
  zdtSetHas,
  ZdtSet,
} from "./temporalPrimitives"

export {
  compareDateDay,
  dateCompare,
  dateEq,
  dateGeq,
  dateGt,
  dateLeq,
  dateLt,
  isDateBetween,
  isDateBetweenInclusive,
  isDateInRange,
  isTimeNumBetweenDates,
  rangeContainsInclusive,
  rangesOverlap,
} from "./dateRanges"

export {
  dateToTimeNum,
  getDateDayOffset,
  getDateHoursOffset,
  getDateWithTimeNum,
  getWrappedTimeRangeDuration,
  plainTimeToTimeNum,
  splitTimeNum,
  timeNumToPlainTime,
  utcTimeToLocalTime,
  utcTimeToLocalTimeNum,
} from "./timeConversions"

export {
  getDateRangeString,
  getDateRangeStringForEvent,
  getDateString,
  getDaysInMonth,
  getISODateString,
  getStartEndDateString,
  timeNumToTimeString,
  timeNumToTimeText,
} from "./dateFormatting"

export { convertToUTC, convertUTCSlotsToLocalISO, dateFromObjectId } from "./dateBoundaryAdapters"

// Extracted timezone/date rules.
export type { EventLike as TimezoneEventLike } from "./timezoneDateRules"
export {
  getEventMembershipDayOfWeekValues,
  getEventMembershipPlainDates,
  getEventTimeSeed,
  getTimezoneReferenceDateForEvent,
  isTimeWithinEventRange,
} from "./eventDateRules"

export {
  doesDstExist,
  getCurrentTimezone,
  getDateInTimezone,
  getDateWithTimezone,
  getFixedOffsetTimeZoneId,
  getScheduleTimezoneOffset,
  getTimezoneOffset,
  getTimezoneOffsetForDate,
  isDstObserved,
  stdTimezoneOffset,
  timezoneObservesDST,
  toZDT,
} from "./timezoneDateRules"

// Extracted browser preference boundary helpers.
export { getLocale, getTimeOptions, userPrefers12h } from "./browserDatePreferences"
export type { DOWSlot, DOWValidationResult } from "./dateValidation"
export { validateDOWPayload } from "./dateValidation"
export {
  dateToDowDate,
  getCalendarAccountKey,
  getRenderedWeekStart,
  getSpecificTimesDayStarts,
  getTimeBlock,
  processTimeBlocks,
  splitTimeBlocksByDay,
} from "./scheduleDateRules"
export {
  getCalendarAvailabilityQueryWindow,
  getCalendarEventsMap,
} from "./services/CalendarAvailabilityService"

export interface TimeBlock {
  startDate: Temporal.ZonedDateTime
  endDate: Temporal.ZonedDateTime
  id?: string
  [key: string]: unknown
}
