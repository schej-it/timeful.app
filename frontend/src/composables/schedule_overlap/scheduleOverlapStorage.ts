const SHOW_BEST_TIMES_KEY = "showBestTimes"

type StorageLike = Storage | Record<string, unknown>

function getLocalStorage(): StorageLike | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null
  }

  return globalThis.localStorage
}

function hasStorageGetItem(
  storage: StorageLike
): storage is Storage & { getItem: (key: string) => string | null } {
  return typeof storage.getItem === "function"
}

function hasStorageSetItem(
  storage: StorageLike
): storage is Storage & { setItem: (key: string, value: string) => void } {
  return typeof storage.setItem === "function"
}

function readStorageValue(storage: StorageLike, key: string): string | undefined {
  if (hasStorageGetItem(storage)) {
    return storage.getItem(key) ?? undefined
  }

  return typeof storage[key] === "string" ? storage[key] : undefined
}

function writeStorageValue(storage: StorageLike, key: string, value: string) {
  if (hasStorageSetItem(storage)) {
    storage.setItem(key, value)
    return
  }

  storage[key] = value
}

export function getGuestNameStorageKey(eventId: string): string {
  return `${eventId}.guestName`
}

export function readGuestName(key: string): string | undefined {
  const storage = getLocalStorage()
  if (!storage) {
    return undefined
  }

  return readStorageValue(storage, key)
}

export function writeGuestName(key: string, name: string) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  writeStorageValue(storage, key, name)
}

export function readShowBestTimesPreference(): boolean {
  const storage = getLocalStorage()
  if (!storage) {
    return false
  }

  return readStorageValue(storage, SHOW_BEST_TIMES_KEY) === "true"
}

export function writeShowBestTimesPreference(value: boolean) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  writeStorageValue(storage, SHOW_BEST_TIMES_KEY, String(value))
}
