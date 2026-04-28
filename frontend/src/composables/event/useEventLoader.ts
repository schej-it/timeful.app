import { ref, nextTick, type Ref, type ComputedRef } from "vue"
import {
  get,
  getCalendarEventsMap,
  processEvent,
} from "@/utils"
import { eventTypes, guestUserId } from "@/constants"
import type { Event, User, RawEvent } from "@/types"
import { fromRawEvent } from "@/types"
import type {
  CalendarEventLite,
  CalendarEventsMap,
  CalendarEntry,
  CalendarEventsEntry,
} from "@/composables/schedule_overlap/types"
import type { ScheduleOverlapInstance } from "./types"

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
  const calendarAvailabilities = ref<Record<string, CalendarEventLite[]>>({})
  const calendarPermissionGranted = ref(true)
  const fromEditEvent = ref(false)
  const hasRefetchedAuthUserCalendarEvents = ref(false)

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
    processEvent(event.value)
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
    return getCalendarEventsMap(ev, { weekOffset: curWeekOffset, eventId: ev._id })
      .then((result) => {
        if (curWeekOffset !== opts.weekOffset.value) return
        const avails = result as Record<string, CalendarEntry[]>
        calendarAvailabilities.value = avails
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
    return getCalendarEventsMap(event.value, { weekOffset: curWeekOffset })
      .then((result) => {
        if (curWeekOffset !== opts.weekOffset.value) return
        const eventsMap = result as Record<string, CalendarEventsEntry>
        calendarEventsMap.value = eventsMap

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
