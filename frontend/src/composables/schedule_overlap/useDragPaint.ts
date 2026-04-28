import { ref, type Ref, type ComputedRef } from "vue"
import { clamp, dateToDowDate, isBetween } from "@/utils"
import { availabilityTypes, eventTypes, type AvailabilityType } from "@/constants"
import {
  DRAG_TYPES,
  SPLIT_GAP_HEIGHT,
  states,
  type DragType,
  type EventLike,
  type RowCol,
  type ScheduleOverlapState,
  type ScheduledEvent,
  type SignUpBlockLite,
  type TimeItem,
  type MonthDayItem,
} from "./types"

export interface UseDragPaintOptions {
  event: Ref<EventLike>
  state: Ref<ScheduleOverlapState>
  isSignUp: ComputedRef<boolean>
  weekOffset: Ref<number>

  // grid info
  splitTimes: ComputedRef<TimeItem[][]>
  times: ComputedRef<TimeItem[]>
  days: ComputedRef<{ isConsecutive?: boolean; dateObject: Date }[]>
  monthDays: ComputedRef<MonthDayItem[]>
  monthDayIncluded: ComputedRef<Map<number, boolean>>
  columnOffsets: ComputedRef<number[]>
  timeslot: Ref<{ width: number; height: number }>

  // mutable state from other composables
  availability: Ref<Set<number>>
  ifNeeded: Ref<Set<number>>
  tempTimes: Ref<Set<number>>
  availabilityType: Ref<AvailabilityType>
  signUpBlocksByDay: Ref<SignUpBlockLite[][]>
  signUpBlocksToAddByDay: Ref<SignUpBlockLite[][]>
  manualAvailability: Ref<Record<number, Set<number>>>
  curScheduledEvent: Ref<ScheduledEvent | null>
  maxSignUpBlockRowSize: ComputedRef<number | null>

  // helpers
  allowDrag: ComputedRef<boolean>
  getDateFromRowCol: (row: number, col: number) => Date | null
  getAvailabilityForColumn: (
    col: number,
    availability?: number[]
  ) => Set<number>
  createSignUpBlock: (
    dayIndex: number,
    hoursOffset: number,
    hoursLength: number
  ) => SignUpBlockLite
  scrollToSignUpBlock?: (id: string) => void
}

export function useDragPaint(opts: UseDragPaintOptions) {
  const dragging = ref(false)
  const dragType = ref<DragType>(DRAG_TYPES.ADD)
  const dragStart = ref<RowCol | null>(null)
  const dragCur = ref<RowCol | null>(null)

  const normalizeXY = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
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
      if (
        isBetween(row, ds.row, dc.row) ||
        isBetween(row, dc.row, ds.row)
      ) {
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
        return (
          isBetween(col, ds.col, dc.col) || isBetween(col, dc.col, ds.col)
        )
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
            block.hoursOffset * 4,
            (block.hoursOffset + block.hoursLength) * 4 - 1
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
      !opts.monthDayIncluded.value.get(date.getTime())
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
        opts.tempTimes.value.has(date.getTime())) ||
      (opts.availabilityType.value === availabilityTypes.AVAILABLE &&
        opts.availability.value.has(date.getTime())) ||
      (opts.availabilityType.value === availabilityTypes.IF_NEEDED &&
        opts.ifNeeded.value.has(date.getTime()))
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
              opts.monthDayIncluded.value.get(date.getTime()) &&
              inDragRange(r, c)
            if (!isMonthDayIncluded) continue
          }

          if (dragType.value === DRAG_TYPES.ADD) {
            if (opts.state.value === states.SET_SPECIFIC_TIMES) {
              opts.tempTimes.value.add(date.getTime())
            } else {
              if (opts.availabilityType.value === availabilityTypes.AVAILABLE) {
                opts.availability.value.add(date.getTime())
                opts.ifNeeded.value.delete(date.getTime())
              } else {
                opts.ifNeeded.value.add(date.getTime())
                opts.availability.value.delete(date.getTime())
              }
            }
          } else {
            if (opts.state.value === states.SET_SPECIFIC_TIMES) {
              opts.tempTimes.value.delete(date.getTime())
            } else {
              opts.availability.value.delete(date.getTime())
              opts.ifNeeded.value.delete(date.getTime())
            }
          }

          if (eventValue.type === eventTypes.GROUP) {
            const eventDates = eventValue.dates ?? []
            const discreteDate = dateToDowDate(
              eventDates,
              date,
              opts.weekOffset.value,
              true
            )
            const startDateOfDay = dateToDowDate(
              eventDates,
              opts.days.value[c].dateObject,
              opts.weekOffset.value,
              true
            )

            if (
              !(startDateOfDay.getTime() in opts.manualAvailability.value)
            ) {
              opts.manualAvailability.value[startDateOfDay.getTime()] =
                new Set<number>()

              const existingAvailability = opts.getAvailabilityForColumn(c)
              for (const a of existingAvailability) {
                const convertedDate = dateToDowDate(
                  eventDates,
                  new Date(a),
                  opts.weekOffset.value,
                  true
                )
                opts.manualAvailability.value[startDateOfDay.getTime()].add(
                  convertedDate.getTime()
                )
              }
            }

            if (dragType.value === DRAG_TYPES.ADD) {
              opts.manualAvailability.value[startDateOfDay.getTime()].add(
                discreteDate.getTime()
              )
            } else {
              opts.manualAvailability.value[startDateOfDay.getTime()].delete(
                discreteDate.getTime()
              )
            }
          }
        }
      }
      // Force reactivity by reassigning the Set
      opts.availability.value = new Set(opts.availability.value)
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
      const hoursOffset = ds.row / 4
      const hoursLength = (dc.row - ds.row + 1) / 4
      if (hoursLength > 0) {
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
