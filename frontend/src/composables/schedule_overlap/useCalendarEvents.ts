import { computed, ref, type ComputedRef, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import {
  dateToDowDate,
  get,
  getCalendarAccountKey,
  getDateHoursOffset,
  getDateInTimezone,
  getFixedOffsetTimeZoneId,
  getRenderedWeekStart,
  parseTemporalEpochKey,
  rangesOverlap,
  splitTimeBlocksByDay,
  ZdtSet,
} from "@/utils"
import { calendarOptionsDefaults, eventTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import type { RawResponse } from "@/types"
import { fromRawResponse } from "@/types"
import {
  type CalendarEventLite,
  type CalendarEventsByDay,
  type CalendarEventsMap,
  type CalendarOptions,
  type DayItem,
  type EventLike,
  type TimeItem,
  type Timezone,
  type ProcessedCalendarEvent,
} from "./types"

type SharedCalendarAccount = {
  enabled: boolean
  subCalendars?: Record<string, { enabled: boolean }>
} & Record<string, unknown>

type SharedCalendarAccounts = Record<string, SharedCalendarAccount>

export interface UseCalendarEventsOptions {
  event: Ref<EventLike>
  weekOffset: Ref<number>
  curTimezone: Ref<Timezone>
  calendarEventsMap: Ref<CalendarEventsMap>
  sampleCalendarEventsByDay?: Ref<CalendarEventsByDay | undefined>
  calendarAvailabilities: Ref<Record<string, CalendarEventLite[]>>
  addingAvailabilityAsGuest: Ref<boolean>
  calendarOnly: Ref<boolean>

  // grid
  allDays: ComputedRef<DayItem[]>
  times: ComputedRef<TimeItem[]>
  timeslotDuration: ComputedRef<Temporal.Duration>
  timezoneOffset: ComputedRef<Temporal.Duration>
  isGroup: ComputedRef<boolean>
  guestName: ComputedRef<string | undefined>
  getDateFromDayTimeIndex: (
    dayIndex: number,
    timeIndex: number
  ) => Temporal.ZonedDateTime | null

  // mutable from useAvailabilityData
  fetchedResponses: Ref<Record<string, unknown>>
  loadingResponses: Ref<{
    loading: boolean
    lastFetched: Temporal.ZonedDateTime
  }>

  // hook called after fetchResponses completes (e.g. to recompute responsesFormatted)
  onResponsesFetched?: () => void
}

export function useCalendarEvents(opts: UseCalendarEventsOptions) {
  const mainStore = useMainStore()

  const sharedCalendarAccounts = ref<SharedCalendarAccounts>({})
  const hasRefreshedAuthUser = ref(false)
  const bufferTime = ref<CalendarOptions["bufferTime"]>({
    ...calendarOptionsDefaults.bufferTime,
  })
  const workingHours = ref<CalendarOptions["workingHours"]>({
    ...calendarOptionsDefaults.workingHours,
  })

  const refreshAuthUser = async () => {
    hasRefreshedAuthUser.value = true
    await mainStore.refreshAuthUser()
  }

  const initSharedCalendarAccounts = () => {
    const authUser = mainStore.authUser
    if (!authUser) return

    sharedCalendarAccounts.value = JSON.parse(
      JSON.stringify(authUser.calendarAccounts ?? {})
    ) as SharedCalendarAccounts

    for (const id in sharedCalendarAccounts.value) {
      sharedCalendarAccounts.value[id].enabled = false
      const subCalendars = sharedCalendarAccounts.value[id].subCalendars
      if (subCalendars) {
        for (const subId in subCalendars) {
          subCalendars[subId].enabled = false
        }
      }
    }

    const responses = opts.event.value.responses
    if (authUser._id && responses && authUser._id in responses) {
      const userResponse = responses[authUser._id]
      const enabledCalendars = userResponse.enabledCalendars ?? {}
      for (const id in enabledCalendars) {
        if (id in sharedCalendarAccounts.value) {
          sharedCalendarAccounts.value[id].enabled = true
          const subs = sharedCalendarAccounts.value[id].subCalendars
          if (subs) {
            enabledCalendars[id].forEach((subId) => {
              if (subId in subs) subs[subId].enabled = true
            })
          }
        }
      }
    }
  }

  const toggleCalendarAccount = (payload: {
    email: string
    calendarType: string
    enabled: boolean
  }) => {
    const key = getCalendarAccountKey(payload.email, payload.calendarType)
    if (!(key in sharedCalendarAccounts.value)) return
    sharedCalendarAccounts.value[key].enabled = payload.enabled
    sharedCalendarAccounts.value = JSON.parse(
      JSON.stringify(sharedCalendarAccounts.value)
    ) as SharedCalendarAccounts
  }

  const toggleSubCalendarAccount = (payload: {
    email: string
    calendarType: string
    subCalendarId: string
    enabled: boolean
  }) => {
    const key = getCalendarAccountKey(payload.email, payload.calendarType)
    const account = (
      sharedCalendarAccounts.value as Record<
        string,
        SharedCalendarAccount | undefined
      >
    )[key]
    if (!account?.subCalendars) return
    if (!(payload.subCalendarId in account.subCalendars)) return
    account.subCalendars[payload.subCalendarId].enabled = payload.enabled
    sharedCalendarAccounts.value = JSON.parse(
      JSON.stringify(sharedCalendarAccounts.value)
    ) as SharedCalendarAccounts
  }

  const calendarEventsByDay = computed<CalendarEventsByDay>(() => {
    if (opts.sampleCalendarEventsByDay?.value) {
      return opts.sampleCalendarEventsByDay.value
    }

    const authUser = mainStore.authUser
    if (!authUser || opts.addingAvailabilityAsGuest.value) return []

    const events: CalendarEventLite[] = []
    const calendarAccounts = opts.isGroup.value
      ? sharedCalendarAccounts.value
      : ((authUser.calendarAccounts ?? {}) as SharedCalendarAccounts)

    for (const id in calendarAccounts) {
      if (!calendarAccounts[id].enabled) continue

      const calMap = opts.calendarEventsMap.value
      if (Object.prototype.hasOwnProperty.call(calMap, id)) {
        for (const evt of calMap[id].calendarEvents ?? []) {
          const subCalendars = calendarAccounts[id].subCalendars
          if (
            !subCalendars ||
            !evt.calendarId ||
            !(evt.calendarId in subCalendars)
          ) {
            events.push(evt)
            if (!hasRefreshedAuthUser.value && !opts.isGroup.value) {
              void refreshAuthUser()
            }
            continue
          }

          if (subCalendars[evt.calendarId].enabled) {
            events.push(evt)
          }
        }
      }
    }

    const eventsCopy = JSON.parse(JSON.stringify(events)) as CalendarEventLite[]
    return splitTimeBlocksByDay(
      opts.event.value,
      eventsCopy,
      opts.weekOffset.value,
      opts.timezoneOffset.value
    )
  })

  const groupCalendarEventsByDay = computed<
    Record<string, CalendarEventsByDay>
  >(() => {
    if (opts.event.value.type !== eventTypes.GROUP) return {}

    const authUser = mainStore.authUser
    const out: Record<string, CalendarEventsByDay> = {}
    const responses = opts.event.value.responses
    if (!responses) return out

    for (const userId in responses) {
      if (userId === authUser?._id) {
        out[userId] = calendarEventsByDay.value
      } else if (userId in opts.calendarAvailabilities.value) {
        out[userId] = splitTimeBlocksByDay(
          opts.event.value,
          opts.calendarAvailabilities.value[userId],
          opts.weekOffset.value,
          opts.timezoneOffset.value
        )
      }
    }

    return out
  })

  const getWorkingHoursStart = (
    date: Temporal.ZonedDateTime,
    startTime: number
  ): Temporal.ZonedDateTime => {
    const localDate = getDateInTimezone(date, opts.curTimezone.value).toPlainDate()
    const hours = Math.floor(startTime)
    const minutes = Math.floor((startTime - hours) * 60)
    const timeZone = opts.curTimezone.value.value
      || getFixedOffsetTimeZoneId(opts.curTimezone.value.offset)

    return Temporal.ZonedDateTime.from({
      timeZone,
      year: localDate.year,
      month: localDate.month,
      day: localDate.day,
      hour: hours,
      minute: minutes,
    })
  }

  const getAvailabilityFromCalendarEvents = (input: {
    calendarEventsByDay?: CalendarEventsByDay
    includeTouchedAvailability?: boolean
    fetchedManualAvailability?: Record<string, ZdtSet>
    curManualAvailability?: Record<string, ZdtSet>
    calendarOptions?: CalendarOptions
  }): ZdtSet => {
    const {
      calendarEventsByDay = [],
      includeTouchedAvailability = false,
      fetchedManualAvailability = {},
      curManualAvailability = {},
      calendarOptions = calendarOptionsDefaults,
    } = input

    const availability = new ZdtSet()

    for (let i = 0; i < opts.allDays.value.length; ++i) {
      const day = opts.allDays.value[i]
      const date = day.dateObject

      if (includeTouchedAvailability) {
        const durationInHours =
          opts.times.value.length * opts.timeslotDuration.value.total("hours")
        const endDate = getDateHoursOffset(
          date,
          Temporal.Duration.from({ hours: durationInHours })
        )

        let manualAvailabilityAdded = false

        for (const time in curManualAvailability) {
          const timeInstant = parseTemporalEpochKey(time).toInstant()
          if (
            Temporal.Instant.compare(date.toInstant(), timeInstant) <= 0 &&
            Temporal.Instant.compare(timeInstant, endDate.toInstant()) <= 0
          ) {
            const slot = curManualAvailability[time]
            const arr = Array.from(slot as Iterable<Temporal.ZonedDateTime>)
            arr.forEach((a) => {
              availability.add(a)
            })
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete curManualAvailability[time]
            manualAvailabilityAdded = true
            break
          }
        }

        if (manualAvailabilityAdded) continue

        for (const time in fetchedManualAvailability) {
          const timeInstant = parseTemporalEpochKey(time).toInstant()
          if (
            Temporal.Instant.compare(date.toInstant(), timeInstant) <= 0 &&
            Temporal.Instant.compare(timeInstant, endDate.toInstant()) <= 0
          ) {
            const slot = fetchedManualAvailability[time]
            slot.forEach((a) => {
              availability.add(a)
            })
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete fetchedManualAvailability[time]
            manualAvailabilityAdded = true
            break
          }
        }

        if (manualAvailabilityAdded) continue
      }

      const bufferTimeInMS = calendarOptions.bufferTime.enabled
        ? calendarOptions.bufferTime.time * 1000 * 60
        : 0

      const workingHoursStart = getWorkingHoursStart(
        date,
        calendarOptions.workingHours.startTime
      )
      let duration =
        calendarOptions.workingHours.endTime -
        calendarOptions.workingHours.startTime
      if (duration <= 0) duration += 24
      const workingHoursEnd = getDateHoursOffset(
        workingHoursStart,
        Temporal.Duration.from({ hours: duration })
      )

      for (let j = 0; j < opts.times.value.length; ++j) {
        const startDate = opts.getDateFromDayTimeIndex(i, j)
        if (!startDate) continue
        const endDate = getDateHoursOffset(
          startDate,
          opts.timeslotDuration.value
        )

        if (calendarOptions.workingHours.enabled) {
          if (
            !rangesOverlap(
              startDate,
              endDate,
              workingHoursStart,
              workingHoursEnd
            )
          ) {
            continue
          }
        }

        const dayEvents = (
          calendarEventsByDay as (ProcessedCalendarEvent[] | undefined)[]
        )[i]
        const index = dayEvents?.findIndex((e) => {
          const startDateBuffered = e.startDate
            .subtract({ milliseconds: bufferTimeInMS })
          const endDateBuffered = e.endDate
            .add({ milliseconds: bufferTimeInMS })
          return (
            rangesOverlap(
              startDate,
              endDate,
              startDateBuffered,
              endDateBuffered
            ) && !e.free
          )
        })
        if (index === undefined || index === -1) {
          availability.add(startDate)
        }
      }
    }
    return availability
  }

  const fetchResponses = () => {
    if (opts.calendarOnly.value) {
      const responses = opts.event.value.responses
      if (responses) opts.fetchedResponses.value = responses
      return
    }

    let timeMin: Temporal.ZonedDateTime | undefined
    let timeMax: Temporal.ZonedDateTime | undefined
    const eventDates = opts.event.value.dates ?? []
    if (opts.event.value.type === eventTypes.GROUP) {
      if (eventDates.length > 0) {
        timeMin = eventDates[0]
        timeMax = eventDates[eventDates.length - 1].add({ days: 1 })
        // Convert to ZonedDateTime to add days, then back to Instant
        const renderedWeekStart = getRenderedWeekStart(
          opts.weekOffset.value,
          opts.event.value.startOnMonday
        )
        timeMin = dateToDowDate(
          eventDates,
          timeMin,
          opts.weekOffset.value,
          true,
          opts.event.value.startOnMonday,
          renderedWeekStart
        )
        timeMax = dateToDowDate(
          eventDates,
          timeMax,
          opts.weekOffset.value,
          true,
          opts.event.value.startOnMonday,
          renderedWeekStart
        )
      }
    } else {
      if (opts.allDays.value.length > 0) {
        timeMin = opts.allDays.value[0].dateObject
        timeMax =
          opts.allDays.value[
            opts.allDays.value.length - 1
          ].dateObject
        // Convert to ZonedDateTime to add days, then back to Instant
        timeMax = timeMax.add({ days: 1 })
      }
    }

    if (!timeMin || !timeMax) return

    let url = `/events/${
      opts.event.value._id ?? ""
    }/responses?timeMin=${timeMin.toString()}&timeMax=${timeMax.toString()}`
    if (opts.guestName.value && opts.guestName.value.length > 0) {
      url += `&guestName=${encodeURIComponent(opts.guestName.value)}`
    }

    get<Record<string, RawResponse>>(url)
      .then((rawResponses) => {
        // Convert raw responses to Temporal-based responses
        const convertedResponses: Record<string, unknown> = {}
        for (const [userId, rawResponse] of Object.entries(rawResponses)) {
          convertedResponses[userId] = fromRawResponse(rawResponse)
        }
        opts.fetchedResponses.value = convertedResponses
        opts.onResponsesFetched?.()
      })
      .catch(() => {
        mainStore.showError(
          "There was an error fetching availability! Please refresh the page."
        )
      })
  }

  return {
    sharedCalendarAccounts,
    bufferTime,
    workingHours,
    hasRefreshedAuthUser,
    calendarEventsByDay,
    groupCalendarEventsByDay,
    initSharedCalendarAccounts,
    toggleCalendarAccount,
    toggleSubCalendarAccount,
    getAvailabilityFromCalendarEvents,
    fetchResponses,
    refreshAuthUser,
  }
}

export type UseCalendarEventsReturn = ReturnType<typeof useCalendarEvents>
