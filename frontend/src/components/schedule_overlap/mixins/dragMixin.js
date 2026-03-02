import { clamp, isBetween, isTouchEnabled, dateToDowDate } from "@/utils"
import { availabilityTypes, eventTypes } from "@/constants"

export default {
  data() {
    return {
      /* Variables for drag stuff */
      DRAG_TYPES: {
        ADD: "add",
        REMOVE: "remove",
      },
      SPLIT_GAP_HEIGHT: 40,
      SPLIT_GAP_WIDTH: 20,
      HOUR_HEIGHT: 60,
      timeslot: {
        width: 0,
        height: 0,
      },
      dragging: false,
      dragType: "add",
      dragStart: null,
      dragCur: null,
    }
  },
  computed: {
    allowDrag() {
      return (
        this.state === this.states.EDIT_AVAILABILITY ||
        this.state === this.states.EDIT_SIGN_UP_BLOCKS ||
        this.state === this.states.SCHEDULE_EVENT ||
        this.state === this.states.SET_SPECIFIC_TIMES
      )
    },
    /** Returns an array of the x-offsets of the columns, taking into account the split gaps from non-consecutive days */
    columnOffsets() {
      const offsets = []
      let accumulatedOffset = 0
      for (let i = 0; i < this.days.length; ++i) {
        offsets.push(accumulatedOffset)
        if (!this.days[i].isConsecutive) {
          accumulatedOffset += this.SPLIT_GAP_WIDTH
        }
        accumulatedOffset += this.timeslot.width
      }
      return offsets
    },
    /** Returns the max allowable drag */
    maxSignUpBlockRowSize() {
      if (!this.dragStart || !this.isSignUp) return null

      const selectedDay = this.signUpBlocksByDay[this.dragStart.col]
      const selectedDayToAdd = this.signUpBlocksToAddByDay[this.dragStart.col]

      if (selectedDay.length === 0 && selectedDayToAdd.length === 0) return null

      let maxSize = Infinity
      for (const block of [...selectedDay, ...selectedDayToAdd]) {
        if (block.hoursOffset * 4 > this.dragStart.row) {
          maxSize = Math.min(
            maxSize,
            block.hoursOffset * 4 - this.dragStart.row
          )
        }
      }

      return maxSize
    },
  },
  methods: {
    setTimeslotSize() {
      /* Gets the dimensions of each timeslot and assigns it to the timeslot variable */
      const timeslotEl = document.querySelector(".timeslot")
      if (timeslotEl) {
        ;({ width: this.timeslot.width, height: this.timeslot.height } =
          timeslotEl.getBoundingClientRect())
      }
    },
    normalizeXY(e) {
      /* Normalize the touch event to be relative to element */
      let pageX, pageY
      if ("touches" in e) {
        // is a touch event
        ;({ pageX, pageY } = e.touches[0])
      } else {
        // is a mouse event
        ;({ pageX, pageY } = e)
      }
      const { left, top } = e.currentTarget.getBoundingClientRect()
      const x = pageX - left
      const y = pageY - top - window.scrollY
      return { x, y }
    },
    clampRow(row) {
      if (this.event.daysOnly) {
        row = clamp(row, 0, Math.floor(this.monthDays.length / 7))
      } else {
        row = clamp(row, 0, this.times.length - 1)
      }
      return row
    },
    clampCol(col) {
      if (this.event.daysOnly) {
        col = clamp(col, 0, 7 - 1)
      } else {
        col = clamp(col, 0, this.days.length - 1)
      }
      return col
    },
    /** Returns row, col for the timeslot we are currently hovering over given the x and y position */
    getRowColFromXY(x, y) {
      const { width, height } = this.timeslot
      let col = Math.floor(x / width)
      if (!this.event.daysOnly) {
        col = this.columnOffsets.length
        for (let i = 0; i < this.columnOffsets.length; ++i) {
          if (x < this.columnOffsets[i]) {
            col = i - 1
            break
          }
        }
      }
      let row = Math.floor(y / height)

      // Account for split gap
      if (!this.event.daysOnly && row > this.splitTimes[0].length) {
        const adjustedRow = Math.floor((y - this.SPLIT_GAP_HEIGHT) / height)
        if (adjustedRow >= this.splitTimes[0].length) {
          // Make sure we don't go to a lesser index
          row = adjustedRow
        }
      }

      row = this.clampRow(row)
      col = this.clampCol(col)
      return {
        row,
        col,
      }
    },
    startDrag(e) {
      const { row, col } = this.getRowColFromXY(
        ...Object.values(this.normalizeXY(e))
      )

      // If sign up form, check if trying to drag in a block
      if (this.isSignUp) {
        for (const block of this.signUpBlocksByDay[col].concat(
          this.signUpBlocksToAddByDay[col]
        )) {
          if (
            isBetween(
              row,
              block.hoursOffset * 4,
              (block.hoursOffset + block.hoursLength) * 4 - 1
            )
          ) {
            this.$refs.signUpBlocksList.scrollToSignUpBlock(block._id)
            return
          }
        }
      }

      if (!this.allowDrag) return
      if (e.touches?.length > 1) return // If dragging with more than one finger

      const date = this.getDateFromRowCol(row, col)
      if (!date) return

      // Dont start dragging if day not included in daysonly event
      if (this.event.daysOnly && !this.monthDayIncluded.get(date.getTime())) {
        return
      }

      this.dragging = true
      this.dragStart = { row, col }
      this.dragCur = { row, col }

      // Prevent scroll
      e.preventDefault()

      // Set drag type
      if (this.isSignUp) {
        this.dragType = this.DRAG_TYPES.ADD
      } else if (
        (this.state === this.states.SET_SPECIFIC_TIMES &&
          this.tempTimes.has(date.getTime())) ||
        (this.availabilityType === availabilityTypes.AVAILABLE &&
          this.availability.has(date.getTime())) ||
        (this.availabilityType === availabilityTypes.IF_NEEDED &&
          this.ifNeeded.has(date.getTime()))
      ) {
        this.dragType = this.DRAG_TYPES.REMOVE
      } else {
        this.dragType = this.DRAG_TYPES.ADD
      }
    },
    moveDrag(e) {
      if (!this.allowDrag) return
      if (e.touches?.length > 1) return // If dragging with more than one finger
      if (!this.dragStart) return

      e.preventDefault()
      let { row, col } = this.getRowColFromXY(
        ...Object.values(this.normalizeXY(e))
      )

      if (
        this.maxSignUpBlockRowSize &&
        row >= this.dragStart.row + this.maxSignUpBlockRowSize
      ) {
        row = this.dragStart.row + this.maxSignUpBlockRowSize - 1
      } else if (this.state === this.states.SCHEDULE_EVENT) {
        const isFirstSplit = this.dragStart.row < this.splitTimes[0].length
        if (isFirstSplit) {
          row = Math.min(row, this.splitTimes[0].length - 1)
        }
      }

      this.dragCur = { row, col }
    },
    endDrag() {
      if (!this.allowDrag) return

      if (!this.dragStart || !this.dragCur) return

      // Update availability set based on drag region
      if (
        this.state === this.states.EDIT_AVAILABILITY ||
        this.state === this.states.SET_SPECIFIC_TIMES
      ) {
        // Determine colInc and rowInc
        let colInc =
          (this.dragCur.col - this.dragStart.col) /
          Math.abs(this.dragCur.col - this.dragStart.col)
        let rowInc =
          (this.dragCur.row - this.dragStart.row) /
          Math.abs(this.dragCur.row - this.dragStart.row)
        if (isNaN(colInc)) colInc = 1
        if (isNaN(rowInc)) rowInc = 1

        // Determine iteration variables
        let rowStart = this.dragStart.row
        let rowMax = this.dragCur.row + rowInc
        let colStart = this.dragStart.col
        let colMax = this.dragCur.col + colInc

        // Correct iteration variables if days only
        if (this.event.daysOnly) {
          colStart = 0
          colMax = 7
          colInc = 1
        }

        // Iterate all selected time slots and either add or remove them
        for (let r = rowStart; r != rowMax; r += rowInc) {
          for (let c = colStart; c != colMax; c += colInc) {
            const date = this.getDateFromRowCol(r, c)
            if (!date) continue

            if (this.event.daysOnly) {
              // Don't add to availability set if month day is not included
              const isMonthDayIncluded =
                this.monthDayIncluded.get(date.getTime()) &&
                this.inDragRange(r, c)
              if (!isMonthDayIncluded) continue
            }

            if (this.dragType === this.DRAG_TYPES.ADD) {
              if (this.state === this.states.SET_SPECIFIC_TIMES) {
                this.tempTimes.add(date.getTime())
              } else {
                // Add / remove time from availability set
                if (this.availabilityType === availabilityTypes.AVAILABLE) {
                  this.availability.add(date.getTime())
                  this.ifNeeded.delete(date.getTime())
                } else if (
                  this.availabilityType === availabilityTypes.IF_NEEDED
                ) {
                  this.ifNeeded.add(date.getTime())
                  this.availability.delete(date.getTime())
                }
              }
            } else if (this.dragType === this.DRAG_TYPES.REMOVE) {
              if (this.state === this.states.SET_SPECIFIC_TIMES) {
                this.tempTimes.delete(date.getTime())
              } else {
                // Add / remove time from availability set
                this.availability.delete(date.getTime())
                this.ifNeeded.delete(date.getTime())
              }
            }

            // Edit manualAvailability set if event is a GROUP
            if (this.event.type === eventTypes.GROUP) {
              const discreteDate = dateToDowDate(
                this.event.dates,
                date,
                this.weekOffset,
                true
              )
              const startDateOfDay = dateToDowDate(
                this.event.dates,
                this.days[c].dateObject,
                this.weekOffset,
                true
              )

              // If date not touched, then add all of the existing calendar availabilities and mark it as touched
              if (!(startDateOfDay.getTime() in this.manualAvailability)) {
                // Create new set
                this.manualAvailability[startDateOfDay.getTime()] = new Set()

                // Add the existing calendar availabilities
                const existingAvailability = this.getAvailabilityForColumn(c)
                for (const a of existingAvailability) {
                  const convertedDate = dateToDowDate(
                    this.event.dates,
                    new Date(a),
                    this.weekOffset,
                    true
                  )
                  this.manualAvailability[startDateOfDay.getTime()].add(
                    convertedDate.getTime()
                  )
                }
              }

              // Add / remove time from manual availability set
              if (this.dragType === this.DRAG_TYPES.ADD) {
                this.manualAvailability[startDateOfDay.getTime()].add(
                  discreteDate.getTime()
                )
              } else if (this.dragType === this.DRAG_TYPES.REMOVE) {
                this.manualAvailability[startDateOfDay.getTime()].delete(
                  discreteDate.getTime()
                )
              }
            }
          }
        }
        this.availability = new Set(this.availability)
      } else if (this.state === this.states.SCHEDULE_EVENT) {
        // Update scheduled event
        const col = this.dragStart.col
        const row = this.dragStart.row
        const numRows = this.dragCur.row - this.dragStart.row + 1

        if (numRows > 0) {
          this.curScheduledEvent = { col, row, numRows }
        } else {
          this.curScheduledEvent = null
        }
      } else if (this.state === this.states.EDIT_SIGN_UP_BLOCKS) {
        // Update sign up blocks
        const dayIndex = this.dragStart.col
        const hoursOffset = this.dragStart.row / 4
        const hoursLength = (this.dragCur.row - this.dragStart.row + 1) / 4
        if (hoursLength > 0) {
          this.signUpBlocksToAddByDay[dayIndex].push(
            this.createSignUpBlock(dayIndex, hoursOffset, hoursLength)
          )
        }
      }

      // Set dragging defaults
      this.dragging = false
      this.dragStart = null
      this.dragCur = null
    },
    inDragRange(row, col) {
      /* Returns whether the given row and col is within the drag range */
      if (this.dragging) {
        if (this.event.daysOnly) {
          if (
            isBetween(row, this.dragStart.row, this.dragCur.row) ||
            isBetween(row, this.dragCur.row, this.dragStart.row)
          ) {
            if (this.dragCur.row < this.dragStart.row) {
              return (
                (this.dragCur.row === row && this.dragCur.col <= col) ||
                (this.dragStart.row === row && this.dragStart.col >= col) ||
                (this.dragStart.row !== row && this.dragCur.row !== row)
              )
            } else if (this.dragCur.row > this.dragStart.row) {
              return (
                (this.dragCur.row === row && this.dragCur.col >= col) ||
                (this.dragStart.row === row && this.dragStart.col <= col) ||
                (this.dragStart.row !== row && this.dragCur.row !== row)
              )
            } else {
              // cur row == start row
              return (
                isBetween(col, this.dragStart.col, this.dragCur.col) ||
                isBetween(col, this.dragCur.col, this.dragStart.col)
              )
            }
          }
          return false
        }

        return (
          (isBetween(row, this.dragStart.row, this.dragCur.row) ||
            isBetween(row, this.dragCur.row, this.dragStart.row)) &&
          (isBetween(col, this.dragStart.col, this.dragCur.col) ||
            isBetween(col, this.dragCur.col, this.dragStart.col))
        )
      }
      return false
    },
  },
  mounted() {
    if (!this.calendarOnly) {
      const timesEl = document.getElementById("drag-section")
      if (isTouchEnabled()) {
        timesEl.addEventListener("touchstart", this.startDrag)
        timesEl.addEventListener("touchmove", this.moveDrag)
        timesEl.addEventListener("touchend", this.endDrag)
        timesEl.addEventListener("touchcancel", this.endDrag)
      }
      timesEl.addEventListener("mousedown", this.startDrag)
      timesEl.addEventListener("mousemove", this.moveDrag)
      timesEl.addEventListener("mouseup", this.endDrag)
    }
  },
}
