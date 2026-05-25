import { computed, ref, watch, type ComputedRef } from "vue"
import {
  clearGuestOwnership,
  getGuestNameStorageKey,
  getGuestOwnershipStorageKey,
  getGuestResponseLookupKey,
  readGuestOwnership,
  readGuestName,
  readShowBestTimesPreference,
  type GuestOwnershipState,
  writeGuestOwnership,
  writeGuestName,
} from "@/composables/schedule_overlap/scheduleOverlapStorage"

export interface UseScheduleOverlapPreferencesOptions {
  eventId: ComputedRef<string>
}

export function useScheduleOverlapPreferences(
  opts: UseScheduleOverlapPreferencesOptions
) {
  const guestNameKey = computed(() => getGuestNameStorageKey(opts.eventId.value))
  const guestOwnershipKey = computed(() =>
    getGuestOwnershipStorageKey(opts.eventId.value)
  )
  const guestOwnership = ref<GuestOwnershipState | undefined>(
    readGuestOwnership(guestOwnershipKey.value)
  )
  const guestName = ref<string | undefined>(
    guestOwnership.value?.name ?? readGuestName(guestNameKey.value)
  )
  const showBestTimes = ref(readShowBestTimesPreference())

  watch(
    [guestNameKey, guestOwnershipKey],
    ([nextGuestNameKey, nextGuestOwnershipKey]) => {
      guestOwnership.value = readGuestOwnership(nextGuestOwnershipKey)
      guestName.value =
        guestOwnership.value?.name ?? readGuestName(nextGuestNameKey)
    },
    { immediate: true }
  )

  function setGuestName(name: string) {
    writeGuestName(guestNameKey.value, name)
    guestOwnership.value = {
      ...(guestOwnership.value ?? {}),
      name,
    }
    writeGuestOwnership(guestOwnershipKey.value, guestOwnership.value)
    guestName.value = name
  }

  function setGuestOwnership(value: GuestOwnershipState) {
    const nextOwnership = {
      ...(guestOwnership.value ?? {}),
      ...value,
    }
    guestOwnership.value = nextOwnership
    if (nextOwnership.name) {
      writeGuestName(guestNameKey.value, nextOwnership.name)
      guestName.value = nextOwnership.name
    }
    writeGuestOwnership(guestOwnershipKey.value, nextOwnership)
  }

  function clearStoredGuestOwnership() {
    clearGuestOwnership(guestOwnershipKey.value)
    guestOwnership.value = undefined
    guestName.value = readGuestName(guestNameKey.value)
  }

  return {
    guestNameKey,
    guestOwnershipKey,
    guestName: computed(() => guestName.value),
    guestOwnership: computed(() => guestOwnership.value),
    guestResponseLookupKey: computed(() =>
      getGuestResponseLookupKey(guestOwnership.value) ?? guestName.value
    ),
    showBestTimes,
    setGuestName,
    setGuestOwnership,
    clearStoredGuestOwnership,
  }
}
