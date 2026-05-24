import { computed, ref, watch, type ComputedRef } from "vue"
import {
  getGuestNameStorageKey,
  readGuestName,
  readShowBestTimesPreference,
  writeGuestName,
} from "@/composables/schedule_overlap/scheduleOverlapStorage"

export interface UseScheduleOverlapPreferencesOptions {
  eventId: ComputedRef<string>
}

export function useScheduleOverlapPreferences(
  opts: UseScheduleOverlapPreferencesOptions
) {
  const guestNameKey = computed(() => getGuestNameStorageKey(opts.eventId.value))
  const guestName = ref<string | undefined>(readGuestName(guestNameKey.value))
  const showBestTimes = ref(readShowBestTimesPreference())

  watch(
    guestNameKey,
    (nextKey) => {
      guestName.value = readGuestName(nextKey)
    },
    { immediate: true }
  )

  function setGuestName(name: string) {
    writeGuestName(guestNameKey.value, name)
    guestName.value = name
  }

  return {
    guestNameKey,
    guestName: computed(() => guestName.value),
    showBestTimes,
    setGuestName,
  }
}
