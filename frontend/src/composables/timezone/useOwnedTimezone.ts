import { computed, ref, watch, type ComputedRef, type Ref } from "vue"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  buildTimezonesForReferenceDate,
  normalizeTimezone,
  resolveBrowserTimezoneSelection,
  resolveSavedTimezoneSelection,
} from "@/utils/timezone_utils"

type MaybeRef<T> = Ref<T> | ComputedRef<T>

interface UseOwnedTimezoneOptions {
  initialTimezone?: MaybeRef<Timezone | null | undefined>
  referenceDate?: MaybeRef<Temporal.ZonedDateTime>
  storage?: Storage | undefined
}

const getStorage = () =>
  typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage

export function useOwnedTimezone(options: UseOwnedTimezoneOptions = {}) {
  const storage = options.storage ?? getStorage()
  const referenceDate = computed(
    () => options.referenceDate?.value ?? Temporal.Now.zonedDateTimeISO()
  )
  const timezones = computed(() =>
    buildTimezonesForReferenceDate(referenceDate.value)
  )
  const initialTimezone = computed(() => options.initialTimezone?.value)

  const resolveBrowserTimezone = () =>
    resolveBrowserTimezoneSelection(timezones.value, referenceDate.value) ??
    normalizeTimezone(undefined)

  const timezone = ref<Timezone>(
    initialTimezone.value != null
      ? normalizeTimezone(initialTimezone.value)
      : resolveSavedTimezoneSelection(timezones.value, storage) ??
          resolveBrowserTimezone()
  )
  const modified = ref(
    resolveSavedTimezoneSelection(timezones.value, storage) !== undefined
  )

  const persistTimezone = (value: Timezone) => {
    storage?.setItem("timezone", JSON.stringify(value))
    modified.value = true
  }

  const setTimezone = (value: Timezone) => {
    const normalizedTimezone = normalizeTimezone(value)
    timezone.value = normalizedTimezone
    persistTimezone(normalizedTimezone)
  }

  const resetTimezone = () => {
    timezone.value = resolveBrowserTimezone()
    storage?.removeItem("timezone")
    modified.value = false
  }

  watch(referenceDate, () => {
    const currentValue = timezone.value.value
    const refreshedTimezone = timezones.value.find(
      (candidate) => candidate.value === currentValue
    )

    if (!refreshedTimezone) {
      return
    }

    if (refreshedTimezone.offset.total("minutes") === timezone.value.offset.total("minutes")) {
      return
    }

    timezone.value = refreshedTimezone

    if (modified.value) {
      persistTimezone(refreshedTimezone)
    }
  })

  return {
    timezone,
    modified,
    setTimezone,
    resetTimezone,
  }
}
