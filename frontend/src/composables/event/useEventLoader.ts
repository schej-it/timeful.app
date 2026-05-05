import { ref, nextTick, type Ref, type ComputedRef } from "vue"
import {
  get,
  getCalendarEventsMap,
  getRenderedWeekStart,
  processEvent,
} from "@/utils"
import { eventTypes, guestUserId } from "@/constants"
import type { Event, User } from "@/types"
import type { RawEvent } from "@/types/transport"
import { fromRawEvent } from "@/types/transport"
import type {
  NormalizedCalendarEvent,
  CalendarEventsMap,
} from "@/composables/schedule_overlap/types"
import type { ScheduleOverlapInstance } from "./types"
import {
  fromCalendarAvailabilitiesTransportMap,
  fromCalendarEventsTransportMap,
  type CalendarAvailabilitiesTransportMap,
  type CalendarEventsTransportMap,
} from "./calendarEventsBoundary"

export interface UseEventLoaderOptions {
  eventId: Ref<string>
  weekOffset: Ref<number>
  authUser: ComputedRef<User | null>
  scheduleOverlapRef?: Ref<ScheduleOverlapInstance | null>
  isEditing?: ComputedRef<boolean>
  userHasResponded?: ComputedRef<boolean>
  areUnsavedChanges?: ComputedRef<boolean>
}

export function useEventLoader(opts: UseEventLoaderOptions) {
  const event = ref<Event | null>(null)
  const loading = ref(true)
  const ownerIsPremium = ref(false)
  const ownerPremiumChecked = ref(false)
  const calendarEventsMap = ref<CalendarEventsMap>({})
  const calendarAvailabilities = ref<Record<string, NormalizedCalendarEvent[]>>({})
  const calendarPermissionGranted = ref(true)
  const fromEditEvent = ref(false)
  const hasRefetchedAuthUserCalendarEvents = ref(false)

  const getEventRenderedWeekStart = () => {
    if (
      event.value?.type !== eventTypes.DOW &&
      event.value?.type !== eventTypes.GROUP
    ) {
      return undefined
    }

    return getRenderedWeekStart(
      opts.weekOffset.value,
      event.value.startOnMonday
    )
  }

  async function refreshEvent() {
    const sanitizedId = opts.eventId.value.replaceAll(".", "")
    let resolvedLongId = event.value?._id ?? ""
    try {
      const ids = await get<{ longId?: string }>(`/events/${sanitizedId}/ids`)
      if (ids.longId) resolvedLongId = ids.longId
    } catch {
      // continue with fallback
    }
    let guestName: string | null = null
    if (typeof localStorage !== "undefined" && resolvedLongId) {
      guestName = (localStorage[`${resolvedLongId}.guestName`] as string | undefined) ?? null
    }
    let url = `/events/${sanitizedId}`
    if (guestName && guestName.length > 0) url += `?guestName=${encodeURIComponent(guestName)}`
    const rawEvent = await get<RawEvent>(url)
    // Convert raw event to Temporal-based event
    event.value = fromRawEvent(rawEvent)
    processEvent(event.value, getEventRenderedWeekStart())
  }

  async function checkOwnerPremium() {
    const ownerId = event.value?.ownerId
    if (ownerId && ownerId !== guestUserId) {
      try {
        const res = await get<{ isPremium: boolean }>(`/users/${ownerId}/is-premium`)
        ownerIsPremium.value = res.isPremium
      } catch {
        ownerIsPremium.value = false
      }
    }
    ownerPremiumChecked.value = true
  }

  async function fetchCalendarAvailabilities() {
    if (event.value?.type !== eventTypes.GROUP) return
    const curWeekOffset = opts.weekOffset.value
    const ev = event.value as Event & { _id: string; type: string }
    const renderedWeekStart = getEventRenderedWeekStart()
    return getCalendarEventsMap(ev, {
      weekOffset: curWeekOffset,
      eventId: ev._id,
      renderedWeekStart,
    })
      .then((result) => {
        if (curWeekOffset !== opts.weekOffset.value) return
        calendarAvailabilities.value = fromCalendarAvailabilitiesTransportMap(
          result as CalendarAvailabilitiesTransportMap
        )
        // With Temporal, DST is handled automatically - no manual adjustment needed
      })
      .catch((err: unknown) => { console.error(err) })
  }

  async function fetchAuthUserCalendarEvents() {
    if (!opts.authUser.value) {
      calendarPermissionGranted.value = false
      return
    }
    const curWeekOffset = opts.weekOffset.value
    if (!event.value) return
    const renderedWeekStart = getEventRenderedWeekStart()
    return getCalendarEventsMap(event.value, {
      weekOffset: curWeekOffset,
      renderedWeekStart,
    })
      .then((result) => {
        if (curWeekOffset !== opts.weekOffset.value) return
        calendarEventsMap.value = fromCalendarEventsTransportMap(
          result as CalendarEventsTransportMap
        )

        const evType = event.value?.type
        if (evType === eventTypes.GROUP || evType === eventTypes.DOW) {
          for (const calendarId in calendarEventsMap.value) {
            const entries = calendarEventsMap.value[calendarId].calendarEvents
            if (!entries) continue
            // With Temporal, DST is handled automatically - no manual adjustment needed
            // The dates are already ZonedDateTime objects with proper timezone info
          }
        }

        if (
          opts.authUser.value &&
          opts.isEditing?.value &&
          !opts.userHasResponded?.value &&
          !opts.areUnsavedChanges?.value &&
          opts.scheduleOverlapRef?.value
        ) {
          void nextTick(() => { opts.scheduleOverlapRef?.value?.setAvailabilityAutomatically() })
        }

        calendarPermissionGranted.value = !Object.values(calendarEventsMap.value).every(
          (c) => Boolean(c.error)
        )

        if (!hasRefetchedAuthUserCalendarEvents.value) {
          const hasError = Object.values(calendarEventsMap.value).some((c) => Boolean(c.error))
          if (hasError) {
            hasRefetchedAuthUserCalendarEvents.value = true
            setTimeout(() => { void fetchAuthUserCalendarEvents() }, 1000)
          }
        }
      })
      .catch((err: unknown) => {
        console.error(err)
        calendarPermissionGranted.value = false
      })
  }

  function refreshCalendar() {
    const promises = [fetchCalendarAvailabilities(), fetchAuthUserCalendarEvents()]
    const curWeekOffset = opts.weekOffset.value
    loading.value = true
    void Promise.allSettled(promises).then(() => {
      if (curWeekOffset === opts.weekOffset.value) loading.value = false
    })
  }

  return {
    event,
    loading,
    ownerIsPremium,
    ownerPremiumChecked,
    calendarEventsMap,
    calendarAvailabilities,
    calendarPermissionGranted,
    fromEditEvent,
    refreshEvent,
    checkOwnerPremium,
    fetchCalendarAvailabilities,
    fetchAuthUserCalendarEvents,
    refreshCalendar,
  }
}
