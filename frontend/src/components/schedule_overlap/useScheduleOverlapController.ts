import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  watch,
  type ComputedRef,
  type Ref,
} from "vue"
import { eventTypes } from "@/constants"
import { isTouchEnabled, ZdtSet } from "@/utils"
import {
  normalizeCalendarOptions,
  states,
  type CalendarEventsByDay,
  type CalendarOptions,
  type EventLike,
  type ParsedResponses,
  type ScheduledEvent,
  type ScheduleOverlapResponse,
  type ScheduleOverlapState,
} from "@/composables/schedule_overlap/types"

interface AuthUserLike {
  _id?: string
  calendarOptions?: ScheduleOverlapResponse["calendarOptions"]
}

export interface UseScheduleOverlapControllerOptions {
  event: ComputedRef<EventLike>
  fromEditEvent: ComputedRef<boolean>
  calendarOnly: ComputedRef<boolean>
  weekOffset: ComputedRef<number>
  isGroup: ComputedRef<boolean>
  isSpecificTimes: ComputedRef<boolean>
  showBestTimes: Ref<boolean>
  state: Ref<ScheduleOverlapState>
  availability: Ref<ZdtSet>
  parsedResponses: ComputedRef<ParsedResponses>
  respondents: ComputedRef<{ _id?: string }[]>
  curTimeslotAvailability: Ref<Record<string, boolean>>
  unsavedChanges: Ref<boolean>
  hideIfNeeded: Ref<boolean>
  page: Ref<number>
  allDays: ComputedRef<unknown[]>
  mobileNumDays: Ref<number>
  tempTimes: Ref<ZdtSet>
  calendarEventsByDay: ComputedRef<CalendarEventsByDay>
  bufferTime: Ref<CalendarOptions["bufferTime"]>
  workingHours: Ref<CalendarOptions["workingHours"]>
  curScheduledEvent: Ref<ScheduledEvent | null>
  delayedShowStickyRespondents: Ref<boolean>
  delayedShowStickyRespondentsTimeout: Ref<ReturnType<typeof setTimeout> | null>
  showStickyRespondents: ComputedRef<boolean>
  authUser: ComputedRef<AuthUserLike | null | undefined>
  setTimeslotSize: () => void
  onResize: (e: Event) => void
  onScroll: (e: Event) => void
  startDrag: (e: MouseEvent | TouchEvent) => void
  moveDrag: (e: MouseEvent | TouchEvent) => void
  endDrag: (e?: MouseEvent | TouchEvent) => void
  deselectRespondents: (e: Event) => void
  resetSignUpForm: () => void
  resetCurUserAvailability: (initSharedCalendarAccounts?: () => void) => void
  initSharedCalendarAccounts: () => void
  fetchResponses: () => void
  reanimateAvailability: () => void
  getResponsesFormatted: () => void
  populateUserAvailability: (id: string) => void
  checkElementsVisible: () => void
  onShowBestTimesChange: () => void
}

const updateCurTimeslotAvailability = (
  curTimeslotAvailability: Ref<Record<string, boolean>>,
  respondents: { _id?: string }[]
) => {
  curTimeslotAvailability.value = {}
  for (const respondent of respondents) {
    if (respondent._id) {
      curTimeslotAvailability.value[respondent._id] = true
    }
  }
}

const getInitialState = ({
  event,
  fromEditEvent,
  scheduledEventFromUrl,
  showBestTimes,
}: {
  event: EventLike
  fromEditEvent: boolean
  scheduledEventFromUrl: ScheduledEvent | null
  showBestTimes: boolean
}): ScheduleOverlapState => {
  if (
    event.hasSpecificTimes &&
    (fromEditEvent || !event.times || event.times.length === 0)
  ) {
    return states.SET_SPECIFIC_TIMES
  }

  if (scheduledEventFromUrl) {
    return states.SCHEDULE_EVENT
  }

  return showBestTimes ? states.BEST_TIMES : states.HEATMAP
}

const consumeScheduledEventFromUrl = (): ScheduledEvent | null => {
  const scheduledEventRaw = new URLSearchParams(window.location.search).get(
    "scheduled_event"
  )
  if (!scheduledEventRaw) return null

  const scheduledEvent = JSON.parse(scheduledEventRaw) as ScheduledEvent
  const newUrl = new URL(window.location.href)
  newUrl.searchParams.delete("scheduled_event")
  window.history.replaceState({}, document.title, newUrl.toString())
  return scheduledEvent
}

const applyCalendarOptions = ({
  event,
  isGroup,
  authUser,
  bufferTime,
  workingHours,
}: {
  event: EventLike
  isGroup: boolean
  authUser: AuthUserLike | null | undefined
  bufferTime: Ref<CalendarOptions["bufferTime"]>
  workingHours: Ref<CalendarOptions["workingHours"]>
}) => {
  if (!authUser) return

  const userCalendarOptions = normalizeCalendarOptions(authUser.calendarOptions)
  bufferTime.value = userCalendarOptions.bufferTime
  workingHours.value = userCalendarOptions.workingHours

  if (!isGroup || !authUser._id) return

  const groupCalendarOptions = event.responses?.[authUser._id]?.calendarOptions

  const normalizedGroupOptions = normalizeCalendarOptions(groupCalendarOptions)
  bufferTime.value = normalizedGroupOptions.bufferTime
  workingHours.value = normalizedGroupOptions.workingHours
}

export function useScheduleOverlapController(
  opts: UseScheduleOverlapControllerOptions
) {
  opts.resetCurUserAvailability(opts.initSharedCalendarAccounts)

  watch(
    opts.showStickyRespondents,
    (cur) => {
      if (opts.delayedShowStickyRespondentsTimeout.value != null) {
        clearTimeout(opts.delayedShowStickyRespondentsTimeout.value)
      }
      opts.delayedShowStickyRespondentsTimeout.value = setTimeout(() => {
        opts.delayedShowStickyRespondents.value = cur
      }, 100)
    },
    { immediate: true }
  )

  watch(opts.showBestTimes, () => {
    opts.onShowBestTimesChange()
  })

  watch(opts.availability, () => {
    if (opts.state.value === states.EDIT_AVAILABILITY) {
      opts.unsavedChanges.value = true
    }
  })

  watch(opts.calendarEventsByDay, (nextEvents, prevEvents) => {
    if (JSON.stringify(nextEvents) !== JSON.stringify(prevEvents)) {
      opts.reanimateAvailability()
    }
  })

  watch(opts.bufferTime, (cur, prev) => {
    if (cur.enabled !== prev.enabled || cur.enabled) {
      opts.reanimateAvailability()
    }
  })

  watch(opts.workingHours, (cur, prev) => {
    if (cur.enabled !== prev.enabled || cur.enabled) {
      opts.reanimateAvailability()
    }
  })

  watch(
    opts.event,
    () => {
      opts.initSharedCalendarAccounts()
      opts.fetchResponses()
    },
    { immediate: true }
  )

  watch(opts.weekOffset, () => {
    if (opts.event.value.type === eventTypes.GROUP) {
      opts.fetchResponses()
    }
  })

  watch(opts.hideIfNeeded, () => {
    opts.getResponsesFormatted()
  })

  watch(opts.parsedResponses, () => {
    opts.getResponsesFormatted()
    if (
      opts.event.value.type === eventTypes.GROUP &&
      opts.state.value === states.EDIT_AVAILABILITY &&
      opts.authUser.value?._id
    ) {
      opts.availability.value = new ZdtSet()
      opts.populateUserAvailability(opts.authUser.value._id)
    }
  })

  watch(opts.state, (nextState, prevState) => {
    void nextTick(() => {
      opts.checkElementsVisible()
    })

    if (prevState === states.SCHEDULE_EVENT) {
      opts.curScheduledEvent.value = null
    } else if (prevState === states.EDIT_AVAILABILITY) {
      opts.unsavedChanges.value = false
    }

    if (nextState === states.SET_SPECIFIC_TIMES) {
      void nextTick(() => {
        const time9 = document.getElementById("time-9")
        if (!time9) return

        const y = time9.getBoundingClientRect().top + window.scrollY - 150
        window.scrollTo({ top: y, behavior: "smooth" })
      })
    }
  })

  watch(opts.page, () => {
    void nextTick(() => {
      opts.setTimeslotSize()
    })
  })

  watch(opts.allDays, () => {
    void nextTick(() => {
      opts.setTimeslotSize()
    })
  })

  watch(opts.mobileNumDays, () => {
    void nextTick(() => {
      opts.setTimeslotSize()
    })
  })

  watch(
    opts.fromEditEvent,
    () => {
      if (opts.fromEditEvent.value && opts.isSpecificTimes.value) {
        opts.tempTimes.value = new ZdtSet(opts.event.value.times ?? [])
        opts.state.value = states.SET_SPECIFIC_TIMES
      }
    }
  )

  watch(
    opts.respondents,
    (respondents) => {
      updateCurTimeslotAvailability(opts.curTimeslotAvailability, respondents)
    },
    { immediate: true }
  )

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    const scheduledEventFromUrl = consumeScheduledEventFromUrl()
    if (scheduledEventFromUrl) {
      opts.curScheduledEvent.value = scheduledEventFromUrl
    }

    opts.state.value = getInitialState({
      event: opts.event.value,
      fromEditEvent: opts.fromEditEvent.value,
      scheduledEventFromUrl,
      showBestTimes: opts.showBestTimes.value,
    })

    applyCalendarOptions({
      event: opts.event.value,
      isGroup: opts.isGroup.value,
      authUser: opts.authUser.value,
      bufferTime: opts.bufferTime,
      workingHours: opts.workingHours,
    })

    opts.setTimeslotSize()
    addEventListener("resize", opts.onResize)
    addEventListener("scroll", opts.onScroll)

    const dragSection = document.getElementById("drag-section")
    if (dragSection) {
      resizeObserver = new ResizeObserver(() => {
        opts.setTimeslotSize()
      })
      resizeObserver.observe(dragSection)
    }

    if (!opts.calendarOnly.value && dragSection) {
      if (isTouchEnabled()) {
        dragSection.addEventListener("touchstart", opts.startDrag)
        dragSection.addEventListener("touchmove", opts.moveDrag)
        dragSection.addEventListener("touchend", opts.endDrag)
        dragSection.addEventListener("touchcancel", opts.endDrag)
      }
      dragSection.addEventListener("mousedown", opts.startDrag)
      dragSection.addEventListener("mousemove", opts.moveDrag)
      dragSection.addEventListener("mouseup", opts.endDrag)
    }

    opts.resetSignUpForm()
    addEventListener("click", opts.deselectRespondents)
  })

  onBeforeUnmount(() => {
    removeEventListener("click", opts.deselectRespondents)
    removeEventListener("resize", opts.onResize)
    removeEventListener("scroll", opts.onScroll)
    resizeObserver?.disconnect()
    if (opts.delayedShowStickyRespondentsTimeout.value != null) {
      clearTimeout(opts.delayedShowStickyRespondentsTimeout.value)
    }
  })

  return {
    updateCurTimeslotAvailability: (respondents: { _id?: string }[]) => {
      updateCurTimeslotAvailability(opts.curTimeslotAvailability, respondents)
    },
  }
}

export type UseScheduleOverlapControllerReturn = ReturnType<
  typeof useScheduleOverlapController
>
