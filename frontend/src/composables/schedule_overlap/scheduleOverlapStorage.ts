import { Temporal } from "temporal-polyfill"

const SHOW_BEST_TIMES_KEY = "showBestTimes"
const SHOW_ALL_HOURS_KEY = "showAllHours"

export interface GuestOwnershipState {
  name?: string
  guestId?: string
  guestEditToken?: string
  guestEditPolicy?: "protected" | "open"
  guestOwnershipMode?: "legacy" | "token"
}

export interface StoredGuestOwnership extends GuestOwnershipState {
  lookupKey: string
  lastUsedAt: number
}

export interface StoredGuestOwnershipCollection {
  version: 1
  selectedLookupKey?: string
  records: StoredGuestOwnership[]
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

function clearStorageValue(storage: StorageLike, key: string) {
  if (hasStorageSetItem(storage) && typeof storage.removeItem === "function") {
    storage.removeItem(key)
    return
  }

  Reflect.deleteProperty(storage, key)
}

export function getGuestNameStorageKey(eventId: string): string {
  return `${eventId}.guestName`
}

export function getGuestOwnershipStorageKey(eventId: string): string {
  return `${eventId}.guestOwnership`
}

export function getGuestOwnershipCollectionStorageKey(eventId: string): string {
  return `${eventId}.guestOwnershipCollection`
}

export function getGuestResponseLookupKey(
  ownership?: GuestOwnershipState
): string | undefined {
  return ownership?.guestId ?? ownership?.name
}

function normalizeStoredGuestOwnership(
  ownership: GuestOwnershipState,
  fallbackLastUsedAt: number
): StoredGuestOwnership | undefined {
  const lookupKey = getGuestResponseLookupKey(ownership)
  if (!lookupKey) {
    return undefined
  }

  return {
    ...ownership,
    lookupKey,
    lastUsedAt: fallbackLastUsedAt,
  }
}

function normalizeStoredGuestOwnershipCollection(
  value: unknown
): StoredGuestOwnershipCollection | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("records" in value) ||
    !Array.isArray((value as { records?: unknown }).records)
  ) {
    return undefined
  }

  const now = Temporal.Now.instant().epochMilliseconds
  const records = (
    value as {
      records: (GuestOwnershipState & { lastUsedAt?: number })[]
    }
  ).records
    .map((record, index) => {
      const normalizedRecord = normalizeStoredGuestOwnership(
        record,
        typeof record.lastUsedAt === "number" ? record.lastUsedAt : now - index
      )
      if (!normalizedRecord) {
        return undefined
      }
      return {
        ...normalizedRecord,
        lastUsedAt:
          typeof record.lastUsedAt === "number"
            ? record.lastUsedAt
            : normalizedRecord.lastUsedAt,
      }
    })
    .filter((record): record is StoredGuestOwnership => record != null)

  const selectedLookupKey =
    typeof (value as { selectedLookupKey?: unknown }).selectedLookupKey ===
    "string"
      ? (value as { selectedLookupKey?: string }).selectedLookupKey
      : undefined

  return {
    version: 1,
    selectedLookupKey:
      selectedLookupKey && records.some((record) => record.lookupKey === selectedLookupKey)
        ? selectedLookupKey
        : undefined,
    records,
  }
}

export function readGuestName(key: string): string | undefined {
  const storage = getLocalStorage()
  if (!storage) {
    return undefined
  }

  return readStorageValue(storage, key)
}

export function readLegacyGuestOwnership(
  key: string
): GuestOwnershipState | undefined {
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

export function readGuestOwnershipCollection(
  key: string
): StoredGuestOwnershipCollection | undefined {
  const storage = getLocalStorage()
  if (!storage) {
    return undefined
  }

  const rawValue = readStorageValue(storage, key)
  if (!rawValue) {
    return undefined
  }

  try {
    return normalizeStoredGuestOwnershipCollection(JSON.parse(rawValue))
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

export function writeGuestOwnershipCollection(
  key: string,
  value: StoredGuestOwnershipCollection
) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  writeStorageValue(storage, key, JSON.stringify(value))
}

export function clearGuestOwnershipCollection(key: string) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  clearStorageValue(storage, key)
}

export function readGuestOwnershipCollectionForEvent(
  eventId: string
): StoredGuestOwnershipCollection | undefined {
  const collectionKey = getGuestOwnershipCollectionStorageKey(eventId)
  const existingCollection = readGuestOwnershipCollection(collectionKey)
  if (existingCollection) {
    return existingCollection
  }

  const guestNameKey = getGuestNameStorageKey(eventId)
  const legacyOwnershipKey = getGuestOwnershipStorageKey(eventId)
  const legacyOwnership = readLegacyGuestOwnership(legacyOwnershipKey)
  const legacyGuestName = readGuestName(guestNameKey)
  const migratedRecord = normalizeStoredGuestOwnership(
    {
      ...(legacyOwnership ?? {}),
      name: legacyOwnership?.name ?? legacyGuestName,
    },
    Temporal.Now.instant().epochMilliseconds
  )

  if (!migratedRecord) {
    return undefined
  }

  const migratedCollection: StoredGuestOwnershipCollection = {
    version: 1,
    selectedLookupKey: migratedRecord.lookupKey,
    records: [migratedRecord],
  }
  writeGuestOwnershipCollection(collectionKey, migratedCollection)
  return migratedCollection
}

export function getSelectedGuestOwnership(
  collection?: StoredGuestOwnershipCollection
): StoredGuestOwnership | undefined {
  if (!collection?.selectedLookupKey) {
    return undefined
  }

  return collection.records.find(
    (record) => record.lookupKey === collection.selectedLookupKey
  )
}

export function getGuestOwnershipByLookupKey(
  collection: StoredGuestOwnershipCollection | undefined,
  lookupKey: string | undefined
): StoredGuestOwnership | undefined {
  if (!collection || !lookupKey) {
    return undefined
  }

  return collection.records.find((record) => record.lookupKey === lookupKey)
}

export function sortStoredGuestOwnershipRecords(
  records: StoredGuestOwnership[]
): StoredGuestOwnership[] {
  return [...records].sort((left, right) => right.lastUsedAt - left.lastUsedAt)
}

export function upsertGuestOwnershipRecord(
  collection: StoredGuestOwnershipCollection | undefined,
  ownership: GuestOwnershipState,
  options: {
    select?: boolean
    lastUsedAt?: number
  } = {}
): StoredGuestOwnershipCollection {
  const now = options.lastUsedAt ?? Temporal.Now.instant().epochMilliseconds
  const nextRecord = normalizeStoredGuestOwnership(ownership, now)
  if (!nextRecord) {
    return collection ?? { version: 1, records: [] }
  }

  const existingRecords = collection?.records ?? []
  const filteredRecords = existingRecords.filter(
    (record) => record.lookupKey !== nextRecord.lookupKey
  )
  const nextCollection: StoredGuestOwnershipCollection = {
    version: 1,
    selectedLookupKey:
      options.select === false
        ? collection?.selectedLookupKey
        : nextRecord.lookupKey,
    records: sortStoredGuestOwnershipRecords([
      ...filteredRecords,
      {
        ...nextRecord,
        lastUsedAt: now,
      },
    ]),
  }

  if (
    nextCollection.selectedLookupKey &&
    !nextCollection.records.some(
      (record) => record.lookupKey === nextCollection.selectedLookupKey
    )
  ) {
    nextCollection.selectedLookupKey = undefined
  }

  return nextCollection
}

export function selectGuestOwnershipRecord(
  collection: StoredGuestOwnershipCollection | undefined,
  lookupKey?: string
): StoredGuestOwnershipCollection | undefined {
  if (!collection) {
    return undefined
  }

  if (!lookupKey) {
    return {
      ...collection,
      selectedLookupKey: undefined,
    }
  }

  const targetRecord = collection.records.find(
    (record) => record.lookupKey === lookupKey
  )
  if (!targetRecord) {
    return collection
  }

  return {
    ...collection,
    selectedLookupKey: lookupKey,
    records: sortStoredGuestOwnershipRecords([
      {
        ...targetRecord,
        lastUsedAt: Temporal.Now.instant().epochMilliseconds,
      },
      ...collection.records.filter((record) => record.lookupKey !== lookupKey),
    ]),
  }
}

export function removeGuestOwnershipRecord(
  collection: StoredGuestOwnershipCollection | undefined,
  lookupKey: string
): StoredGuestOwnershipCollection | undefined {
  if (!collection) {
    return undefined
  }

  const nextRecords = collection.records.filter(
    (record) => record.lookupKey !== lookupKey
  )
  if (nextRecords.length === 0) {
    return undefined
  }

  return {
    version: 1,
    selectedLookupKey:
      collection.selectedLookupKey === lookupKey
        ? undefined
        : collection.selectedLookupKey,
    records: nextRecords,
  }
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
