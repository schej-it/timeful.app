import type { Temporal } from "temporal-polyfill"
import {
  availabilityTypes,
  durations,
  timeTypes,
  type AvailabilityType,
  type TimeType,
} from "@/constants"
import {
  compareDuration,
  getDateInTimezone,
  lightOrDark,
  removeTransparencyFromHex,
  zdtMapGet,
  zdtSetHas,
  type ZdtMap,
  type ZdtSet,
} from "@/utils"
import type {
  ParsedResponses,
  ResponsesFormatted,
  ScheduleOverlapState,
  TimeItem,
  Timezone,
} from "@/composables/schedule_overlap/types"
import {
  DRAG_TYPES,
  HOUR_HEIGHT,
  SPLIT_GAP_HEIGHT,
  states,
} from "@/composables/schedule_overlap/types"

export interface ClassStyle {
  class: string
  style: Record<string, string>
}

export interface OverlaidAvailabilityBlock {
  hoursOffset: Temporal.Duration
  hoursLength: Temporal.Duration
  type: AvailabilityType
}

interface TimeslotBaseArgs {
  date: Temporal.ZonedDateTime | null
  row: number
  col: number
  state: ScheduleOverlapState
  overlayAvailability: boolean
  dragType: string
  availabilityType: AvailabilityType
  availability: ZdtSet
  ifNeeded: ZdtSet
  tempTimes: ZdtSet
  responsesFormatted: ResponsesFormatted
  parsedResponses: ParsedResponses
  curRespondent: string
  curRespondents: string[]
  curRespondentsSet: Set<string>
  respondents: { _id?: string | null }[]
  curRespondentsMax: number
  max: number
  defaultState: ScheduleOverlapState
  userHasResponded: boolean
  curGuestId: string
  authUserId?: string
  inDragRange: (row: number, col: number) => boolean
}

export const getBaseTimeslotClassStyle = ({
  date,
  row,
  col,
  state,
  overlayAvailability,
  dragType,
  availabilityType,
  availability,
  ifNeeded,
  tempTimes,
  responsesFormatted,
  parsedResponses,
  curRespondent,
  curRespondents,
  curRespondentsSet,
  respondents,
  curRespondentsMax,
  max,
  defaultState,
  userHasResponded,
  curGuestId,
  authUserId,
  inDragRange,
}: TimeslotBaseArgs): ClassStyle => {
  let c = ""
  const s: Record<string, string> = {}
  if (!date) return { class: c, style: s }

  const timeslotRespondents =
    zdtMapGet(responsesFormatted, date) ?? new Set<string>()

  if (
    (!overlayAvailability && state === states.EDIT_AVAILABILITY) ||
    state === states.SET_SPECIFIC_TIMES
  ) {
    s.backgroundColor = "#E523230D"
    const inRange = inDragRange(row, col)
    if (inRange) {
      if (dragType === DRAG_TYPES.ADD) {
        if (state === states.SET_SPECIFIC_TIMES) {
          c += "tw-bg-white "
        } else if (availabilityType === availabilityTypes.AVAILABLE) {
          s.backgroundColor = "#00994C77"
        } else {
          c += "tw-bg-yellow "
        }
      } else if (state === states.SET_SPECIFIC_TIMES) {
        c += "tw-bg-gray "
      }
    } else if (state === states.SET_SPECIFIC_TIMES) {
      c += zdtSetHas(tempTimes, date) ? "tw-bg-white " : "tw-bg-gray "
    } else if (zdtSetHas(availability, date)) {
      s.backgroundColor = "#00994C77"
    } else if (zdtSetHas(ifNeeded, date)) {
      c += "tw-bg-yellow "
    }
  }

  if (state === states.SINGLE_AVAILABILITY) {
    if (timeslotRespondents.has(curRespondent)) {
      if (
        parsedResponses[curRespondent].ifNeeded &&
        zdtSetHas(parsedResponses[curRespondent].ifNeeded, date)
      ) {
        c += "tw-bg-yellow "
      } else {
        s.backgroundColor = "#00994C77"
      }
    } else {
      s.backgroundColor = "#E523230D"
    }
    return { class: c, style: s }
  }

  if (
    overlayAvailability ||
    state === states.BEST_TIMES ||
    state === states.HEATMAP ||
    state === states.SCHEDULE_EVENT ||
    state === states.SUBSET_AVAILABILITY
  ) {
    let numRespondents = 0
    let maxVal = 0
    if (
      state === states.BEST_TIMES ||
      state === states.HEATMAP ||
      state === states.SCHEDULE_EVENT
    ) {
      numRespondents = timeslotRespondents.size
      maxVal = max
    } else if (state === states.SUBSET_AVAILABILITY) {
      numRespondents = [...timeslotRespondents].filter((r) =>
        curRespondentsSet.has(r)
      ).length
      maxVal = curRespondentsMax
    } else if (overlayAvailability) {
      if (
        (userHasResponded || curGuestId.length > 0) &&
        timeslotRespondents.has(authUserId ?? curGuestId)
      ) {
        numRespondents = timeslotRespondents.size - 1
        maxVal = max
      } else {
        numRespondents = timeslotRespondents.size
        maxVal = max
      }
    }

    const totalRespondents =
      state === states.SUBSET_AVAILABILITY
        ? curRespondents.length
        : respondents.length

    if (defaultState === states.BEST_TIMES) {
      if (maxVal > 0 && numRespondents === maxVal) {
        s.backgroundColor =
          totalRespondents === 1 || overlayAvailability
            ? "#00994C88"
            : "#00994C"
      }
    } else if (defaultState === states.HEATMAP) {
      if (numRespondents > 0) {
        if (totalRespondents === 1) {
          const respondentId =
            state === states.SUBSET_AVAILABILITY
              ? curRespondents[0]
              : respondents[0]?._id
          if (
            respondentId &&
            parsedResponses[respondentId].ifNeeded &&
            zdtSetHas(parsedResponses[respondentId].ifNeeded, date)
          ) {
            c += "tw-bg-yellow "
          } else {
            s.backgroundColor = "#00994C88"
          }
        } else {
          const frac = numRespondents / maxVal
          let alpha: string
          if (!overlayAvailability) {
            alpha = Math.floor(frac * (255 - 30))
              .toString(16)
              .toUpperCase()
              .substring(0, 2)
              .padStart(2, "0")
            if (
              frac === 1 &&
              ((curRespondents.length > 0 &&
                maxVal === curRespondents.length) ||
                (curRespondents.length === 0 &&
                  maxVal === respondents.length))
            ) {
              alpha = "FF"
            }
          } else {
            alpha = Math.floor(frac * (255 - 85))
              .toString(16)
              .toUpperCase()
              .substring(0, 2)
              .padStart(2, "0")
          }
          s.backgroundColor = "#00994C" + alpha
        }
      } else if (totalRespondents === 1) {
        s.backgroundColor = "#E523230D"
      }
    }
  }

  return { class: c, style: s }
}

interface TimeGridTimeslotArgs extends TimeslotBaseArgs {
  date: Temporal.ZonedDateTime | null
  isFirstSplit: boolean
  isDisabled: boolean
  animateTimeslotAlways: boolean
  availabilityAnimEnabled: boolean
  timeslotHeight: number
  timezoneOffset: Temporal.Duration
  curTimeslot: { row: number; col: number }
  editing: boolean
  isColConsecutive: (col: number) => boolean
  daysLength: number
  firstSplitLength: number
  lastRow: number
}

interface BuildTimeGridTimeslotClassStylesArgs
  extends Omit<
    TimeGridTimeslotArgs,
    "date" | "row" | "col" | "isFirstSplit" | "isDisabled"
  > {
  firstSplitTimes: TimeItem[]
  secondSplitTimes: TimeItem[]
  getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null
}

export const getTimeGridTimeslotClassStyle = ({
  isFirstSplit,
  isDisabled,
  animateTimeslotAlways,
  availabilityAnimEnabled,
  timeslotHeight,
  timezoneOffset,
  curTimeslot,
  editing,
  isColConsecutive,
  daysLength,
  respondents,
  state,
  curRespondents,
  ...baseArgs
}: TimeGridTimeslotArgs): ClassStyle => {
  const cs = getBaseTimeslotClassStyle({
    ...baseArgs,
    respondents,
    state,
    curRespondents,
  })

  if (animateTimeslotAlways || availabilityAnimEnabled) {
    cs.class += "animate-bg-color "
  }
  cs.style.height = `${String(timeslotHeight)}px`

  if (
    (respondents.length > 0 ||
      editing ||
      state === states.SET_SPECIFIC_TIMES) &&
    curTimeslot.row === baseArgs.row &&
    curTimeslot.col === baseArgs.col &&
    !isDisabled
  ) {
    cs.class += "tw-border tw-border-dashed tw-border-black tw-z-10 "
  } else {
    if (baseArgs.date) {
      const offsetMinutes = timezoneOffset.total("minutes")
      const localDate = baseArgs.date.subtract({ minutes: offsetMinutes })
      const frac = localDate.minute
      if (frac === 0) cs.class += "tw-border-t "
      else if (frac === 30) {
        cs.class += "tw-border-t "
        cs.style.borderTopStyle = "dashed"
      }
    }

    cs.class += "tw-border-r "
    if (baseArgs.col === 0 || !isColConsecutive(baseArgs.col)) {
      cs.class += "tw-border-l tw-border-l-gray "
    }
    if (baseArgs.col === daysLength - 1 || !isColConsecutive(baseArgs.col + 1)) {
      cs.class += "tw-border-r-gray "
    }
    if (isFirstSplit && baseArgs.row === 0) {
      cs.class += "tw-border-t tw-border-t-gray "
    }
    if (!isFirstSplit && baseArgs.row === baseArgs.firstSplitLength) {
      cs.class += "tw-border-t tw-border-t-gray "
    }
    if (isFirstSplit && baseArgs.row === baseArgs.firstSplitLength - 1) {
      cs.class += "tw-border-b tw-border-b-gray "
    }
    if (!isFirstSplit && baseArgs.row === baseArgs.lastRow) {
      cs.class += "tw-border-b tw-border-b-gray "
    }

    const total =
      state === states.SUBSET_AVAILABILITY
        ? curRespondents.length
        : respondents.length
    if (
      state === states.EDIT_AVAILABILITY ||
      state === states.SINGLE_AVAILABILITY ||
      total === 1
    ) {
      cs.class += "tw-border-[#999999] "
    } else {
      cs.class += "tw-border-[#DDDDDD99] "
    }
  }

  if (isDisabled) {
    cs.class += "tw-bg-light-gray-stroke tw-border-light-gray-stroke "
  }
  if (cs.style.backgroundColor === "#E523230D") {
    cs.style.backgroundColor = "#E5232333"
  }

  return cs
}

export const buildTimeGridTimeslotClassStyles = ({
  firstSplitTimes,
  secondSplitTimes,
  getDateFromRowCol,
  ...sharedArgs
}: BuildTimeGridTimeslotClassStylesArgs): ClassStyle[] => {
  const out: ClassStyle[] = []

  for (let col = 0; col < sharedArgs.daysLength; col += 1) {
    for (let row = 0; row < firstSplitTimes.length; row += 1) {
      const date = getDateFromRowCol(row, col)
      out.push(
        getTimeGridTimeslotClassStyle({
          ...sharedArgs,
          date,
          row,
          col,
          isFirstSplit: true,
          isDisabled: !date,
        })
      )
    }

    for (
      let secondSplitRow = 0;
      secondSplitRow < secondSplitTimes.length;
      secondSplitRow += 1
    ) {
      const row = secondSplitRow + firstSplitTimes.length
      const date = getDateFromRowCol(row, col)
      out.push(
        getTimeGridTimeslotClassStyle({
          ...sharedArgs,
          date,
          row,
          col,
          isFirstSplit: false,
          isDisabled: !date,
        })
      )
    }
  }

  return out
}

interface DayGridTimeslotArgs extends TimeslotBaseArgs {
  date: Temporal.ZonedDateTime
  row: number
  col: number
  monthDayIncluded: ZdtMap<boolean>
  curTimeslot: { row: number; col: number }
  lastMonthRow: number
}

export const getDayGridTimeslotClassStyle = ({
  monthDayIncluded,
  curTimeslot,
  respondents,
  state,
  ...baseArgs
}: DayGridTimeslotArgs): ClassStyle => {
  let cs: ClassStyle

  if (zdtMapGet(monthDayIncluded, baseArgs.date)) {
    cs = getBaseTimeslotClassStyle({
      ...baseArgs,
      respondents,
      state,
    })
    if (state === states.EDIT_AVAILABILITY) {
      cs.class += "tw-cursor-pointer "
    }
    const bg = cs.style.backgroundColor
    if (bg && lightOrDark(removeTransparencyFromHex(bg)) === "dark") {
      cs.class += "tw-text-white "
    }
  } else {
    cs = { class: "tw-bg-off-white tw-text-gray ", style: {} }
  }

  if (cs.style.backgroundColor === "#E523230D") {
    cs.style.backgroundColor = "#E523233B"
  }

  if (
    (respondents.length > 0 || state === states.EDIT_AVAILABILITY) &&
    curTimeslot.row === baseArgs.row &&
    curTimeslot.col === baseArgs.col &&
    zdtMapGet(monthDayIncluded, baseArgs.date)
  ) {
    cs.class += "tw-outline-2 tw-outline-dashed tw-outline-black tw-z-10 "
  } else {
    if (baseArgs.col === 0) cs.class += "tw-border-l tw-border-l-gray "
    cs.class += "tw-border-r tw-border-r-gray "
    if (baseArgs.col !== 6) cs.style.borderRightStyle = "dashed"
    if (baseArgs.row === 0) cs.class += "tw-border-t tw-border-t-gray "
    cs.class += "tw-border-b tw-border-b-gray "
    if (baseArgs.row !== baseArgs.lastMonthRow) {
      cs.style.borderBottomStyle = "dashed"
    }
  }

  return cs
}

export const buildDayGridTimeslotClassStyles = ({
  monthDays,
  ...sharedArgs
}: Omit<DayGridTimeslotArgs, "date" | "row" | "col"> & {
  monthDays: Temporal.ZonedDateTime[]
}): ClassStyle[] =>
  monthDays.map((date, index) =>
    getDayGridTimeslotClassStyle({
      ...sharedArgs,
      date,
      row: Math.floor(index / 7),
      col: index % 7,
    })
  )

interface BuildOverlaidAvailabilityArgs {
  daysLength: number
  firstSplitTimes: TimeItem[]
  secondSplitTimes: TimeItem[]
  getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null
  dragging: boolean
  inDragRange: (row: number, col: number) => boolean
  dragType: string
  availabilityType: AvailabilityType
  availability: ZdtSet
  ifNeeded: ZdtSet
}

export const buildOverlaidAvailability = ({
  daysLength,
  firstSplitTimes,
  secondSplitTimes,
  getDateFromRowCol,
  dragging,
  inDragRange,
  dragType,
  availabilityType,
  availability,
  ifNeeded,
}: BuildOverlaidAvailabilityArgs): OverlaidAvailabilityBlock[][] => {
  const result: OverlaidAvailabilityBlock[][] = []

  for (let dayIndex = 0; dayIndex < daysLength; dayIndex += 1) {
    result.push([])
    let idx = 0

    const addBlock = (time: TimeItem, row: number) => {
      const date = getDateFromRowCol(row, dayIndex)
      if (!date) return

      const draggingAdd =
        dragging && inDragRange(row, dayIndex) && dragType === DRAG_TYPES.ADD
      const draggingRemove =
        dragging &&
        inDragRange(row, dayIndex) &&
        dragType === DRAG_TYPES.REMOVE

      if (
        draggingAdd ||
        (!draggingRemove &&
          (zdtSetHas(availability, date) || zdtSetHas(ifNeeded, date)))
      ) {
        const blockType = draggingAdd
          ? availabilityType
          : zdtSetHas(availability, date)
            ? availabilityTypes.AVAILABLE
            : availabilityTypes.IF_NEEDED

        if (idx in result[dayIndex]) {
          if (result[dayIndex][idx].type === blockType) {
            result[dayIndex][idx].hoursLength =
              result[dayIndex][idx].hoursLength.add(durations.FIFTEEN_MINUTES)
          } else {
            result[dayIndex].push({
              hoursOffset: time.hoursOffset,
              hoursLength: durations.FIFTEEN_MINUTES,
              type: blockType,
            })
            idx += 1
          }
        } else {
          result[dayIndex].push({
            hoursOffset: time.hoursOffset,
            hoursLength: durations.FIFTEEN_MINUTES,
            type: blockType,
          })
        }
      } else if (idx in result[dayIndex]) {
        idx += 1
      }
    }

    for (let row = 0; row < firstSplitTimes.length; row += 1) {
      addBlock(firstSplitTimes[row], row)
    }
    if (idx in result[dayIndex]) idx += 1
    for (let row = 0; row < secondSplitTimes.length; row += 1) {
      addBlock(secondSplitTimes[row], row + firstSplitTimes.length)
    }
  }

  return result
}

export const formatTooltipContent = ({
  date,
  curTimezone,
  timeslotDuration,
  timeType,
  isSpecificDates,
}: {
  date: Temporal.ZonedDateTime
  curTimezone: Timezone
  timeslotDuration: Temporal.Duration
  timeType: TimeType
  isSpecificDates: boolean
}): string => {
  const start = getDateInTimezone(date, curTimezone)
  const end = start.add(timeslotDuration)

  const timeFormat: Intl.DateTimeFormatOptions =
    timeType === timeTypes.HOUR12
      ? { hour: "numeric", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit", hour12: false }

  const dateFormat: Intl.DateTimeFormatOptions = isSpecificDates
    ? { weekday: "short", month: "short", day: "numeric", year: "numeric" }
    : { weekday: "short" }

  const startDateStr = start.toLocaleString("en-US", dateFormat)
  const startTimeStr = start.toLocaleString("en-US", timeFormat)
  const endTimeStr = end.toLocaleString("en-US", timeFormat)

  return `${startDateStr} ${startTimeStr} to ${endTimeStr}`
}

export const getIsTimeBlockInFirstSplit = (
  timeBlock: { hoursOffset: Temporal.Duration },
  firstSplitTimes: TimeItem[]
): boolean =>
  firstSplitTimes.length > 0 &&
  compareDuration(timeBlock.hoursOffset, firstSplitTimes[0].hoursOffset) >= 0 &&
  compareDuration(
    timeBlock.hoursOffset,
    firstSplitTimes[firstSplitTimes.length - 1].hoursOffset
  ) <= 0

export const getTimeBlockStyle = ({
  timeBlock,
  firstSplitTimes,
  secondSplitTimes,
  timeslotHeight,
}: {
  timeBlock: {
    hoursOffset?: Temporal.Duration
    hoursLength?: Temporal.Duration
  }
  firstSplitTimes: TimeItem[]
  secondSplitTimes: TimeItem[]
  timeslotHeight: number
}): Record<string, string> => {
  const style: Record<string, string> = {}
  const hoursOffset = timeBlock.hoursOffset ?? durations.ZERO
  const hoursLength = timeBlock.hoursLength ?? durations.ZERO

  if (
    secondSplitTimes.length === 0 ||
    getIsTimeBlockInFirstSplit(
      timeBlock as { hoursOffset: Temporal.Duration },
      firstSplitTimes
    )
  ) {
    style.top = `calc(${String(
      hoursOffset
        .subtract(firstSplitTimes[0]?.hoursOffset ?? durations.ZERO)
        .total("hours")
    )} * ${String(HOUR_HEIGHT)}px)`
    style.height = `calc(${String(hoursLength)} * ${String(HOUR_HEIGHT)}px)`
    return style
  }

  style.top = `calc(${String(firstSplitTimes.length)} * ${String(
    timeslotHeight
  )}px + ${String(SPLIT_GAP_HEIGHT)}px + ${String(
    hoursOffset
      .subtract(secondSplitTimes[0]?.hoursOffset ?? durations.ZERO)
      .total("hours")
  )} * ${String(HOUR_HEIGHT)}px)`
  style.height = `calc(${String(hoursLength)} * ${String(HOUR_HEIGHT)}px)`

  return style
}

export const getSignUpBlockStyle = ({
  hoursOffset,
  hoursLength,
}: {
  hoursOffset?: Temporal.Duration
  hoursLength?: Temporal.Duration
}): Record<string, string> => ({
  top: `calc(${String(hoursOffset ?? durations.ZERO)} * 4 * 1rem)`,
  height: `calc(${String(hoursLength ?? durations.ZERO)} * 4 * 1rem)`,
})
