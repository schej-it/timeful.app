import { computed, ref, type ComputedRef, type Ref } from "vue"
import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
import {
  dateCompare,
  dateToDowDate,
  get,
  getCalendarAccountKey,
  getDateHoursOffset,
  getDateWithTimezone,
  getISODateString,
  splitTimeBlocksByDay,
  timeNumToTimeString,
} from "@/utils"
import {
  calendarOptionsDefaults,
  eventTypes,
} from "@/constants"
import { useMainStore } from "@/stores/main"
import {
  type CalendarEventLite,
  type CalendarEventsByDay,
  type CalendarOptions,
  type DayItem,
  type EventLike,
  type TimeItem,
  type Timezone,
  type ProcessedCalendarEvent,
} from "./types"

dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

type SharedCalendarAccount = {
  enabled: boolean
  subCalendars?: Record<string, { enabled: boolean }>
} & Record<string, unknown>

type SharedCalendarAccounts = Record<string, SharedCalendarAccount>

type CalendarEventsMap = Record<
  string,
  { calendarEvents: CalendarEventLite[] }
>

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
  timeslotDuration: ComputedRef<number>
  timezoneOffset: ComputedRef<number>
  isGroup: ComputedRef<boolean>
  guestName: ComputedRef<string | undefined>
  getDateFromDayTimeIndex: (
    dayIndex: number,
    timeIndex: number
  ) => Date | null

  // mutable from useAvailabilityData
  fetchedResponses: Ref<Record<string, unknown>>
  loadingResponses: Ref<{ loading: boolean; lastFetched: number }>

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

    const responses = (opts.event.value as { responses?: Record<string, { enabledCalendars?: Record<string, string[]> } | undefined> })
      .responses
    if (authUser._id && responses && authUser._id in responses) {
      const userResponse = responses[authUser._id]
      const enabledCalendars = userResponse?.enabledCalendars ?? {}
      for (const id in enabledCalendars) {
        if (id in sharedCalendarAccounts.value) {
          sharedCalendarAccounts.value[id].enabled = true
          const subs = sharedCalendarAccounts.value[id].subCalendars
          if (subs) {
            ;(enabledCalendars[id]).forEach((subId) => {
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
    const account = (sharedCalendarAccounts.value as Record<string, SharedCalendarAccount | undefined>)[key]
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
        for (const evt of calMap[id].calendarEvents) {
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
    const responses = (opts.event.value as { responses?: Record<string, unknown> })
      .responses
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

  const getAvailabilityFromCalendarEvents = (input: {
    calendarEventsByDay?: CalendarEventsByDay
    includeTouchedAvailability?: boolean
    fetchedManualAvailability?: Record<string, number[] | Date[]>
    curManualAvailability?: Record<string, Set<number> | number[]>
    calendarOptions?: CalendarOptions
  }): Set<number> => {
    const {
      calendarEventsByDay = [],
      includeTouchedAvailability = false,
      fetchedManualAvailability = {},
      curManualAvailability = {},
      calendarOptions = calendarOptionsDefaults,
    } = input

    const availability = new Set<number>()

    for (let i = 0; i < opts.allDays.value.length; ++i) {
      const day = opts.allDays.value[i]
      const date = day.dateObject

      if (includeTouchedAvailability) {
        const endDate = getDateHoursOffset(
          date,
          opts.times.value.length * (opts.timeslotDuration.value / 60)
        )

        let manualAvailabilityAdded = false

        for (const time in curManualAvailability) {
          const timeNum = parseInt(time)
          if (date.getTime() <= timeNum && timeNum <= endDate.getTime()) {
            const slot = curManualAvailability[time]
            const arr = Array.from(slot as Iterable<number | Date>)
            arr.forEach((a) => {
              availability.add(new Date(a).getTime())
            })
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete curManualAvailability[time]
            manualAvailabilityAdded = true
            break
          }
        }

        if (manualAvailabilityAdded) continue

        for (const time in fetchedManualAvailability) {
          const timeNum = parseInt(time)
          if (date.getTime() <= timeNum && timeNum <= endDate.getTime()) {
            const slot = fetchedManualAvailability[time]
            ;(slot as (number | Date)[]).forEach((a) => {
              availability.add(new Date(a).getTime())
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

      const startTimeString = timeNumToTimeString(
        calendarOptions.workingHours.startTime
      )
      const isoDateString = getISODateString(getDateWithTimezone(date), true)
      const workingHoursStartDate = dayjs
        .tz(`${isoDateString} ${startTimeString}`, opts.curTimezone.value.value)
        .toDate()
      let duration =
        calendarOptions.workingHours.endTime -
        calendarOptions.workingHours.startTime
      if (duration <= 0) duration += 24
      const workingHoursEndDate = getDateHoursOffset(
        workingHoursStartDate,
        duration
      )

      for (let j = 0; j < opts.times.value.length; ++j) {
        const startDate = opts.getDateFromDayTimeIndex(i, j)
        if (!startDate) continue
        const endDate = getDateHoursOffset(
          startDate,
          opts.timeslotDuration.value / 60
        )

        if (calendarOptions.workingHours.enabled) {
          if (
            endDate.getTime() <= workingHoursStartDate.getTime() ||
            startDate.getTime() >= workingHoursEndDate.getTime()
          ) {
            continue
          }
        }

        const dayEvents = (calendarEventsByDay as (ProcessedCalendarEvent[] | undefined)[])[i]
        const index = dayEvents?.findIndex((e) => {
          const startDateBuffered = new Date(
            e.startDate.getTime() - bufferTimeInMS
          )
          const endDateBuffered = new Date(
            e.endDate.getTime() + bufferTimeInMS
          )
          const notIntersect =
            dateCompare(endDate, startDateBuffered) <= 0 ||
            dateCompare(startDate, endDateBuffered) >= 0
          return !notIntersect && !e.free
        })
        if (index === undefined || index === -1) {
          availability.add(startDate.getTime())
        }
      }
    }
    return availability
  }

  const fetchResponses = () => {
    if (opts.calendarOnly.value) {
      const responses = (opts.event.value as { responses?: Record<string, unknown> })
        .responses
      if (responses) opts.fetchedResponses.value = responses
      return
    }

    let timeMin: Date | undefined
    let timeMax: Date | undefined
    const eventDates = (opts.event.value.dates ?? [])
    if (opts.event.value.type === eventTypes.GROUP) {
      if (eventDates.length > 0) {
        timeMin = new Date(eventDates[0])
        timeMax = new Date(eventDates[eventDates.length - 1])
        timeMax.setDate(timeMax.getDate() + 1)
        timeMin = dateToDowDate(eventDates, timeMin, opts.weekOffset.value, true)
        timeMax = dateToDowDate(eventDates, timeMax, opts.weekOffset.value, true)
      }
    } else {
      if (opts.allDays.value.length > 0) {
        timeMin = new Date(opts.allDays.value[0].dateObject)
        timeMax = new Date(
          opts.allDays.value[opts.allDays.value.length - 1].dateObject
        )
        timeMax.setDate(timeMax.getDate() + 1)
      }
    }

    if (!timeMin || !timeMax) return

    let url = `/events/${opts.event.value._id ?? ""}/responses?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`
    if (opts.guestName.value && opts.guestName.value.length > 0) {
      url += `&guestName=${encodeURIComponent(opts.guestName.value)}`
    }

    get<Record<string, unknown>>(url)
      .then((responses) => {
        opts.fetchedResponses.value = responses
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
