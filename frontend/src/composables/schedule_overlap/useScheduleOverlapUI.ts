import { computed, ref, type ComputedRef, type Ref } from "vue"
import { isElementInViewport } from "@/utils"
import { posthog } from "@/plugins/posthog"
import { availabilityTypes, type AvailabilityType } from "@/constants"
import { useMainStore } from "@/stores/main"
import {
  states,
  type ParsedResponses,
  type RowCol,
  type ScheduleOverlapState,
} from "./types"

export interface UseScheduleOverlapUIOptions {
  isPhone: Ref<boolean>
  isSignUp: ComputedRef<boolean>
  isGroup: ComputedRef<boolean>
  showHintText: Ref<boolean>
  /** Optional external state ref — if provided, used instead of creating one internally */
  state?: Ref<ScheduleOverlapState>
  showBestTimes?: Ref<boolean>
  defaultState?: ComputedRef<ScheduleOverlapState>
  allowDrag?: ComputedRef<boolean>
  availabilityType?: Ref<AvailabilityType>
  parsedResponses: ComputedRef<ParsedResponses>
  curTimeslot: Ref<RowCol>
  resetCurTimeslotOnDrag?: () => void
  endDrag: () => void
  timeslotSelected: Ref<boolean>
  curTimeslotAvailability: Ref<Record<string, boolean>>
  respondents: ComputedRef<{ _id?: string }[]>
  curGuestId: Ref<string>
  guestName: ComputedRef<string | undefined>
  guestAddedAvailability: ComputedRef<boolean>
  // refs to other components for visibility checks
  optionsSectionRef?: Ref<HTMLElement | null>
  respondentsListRef?: Ref<HTMLElement | null>
}

export function useScheduleOverlapUI(opts: UseScheduleOverlapUIOptions) {
  const mainStore = useMainStore()

  const state = opts.state ?? ref<ScheduleOverlapState>(states.BEST_TIMES)

  const showBestTimes = opts.showBestTimes ?? ref<boolean>(
    localStorage.showBestTimes === undefined
      ? false
      : localStorage.showBestTimes === "true"
  )

  const defaultState = opts.defaultState ?? computed<ScheduleOverlapState>(() =>
    showBestTimes.value ? states.BEST_TIMES : states.HEATMAP
  )

  const editing = computed(
    () =>
      state.value === states.EDIT_AVAILABILITY ||
      state.value === states.EDIT_SIGN_UP_BLOCKS
  )
  const scheduling = computed(() => state.value === states.SCHEDULE_EVENT)
  const allowDrag = opts.allowDrag ?? computed(
    () =>
      state.value === states.EDIT_AVAILABILITY ||
      state.value === states.EDIT_SIGN_UP_BLOCKS ||
      state.value === states.SCHEDULE_EVENT ||
      state.value === states.SET_SPECIFIC_TIMES
  )

  const curRespondent = ref("")
  const curRespondents = ref<string[]>([])
  const curRespondentsSet = computed(() => new Set(curRespondents.value))

  const showEditOptions = ref<boolean>(
    localStorage.showEditOptions === undefined
      ? false
      : localStorage.showEditOptions === "true"
  )
  const showEventOptions = ref<boolean>(
    localStorage.showEventOptions === undefined
      ? false
      : localStorage.showEventOptions === "true"
  )
  const showCalendarEvents = ref(false)

  const availabilityType = opts.availabilityType ?? ref<AvailabilityType>(availabilityTypes.AVAILABLE)
  const overlayAvailability = ref(false)

  const deleteAvailabilityDialog = ref(false)
  const calendarOptionsDialog = ref(false)
  const editGuestNameDialog = ref(false)
  const newGuestName = ref("")

  const tooltipContent = ref("")
  const optionsVisible = ref(false)
  const scrolledToRespondents = ref(false)
  const delayedShowStickyRespondents = ref(false)
  const delayedShowStickyRespondentsTimeout = ref<
    ReturnType<typeof setTimeout> | null
  >(null)

  const hintState = ref(true)

  const rightSideWidth = computed(() => {
    if (opts.isPhone.value) return "100%"
    return opts.isSignUp.value ? "18rem" : "13rem"
  })

  const showStickyRespondents = computed(
    () =>
      opts.isPhone.value &&
      !scrolledToRespondents.value &&
      (opts.curTimeslot.value.row !== -1 ||
        curRespondent.value.length > 0 ||
        curRespondents.value.length > 0)
  )

  const hintStateLocalStorageKey = computed(
    () =>
      `closedHintText${state.value}` + (opts.isGroup.value ? "&isGroup" : "")
  )

  const hintText = computed(() => {
    const phone = opts.isPhone.value
    const verb = phone ? "Tap and drag" : "Click and drag"
    if (opts.isGroup.value && state.value === states.EDIT_AVAILABILITY) {
      return `Toggle which calendars are used. ${verb.toLowerCase()} to edit your availability.`
    }
    if (state.value === states.EDIT_AVAILABILITY) {
      const daysOrTimes = "times" // event.daysOnly handled by caller via override
      if (availabilityType.value === availabilityTypes.IF_NEEDED) {
        return `${verb} to add your "if needed" ${daysOrTimes} in yellow.`
      }
      return `${verb} to add your "available" ${daysOrTimes} in green.`
    }
    if (state.value === states.SCHEDULE_EVENT) {
      return `${verb} on the calendar to schedule a Google Calendar event during those times.`
    }
    return ""
  })

  const hintClosed = computed(
    () =>
      !hintState.value || Boolean(localStorage[hintStateLocalStorageKey.value])
  )

  const hintTextShown = computed(
    () => opts.showHintText.value && hintText.value !== "" && !hintClosed.value
  )

  const closeHint = () => {
    hintState.value = false
    localStorage[hintStateLocalStorageKey.value] = "true"
  }

  const mouseOverRespondent = (_e: Event, id: string) => {
    if (curRespondents.value.length === 0) {
      if (state.value === defaultState.value) {
        state.value = states.SINGLE_AVAILABILITY
      }
      curRespondent.value = id
    }
  }

  const mouseLeaveRespondent = (_e?: Event) => {
    if (curRespondents.value.length === 0) {
      if (state.value === states.SINGLE_AVAILABILITY) {
        state.value = defaultState.value
      }
      curRespondent.value = ""
    }
  }

  const clickRespondent = (e: Event, id: string) => {
    state.value = states.SUBSET_AVAILABILITY
    curRespondent.value = ""

    if (curRespondentsSet.value.has(id)) {
      curRespondents.value = curRespondents.value.filter((r) => r !== id)
      if (curRespondents.value.length === 0) state.value = defaultState.value
    } else {
      curRespondents.value.push(id)
    }
    e.stopPropagation()
  }

  const resetCurTimeslot = () => {
    if (opts.timeslotSelected.value) return
    opts.curTimeslotAvailability.value = {}
    for (const respondent of opts.respondents.value) {
      if (respondent._id)
        opts.curTimeslotAvailability.value[respondent._id] = true
    }
    opts.curTimeslot.value = { row: -1, col: -1 }
    opts.endDrag()
  }

  const deselectRespondents = (e: MouseEvent | Event) => {
    const target = e.target as Element | null
    if (
      target?.previousElementSibling?.id === "show-best-times-toggle" ||
      (target?.firstChild as HTMLElement | null)?.firstChild &&
        ((target?.firstChild as HTMLElement).firstChild as HTMLElement | null)
          ?.id === "show-best-times-toggle" ||
      target?.classList.contains("timeslot")
    ) {
      return
    }

    if (state.value === states.SUBSET_AVAILABILITY) {
      state.value = defaultState.value
    }
    curRespondents.value = []
    opts.timeslotSelected.value = false
    resetCurTimeslot()
  }

  const isGuest = (user: { _id?: string; firstName?: string }): boolean =>
    user._id === user.firstName

  const checkElementsVisible = () => {
    const optionsSectionEl = opts.optionsSectionRef?.value
    if (optionsSectionEl) {
      optionsVisible.value = isElementInViewport(optionsSectionEl, {
        bottomOffset: -64,
      })
    }

    const respondentsListEl = opts.respondentsListRef?.value
    if (respondentsListEl) {
      scrolledToRespondents.value = isElementInViewport(respondentsListEl, {
        bottomOffset: -64,
      })
    }
  }

  const onScroll = (_e: Event) => {
    checkElementsVisible()
  }

  const toggleShowEditOptions = () => {
    showEditOptions.value = !showEditOptions.value
    localStorage.showEditOptions = String(showEditOptions.value)
  }
  const toggleShowEventOptions = () => {
    showEventOptions.value = !showEventOptions.value
    localStorage.showEventOptions = String(showEventOptions.value)
  }
  const onShowBestTimesChange = () => {
    localStorage.showBestTimes = String(showBestTimes.value)
    if (
      state.value === states.BEST_TIMES ||
      state.value === states.HEATMAP
    ) {
      state.value = defaultState.value
    }
  }
  const updateOverlayAvailability = (val: unknown) => {
    overlayAvailability.value = !!val
    posthog.capture("overlay_availability_toggled", { enabled: !!val })
  }

  const showCalendarOptions = computed(() => true) // computed by caller — placeholder
  const showOverlayAvailabilityToggle = computed(
    () =>
      opts.respondents.value.length > 0 &&
      mainStore.overlayAvailabilitiesEnabled
  )

  const guestNameKey = computed(() => "") // overridden by caller; provided here for shape parity

  const selectedGuestRespondent = computed(() => {
    if (opts.guestAddedAvailability.value) return opts.guestName.value ?? ""
    if (curRespondents.value.length !== 1) return ""
    const parsedResp = (opts.parsedResponses.value as Record<string, (typeof opts.parsedResponses.value)[string] | undefined>)[curRespondents.value[0]]
    const user = parsedResp?.user
    if (!user) return ""
    return isGuest(user) ? user._id : ""
  })

  const canEditGuestName = computed(() => true)

  return {
    // refs
    state,
    showBestTimes,
    showEditOptions,
    showEventOptions,
    showCalendarEvents,
    availabilityType,
    overlayAvailability,
    deleteAvailabilityDialog,
    calendarOptionsDialog,
    editGuestNameDialog,
    newGuestName,
    tooltipContent,
    optionsVisible,
    scrolledToRespondents,
    delayedShowStickyRespondents,
    delayedShowStickyRespondentsTimeout,
    hintState,
    curRespondent,
    curRespondents,
    // computed
    defaultState,
    editing,
    scheduling,
    allowDrag,
    curRespondentsSet,
    rightSideWidth,
    showStickyRespondents,
    hintStateLocalStorageKey,
    hintText,
    hintClosed,
    hintTextShown,
    showCalendarOptions,
    showOverlayAvailabilityToggle,
    guestNameKey,
    selectedGuestRespondent,
    canEditGuestName,
    // helpers
    mouseOverRespondent,
    mouseLeaveRespondent,
    clickRespondent,
    deselectRespondents,
    resetCurTimeslot,
    isGuest,
    checkElementsVisible,
    onScroll,
    toggleShowEditOptions,
    toggleShowEventOptions,
    onShowBestTimesChange,
    updateOverlayAvailability,
    closeHint,
  }
}

export type UseScheduleOverlapUIReturn = ReturnType<
  typeof useScheduleOverlapUI
>
