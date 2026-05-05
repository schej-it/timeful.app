import { type Ref, ref, type ComputedRef } from "vue"
import { Temporal } from "temporal-polyfill"
import {
  clamp,
  dateToDowDate,
  getRenderedWeekStart,
  isBetween,
  ZdtMap,
  ZdtSet,
  zdtMapGet,
  zdtMapGetOrInsert,
  zdtSetDelete,
  zdtSetHas,
} from "@/utils"
import {
  availabilityTypes,
  eventTypes,
  type AvailabilityType,
} from "@/constants"
import {
  DRAG_TYPES,
  SPLIT_GAP_HEIGHT,
  states,
  type DragType,
  type RowCol,
  type ScheduleOverlapEvent,
  type ScheduledEvent,
  type ScheduleOverlapState,
  type SignUpBlockLite,
  type TimeItem,
  type MonthDayItem,
} from "./types"

export interface UseDragPaintOptions {
  event: Ref<ScheduleOverlapEvent>
  state: Ref<ScheduleOverlapState>
  isSignUp: ComputedRef<boolean>
  weekOffset: Ref<number>
  dragging: Ref<boolean>
  dragStart: Ref<RowCol | null>
  dragCur: Ref<RowCol | null>

  // grid info
  splitTimes: ComputedRef<TimeItem[][]>
  times: ComputedRef<TimeItem[]>
  days: ComputedRef<
    { isConsecutive?: boolean; dateObject: Temporal.ZonedDateTime }[]
  >
  monthDays: ComputedRef<MonthDayItem[]>
  monthDayIncluded: ComputedRef<ZdtMap<boolean>>
  columnOffsets: ComputedRef<number[]>
  timeslot: Ref<{ width: number; height: number }>

  // mutable state from other composables
  availability: Ref<ZdtSet>
  ifNeeded: Ref<ZdtSet>
  tempTimes: Ref<ZdtSet>
  availabilityType: Ref<AvailabilityType>
  signUpBlocksByDay: Ref<SignUpBlockLite[][]>
  signUpBlocksToAddByDay: Ref<SignUpBlockLite[][]>
  manualAvailability: Ref<ZdtMap<ZdtSet>>
  curScheduledEvent: Ref<ScheduledEvent | null>
  maxSignUpBlockRowSize: ComputedRef<number | null>

  // helpers
  allowDrag: ComputedRef<boolean>
  
  getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null
  
  getAvailabilityForColumn: (
    col: number,
    availability?: ZdtSet
  ) => ZdtSet
  
  createSignUpBlock: (
    dayIndex: number,
    hoursOffset: Temporal.Duration,
    hoursLength: Temporal.Duration
  ) => SignUpBlockLite
  
  scrollToSignUpBlock?: (id: string) => void
}

export function useDragPaint(opts: UseDragPaintOptions) {
  const dragging = opts.dragging
  const dragType = ref<DragType>(DRAG_TYPES.ADD)
  const dragStart = opts.dragStart
  const dragCur = opts.dragCur

  const normalizeXY = (
    e: MouseEvent | TouchEvent
  ): { x: number; y: number } => {
    let clientX: number
    let clientY: number
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as MouseEvent).clientX
      clientY = (e as MouseEvent).clientY
    }
    const target = e.currentTarget as Element
    const { left, top } = target.getBoundingClientRect()
    return { x: clientX - left, y: clientY - top }
  }

  const clampRow = (row: number): number => {
    if (opts.event.value.daysOnly) {
      return clamp(row, 0, Math.floor(opts.monthDays.value.length / 7))
    }
    return clamp(row, 0, opts.times.value.length - 1)
  }

  const clampCol = (col: number): number => {
    if (opts.event.value.daysOnly) {
      return clamp(col, 0, 7 - 1)
    }
    return clamp(col, 0, opts.days.value.length - 1)
  }

  const getRowColFromXY = (x: number, y: number): RowCol => {
    const { width, height } = opts.timeslot.value
    let col = Math.floor(x / width)
    if (!opts.event.value.daysOnly) {
      col = opts.columnOffsets.value.length
      for (let i = 0; i < opts.columnOffsets.value.length; ++i) {
        if (x < opts.columnOffsets.value[i]) {
          col = i - 1
          break
        }
      }
    }
    let row = Math.floor(y / height)

    if (!opts.event.value.daysOnly && row > opts.splitTimes.value[0].length) {
      const adjustedRow = Math.floor((y - SPLIT_GAP_HEIGHT) / height)
      if (adjustedRow >= opts.splitTimes.value[0].length) {
        row = adjustedRow
      }
    }

    return { row: clampRow(row), col: clampCol(col) }
  }

  const inDragRange = (row: number, col: number): boolean => {
    if (!dragging.value || !dragStart.value || !dragCur.value) return false

    const ds = dragStart.value
    const dc = dragCur.value

    if (opts.event.value.daysOnly) {
      if (isBetween(row, ds.row, dc.row) || isBetween(row, dc.row, ds.row)) {
        if (dc.row < ds.row) {
          return (
            (dc.row === row && dc.col <= col) ||
            (ds.row === row && ds.col >= col) ||
            (ds.row !== row && dc.row !== row)
          )
        }
        if (dc.row > ds.row) {
          return (
            (dc.row === row && dc.col >= col) ||
            (ds.row === row && ds.col <= col) ||
            (ds.row !== row && dc.row !== row)
          )
        }
        return isBetween(col, ds.col, dc.col) || isBetween(col, dc.col, ds.col)
      }
      return false
    }

    return (
      (isBetween(row, ds.row, dc.row) || isBetween(row, dc.row, ds.row)) &&
      (isBetween(col, ds.col, dc.col) || isBetween(col, dc.col, ds.col))
    )
  }

  const startDrag = (e: MouseEvent | TouchEvent) => {
    const { x, y } = normalizeXY(e)
    const { row, col } = getRowColFromXY(x, y)

    if (opts.isSignUp.value) {
      const dayBlocks = opts.signUpBlocksByDay.value[col] ?? []
      const dayBlocksToAdd = opts.signUpBlocksToAddByDay.value[col] ?? []
      for (const block of dayBlocks.concat(dayBlocksToAdd)) {
        if (
          isBetween(
            row,
            block.hoursOffset.total("hours") * 4,
            (block.hoursOffset.total("hours") +
              block.hoursLength.total("hours")) *
              4 -
              1
          )
        ) {
          opts.scrollToSignUpBlock?.(block._id)
          return
        }
      }
    }

    if (!opts.allowDrag.value) return
    if ("touches" in e && e.touches.length > 1) return

    const date = opts.getDateFromRowCol(row, col)
    if (!date) return

    if (
      opts.event.value.daysOnly &&
      !zdtMapGet(opts.monthDayIncluded.value, date)
    )
      return

    dragging.value = true
    dragStart.value = { row, col }
    dragCur.value = { row, col }

    e.preventDefault()

    if (opts.isSignUp.value) {
      dragType.value = DRAG_TYPES.ADD
    } else if (
      (opts.state.value === states.SET_SPECIFIC_TIMES &&
        zdtSetHas(opts.tempTimes.value, date)) ||
      (opts.availabilityType.value === availabilityTypes.AVAILABLE &&
        zdtSetHas(opts.availability.value, date)) ||
      (opts.availabilityType.value === availabilityTypes.IF_NEEDED &&
        zdtSetHas(opts.ifNeeded.value, date))
    ) {
      dragType.value = DRAG_TYPES.REMOVE
    } else {
      dragType.value = DRAG_TYPES.ADD
    }
  }

  const moveDrag = (e: MouseEvent | TouchEvent) => {
    if (!opts.allowDrag.value) return
    if ("touches" in e && e.touches.length > 1) return
    if (!dragStart.value) return

    e.preventDefault()
    const { x, y } = normalizeXY(e)
    const { col } = getRowColFromXY(x, y)
    let { row } = getRowColFromXY(x, y)

    const maxRow = opts.maxSignUpBlockRowSize.value
    if (maxRow && row >= dragStart.value.row + maxRow) {
      row = dragStart.value.row + maxRow - 1
    } else if (opts.state.value === states.SCHEDULE_EVENT) {
      const isFirstSplit = dragStart.value.row < opts.splitTimes.value[0].length
      if (isFirstSplit) {
        row = Math.min(row, opts.splitTimes.value[0].length - 1)
      }
    }

    dragCur.value = { row, col }
  }

  const endDrag = () => {
    if (!opts.allowDrag.value) return
    if (!dragStart.value || !dragCur.value) return

    const ds = dragStart.value
    const dc = dragCur.value
    const eventValue = opts.event.value

    if (
      opts.state.value === states.EDIT_AVAILABILITY ||
      opts.state.value === states.SET_SPECIFIC_TIMES
    ) {
      let colInc = (dc.col - ds.col) / Math.abs(dc.col - ds.col)
      let rowInc = (dc.row - ds.row) / Math.abs(dc.row - ds.row)
      if (isNaN(colInc)) colInc = 1
      if (isNaN(rowInc)) rowInc = 1

      const rowStart = ds.row
      const rowMax = dc.row + rowInc
      let colStart = ds.col
      let colMax = dc.col + colInc

      if (eventValue.daysOnly) {
        colStart = 0
        colMax = 7
        colInc = 1
      }

      for (let r = rowStart; r != rowMax; r += rowInc) {
        for (let c = colStart; c != colMax; c += colInc) {
          const date = opts.getDateFromRowCol(r, c)
          if (!date) continue

          if (eventValue.daysOnly) {
            const isMonthDayIncluded =
              zdtMapGet(opts.monthDayIncluded.value, date) &&
              inDragRange(r, c)
            if (!isMonthDayIncluded) continue
          }

          if (dragType.value === DRAG_TYPES.ADD) {
            if (opts.state.value === states.SET_SPECIFIC_TIMES) {
              opts.tempTimes.value.add(date)
            } else {
              if (opts.availabilityType.value === availabilityTypes.AVAILABLE) {
                opts.availability.value.add(date)
                zdtSetDelete(opts.ifNeeded.value, date)
              } else {
                opts.ifNeeded.value.add(date)
                zdtSetDelete(opts.availability.value, date)
              }
            }
          } else {
            if (opts.state.value === states.SET_SPECIFIC_TIMES) {
              zdtSetDelete(opts.tempTimes.value, date)
            } else {
              zdtSetDelete(opts.availability.value, date)
              zdtSetDelete(opts.ifNeeded.value, date)
            }
          }

          if (eventValue.type === eventTypes.GROUP) {
            const eventDates = eventValue.dates ?? []
            const renderedWeekStart = getRenderedWeekStart(
              opts.weekOffset.value,
              eventValue.startOnMonday
            )
            const discreteDate = dateToDowDate(
              eventDates,
              date,
              opts.weekOffset.value,
              true,
              eventValue.startOnMonday,
              renderedWeekStart
            )
            const startDateOfDay = dateToDowDate(
              eventDates,
              opts.days.value[c].dateObject,
              opts.weekOffset.value,
              true,
              eventValue.startOnMonday,
              renderedWeekStart
            )

            const startDateOfDayKey = startDateOfDay
            const dayAvailability = zdtMapGetOrInsert(
              opts.manualAvailability.value,
              startDateOfDayKey,
              () => new ZdtSet()
            )

            if (dayAvailability.size === 0) {
              const existingAvailability = opts.getAvailabilityForColumn(c)
              for (const a of existingAvailability) {
                const convertedDate = dateToDowDate(
                  eventDates,
                  a,
                  opts.weekOffset.value,
                  true,
                  eventValue.startOnMonday,
                  renderedWeekStart
                )
                dayAvailability.add(convertedDate)
              }
            }

            if (dragType.value === DRAG_TYPES.ADD) {
              dayAvailability.add(discreteDate)
            } else {
              zdtSetDelete(dayAvailability, discreteDate)
            }
          }
        }
      }
      // Force reactivity by reassigning the value-keyed wrappers.
      if (opts.state.value === states.SET_SPECIFIC_TIMES) {
        opts.tempTimes.value = new ZdtSet(opts.tempTimes.value)
      } else {
        opts.availability.value = new ZdtSet(opts.availability.value)
        opts.ifNeeded.value = new ZdtSet(opts.ifNeeded.value)
        if (eventValue.type === eventTypes.GROUP) {
          opts.manualAvailability.value = new ZdtMap(opts.manualAvailability.value)
        }
      }
    } else if (opts.state.value === states.SCHEDULE_EVENT) {
      const col = ds.col
      const row = ds.row
      const numRows = dc.row - ds.row + 1

      if (numRows > 0) {
        opts.curScheduledEvent.value = { col, row, numRows }
      } else {
        opts.curScheduledEvent.value = null
      }
    } else if (opts.state.value === states.EDIT_SIGN_UP_BLOCKS) {
      const dayIndex = ds.col
      const hoursOffsetNum = ds.row / 4
      const hoursLengthNum = (dc.row - ds.row + 1) / 4
      if (hoursLengthNum > 0) {
        // Convert numbers to Duration for createSignUpBlock
        const hoursOffset = Temporal.Duration.from({ hours: hoursOffsetNum })
        const hoursLength = Temporal.Duration.from({ hours: hoursLengthNum })
        opts.signUpBlocksToAddByDay.value[dayIndex].push(
          opts.createSignUpBlock(dayIndex, hoursOffset, hoursLength)
        )
      }
    }

    dragging.value = false
    dragStart.value = null
    dragCur.value = null
  }

  return {
    dragging,
    dragType,
    dragStart,
    dragCur,
    DRAG_TYPES,
    normalizeXY,
    clampRow,
    clampCol,
    getRowColFromXY,
    inDragRange,
    startDrag,
    moveDrag,
    endDrag,
  }
}

export type UseDragPaintReturn = ReturnType<typeof useDragPaint>
