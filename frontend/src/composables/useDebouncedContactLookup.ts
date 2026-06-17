import { onBeforeUnmount, ref } from "vue"
import { get } from "@/utils"
import {
  toContactSearchSuggestion,
  type ContactSearchResult,
  type ContactSearchSuggestion,
} from "@/components/event/contactSuggestions"

export function useDebouncedContactLookup() {
  const suggestionsByKey = ref<Partial<Record<string, ContactSearchSuggestion[]>>>({})
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function clearTimer(key: string) {
    const existingTimer = pendingTimers.get(key)
    if (existingTimer != null) {
      clearTimeout(existingTimer)
      pendingTimers.delete(key)
    }
  }

  function clearSuggestions(key: string) {
    clearTimer(key)
    suggestionsByKey.value = {
      ...suggestionsByKey.value,
      [key]: [],
    }
  }

  function scheduleLookup(key: string, query: string, delayMs = 250) {
    clearTimer(key)

    if (query.length === 0) {
      clearSuggestions(key)
      return
    }

    pendingTimers.set(
      key,
      setTimeout(() => {
        void get<ContactSearchResult[]>(`/user/searchContacts?query=${query}`).then(
          (results) => {
            suggestionsByKey.value = {
              ...suggestionsByKey.value,
              [key]: results.map(toContactSearchSuggestion),
            }
          }
        )
      }, delayMs)
    )
  }

  onBeforeUnmount(() => {
    for (const timer of pendingTimers.values()) {
      clearTimeout(timer)
    }
    pendingTimers.clear()
  })

  return {
    suggestionsByKey,
    scheduleLookup,
    clearSuggestions,
  }
}
