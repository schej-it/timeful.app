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
import { allTimezones } from "@/constants"
import type { Timezone } from "@/composables/schedule_overlap/types"
import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

const props = withDefaults(
  defineProps<{
    modelValue: Timezone
    label?: string
    labelColor?: string
    referenceDate?: Date | null
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

const effectiveReferenceDate = computed(() => props.referenceDate ?? new Date())

const timezones = computed<Timezone[]>(() => {
  const t = Object.entries(allTimezones)
    .map((zone): Timezone | null => {
      try {
        const min = dayjs(effectiveReferenceDate.value).tz(zone[0]).utcOffset()
        const hr = `${String((min / 60) ^ 0)}:${
          min % 60 === 0 ? "00" : String(Math.abs(min % 60))
        }`
        const gmtString = `(GMT${hr.includes("-") ? hr : `+${hr}`})`
        return { value: zone[0], label: zone[1], gmtString, offset: min }
      } catch (e: unknown) {
        console.error(e)
        return null
      }
    })
    .filter((z): z is Timezone => z !== null)
    .sort((a, b) => a.offset - b.offset)
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
    const janOffset = dayjs.tz("2024-01-15 12:00", localTimezone).utcOffset()
    const julOffset = dayjs.tz("2024-07-15 12:00", localTimezone).utcOffset()
    match = timezones.value.find((t) => {
      const tJan = dayjs.tz("2024-01-15 12:00", t.value).utcOffset()
      const tJul = dayjs.tz("2024-07-15 12:00", t.value).utcOffset()
      return tJan === janOffset && tJul === julOffset
    })
  }

  if (!match) {
    // Step 3: Final fallback — current offset only
    const offset = dayjs(effectiveReferenceDate.value)
      .tz(localTimezone)
      .utcOffset()
    match = timezones.value.find((t) => t.offset === offset)
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
