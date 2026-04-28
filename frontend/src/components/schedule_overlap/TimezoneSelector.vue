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
  localStorage.timezone = JSON.stringify(val)
  emit("update:modelValue", val)
  timezoneModified.value = true
}

function resetTimezone() {
  const local = getLocalTimezone()
  if (local) emit("update:modelValue", local)
  localStorage.removeItem("timezone")
  timezoneModified.value = false
}

// created() equivalent
if (localStorage.timezone) {
  timezoneModified.value = true
}
if (!props.modelValue.value) {
  if (localStorage.timezone) {
    const tz = JSON.parse(localStorage.timezone as string) as Timezone
    emit("update:modelValue", tz)
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

    if (localStorage.timezone) {
      localStorage.timezone = JSON.stringify(refreshed)
    }

    emit("update:modelValue", refreshed)
  }
)
</script>
