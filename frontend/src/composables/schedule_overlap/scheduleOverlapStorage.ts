const SHOW_BEST_TIMES_KEY = "showBestTimes"
const SHOW_ALL_HOURS_KEY = "showAllHours"

export interface GuestOwnershipState {
  name?: string
  guestId?: string
  guestEditToken?: string
  guestEditPolicy?: "protected" | "open"
  guestOwnershipMode?: "legacy" | "token"
}

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

export function getGuestOwnershipStorageKey(eventId: string): string {
  return `${eventId}.guestOwnership`
}

export function readGuestName(key: string): string | undefined {
  const storage = getLocalStorage()
  if (!storage) {
    return undefined
  }

  return readStorageValue(storage, key)
}

export function readGuestOwnership(key: string): GuestOwnershipState | undefined {
  const storage = getLocalStorage()
  if (!storage) {
    return undefined
  }

  const rawValue = readStorageValue(storage, key)
  if (!rawValue) {
    return undefined
  }

  try {
    return JSON.parse(rawValue) as GuestOwnershipState
  } catch {
    return undefined
  }
}

export function writeGuestName(key: string, name: string) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  writeStorageValue(storage, key, name)
}

export function writeGuestOwnership(key: string, value: GuestOwnershipState) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  writeStorageValue(storage, key, JSON.stringify(value))
}

export function clearGuestOwnership(key: string) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  if (hasStorageSetItem(storage) && typeof storage.removeItem === "function") {
    storage.removeItem(key)
    return
  }

  Reflect.deleteProperty(storage, key)
}

export function getGuestResponseLookupKey(
  ownership?: GuestOwnershipState
): string | undefined {
  return ownership?.guestId ?? ownership?.name
}

export function appendGuestIdentityQuery(
  path: string,
  ownership?: GuestOwnershipState,
  fallbackGuestName?: string | null
): string {
  const guestId = ownership?.guestId
  const guestName =
    guestId == null ? ownership?.name ?? fallbackGuestName : undefined

  if (guestId && guestId.length > 0) {
    return `${path}${path.includes("?") ? "&" : "?"}guestId=${encodeURIComponent(guestId)}`
  }
  if (guestName && guestName.length > 0) {
    return `${path}${path.includes("?") ? "&" : "?"}guestName=${encodeURIComponent(guestName)}`
  }

  return path
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

export function readShowAllHoursPreference(): boolean {
  const storage = getLocalStorage()
  if (!storage) {
    return false
  }

  return readStorageValue(storage, SHOW_ALL_HOURS_KEY) === "true"
}

export function writeShowAllHoursPreference(value: boolean) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  writeStorageValue(storage, SHOW_ALL_HOURS_KEY, String(value))
}
