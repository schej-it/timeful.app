import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import { fetchUserCalendarEventsMap } from "@/composables/event/calendarEventsBoundary"
import type { CalendarEventsMap } from "@/composables/schedule_overlap/types"
import type { CalendarAccount, SubCalendar, User } from "@/types"
import type { CalendarAccountEntry } from "./CalendarAccounts.vue"

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export const SHOW_CALENDARS_STORAGE_KEY = "showCalendars"

export type EditableCalendarAccount = CalendarAccount & {
  enabled: boolean
  subCalendars: Record<string, SubCalendar & { enabled: boolean }>
}

const getStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") {
    return undefined
  }

  return window.localStorage
}

const readShowCalendars = (storage: StorageLike | undefined): boolean => {
  const storedValue = storage?.getItem(SHOW_CALENDARS_STORAGE_KEY)

  if (storedValue == null) {
    return true
  }

  return storedValue === "true"
}

export const cloneCalendarAccounts = (
  calendarAccounts: Record<string, CalendarAccount>
): Record<string, EditableCalendarAccount> =>
  Object.fromEntries(
    Object.entries(calendarAccounts).map(([accountId, account]) => [
      accountId,
      {
        ...account,
        enabled: account.enabled ?? false,
        subCalendars: Object.fromEntries(
          Object.entries(account.subCalendars ?? {}).map(([subCalendarId, subCalendar]) => [
            subCalendarId,
            {
              ...subCalendar,
              enabled: subCalendar.enabled ?? false,
            },
          ])
        ),
      },
    ])
  )

export const useCalendarAccountsState = ({
  authUser,
  initialCalendarAccountsData,
  calendarEventsMap,
  storage = getStorage(),
}: {
  authUser: Ref<User | null>
  initialCalendarAccountsData: Ref<Record<string, CalendarAccountEntry>>
  calendarEventsMap: Ref<CalendarEventsMap>
  storage?: StorageLike
}) => {
  const showCalendars = ref(readShowCalendars(storage))
  const calendarEventsMapCopy = ref<CalendarEventsMap>({})

  const calendarAccounts: ComputedRef<Record<string, CalendarAccountEntry>> =
    computed(() => {
      if (Object.keys(initialCalendarAccountsData.value).length > 0) {
        return initialCalendarAccountsData.value
      }

      return authUser.value?.calendarAccounts ?? {}
    })

  const setShowCalendars = (value: boolean) => {
    showCalendars.value = value

    try {
      storage?.setItem(SHOW_CALENDARS_STORAGE_KEY, String(value))
    } catch (error) {
      console.error("Error saving showCalendars to localStorage", error)
    }
  }

  const toggleShowCalendars = () => {
    setShowCalendars(!showCalendars.value)
  }

  watch(
    calendarEventsMap,
    async (nextCalendarEventsMap) => {
      if (Object.keys(nextCalendarEventsMap).length > 0) {
        calendarEventsMapCopy.value = nextCalendarEventsMap
        return
      }

      const timeMin = Temporal.Now.instant()
      const timeMax = Temporal.Now.instant()

      try {
        calendarEventsMapCopy.value = await fetchUserCalendarEventsMap({
          timeMin,
          timeMax,
        })
      } catch (error) {
        console.error(error)
      }
    },
    { immediate: true }
  )

  return {
    calendarAccounts,
    calendarEventsMapCopy,
    showCalendars,
    toggleShowCalendars,
  }
}
