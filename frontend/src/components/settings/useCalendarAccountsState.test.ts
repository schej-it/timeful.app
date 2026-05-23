// @vitest-environment happy-dom

import { flushPromises } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import type { CalendarEventsMap } from "@/composables/schedule_overlap/types"
import type { User } from "@/types"
import {
  SHOW_CALENDARS_STORAGE_KEY,
  useCalendarAccountsState,
} from "./useCalendarAccountsState"

const { fetchUserCalendarEventsMap } = vi.hoisted(() => ({
  fetchUserCalendarEventsMap: vi.fn(),
}))

vi.mock("@/composables/event/calendarEventsBoundary", () => ({
  fetchUserCalendarEventsMap,
}))

const makeCalendarAccount = (email: string) => ({
  calendarType: "google",
  email,
  enabled: true,
})

const makeUser = (accounts: Record<string, ReturnType<typeof makeCalendarAccount>>): User =>
  ({
    calendarAccounts: accounts,
  }) as User

describe("useCalendarAccountsState", () => {
  beforeEach(() => {
    fetchUserCalendarEventsMap.mockReset()
    vi.stubGlobal("localStorage", createLocalStorageMock())
  })

  it("restores and persists the calendar visibility toggle through storage", () => {
    const storage = createLocalStorageMock({
      [SHOW_CALENDARS_STORAGE_KEY]: "false",
    })
    const authUser = ref<User | null>(makeUser({}))
    const initialCalendarAccountsData = ref({})
    const calendarEventsMap = ref<CalendarEventsMap>({
      account: { calendarEvents: [] },
    })

    const { showCalendars, toggleShowCalendars } = useCalendarAccountsState({
      authUser,
      initialCalendarAccountsData,
      calendarEventsMap,
      storage,
    })

    expect(showCalendars.value).toBe(false)

    toggleShowCalendars()

    expect(showCalendars.value).toBe(true)
    expect(storage.getItem(SHOW_CALENDARS_STORAGE_KEY)).toBe("true")
  })

  it("prefers auth-owned accounts unless event-owned data is supplied", () => {
    const authUser = ref<User | null>(
      makeUser({
        "auth-account": makeCalendarAccount("auth@example.com"),
      })
    )
    const initialCalendarAccountsData = ref({})
    const calendarEventsMap = ref<CalendarEventsMap>({
      account: { calendarEvents: [] },
    })

    const state = useCalendarAccountsState({
      authUser,
      initialCalendarAccountsData,
      calendarEventsMap,
    })

    expect(Object.keys(state.calendarAccounts.value)).toEqual(["auth-account"])

    initialCalendarAccountsData.value = {
      "event-account": makeCalendarAccount("event@example.com"),
    }

    expect(Object.keys(state.calendarAccounts.value)).toEqual(["event-account"])
  })

  it("loads user calendar events only when a caller did not provide them", async () => {
    fetchUserCalendarEventsMap.mockResolvedValue({
      fetched: { calendarEvents: [], error: "needs-auth" },
    })

    const authUser = ref<User | null>(makeUser({}))
    const initialCalendarAccountsData = ref({})
    const calendarEventsMap = ref<CalendarEventsMap>({})

    const state = useCalendarAccountsState({
      authUser,
      initialCalendarAccountsData,
      calendarEventsMap,
    })

    await flushPromises()

    expect(fetchUserCalendarEventsMap).toHaveBeenCalledTimes(1)
    expect(state.calendarEventsMapCopy.value).toEqual({
      fetched: { calendarEvents: [], error: "needs-auth" },
    })

    calendarEventsMap.value = {
      provided: { calendarEvents: [] },
    }
    await flushPromises()

    expect(state.calendarEventsMapCopy.value).toEqual({
      provided: { calendarEvents: [] },
    })
    expect(fetchUserCalendarEventsMap).toHaveBeenCalledTimes(1)
  })
})
