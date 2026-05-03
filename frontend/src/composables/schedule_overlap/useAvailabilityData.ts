import {
  computed,
  nextTick,
  ref,
  shallowRef,
  type ComputedRef,
  type Ref,
} from "vue"
import {
  _delete,
  dateToDowDate,
  dateCompare,
  fromEpochMillisecondsToZDT,
  getDateDayOffset,
  getDateHoursOffset,
  getRenderedWeekStart,
  isDateBetween,
  parseTemporalEpochKey,
  post,
  generateEnabledCalendarsPayload,
  ZdtMap,
  ZdtSet,
  zdtMapGet,
  zdtSetHas,
  type CalendarAccountsMap,
} from "@/utils"
import { eventTypes, durations, UTC } from "@/constants"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import { Temporal } from "temporal-polyfill"
import {
  normalizeCalendarOptions,
  states,
  type CalendarEventsByDay,
  type CalendarOptions,
  type DayItem,
  type EventLike,
  type FetchedResponse,
  type ParsedResponse,
  type ParsedResponses,
  type ResponsesFormatted,
  type RowCol,
  type ScheduleOverlapState,
  type TimeItem,
} from "./types"

declare global {
  interface Window {
    __scheduleOverlapWorker?: {
      run: (
        fn: (...args: unknown[]) => unknown,
        args: unknown[]
      ) => Promise<ResponsesFormatted>
    }
  }
}

export interface UseAvailabilityDataOptions {
  event: Ref<EventLike>
  weekOffset: Ref<number>
  state: Ref<ScheduleOverlapState>
  fetchedResponses: Ref<Record<string, FetchedResponse | undefined>>
  loadingResponses: Ref<{
    loading: boolean
    lastFetched: Temporal.ZonedDateTime
  }>
  curGuestId: Ref<string>
  addingAvailabilityAsGuest: Ref<boolean>
  showSnackbar: Ref<boolean>
  calendarPermissionGranted: Ref<boolean>
  loadingCalendarEvents: Ref<boolean>

  // grid
  allDays: ComputedRef<DayItem[]>
  days: ComputedRef<DayItem[]>
  times: ComputedRef<TimeItem[]>
  splitTimes: ComputedRef<TimeItem[][]>
  timeslotDuration: ComputedRef<Temporal.Duration>
  page: Ref<number>
  maxDaysPerPage: ComputedRef<number>
  isGroup: ComputedRef<boolean>
  isOwner: ComputedRef<boolean>
  guestNameKey: ComputedRef<string>
  guestName: ComputedRef<string | undefined>
  // TODO
  getDateFromRowCol: (row: number, col: number) => Temporal.ZonedDateTime | null

  // from useCalendarEvents
  calendarEventsByDay: ComputedRef<CalendarEventsByDay>
  groupCalendarEventsByDay: ComputedRef<Record<string, CalendarEventsByDay>>
  bufferTime: Ref<CalendarOptions["bufferTime"]>
  workingHours: Ref<CalendarOptions["workingHours"]>
  getAvailabilityFromCalendarEvents: (input: {
    calendarEventsByDay?: CalendarEventsByDay
    includeTouchedAvailability?: boolean
    fetchedManualAvailability?: Record<string, ZdtSet>
    curManualAvailability?: Record<string, ZdtSet>
    calendarOptions?: CalendarOptions
  }) => ZdtSet

  // emits / external
  refreshEvent: () => void
}

export const getNumCurRespondentsForDay = (
  responsesFormatted: ResponsesFormatted,
  day: Temporal.ZonedDateTime,
  curRespondentsSet: Set<string>
): number =>
  [
    ...(zdtMapGet(responsesFormatted, day) ?? new Set<string>()),
  ].filter((respondentId) => curRespondentsSet.has(respondentId)).length

export function useAvailabilityData(opts: UseAvailabilityDataOptions) {
  const mainStore = useMainStore()

  const availability = shallowRef<ZdtSet>(new ZdtSet())
  const ifNeeded = shallowRef<ZdtSet>(new ZdtSet())
  const tempTimes = shallowRef<ZdtSet>(new ZdtSet())
  const availabilityAnimTimeouts = ref<ReturnType<typeof setTimeout>[]>([])
  const availabilityAnimEnabled = ref(false)
  const maxAnimTime = 1200
  const unsavedChanges = ref(false)
  const hideIfNeeded = ref(false)
  const manualAvailability = shallowRef<ZdtMap<ZdtSet>>(new ZdtMap())
  const responsesFormatted = shallowRef<ResponsesFormatted>(new ZdtMap())
  const curTimeslot = ref<RowCol>({ row: -1, col: -1 })
  const curTimeslotAvailability = ref<Record<string, boolean>>({})
  const timeslotSelected = ref(false)

  const availabilityArray = computed<Temporal.ZonedDateTime[]>(() => [
    ...availability.value,
  ])
  const ifNeededArray = computed<Temporal.ZonedDateTime[]>(() => [
    ...ifNeeded.value,
  ])

  const parsedResponses = computed<ParsedResponses>(() => {
    const parsed: ParsedResponses = {}
    const authUser = mainStore.authUser
    const responses = opts.event.value.responses
    if (!responses) return parsed

    if (opts.event.value.type === eventTypes.GROUP) {
      for (const userId in responses) {
        const calendarEventsByDay = (
          opts.groupCalendarEventsByDay.value as Record<
            string,
            CalendarEventsByDay | undefined
          >
        )[userId]
        if (calendarEventsByDay) {
          const fetchedManualAvailability = getFetchedManualAvailabilityDow(
            opts.fetchedResponses.value[userId]?.manualAvailability
          )
          const curManualAvailability =
            userId === authUser?._id
              ? getManualAvailabilityDow(manualAvailability.value)
              : {}

          const computedAvailability = opts.getAvailabilityFromCalendarEvents({
            calendarEventsByDay,
            includeTouchedAvailability: true,
            fetchedManualAvailability,
            curManualAvailability,
            calendarOptions:
              userId === authUser?._id
                ? {
                    bufferTime: opts.bufferTime.value,
                    workingHours: opts.workingHours.value,
                  }
                : normalizeCalendarOptions(
                    opts.fetchedResponses.value[userId]?.calendarOptions
                  ),
          })

          parsed[userId] = {
            user: {
              ...(responses[userId].user ?? {}),
              _id: responses[userId].user?._id ?? userId,
            },
            availability: computedAvailability,
            ifNeeded:
              responses[userId].ifNeeded &&
              Array.isArray(responses[userId].ifNeeded)
                ? new ZdtSet(
                    responses[userId].ifNeeded.map((ms) =>
                      fromEpochMillisecondsToZDT(ms)
                    )
                  )
                : undefined,
            enabledCalendars: responses[userId].enabledCalendars,
            calendarOptions: normalizeCalendarOptions(
              responses[userId].calendarOptions
            ),
          }
        } else {
          parsed[userId] = {
            user: {
              ...(responses[userId].user ?? {}),
              _id: responses[userId].user?._id ?? userId,
            },
            availability: new ZdtSet(),
          }
        }
      }
      return parsed
    }

    if (
      (opts.event.value as { blindAvailabilityEnabled?: boolean })
        .blindAvailabilityEnabled &&
      !opts.isOwner.value
    ) {
      const guestName = localStorage.getItem(opts.guestNameKey.value) ?? ""
      const userId = authUser?._id ?? guestName
      if (userId in responses) {
        const user = {
          ...(responses[userId].user ?? {}),
          _id: userId,
        }
        parsed[userId] = {
          user,
          availability: new ZdtSet(
            opts.fetchedResponses.value[userId]?.availability ?? []
          ),
          ifNeeded: new ZdtSet(
            opts.fetchedResponses.value[userId]?.ifNeeded ?? []
          ),
          enabledCalendars: responses[userId].enabledCalendars,
          calendarOptions: normalizeCalendarOptions(
            responses[userId].calendarOptions
          ),
        }
      }
      return parsed
    }

    for (const k of Object.keys(responses)) {
      const newUser = {
        ...(responses[k].user ?? {}),
        _id: k,
      }
      parsed[k] = {
        user: newUser,
        availability: new ZdtSet(opts.fetchedResponses.value[k]?.availability ?? []),
        ifNeeded: new ZdtSet(opts.fetchedResponses.value[k]?.ifNeeded ?? []),
        enabledCalendars: responses[k].enabledCalendars,
        calendarOptions: normalizeCalendarOptions(responses[k].calendarOptions),
      }
    }
    return parsed
  })

  const respondents = computed(() =>
    Object.values(parsedResponses.value)
      .map((r) => r.user)
      .filter(Boolean)
  )

  const userHasResponded = computed(() => {
    const authUser = mainStore.authUser
    return Boolean(authUser?._id && authUser._id in parsedResponses.value)
  })

  const max = computed(() => {
    let m = 0
    for (const [, available] of responsesFormatted.value) {
      if (available.size > m) m = available.size
    }
    return m
  })

  const getRespondentsForHoursOffset = (
    date: Temporal.ZonedDateTime,
    hoursOffset: Temporal.Duration
  ): Set<string> => {
    const d = date.add(hoursOffset)
    return zdtMapGet(responsesFormatted.value, d) ?? new Set()
  }

  const getResponsesFormatted = () => {
    const lastFetched = Temporal.Now.instant().toZonedDateTimeISO(UTC)
    opts.loadingResponses.value.loading = true
    opts.loadingResponses.value.lastFetched = lastFetched

    const job = (
      days: DayItem[],
      times: TimeItem[],
      pr: ParsedResponses,
      daysOnly: boolean,
      hideIfNeededFlag: boolean
    ) => {
      const dates: Temporal.ZonedDateTime[] = []
      if (daysOnly) {
        for (const day of days) dates.push(day.dateObject)
      } else {
        for (const day of days) {
          for (const time of times) {
            dates.push(day.dateObject.add(time.hoursOffset))
          }
        }
      }

      const formatted: ResponsesFormatted = new ZdtMap()
      for (const date of dates) {
        const bucket = new Set<string>()
        formatted.set(date, bucket)
        for (const response of Object.values(pr)) {
          if (
            zdtSetHas(response.availability, date) ||
            (response.ifNeeded && zdtSetHas(response.ifNeeded, date) && !hideIfNeededFlag)
          ) {
            bucket.add(response.user._id)
            continue
          }
        }
      }
      return formatted
    }

    const formatted = job(
      opts.allDays.value,
      opts.times.value,
      parsedResponses.value,
      Boolean(opts.event.value.daysOnly),
      hideIfNeeded.value
    )

    if (dateCompare(lastFetched, opts.loadingResponses.value.lastFetched) >= 0) {
      responsesFormatted.value = formatted
    }
    if (lastFetched.equals(opts.loadingResponses.value.lastFetched)) {
      opts.loadingResponses.value.loading = false
    }
  }

  const populateUserAvailability = (id: string) => {
    const resp = (
      parsedResponses.value as Record<string, ParsedResponse | undefined>
    )[id]
    availability.value = new ZdtSet(resp?.availability ?? [])
    ifNeeded.value = new ZdtSet(resp?.ifNeeded ?? [])
    void nextTick(() => (unsavedChanges.value = false))
  }

  const resetCurUserAvailability = (
    initSharedCalendarAccounts?: () => void
  ) => {
    if (opts.event.value.type === eventTypes.GROUP) {
      initSharedCalendarAccounts?.()
      manualAvailability.value = new ZdtMap()
    }
    availability.value = new ZdtSet()
    ifNeeded.value = new ZdtSet()
    const authUser = mainStore.authUser
    if (userHasResponded.value && authUser?._id) {
      populateUserAvailability(authUser._id)
    }
  }

  const resetCurTimeslot = () => {
    curTimeslot.value = { row: -1, col: -1 }
  }

  const animateAvailability = (
    incoming: ZdtSet,
    startDate: Temporal.ZonedDateTime,
    endDate: Temporal.ZonedDateTime
  ) => {
    availabilityAnimEnabled.value = true
    availabilityAnimTimeouts.value = []

    const msPerGroup = 25
    let blocksPerGroup = 2
    if ((incoming.size / blocksPerGroup) * msPerGroup > maxAnimTime) {
      blocksPerGroup = (incoming.size * msPerGroup) / maxAnimTime
    }
    let availabilityArray = [...incoming]
    availabilityArray = availabilityArray.filter(
      (a) => isDateBetween(a, startDate, endDate)
    )

    for (let i = 0; i < availabilityArray.length / blocksPerGroup + 1; ++i) {
      const timeout = setTimeout(() => {
        for (const a of availabilityArray.slice(
          i * blocksPerGroup,
          i * blocksPerGroup + blocksPerGroup
        )) {
          availability.value.add(a)
        }
        availability.value = new ZdtSet(availability.value)
        if (i >= availabilityArray.length / blocksPerGroup) {
          availability.value = new ZdtSet(incoming)
          availabilityAnimTimeouts.value.push(
            setTimeout(() => {
              availabilityAnimEnabled.value = false
              if (opts.showSnackbar.value) {
                mainStore.showInfo("Your availability has been autofilled!")
              }
              unsavedChanges.value = false
            }, 500)
          )
        }
      }, i * msPerGroup)

      availabilityAnimTimeouts.value.push(timeout)
    }
  }

  const stopAvailabilityAnim = () => {
    for (const timeout of availabilityAnimTimeouts.value) {
      clearTimeout(timeout)
    }
    availabilityAnimEnabled.value = false
  }

  const setAvailabilityAutomatically = () => {
    availability.value = new ZdtSet()
    const tmpAvailability = opts.getAvailabilityFromCalendarEvents({
      calendarEventsByDay: opts.calendarEventsByDay.value,
      calendarOptions: {
        bufferTime: opts.bufferTime.value,
        workingHours: opts.workingHours.value,
      },
    })

    const eventDates = opts.event.value.dates ?? []
    if (eventDates.length === 0) return
    const pageStartDate = getDateDayOffset(
      eventDates[0],
      opts.page.value * opts.maxDaysPerPage.value
    )
    const pageEndDate = getDateDayOffset(
      pageStartDate,
      opts.maxDaysPerPage.value
    )
    animateAvailability(tmpAvailability, pageStartDate, pageEndDate)
  }

  const reanimateAvailability = () => {
    const authUser = mainStore.authUser
    const responses = opts.event.value.responses
    if (
      opts.state.value === states.EDIT_AVAILABILITY &&
      authUser?._id &&
      !(authUser._id in (responses ?? {})) &&
      !opts.loadingCalendarEvents.value &&
      (!unsavedChanges.value || availabilityAnimEnabled.value)
    ) {
      for (const timeout of availabilityAnimTimeouts.value)
        clearTimeout(timeout)
      setAvailabilityAutomatically()
    }
  }

  const isTouched = (
    date: Temporal.ZonedDateTime,
    fromAvailability: Temporal.ZonedDateTime[] = [...availability.value]
  ): boolean => {
    const start = date
    // Convert Duration or default to Duration
    const duration = opts.event.value.duration ?? durations.ZERO
    const end = getDateHoursOffset(date, duration)
    for (const a of fromAvailability) {
      if (isDateBetween(a, start, end)) {
        return true
      }
    }
    return false
  }

  const getAvailabilityForColumn = (
    column: number,
    fromAvailability: ZdtSet = availability.value
  ): ZdtSet => {
    const subset = new ZdtSet()
    const totalRows =
      opts.splitTimes.value[0].length + opts.splitTimes.value[1].length
    for (let r = 0; r < totalRows; ++r) {
      const date = opts.getDateFromRowCol(r, column)
      if (!date) continue
      if (zdtSetHas(fromAvailability, date)) subset.add(date)
    }
    return subset
  }

  function getManualAvailabilityDow(
    fromManualAvailability: ZdtMap<ZdtSet> = manualAvailability.value
  ): Record<string, ZdtSet> {
    const eventDates = opts.event.value.dates ?? []
    const renderedWeekStart = getRenderedWeekStart(
      opts.weekOffset.value,
      opts.event.value.startOnMonday
    )
    const out: Record<string, ZdtSet> = {}

    for (const [timeInstant, slot] of fromManualAvailability.entries()) {
      const dowTime = dateToDowDate(
        eventDates,
        timeInstant,
        opts.weekOffset.value,
        false,
        opts.event.value.startOnMonday,
        renderedWeekStart
      )
      out[String(dowTime.epochMilliseconds)] = new ZdtSet(
        Array.from(slot).map((a) =>
          dateToDowDate(
            eventDates,
            a,
            opts.weekOffset.value,
            false,
            opts.event.value.startOnMonday,
            renderedWeekStart
          )
        )
      )
    }
    return out
  }

  function getFetchedManualAvailabilityDow(
    fromManualAvailability?: Record<string, Temporal.ZonedDateTime[]>
  ): Record<string, ZdtSet> {
    if (!fromManualAvailability) return {}

    const eventDates = opts.event.value.dates ?? []
    const renderedWeekStart = getRenderedWeekStart(
      opts.weekOffset.value,
      opts.event.value.startOnMonday
    )
    const out: Record<string, ZdtSet> = {}

    for (const time in fromManualAvailability) {
      const timeInstant = parseTemporalEpochKey(time)
      const dowTime = dateToDowDate(
        eventDates,
        timeInstant,
        opts.weekOffset.value,
        false,
        opts.event.value.startOnMonday,
        renderedWeekStart
      )
      out[String(dowTime.epochMilliseconds)] = new ZdtSet(
        fromManualAvailability[time].map((a) =>
          dateToDowDate(
            eventDates,
            a,
            opts.weekOffset.value,
            false,
            opts.event.value.startOnMonday,
            renderedWeekStart
          )
        )
      )
    }

    return out
  }

  const curRespondentsMaxFor = (
    curRespondentsSet: Set<string>,
    allDays: DayItem[]
  ): number => {
    let maxLocal = 0
    if (opts.event.value.daysOnly) {
      for (const day of allDays) {
        const num = getNumCurRespondentsForDay(
          responsesFormatted.value,
          day.dateObject,
          curRespondentsSet
        )
        if (num > maxLocal) maxLocal = num
      }
    } else {
      const eventDates = opts.event.value.dates ?? []
      for (const date of eventDates) {
        for (const time of opts.times.value) {
          const num = [
            ...getRespondentsForHoursOffset(date, time.hoursOffset),
          ].filter((r) => curRespondentsSet.has(r)).length
          if (num > maxLocal) maxLocal = num
        }
      }
    }
    return maxLocal
  }

  const showAvailability = (row: number, col: number) => {
    if (opts.state.value === states.EDIT_AVAILABILITY) {
      // Don't show availability when editing
      curTimeslot.value = { row, col }
      return
    }
    curTimeslot.value = { row, col }
    const date = opts.getDateFromRowCol(row, col)
    if (!date) return
    const available =
      zdtMapGet(responsesFormatted.value, date) ?? new Set()
    for (const respondent of respondents.value) {
      if (respondent._id) {
        curTimeslotAvailability.value[respondent._id] = available.has(
          respondent._id
        )
      }
    }
  }

  const submitAvailability = async (
    guestPayload: { name: string; email: string } = { name: "", email: "" },
    sharedCalendarAccounts?: Record<string, unknown>
  ) => {
    let payload: Record<string, unknown> = {}
    let type: string
    const authUser = mainStore.authUser

    if (opts.isGroup.value) {
      type = "group availability and calendars"
      payload = generateEnabledCalendarsPayload(
        (sharedCalendarAccounts ?? {}) as CalendarAccountsMap
      )
      const md: Record<string, number[]> = {}
      for (const [day, instants] of manualAvailability.value.entries()) {
        md[day.toString()] = [...instants].map(
          (instant) => instant.epochMilliseconds
        )
      }
      payload.manualAvailability = md
      payload.calendarOptions = {
        bufferTime: opts.bufferTime.value,
        workingHours: opts.workingHours.value,
      }
    } else {
      type = "availability"
      payload.availability = availabilityArray.value
      payload.ifNeeded = ifNeededArray.value
      if (authUser && !opts.addingAvailabilityAsGuest.value) {
        payload.guest = false
      } else {
        payload.guest = true
        payload.name = guestPayload.name
        payload.email = guestPayload.email
        localStorage[opts.guestNameKey.value] = guestPayload.name
      }
    }

    await post(`/events/${opts.event.value._id ?? ""}/response`, payload)

    const addedIfNeededTimes = ifNeededArray.value.length > 0
    if (authUser) {
      if (authUser._id && authUser._id in parsedResponses.value) {
        posthog.capture(`Edited ${type}`, {
          eventId: opts.event.value._id,
          addedIfNeededTimes,
        })
      } else {
        posthog.capture(`Added ${type}`, {
          eventId: opts.event.value._id,
          addedIfNeededTimes,
          bufferTime: opts.bufferTime.value.time,
          bufferTimeActive: opts.bufferTime.value.enabled,
          workingHoursEnabled: opts.workingHours.value.enabled,
          workingHoursStartTime: opts.workingHours.value.startTime,
          workingHoursEndTime: opts.workingHours.value.endTime,
        })
      }
    } else {
      if (guestPayload.name in parsedResponses.value) {
        posthog.capture(`Edited ${type} as guest`, {
          eventId: opts.event.value._id,
          addedIfNeededTimes,
        })
      } else {
        posthog.capture(`Added ${type} as guest`, {
          eventId: opts.event.value._id,
          addedIfNeededTimes,
        })
      }
    }

    opts.refreshEvent()
    unsavedChanges.value = false
  }

  const deleteAvailability = async (name = "") => {
    const payload: Record<string, unknown> = {}
    const authUser = mainStore.authUser
    if (authUser && !opts.addingAvailabilityAsGuest.value) {
      payload.guest = false
      payload.userId = authUser._id
      posthog.capture("Deleted availability", {
        eventId: opts.event.value._id,
      })
    } else {
      payload.guest = true
      payload.name = name
      posthog.capture("Deleted availability as guest", {
        eventId: opts.event.value._id,
        name,
      })
    }
    await _delete(`/events/${opts.event.value._id ?? ""}/response`, payload)
    availability.value = new ZdtSet()
    if (opts.isGroup.value) {
      // group navigation handled by caller
    } else {
      opts.refreshEvent()
    }
  }

  const getAllValidTimeRanges = (): Map<
    Temporal.ZonedDateTime,
    {
      row: number
      col: number
      startTime: Temporal.ZonedDateTime
      endTime: Temporal.ZonedDateTime
    }
  > => {
    const out = new Map<
      Temporal.ZonedDateTime,
      {
        row: number
        col: number
        startTime: Temporal.ZonedDateTime
        endTime: Temporal.ZonedDateTime
      }
    >()
    if (opts.event.value.daysOnly) return out

    for (let col = 0; col < opts.days.value.length; col++) {
      for (let row = 0; row < opts.times.value.length; row++) {
        const date = opts.getDateFromRowCol(row, col)
        if (!date) continue
        const startTime = date
        const endTime = startTime.add(opts.timeslotDuration.value)
        out.set(startTime, { row, col, startTime, endTime })
      }
    }
    return out
  }

  return {
    // refs
    availability,
    ifNeeded,
    tempTimes,
    availabilityAnimEnabled,
    availabilityAnimTimeouts,
    unsavedChanges,
    hideIfNeeded,
    manualAvailability,
    fetchedResponses: opts.fetchedResponses,
    loadingResponses: opts.loadingResponses,
    responsesFormatted,
    curTimeslot,
    curTimeslotAvailability,
    timeslotSelected,
    // computed
    availabilityArray,
    ifNeededArray,
    parsedResponses,
    respondents,
    userHasResponded,
    max,
    // helpers
    getRespondentsForHoursOffset,
    getResponsesFormatted,
    populateUserAvailability,
    resetCurUserAvailability,
    resetCurTimeslot,
    animateAvailability,
    stopAvailabilityAnim,
    setAvailabilityAutomatically,
    reanimateAvailability,
    isTouched,
    getAvailabilityForColumn,
    getManualAvailabilityDow,
    getFetchedManualAvailabilityDow,
    curRespondentsMaxFor,
    showAvailability,
    submitAvailability,
    deleteAvailability,
    getAllValidTimeRanges,
  }
}

export type UseAvailabilityDataReturn = ReturnType<typeof useAvailabilityData>
