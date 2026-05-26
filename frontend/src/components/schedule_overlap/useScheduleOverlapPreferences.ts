import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import {
  clearGuestOwnershipCollection,
  getGuestNameStorageKey,
  getGuestOwnershipByLookupKey,
  getGuestOwnershipCollectionStorageKey,
  getGuestResponseLookupKey,
  getSelectedGuestOwnership,
  readGuestName,
  readGuestOwnershipCollectionForEvent,
  readShowBestTimesPreference,
  selectGuestOwnershipRecord,
  sortStoredGuestOwnershipRecords,
  type GuestOwnershipState,
  type StoredGuestOwnership,
  type StoredGuestOwnershipCollection,
  upsertGuestOwnershipRecord,
  writeGuestName,
  writeGuestOwnershipCollection,
  removeGuestOwnershipRecord,
} from "@/composables/schedule_overlap/scheduleOverlapStorage"

export interface UseScheduleOverlapPreferencesOptions {
  eventId: ComputedRef<string>
}

export interface UseScheduleOverlapPreferencesReturn {
  guestNameKey: ComputedRef<string>
  guestOwnershipCollectionKey: ComputedRef<string>
  guestName: ComputedRef<string | undefined>
  guestOwnershipCollection: ComputedRef<StoredGuestOwnershipCollection | undefined>
  ownedGuestResponses: ComputedRef<StoredGuestOwnership[]>
  guestOwnership: ComputedRef<StoredGuestOwnership | undefined>
  guestResponseLookupKey: ComputedRef<string | undefined>
  showBestTimes: Ref<boolean>
  setGuestName: (name: string) => void
  setGuestOwnership: (
    value: GuestOwnershipState,
    options?: { select?: boolean }
  ) => void
  selectGuestOwnership: (lookupKey?: string) => void
  removeGuestOwnership: (lookupKey: string) => void
  clearSelectedGuestOwnership: () => void
  getOwnedGuestOwnership: (
    lookupKey?: string
  ) => StoredGuestOwnership | undefined
}

export function useScheduleOverlapPreferences(
  opts: UseScheduleOverlapPreferencesOptions
): UseScheduleOverlapPreferencesReturn {
  const guestNameKey = computed(() => getGuestNameStorageKey(opts.eventId.value))
  const guestOwnershipCollectionKey = computed(() =>
    getGuestOwnershipCollectionStorageKey(opts.eventId.value)
  )
  const guestOwnershipCollection = ref<StoredGuestOwnershipCollection | undefined>(
    readGuestOwnershipCollectionForEvent(opts.eventId.value)
  )
  const guestName = ref<string | undefined>(
    getSelectedGuestOwnership(guestOwnershipCollection.value)?.name ??
      readGuestName(guestNameKey.value)
  )
  const showBestTimes = ref(readShowBestTimesPreference())

  watch(
    [guestNameKey, guestOwnershipCollectionKey],
    ([nextGuestNameKey]) => {
      guestOwnershipCollection.value = readGuestOwnershipCollectionForEvent(
        opts.eventId.value
      )
      guestName.value =
        getSelectedGuestOwnership(guestOwnershipCollection.value)?.name ??
        readGuestName(nextGuestNameKey)
    },
    { immediate: true }
  )

  function persistGuestOwnershipCollection(
    nextCollection: StoredGuestOwnershipCollection | undefined
  ) {
    guestOwnershipCollection.value = nextCollection
    if (!nextCollection || nextCollection.records.length === 0) {
      clearGuestOwnershipCollection(guestOwnershipCollectionKey.value)
      return
    }

    writeGuestOwnershipCollection(guestOwnershipCollectionKey.value, nextCollection)
  }

  function setGuestName(name: string) {
    writeGuestName(guestNameKey.value, name)
    guestName.value = name
  }

  function setGuestOwnership(
    value: GuestOwnershipState,
    options: { select?: boolean } = {}
  ) {
    const nextCollection = upsertGuestOwnershipRecord(
      guestOwnershipCollection.value,
      value,
      options
    )
    persistGuestOwnershipCollection(nextCollection)
    if (value.name) {
      setGuestName(value.name)
    }
  }

  function selectGuestOwnership(lookupKey?: string) {
    const nextCollection = selectGuestOwnershipRecord(
      guestOwnershipCollection.value,
      lookupKey
    )
    persistGuestOwnershipCollection(nextCollection)
    guestName.value =
      getSelectedGuestOwnership(nextCollection)?.name ??
      readGuestName(guestNameKey.value)
  }

  function removeGuestOwnership(lookupKey: string) {
    const nextCollection = removeGuestOwnershipRecord(
      guestOwnershipCollection.value,
      lookupKey
    )
    persistGuestOwnershipCollection(nextCollection)
    guestName.value =
      getSelectedGuestOwnership(nextCollection)?.name ??
      readGuestName(guestNameKey.value)
  }

  function clearSelectedGuestOwnership() {
    selectGuestOwnership(undefined)
  }

  function getOwnedGuestOwnership(lookupKey?: string) {
    return getGuestOwnershipByLookupKey(guestOwnershipCollection.value, lookupKey)
  }

  return {
    guestNameKey,
    guestOwnershipCollectionKey,
    guestName: computed(() => guestName.value),
    guestOwnershipCollection: computed(() => guestOwnershipCollection.value),
    ownedGuestResponses: computed<StoredGuestOwnership[]>(() =>
      sortStoredGuestOwnershipRecords(
        guestOwnershipCollection.value?.records ?? []
      )
    ),
    guestOwnership: computed(() =>
      getSelectedGuestOwnership(guestOwnershipCollection.value)
    ),
    guestResponseLookupKey: computed(() =>
      getGuestResponseLookupKey(
        getSelectedGuestOwnership(guestOwnershipCollection.value)
      )
    ),
    showBestTimes,
    setGuestName,
    setGuestOwnership,
    selectGuestOwnership,
    removeGuestOwnership,
    clearSelectedGuestOwnership,
    getOwnedGuestOwnership,
  }
}
