<!-- Allows user to change timezone -->
<template>
  <div
    id="timezone-select-container"
    class="tw-flex tw-items-center tw-justify-center tw-text-[rgba(0,0,0,0.6)]"
  >
    <div :class="`tw-mr-2 tw-mt-px ${labelColor}`">{{ label }}</div>
    <v-select
      id="timezone-select"
      :model-value="selectedTimezoneValue"
      :items="visibleTimezoneItems"
      class="compact-inline-select tw-z-20 -tw-mt-px tw-w-52 tw-text-sm tw-text-black"
      color="#219653"
      density="compact"
      item-color="green"
      hide-details
      item-title="title"
      item-value="value"
      single-line
      variant="plain"
      @update:model-value="onChangeValue"
    >
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="stripGeneratedTitle(itemProps)">
          <v-list-item-title>
            {{ item.raw.timezone.gmtString }} {{ item.raw.timezone.label }}
          </v-list-item-title>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <div
          class="timezone-select__selection-text v-select__selection v-select__selection--comma"
        >
          {{ item.raw.timezone.gmtString }} {{ item.raw.timezone.label }}
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
  getFixedOffsetTimeZoneId,
  readSavedTimezone,
  reviveSavedTimezoneOffset,
  resolveSavedTimezoneValue,
} from "@/utils/timezone_utils"

interface TimezoneSelectItem {
  title: string
  value: string
  timezone: Timezone
}

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

function formatTimezoneTitle(timezone: Timezone): string {
  return `${timezone.gmtString} ${timezone.label}`.trim()
}

function normalizeTimezone(timezone: Timezone): Timezone {
  const rawOffset = timezone.offset
  const revivedOffset =
    rawOffset instanceof Temporal.Duration
      ? rawOffset
      : typeof rawOffset === "string"
        ? reviveSavedTimezoneOffset(rawOffset)
        : undefined
  const offset = revivedOffset ?? Temporal.Duration.from({ minutes: 0 })
  const value =
    typeof timezone.value === "string" && timezone.value
      ? timezone.value
      : getFixedOffsetTimeZoneId(offset)
  const label =
    typeof timezone.label === "string" && timezone.label ? timezone.label : value
  const gmtString =
    typeof timezone.gmtString === "string" && timezone.gmtString
      ? timezone.gmtString
      : formatGmtString(offset.total("minutes"))

  return {
    value,
    label,
    gmtString,
    offset,
  }
}

function toTimezoneSelectItem(timezone: Timezone): TimezoneSelectItem {
  const normalizedTimezone = normalizeTimezone(timezone)

  return {
    title: formatTimezoneTitle(normalizedTimezone),
    value: normalizedTimezone.value,
    timezone: normalizedTimezone,
  }
}

function stripGeneratedTitle(
  itemProps: Record<string, unknown>
): Record<string, unknown> {
  const { title: _title, ...rest } = itemProps
  return rest
}

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

const timezoneItems = computed<TimezoneSelectItem[]>(() =>
  timezones.value.map((timezone) => toTimezoneSelectItem(timezone))
)

const selectedTimezoneValue = computed(() => {
  if (!props.modelValue.value && !(props.modelValue.offset instanceof Temporal.Duration)) {
    return undefined
  }

  return normalizeTimezone(props.modelValue).value
})

const visibleTimezoneItems = computed<TimezoneSelectItem[]>(() => {
  const currentValue = selectedTimezoneValue.value
  if (!currentValue) {
    return timezoneItems.value
  }

  if (timezoneItems.value.some((item) => item.value === currentValue)) {
    return timezoneItems.value
  }

  return [toTimezoneSelectItem(props.modelValue), ...timezoneItems.value]
})

function formatGmtString(offsetMinutes: number): string {
  const hours = Math.trunc(offsetMinutes / 60)
  const minutes = Math.abs(offsetMinutes % 60)
  const hr = `${String(hours)}:${minutes === 0 ? "00" : String(minutes).padStart(2, "0")}`
  return `(GMT${hr.includes("-") ? hr : `+${hr}`})`
}

function createFixedOffsetTimezone(offset: Temporal.Duration): Timezone {
  const offsetMinutes = offset.total("minutes")
  const value = getFixedOffsetTimeZoneId(offset)

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
  const normalizedTimezone = normalizeTimezone(val)

  storage?.setItem("timezone", JSON.stringify(normalizedTimezone))
  emit("update:modelValue", normalizedTimezone)
  timezoneModified.value = true
}

function onChangeValue(val: string | null) {
  if (!val) {
    return
  }

  const matchedTimezone = visibleTimezoneItems.value.find(
    (timezone) => timezone.value === val
  )?.timezone
  if (!matchedTimezone) {
    return
  }

  onChange(matchedTimezone)
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

<style scoped>
.compact-inline-select {
  --v-input-control-height: 26px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-padding-start: 0px;
  --v-field-padding-end: 0px;
}

.compact-inline-select,
.compact-inline-select:deep(.v-input),
.compact-inline-select :deep(.v-input),
.compact-inline-select :deep(.v-field),
.compact-inline-select :deep(.v-field__input),
.compact-inline-select :deep(.v-select__selection),
.compact-inline-select :deep(.v-select__selection-text) {
  letter-spacing: normal !important;
}

.compact-inline-select :deep(.v-field) {
  background: transparent;
  border: 0;
  border-radius: 0;
  align-items: center !important;
  display: flex !important;
  height: 26px !important;
  min-height: 26px !important;
}

.compact-inline-select :deep(.v-input__control),
.compact-inline-select :deep(.v-field__field) {
  align-items: center !important;
  display: flex !important;
  height: 26px !important;
  min-height: 26px !important;
}

.compact-inline-select :deep(.v-field__input) {
  align-items: center !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  height: 26px !important;
  min-height: 26px;
  overflow: hidden !important;
  padding-inline: 0 !important;
  padding-bottom: 0;
  padding-top: 0;
}

.compact-inline-select :deep(.v-select__selection) {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.compact-inline-select :deep(.v-field__append-inner) {
  align-items: center !important;
  height: 26px !important;
  min-height: 26px !important;
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}

.compact-inline-select :deep(.v-select__selection-text) {
  line-height: 22px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.compact-inline-select :deep(.v-field__overlay) {
  opacity: 0;
}

.compact-inline-select :deep(.v-field__outline) {
  display: none;
}
</style>
