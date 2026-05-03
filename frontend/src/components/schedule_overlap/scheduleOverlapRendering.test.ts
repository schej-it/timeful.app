import { describe, expect, it } from "vitest"
import { Temporal } from "temporal-polyfill"
import { availabilityTypes, timeTypes, UTC } from "@/constants"
import { ZdtMap, ZdtSet } from "@/utils"
import { DRAG_TYPES, HOUR_HEIGHT, SPLIT_GAP_HEIGHT, states } from "@/composables/schedule_overlap/types"
import {
  buildTimeGridTimeslotClassStyles,
  buildOverlaidAvailability,
  formatTooltipContent,
  getSignUpBlockStyle,
  getTimeBlockStyle,
} from "./scheduleOverlapRendering"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

describe("scheduleOverlapRendering", () => {
  it("merges adjacent availability slots by assigning the new Temporal.Duration", () => {
    const first = zdt("2026-01-01T09:00:00Z")
    const second = zdt("2026-01-01T09:15:00Z")
    const slots = new Map([
      ["0-0", first],
      ["1-0", second],
    ])

    const blocks = buildOverlaidAvailability({
      daysLength: 1,
      firstSplitTimes: [
        { hoursOffset: Temporal.Duration.from({ hours: 0 }) },
        { hoursOffset: Temporal.Duration.from({ minutes: 15 }) },
      ],
      secondSplitTimes: [],
      getDateFromRowCol: (row, col) => slots.get(`${String(row)}-${String(col)}`) ?? null,
      dragging: false,
      inDragRange: () => false,
      dragType: availabilityTypes.AVAILABLE,
      availabilityType: availabilityTypes.AVAILABLE,
      availability: new ZdtSet([first, second]),
      ifNeeded: new ZdtSet(),
    })

    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toHaveLength(1)
    expect(blocks[0][0].hoursLength.total("minutes")).toBe(30)
    expect(blocks[0][0].type).toBe(availabilityTypes.AVAILABLE)
  })

  it("formats tooltip content from the normalized slot time", () => {
    const tooltip = formatTooltipContent({
      date: zdt("2026-07-04T14:30:00Z"),
      curTimezone: {
        value: "UTC",
        offset: Temporal.Duration.from({ minutes: 0 }),
        label: "UTC",
        gmtString: "GMT+00:00",
      },
      timeslotDuration: Temporal.Duration.from({ minutes: 30 }),
      timeType: timeTypes.HOUR24,
      isSpecificDates: true,
    })

    expect(tooltip).toBe("Sat, Jul 4, 2026 14:30 to 15:00")
  })

  it("builds timed-grid class styles across both splits and marks missing dates disabled", () => {
    const first = zdt("2026-01-01T09:00:00Z")
    const second = zdt("2026-01-01T09:15:00Z")

    const styles = buildTimeGridTimeslotClassStyles({
      firstSplitTimes: [
        { hoursOffset: Temporal.Duration.from({ hours: 9 }) },
        { hoursOffset: Temporal.Duration.from({ hours: 9, minutes: 15 }) },
      ],
      secondSplitTimes: [
        { hoursOffset: Temporal.Duration.from({ hours: 13 }) },
      ],
      getDateFromRowCol: (row) => {
        if (row === 0) return first
        if (row === 1) return second
        return null
      },
      state: states.HEATMAP,
      overlayAvailability: false,
      dragType: DRAG_TYPES.ADD,
      availabilityType: availabilityTypes.AVAILABLE,
      availability: new ZdtSet(),
      ifNeeded: new ZdtSet(),
      tempTimes: new ZdtSet(),
      responsesFormatted: new ZdtMap(),
      parsedResponses: {},
      curRespondent: "",
      curRespondents: [],
      curRespondentsSet: new Set<string>(),
      respondents: [],
      curRespondentsMax: 0,
      max: 0,
      defaultState: states.HEATMAP,
      userHasResponded: false,
      curGuestId: "",
      authUserId: undefined,
      inDragRange: () => false,
      animateTimeslotAlways: false,
      availabilityAnimEnabled: false,
      timeslotHeight: 15,
      timezoneOffset: Temporal.Duration.from({ minutes: 0 }),
      curTimeslot: { row: -1, col: -1 },
      editing: false,
      isColConsecutive: () => true,
      daysLength: 1,
      firstSplitLength: 2,
      lastRow: 2,
    })

    expect(styles).toHaveLength(3)
    expect(styles[0].style.height).toBe("15px")
    expect(styles[2].class).toContain("tw-bg-light-gray-stroke")
  })

  it("positions second-split blocks after the split gap", () => {
    const style = getTimeBlockStyle({
      timeBlock: {
        hoursOffset: Temporal.Duration.from({ hours: 13 }),
        hoursLength: Temporal.Duration.from({ minutes: 30 }),
      },
      firstSplitTimes: [
        { hoursOffset: Temporal.Duration.from({ hours: 9 }) },
        { hoursOffset: Temporal.Duration.from({ hours: 9, minutes: 15 }) },
      ],
      secondSplitTimes: [
        { hoursOffset: Temporal.Duration.from({ hours: 13 }) },
      ],
      timeslotHeight: 15,
    })

    expect(style.top).toBe(
      `calc(2 * 15px + ${String(SPLIT_GAP_HEIGHT)}px + 0 * ${String(HOUR_HEIGHT)}px)`
    )
    expect(style.height).toBe(`calc(PT30M * ${String(HOUR_HEIGHT)}px)`)
  })

  it("formats sign-up block styles from normalized durations", () => {
    const style = getSignUpBlockStyle({
      hoursOffset: Temporal.Duration.from({ hours: 1, minutes: 30 }),
      hoursLength: Temporal.Duration.from({ minutes: 45 }),
    })

    expect(style).toEqual({
      top: "calc(PT1H30M * 4 * 1rem)",
      height: "calc(PT45M * 4 * 1rem)",
    })
  })
})
