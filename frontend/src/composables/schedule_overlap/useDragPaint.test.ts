// @vitest-environment happy-dom

import { computed, ref, shallowRef } from "vue"
import { describe, expect, it, vi } from "vitest"
import { Temporal } from "temporal-polyfill"
import { availabilityTypes, eventTypes, UTC } from "@/constants"
import { ZdtMap, ZdtSet } from "@/utils"
import { states } from "@/composables/schedule_overlap/types"
import { useDragPaint } from "./useDragPaint"

const zdt = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(UTC)

function createScheduleEventDragPaint() {
  const event = ref({
    _id: "evt-1",
    ownerId: "owner-1",
    name: "Schedule event",
    type: eventTypes.SPECIFIC_DATES,
    dates: [Temporal.PlainDate.from("2026-01-01")],
    timeSeed: zdt("2026-01-01T09:00:00Z"),
    daysOnly: false,
    hasSpecificTimes: false,
  })
  const state = ref(states.SCHEDULE_EVENT)
  const dragging = ref(false)
  const dragStart = ref<{ row: number; col: number } | null>(null)
  const dragCur = ref<{ row: number; col: number } | null>(null)
  const curScheduledEvent = ref(null)

  return {
    dragPaint: useDragPaint({
      event,
      state,
      isSignUp: computed(() => false),
      weekOffset: ref(0),
      dragging,
      dragStart,
      dragCur,
      splitTimes: computed(() => [[{ hoursOffset: Temporal.Duration.from({ hours: 9 }) }], []]),
      times: computed(() => [{ hoursOffset: Temporal.Duration.from({ hours: 9 }) }]),
      days: computed(() => [{ dateObject: zdt("2026-01-01T09:00:00Z") }]),
      monthDays: computed(() => []),
      monthDayIncluded: computed(() => new ZdtMap<boolean>()),
      columnOffsets: computed(() => [10]),
      timeslot: ref({ width: 10, height: 10 }),
      availability: shallowRef(new ZdtSet()),
      ifNeeded: shallowRef(new ZdtSet()),
      tempTimes: shallowRef(new ZdtSet()),
      availabilityType: ref(availabilityTypes.AVAILABLE),
      signUpBlocksByDay: ref([[]]),
      signUpBlocksToAddByDay: ref([[]]),
      manualAvailability: shallowRef(new ZdtMap<ZdtSet>()),
      curScheduledEvent,
      maxSignUpBlockRowSize: computed(() => null),
      allowDrag: computed(() => true),
      getDateFromRowCol: (row, col) =>
        zdt(`2026-01-01T0${String(9 + row)}:00:00Z`).add({ days: col }),
      getAvailabilityForColumn: () => new ZdtSet(),
      createSignUpBlock: () => {
        throw new Error("not used in schedule-event tests")
      },
    }),
    curScheduledEvent,
    dragging,
  }
}

function createPointerEvent(
  type: string,
  target: HTMLElement,
  pointerId: number,
  y: number
) {
  const event = new PointerEvent(type, {
    clientX: 5,
    clientY: y,
    pointerId,
  })
  Object.defineProperty(event, "currentTarget", {
    configurable: true,
    value: target,
  })
  return event
}

describe("useDragPaint pointer capture", () => {
  it("captures the active pointer for schedule-event drags and releases it on completion", () => {
    const { dragPaint, curScheduledEvent, dragging } = createScheduleEventDragPaint()
    const target = document.createElement("div")

    Object.defineProperty(target, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        width: 10,
        height: 10,
      }),
    })

    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    const hasPointerCapture = vi.fn(() => true)
    target.setPointerCapture = setPointerCapture
    target.releasePointerCapture = releasePointerCapture
    target.hasPointerCapture = hasPointerCapture

    dragPaint.startDrag(createPointerEvent("pointerdown", target, 7, 5))
    dragPaint.moveDrag(createPointerEvent("pointermove", target, 7, 25))
    dragPaint.endDrag(createPointerEvent("pointerup", target, 7, 25))

    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(releasePointerCapture).toHaveBeenCalledWith(7)
    expect(dragging.value).toBe(false)
    expect(curScheduledEvent.value).toEqual({
      col: 0,
      row: 0,
      numRows: 1,
    })
  })

  it("ignores pointer movement from a different pointer id during an active drag", () => {
    const { dragPaint, curScheduledEvent } = createScheduleEventDragPaint()
    const target = document.createElement("div")

    Object.defineProperty(target, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        width: 10,
        height: 10,
      }),
    })

    target.setPointerCapture = vi.fn()
    target.releasePointerCapture = vi.fn()
    target.hasPointerCapture = vi.fn(() => true)

    dragPaint.startDrag(createPointerEvent("pointerdown", target, 7, 5))
    dragPaint.moveDrag(createPointerEvent("pointermove", target, 11, 35))
    dragPaint.endDrag(createPointerEvent("pointerup", target, 7, 35))

    expect(curScheduledEvent.value).toEqual({
      col: 0,
      row: 0,
      numRows: 1,
    })
  })
})
