import { ref, watch, type Ref } from "vue"

const SHOW_EVENT_NAMES_STORAGE_KEY = "showEventNames"
const DEFAULT_SHOW_EVENT_NAMES = true

type StorageWithShowEventNames = Storage & { showEventNames?: unknown }

const getStorage = (): Storage | undefined => {
  return typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage
}

const parseStoredBoolean = (value: unknown): boolean | undefined => {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return undefined
}

const readStoredShowEventNamesPreference = (
  storage: Storage | undefined
): boolean => {
  if (!storage) {
    return DEFAULT_SHOW_EVENT_NAMES
  }

  const directValue = parseStoredBoolean(
    (storage as StorageWithShowEventNames).showEventNames
  )
  if (directValue !== undefined) {
    return directValue
  }

  return (
    parseStoredBoolean(storage.getItem(SHOW_EVENT_NAMES_STORAGE_KEY)) ??
    DEFAULT_SHOW_EVENT_NAMES
  )
}

export interface ShowEventNamesPreference {
  showEventNames: Ref<boolean>
}

export const useShowEventNamesPreference = (
  onPreferenceChange: (value: boolean) => void,
  storage: Storage | undefined = getStorage()
): ShowEventNamesPreference => {
  const showEventNames = ref(readStoredShowEventNamesPreference(storage))

  watch(showEventNames, value => {
    storage?.setItem(SHOW_EVENT_NAMES_STORAGE_KEY, String(value))
    onPreferenceChange(value)
  })

  return {
    showEventNames,
  }
}
