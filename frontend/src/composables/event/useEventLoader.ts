import { ref, nextTick, type Ref, type ComputedRef } from "vue"
import { get, getRenderedWeekStart, processEvent } from "@/utils"
import { eventTypes } from "@/constants"
import { logEventBoot } from "@/utils/eventBootDebug"
import type { Event, User } from "@/types"
import type {
  NormalizedCalendarEvent,
  CalendarEventsMap,
} from "@/composables/schedule_overlap/types"
import { getRealOwnerId } from "@/composables/event/eventOwnership"
import {
  getSelectedGuestOwnership,
  readGuestOwnershipCollectionForEvent,
} from "@/composables/schedule_overlap/scheduleOverlapStorage"
import type { ScheduleOverlapInstance } from "./types"
import { fetchEventFromPath } from "./eventTransportBoundary"
import {
  fetchCalendarAvailabilities as fetchCalendarAvailabilitiesBoundary,
  fetchCalendarEventsMap,
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
    logEventBoot("useEventLoader", "refreshEvent:start", {
      eventId: opts.eventId.value,
      weekOffset: opts.weekOffset.value,
      existingEventId: event.value?._id ?? null,
    })
    const sanitizedId = opts.eventId.value.replaceAll(".", "")
    let resolvedLongId = event.value?._id ?? ""
    try {
      const ids = await get<{ longId?: string }>(`/events/${sanitizedId}/ids`)
      if (ids.longId) resolvedLongId = ids.longId
    } catch {
      // continue with fallback
    }
    const guestOwnership = resolvedLongId
      ? getSelectedGuestOwnership(
          readGuestOwnershipCollectionForEvent(resolvedLongId)
        )
      : undefined
    let url = `/events/${sanitizedId}`
    if (guestOwnership?.guestId && guestOwnership.guestId.length > 0) {
      url += `?guestId=${encodeURIComponent(guestOwnership.guestId)}`
    } else if (guestOwnership?.name && guestOwnership.name.length > 0) {
      url += `?guestName=${encodeURIComponent(guestOwnership.name)}`
    }
    const fetchedEvent = await fetchEventFromPath(url)
    event.value = fetchedEvent
    processEvent(fetchedEvent, getEventRenderedWeekStart())
    logEventBoot("useEventLoader", "refreshEvent:done", {
      resolvedLongId,
      fetchedEventId: fetchedEvent._id ?? null,
      type: fetchedEvent.type,
      hasResponses: Object.keys(fetchedEvent.responses ?? {}).length,
    })
  }

  async function checkOwnerPremium() {
    logEventBoot("useEventLoader", "checkOwnerPremium:start", {
      ownerId: event.value?.ownerId ?? null,
    })
    const ownerId = getRealOwnerId(event.value)
    if (ownerId) {
      try {
        const res = await get<{ isPremium: boolean }>(`/users/${ownerId}/is-premium`)
        ownerIsPremium.value = res.isPremium
      } catch {
        ownerIsPremium.value = false
      }
    }
    ownerPremiumChecked.value = true
    logEventBoot("useEventLoader", "checkOwnerPremium:done", {
      ownerId: event.value?.ownerId ?? null,
      ownerIsPremium: ownerIsPremium.value,
    })
  }

  function fetchCalendarAvailabilities() {
    if (event.value?.type !== eventTypes.GROUP) return
    const curWeekOffset = opts.weekOffset.value
    const ev = event.value as Event & { _id: string; type: string }
    const renderedWeekStart = getEventRenderedWeekStart()
    logEventBoot("useEventLoader", "fetchCalendarAvailabilities:start", {
      eventId: ev._id,
      weekOffset: curWeekOffset,
      renderedWeekStart: renderedWeekStart?.toString() ?? null,
    })
    return fetchCalendarAvailabilitiesBoundary(ev, {
      weekOffset: curWeekOffset,
      eventId: ev._id,
      renderedWeekStart,
    })
      .then((result) => {
        if (curWeekOffset !== opts.weekOffset.value) return
        calendarAvailabilities.value = result
        logEventBoot("useEventLoader", "fetchCalendarAvailabilities:done", {
          weekOffset: curWeekOffset,
          calendars: Object.keys(result).length,
        })
        // With Temporal, DST is handled automatically - no manual adjustment needed
      })
      .catch((err: unknown) => {
        console.error(err)
        logEventBoot("useEventLoader", "fetchCalendarAvailabilities:error", {
          weekOffset: curWeekOffset,
          error: err instanceof Error ? err.message : String(err),
        })
      })
  }

  async function fetchAuthUserCalendarEvents() {
    if (!opts.authUser.value) {
      calendarPermissionGranted.value = false
      logEventBoot("useEventLoader", "fetchAuthUserCalendarEvents:skip-no-auth")
      return
    }
    const curWeekOffset = opts.weekOffset.value
    if (!event.value) return
    const renderedWeekStart = getEventRenderedWeekStart()
    logEventBoot("useEventLoader", "fetchAuthUserCalendarEvents:start", {
      eventId: event.value._id ?? null,
      weekOffset: curWeekOffset,
      renderedWeekStart: renderedWeekStart?.toString() ?? null,
    })
    return fetchCalendarEventsMap(event.value, {
      weekOffset: curWeekOffset,
      renderedWeekStart,
    })
      .then((result) => {
        if (curWeekOffset !== opts.weekOffset.value) return
        calendarEventsMap.value = result

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
        logEventBoot("useEventLoader", "fetchAuthUserCalendarEvents:done", {
          weekOffset: curWeekOffset,
          calendars: Object.keys(result).length,
          calendarPermissionGranted: calendarPermissionGranted.value,
          hasAnyError: Object.values(result).some((c) => Boolean(c.error)),
        })

        if (!hasRefetchedAuthUserCalendarEvents.value) {
          const hasError = Object.values(calendarEventsMap.value).some((c) => Boolean(c.error))
          if (hasError) {
            hasRefetchedAuthUserCalendarEvents.value = true
            logEventBoot("useEventLoader", "fetchAuthUserCalendarEvents:retry-scheduled", {
              weekOffset: curWeekOffset,
            })
            setTimeout(() => { void fetchAuthUserCalendarEvents() }, 1000)
          }
        }
      })
      .catch((err: unknown) => {
        console.error(err)
        calendarPermissionGranted.value = false
        logEventBoot("useEventLoader", "fetchAuthUserCalendarEvents:error", {
          weekOffset: curWeekOffset,
          error: err instanceof Error ? err.message : String(err),
        })
      })
  }

  function refreshCalendar() {
    logEventBoot("useEventLoader", "refreshCalendar:start", {
      weekOffset: opts.weekOffset.value,
      eventId: event.value?._id ?? null,
    })
    const promises = [
      Promise.resolve(fetchCalendarAvailabilities()),
      Promise.resolve(fetchAuthUserCalendarEvents()),
    ]
    const curWeekOffset = opts.weekOffset.value
    loading.value = true
    void Promise.allSettled(promises).then(() => {
      if (curWeekOffset === opts.weekOffset.value) loading.value = false
      logEventBoot("useEventLoader", "refreshCalendar:done", {
        weekOffset: curWeekOffset,
        loading: loading.value,
      })
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
