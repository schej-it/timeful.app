import { describe, expect, it } from "vitest"
import {
  convertUTCSlotsToLocalISO,
  getDateRangeStringForEvent,
  getDateHoursOffset,
  getWrappedTimeRangeDuration,
  getTimezoneReferenceDateForEvent,
  timeNumToTimeText,
} from "./date_utils"
import { eventTypes, UTC } from "../constants"
import { Temporal } from "temporal-polyfill"
import {
  convertUTCSlotsToLocalISO as convertUTCSlotsToLocalISODirect,
} from "./dateBoundaryAdapters"
import { getDateRangeStringForEvent as getDateRangeStringForEventDirect, timeNumToTimeText as timeNumToTimeTextDirect } from "./dateFormatting"
import {
  getDateHoursOffset as getDateHoursOffsetDirect,
  getWrappedTimeRangeDuration as getWrappedTimeRangeDurationDirect,
} from "./timeConversions"
import { getTimezoneReferenceDateForEvent as getTimezoneReferenceDateForEventDirect } from "./eventDateRules"

describe("date_utils compatibility barrel", () => {
  const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

  it("re-exports focused helpers without changing behavior", () => {
    expect(convertUTCSlotsToLocalISO).toBe(convertUTCSlotsToLocalISODirect)
    expect(getDateRangeStringForEvent).toBe(getDateRangeStringForEventDirect)
    expect(getDateHoursOffset).toBe(getDateHoursOffsetDirect)
    expect(getWrappedTimeRangeDuration).toBe(getWrappedTimeRangeDurationDirect)
    expect(getTimezoneReferenceDateForEvent).toBe(getTimezoneReferenceDateForEventDirect)
    expect(timeNumToTimeText).toBe(timeNumToTimeTextDirect)
  })

  it("keeps compatibility imports usable at runtime", () => {
    expect(
      getDateRangeStringForEvent({
        type: eventTypes.SPECIFIC_DATES,
        dates: [zdt("2026-05-01T00:00:00Z"), zdt("2026-05-03T00:00:00Z")],
      })
    ).toBe("5/1 - 5/2")

    expect(getDateHoursOffset(zdt("2026-01-01T09:00:00Z"), Temporal.Duration.from({ hours: 2 })).hour).toBe(
      11
    )
    expect(timeNumToTimeText(13.5)).toBe("1:30 pm")
  })
})
