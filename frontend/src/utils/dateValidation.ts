import { dayIndexToDayString } from "@/constants"
import { Temporal } from "temporal-polyfill"

export interface DOWSlot {
  start: string
  end: string
  status?: string
}

export type DOWValidationResult = { valid: false; error: string } | null

/** Validates a DOW (Days of Week) event payload */
export const validateDOWPayload = (
  slots: DOWSlot[],
  skipSameDayCheck = false
): DOWValidationResult => {
  if (!Array.isArray(slots)) {
    return { valid: false, error: "Slots must be an array" }
  }

  if (slots.length === 0) {
    return null
  }

  const validDOWDates = new Set<string>(dayIndexToDayString)
  const timeFormatRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const iStr = String(i)

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

    if (!timeFormatRegex.test(slot.start) || !timeFormatRegex.test(slot.end)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid time format. Expected format: YYYY-MM-DDTHH:mm:ss (e.g., "2018-06-18T09:00:00")`,
      }
    }

    const startMatch = timeFormatRegex.exec(slot.start)
    const endMatch = timeFormatRegex.exec(slot.end)

    if (!startMatch || !endMatch) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid time format`,
      }
    }

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
    } else if (
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

    const startDateStr = `${String(startYear)}-${String(startMonth).padStart(
      2,
      "0"
    )}-${String(startDay).padStart(2, "0")}`
    const endDateStr = `${String(endYear)}-${String(endMonth).padStart(
      2,
      "0"
    )}-${String(endDay).padStart(2, "0")}`

    if (!validDOWDates.has(startDateStr)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid start date: ${startDateStr}. Must be one of the hardcoded DOW dates: ${Array.from(
          validDOWDates
        ).join(", ")}`,
      }
    }

    if (!validDOWDates.has(endDateStr)) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has invalid end date: ${endDateStr}. Must be one of the hardcoded DOW dates: ${Array.from(
          validDOWDates
        ).join(", ")}`,
      }
    }

    if (!skipSameDayCheck && startDateStr !== endDateStr) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has start and end times on different days (${startDateStr} vs ${endDateStr}). Start and end must be on the same day of the week.`,
      }
    }

    let endTimeString = slot.end
    if (endHour === 24) {
      const endDate = Temporal.PlainDate.from({
        year: endYear,
        month: endMonth,
        day: endDay,
      })
      endTimeString = `${endDate.add({ days: 1 }).toString()}T00:00:00`
    }

    const startZDT = Temporal.ZonedDateTime.from(`${slot.start}[UTC]`)
    const endZDT = Temporal.ZonedDateTime.from(`${endTimeString}[UTC]`)

    if (
      Temporal.Instant.compare(endZDT.toInstant(), startZDT.toInstant()) <= 0
    ) {
      return {
        valid: false,
        error: `Slot at index ${iStr} has end time that is before or equal to start time`,
      }
    }

    if (slot.status !== undefined) {
      if (slot.status !== "available" && slot.status !== "if-needed") {
        return {
          valid: false,
          error: `Slot at index ${iStr} has invalid status '${slot.status}'. Must be 'available' or 'if-needed'`,
        }
      }
    }
  }

  return null
}
