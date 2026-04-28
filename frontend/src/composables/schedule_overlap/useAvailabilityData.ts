import { computed, nextTick, ref, type ComputedRef, type Ref } from "vue"
import {
  _delete,
  dateToDowDate,
  getDateDayOffset,
  getDateHoursOffset,
  post,
  generateEnabledCalendarsPayload,
  type CalendarAccountsMap,
} from "@/utils"
import { eventTypes, durations, UTC } from "@/constants"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import { Temporal } from "temporal-polyfill"
import {
  states,
  type CalendarEventsByDay,
  type CalendarOptions,
  type DayItem,
  type EventLike,
  type ParsedResponse,
  type ParsedResponses,
  type ResponsesFormatted,
  type RowCol,
  type ScheduleOverlapState,
  type TimeItem,
} from "./types"

interface FetchedResponse {
  user?: Record<string, unknown>
  availability?: Temporal.ZonedDateTime[]
  ifNeeded?: Temporal.ZonedDateTime[]
  enabledCalendars?: Record<string, string[]>
  calendarOptions?: CalendarOptions
  manualAvailability?: Record<string, Temporal.ZonedDateTime[]>
}

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
    fetchedManualAvailability?: Record<string, Set<Temporal.ZonedDateTime>>
    curManualAvailability?: Record<string, Set<Temporal.ZonedDateTime>>
    calendarOptions?: CalendarOptions
  }) => Set<Temporal.ZonedDateTime>

  // emits / external
  refreshEvent: () => void
}

export function useAvailabilityData(opts: UseAvailabilityDataOptions) {
  const mainStore = useMainStore()

  const availability = ref<Set<Temporal.ZonedDateTime>>(new Set())
  const ifNeeded = ref<Set<Temporal.ZonedDateTime>>(new Set())
  const tempTimes = ref<Set<Temporal.ZonedDateTime>>(new Set())
  const availabilityAnimTimeouts = ref<ReturnType<typeof setTimeout>[]>([])
  const availabilityAnimEnabled = ref(false)
  const maxAnimTime = 1200
  const unsavedChanges = ref(false)
  const hideIfNeeded = ref(false)
  const manualAvailability = ref<
    Map<Temporal.ZonedDateTime, Set<Temporal.ZonedDateTime>>
  >(new Map())
  const fetchedResponses = ref<Record<string, FetchedResponse | undefined>>({})
  const loadingResponses = ref<{
    loading: boolean
    lastFetched: Temporal.ZonedDateTime
  }>({
    loading: false,
    lastFetched: Temporal.Now.instant().toZonedDateTimeISO(UTC),
  })
  const responsesFormatted = ref<ResponsesFormatted>(new Map())
  const curTimeslot = ref<RowCol>({ row: -1, col: -1 })
  const curTimeslotAvailability = ref<Record<string, boolean>>({})
  const timeslotSelected = ref(false)

  const availabilityArray = computed<Temporal.ZonedDateTime[]>(() => [
    ...availability.value,
  ])
  const ifNeededArray = computed<Temporal.ZonedDateTime[]>(() => [
    ...ifNeeded.value,
  ])

  type ResponseEntry = { user?: ParsedResponse["user"] } & Record<
    string,
    unknown
  >

  const parsedResponses = computed<ParsedResponses>(() => {
    const parsed: ParsedResponses = {}
    const authUser = mainStore.authUser
    const responses = (
      opts.event.value as { responses?: Record<string, ResponseEntry> }
    ).responses
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
          const fetchedManualAvailability = getManualAvailabilityDow(
            fetchedResponses.value[userId]?.manualAvailability
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
                : fetchedResponses.value[userId]?.calendarOptions ?? {
                    bufferTime: opts.bufferTime.value,
                    workingHours: opts.workingHours.value,
                  },
          })

          parsed[userId] = {
            user: responses[userId].user ?? { _id: userId },
            availability: computedAvailability,
            ifNeeded:
              responses[userId].ifNeeded &&
              Array.isArray(responses[userId].ifNeeded)
                ? new Set(
                    (responses[userId].ifNeeded as number[]).map((ms) =>
                      Temporal.ZonedDateTime.from({millisecond: ms})
                    )
                  )
                : undefined,
            enabledCalendars: responses[userId].enabledCalendars as
              | Record<string, string[]>
              | undefined,
            calendarOptions: responses[userId].calendarOptions as
              | CalendarOptions
              | undefined,
          }
        } else {
          parsed[userId] = {
            user: responses[userId].user ?? { _id: userId },
            availability: new Set(),
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
          availability: new Set(
            fetchedResponses.value[userId]?.availability ?? []
          ),
          ifNeeded: new Set(fetchedResponses.value[userId]?.ifNeeded ?? []),
          enabledCalendars: responses[userId].enabledCalendars as
            | Record<string, string[]>
            | undefined,
          calendarOptions: responses[userId].calendarOptions as
            | CalendarOptions
            | undefined,
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
        availability: new Set(fetchedResponses.value[k]?.availability ?? []),
        ifNeeded: new Set(fetchedResponses.value[k]?.ifNeeded ?? []),
        enabledCalendars: responses[k].enabledCalendars as
          | Record<string, string[]>
          | undefined,
        calendarOptions: responses[k].calendarOptions as
          | CalendarOptions
          | undefined,
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
    return responsesFormatted.value.get(d) ?? new Set()
  }

  const getResponsesFormatted = () => {
    const lastFetched = Temporal.Now.instant().toZonedDateTimeISO(UTC)
    loadingResponses.value.loading = true
    loadingResponses.value.lastFetched = lastFetched

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

      const formatted: ResponsesFormatted = new Map()
      for (const date of dates) {
        const bucket = new Set<string>()
        formatted.set(date, bucket)
        for (const response of Object.values(pr)) {
          if (
            response.availability.has(date) ||
            (response.ifNeeded?.has(date) && !hideIfNeededFlag)
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

    if (
      lastFetched >= loadingResponses.value.lastFetched
    ) {
      responsesFormatted.value = formatted
    }
    if (lastFetched.equals(loadingResponses.value.lastFetched)) {
      loadingResponses.value.loading = false
    }
  }

  const populateUserAvailability = (id: string) => {
    const resp = (
      parsedResponses.value as Record<string, ParsedResponse | undefined>
    )[id]
    availability.value = new Set(resp?.availability ?? [])
    ifNeeded.value = new Set(resp?.ifNeeded ?? [])
    void nextTick(() => (unsavedChanges.value = false))
  }

  const resetCurUserAvailability = (
    initSharedCalendarAccounts?: () => void
  ) => {
    if (opts.event.value.type === eventTypes.GROUP) {
      initSharedCalendarAccounts?.()
      manualAvailability.value = new Map()
    }
    availability.value = new Set()
    ifNeeded.value = new Set()
    const authUser = mainStore.authUser
    if (userHasResponded.value && authUser?._id) {
      populateUserAvailability(authUser._id)
    }
  }

  const resetCurTimeslot = () => {
    curTimeslot.value = { row: -1, col: -1 }
  }

  const animateAvailability = (
    incoming: Set<Temporal.ZonedDateTime>,
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
      (a) =>
        a >= startDate && a <= endDate
    )

    for (let i = 0; i < availabilityArray.length / blocksPerGroup + 1; ++i) {
      const timeout = setTimeout(() => {
        for (const a of availabilityArray.slice(
          i * blocksPerGroup,
          i * blocksPerGroup + blocksPerGroup
        )) {
          availability.value.add(a)
        }
        availability.value = new Set(availability.value)
        if (i >= availabilityArray.length / blocksPerGroup) {
          availability.value = new Set(incoming)
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
    availability.value = new Set()
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
    const responses = (
      opts.event.value as { responses?: Record<string, unknown> }
    ).responses
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
      if (
        start <= a && a <= end
      ) {
        return true
      }
    }
    return false
  }

  const getAvailabilityForColumn = (
    column: number,
    fromAvailability: Temporal.ZonedDateTime[] = [...availability.value]
  ): Set<Temporal.ZonedDateTime> => {
    const subset = new Set<Temporal.ZonedDateTime>()
    const set = new Set(fromAvailability)
    const totalRows =
      opts.splitTimes.value[0].length + opts.splitTimes.value[1].length
    for (let r = 0; r < totalRows; ++r) {
      const date = opts.getDateFromRowCol(r, column)
      if (!date) continue
      if (set.has(date)) subset.add(date)
    }
    return subset
  }

  function getManualAvailabilityDow(
    fromManualAvailability:
      | Map<Temporal.ZonedDateTime, Set<Temporal.ZonedDateTime>>
      | Record<
          string,
          Set<Temporal.ZonedDateTime> | Temporal.ZonedDateTime[]
        > = manualAvailability.value
  ): Record<string, Set<Temporal.ZonedDateTime>> {
    const eventDates = opts.event.value.dates ?? []
    const out: Record<string, Set<Temporal.ZonedDateTime>> = {}

    // Handle both Map and Record types for backward compatibility
    if (fromManualAvailability instanceof Map) {
      for (const [timeInstant, slot] of fromManualAvailability.entries()) {
        const dowTime = dateToDowDate(
          eventDates,
          timeInstant,
          opts.weekOffset.value
        )
        out[String(dowTime.epochMilliseconds)] = new Set(
          Array.from(slot).map((a) =>
            dateToDowDate(eventDates, a, opts.weekOffset.value)
          )
        )
      }
    } else {
      // Legacy Record format
      for (const time in fromManualAvailability) {
        const timeInstant = Temporal.ZonedDateTime.from(time)
        const dowTime = dateToDowDate(
          eventDates,
          timeInstant,
          opts.weekOffset.value
        )
        const slot = fromManualAvailability[time]
        out[String(dowTime.epochMilliseconds)] = new Set(
          Array.from(slot as Iterable<Temporal.ZonedDateTime>).map((a) =>
            dateToDowDate(eventDates, a, opts.weekOffset.value)
          )
        )
      }
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
        const num = [
          ...(responsesFormatted.value.get(day.dateObject) ?? new Set<string>()),
        ].filter((r) => curRespondentsSet.has(r)).length
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
      responsesFormatted.value.get(date) ?? new Set()
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
    availability.value = new Set()
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
    fetchedResponses,
    loadingResponses,
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
    curRespondentsMaxFor,
    showAvailability,
    submitAvailability,
    deleteAvailability,
    getAllValidTimeRanges,
  }
}

export type UseAvailabilityDataReturn = ReturnType<typeof useAvailabilityData>
