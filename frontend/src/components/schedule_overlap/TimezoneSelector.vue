<!-- Allows user to change timezone -->
<template>
  <div
    id="timezone-select-container"
    class="tw-flex tw-items-center tw-justify-center"
  >
    <div :class="`tw-mr-2 tw-mt-px ${labelColor}`">{{ label }}</div>
    <v-select
      id="timezone-select"
      :value="modelValue"
      :items="timezones"
      class="tw-z-20 -tw-mt-px tw-w-52 tw-text-sm"
      dense
      color="#219653"
      item-color="green"
      hide-details
      item-text="label"
      return-object
      @input="onChange"
    >
      <template #item="{ item }">
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>
              {{ (item.raw as Timezone).gmtString }} {{ (item.raw as Timezone).label }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <div class="v-select__selection v-select__selection--comma">
          {{ (item.raw as Timezone).gmtString }} {{ (item.raw as Timezone).label }}
        </div>
      </template>
    </v-select>
    <v-btn v-if="timezoneModified" icon color="primary" @click="resetTimezone"
      ><v-icon>mdi-refresh</v-icon></v-btn
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { Temporal } from "temporal-polyfill"
import { allTimezones } from "@/constants"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  readSavedTimezone,
  reviveSavedTimezoneOffset,
  resolveSavedTimezoneValue,
} from "@/utils/timezone_utils"

const props = withDefaults(
  defineProps<{
    modelValue: Timezone
    label?: string
    labelColor?: string
    referenceDate?: Temporal.ZonedDateTime | null
  }>(),
  {
    label: "Shown in",
    labelColor: "",
    referenceDate: null,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: Timezone]
}>()

const timezoneModified = ref(false)
const storage =
  typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage

const effectiveReferenceDate = computed(() => {
  const refDate = props.referenceDate ?? Temporal.Now.zonedDateTimeISO()
  return refDate
})

const timezones = computed<Timezone[]>(() => {
  const t = Object.entries(allTimezones)
    .map((zone): Timezone | null => {
      try {
        // Use Temporal to get the UTC offset for the timezone at the reference date
        const zdt = effectiveReferenceDate.value.withTimeZone(zone[0])
        const min = Math.round(zdt.offsetNanoseconds / (1000 * 1000 * 1000 * 60))
        const hr = `${String((min / 60) ^ 0)}:${
          min % 60 === 0 ? "00" : String(Math.abs(min % 60))
        }`
        const gmtString = `(GMT${hr.includes("-") ? hr : `+${hr}`})`
        return { value: zone[0], label: zone[1], gmtString, offset: Temporal.Duration.from({ minutes: min }) }
      } catch (e: unknown) {
        console.error(e)
        return null
      }
    })
    .filter((z): z is Timezone => z !== null)
    .sort((a, b) => a.offset.total("minutes") - b.offset.total("minutes"))
  return t
})

function formatGmtString(offsetMinutes: number): string {
  const hours = Math.trunc(offsetMinutes / 60)
  const minutes = Math.abs(offsetMinutes % 60)
  const hr = `${String(hours)}:${minutes === 0 ? "00" : String(minutes).padStart(2, "0")}`
  return `(GMT${hr.includes("-") ? hr : `+${hr}`})`
}

function createFixedOffsetTimezone(offset: Temporal.Duration): Timezone {
  const offsetMinutes = offset.total("minutes")
  const value = resolveSavedTimezoneValue({ offset }) ?? ""

  return {
    value,
    label: value,
    gmtString: formatGmtString(offsetMinutes),
    offset,
  }
}

function getLocalTimezone(): Timezone | undefined {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Step 1: Exact match on spacetime-canonical name
  let match = timezones.value.find((t) => t.value === localTimezone)

  if (!match) {
    // Step 2: Match by offsets at two reference dates (Jan + Jul)
    // Distinguishes DST-observing zones from non-DST zones that share
    // the same current offset (e.g. Europe/Belgrade vs Africa/Casablanca)
    const janDate = Temporal.ZonedDateTime.from("2024-01-15T12:00:00[America/New_York]")
      .withTimeZone(localTimezone)
    const julDate = Temporal.ZonedDateTime.from("2024-07-15T12:00:00[America/New_York]")
      .withTimeZone(localTimezone)
    
    const janOffset = Math.round(janDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60))
    const julOffset = Math.round(julDate.offsetNanoseconds / (1000 * 1000 * 1000 * 60))
    
    match = timezones.value.find((t) => {
      const tJan = Temporal.ZonedDateTime.from("2024-01-15T12:00:00[America/New_York]")
        .withTimeZone(t.value)
      const tJul = Temporal.ZonedDateTime.from("2024-07-15T12:00:00[America/New_York]")
        .withTimeZone(t.value)
      
      const tJanOffset = Math.round(tJan.offsetNanoseconds / (1000 * 1000 * 1000 * 60))
      const tJulOffset = Math.round(tJul.offsetNanoseconds / (1000 * 1000 * 1000 * 60))
      
      return tJanOffset === janOffset && tJulOffset === julOffset
    })
  }

  if (!match) {
    // Step 3: Final fallback — current offset only
    const zdt = effectiveReferenceDate.value.withTimeZone(localTimezone)
    const offsetMinutes = Math.round(zdt.offsetNanoseconds / (1000 * 1000 * 1000 * 60))
    match = timezones.value.find((t) => t.offset.total("minutes") === offsetMinutes)
  }

  return match
}

function onChange(val: Timezone) {
  storage?.setItem("timezone", JSON.stringify(val))
  emit("update:modelValue", val)
  timezoneModified.value = true
}

function getSavedTimezone(): Timezone | undefined {
  if (!storage) {
    return undefined
  }

  try {
    const parsedSavedTimezone = readSavedTimezone(storage)
    if (!parsedSavedTimezone) {
      return undefined
    }

    const savedTimezoneValue = resolveSavedTimezoneValue(
      parsedSavedTimezone
    )
    if (!savedTimezoneValue) {
      return undefined
    }

    const matchedTimezone = timezones.value.find(
      (timezone) => timezone.value === savedTimezoneValue
    )
    if (matchedTimezone) {
      return matchedTimezone
    }

    if (!savedTimezoneValue.startsWith("+") && !savedTimezoneValue.startsWith("-")) {
      return undefined
    }

    if (!parsedSavedTimezone.offset) {
      return undefined
    }

    const offset = reviveSavedTimezoneOffset(parsedSavedTimezone.offset)
    if (!offset) {
      return undefined
    }

    return createFixedOffsetTimezone(offset)
  } catch {
    return undefined
  }
}

function resetTimezone() {
  const local = getLocalTimezone()
  if (local) emit("update:modelValue", local)
  storage?.removeItem("timezone")
  timezoneModified.value = false
}

// created() equivalent
const savedTimezone = getSavedTimezone()
timezoneModified.value = savedTimezone !== undefined

if (!props.modelValue.value) {
  if (savedTimezone) {
    emit("update:modelValue", savedTimezone)
  } else {
    const local = getLocalTimezone()
    if (local) emit("update:modelValue", local)
  }
}

watch(
  () => props.referenceDate,
  () => {
    if (!props.modelValue.value) return

    const refreshed = timezones.value.find(
      (tz) => tz.value === props.modelValue.value
    )

    if (!refreshed || refreshed.offset === props.modelValue.offset) return

    if (storage?.getItem("timezone")) {
      storage.setItem("timezone", JSON.stringify(refreshed))
    }

    emit("update:modelValue", refreshed)
  }
)
</script>
