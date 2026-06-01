<template>
  <div
    id="timezone-select-container"
    class="tw-flex tw-min-w-0 tw-items-center tw-justify-center tw-text-[rgba(0,0,0,0.6)]"
  >
    <div :class="`tw-mr-2 tw-mt-px ${labelColor}`">{{ label }}</div>
    <div class="timezone-select__field-row tw-flex tw-min-w-0 tw-items-center">
      <v-select
        id="timezone-select"
        :model-value="selectedTimezoneValue"
        :items="visibleTimezoneItems"
        data-testid="timezone-select-trigger"
        class="compact-inline-select tw-z-20 -tw-mt-px tw-w-64 tw-min-w-0 tw-text-sm tw-text-black"
        color="#219653"
        density="compact"
        item-color="green"
        hide-details
        item-title="title"
        item-value="value"
        single-line
        variant="underlined"
        @update:model-value="onChangeValue"
      >
        <template #item="{ item, props: itemProps }">
          <v-list-item
            v-bind="stripGeneratedTitle(itemProps)"
            class="timezone-select__item"
            data-testid="timezone-select-option"
            :data-timezone-value="getTimezoneFromSelectItem(item.raw).value"
            :class="{
              'timezone-select__item--active': getTimezoneFromSelectItem(item.raw).value === selectedTimezoneValue,
            }"
          >
            <v-list-item-title class="timezone-select__item-title">
              {{ formatTimezoneSelectItemLabel(item.raw) }}
            </v-list-item-title>
          </v-list-item>
        </template>
        <template #selection="{ item }">
          <div
            class="timezone-select__selection-text v-select__selection v-select__selection--comma"
          >
            {{ formatTimezoneSelectItemLabel(item.raw) }}
          </div>
        </template>
      </v-select>
      <v-btn
        v-if="modified"
        icon
        color="primary"
        variant="text"
        class="timezone-select__reset-button"
        @mousedown.stop.prevent
        @pointerdown.stop.prevent
        @click.stop="emit('reset')"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Temporal } from "temporal-polyfill"
import type { Timezone } from "@/composables/schedule_overlap/types"
import {
  normalizeTimezone,
  buildTimezonesForReferenceDate,
} from "@/utils/timezone_utils"

interface TimezoneSelectItem {
  title: string
  value: string
  timezone: Timezone
}

const props = withDefaults(
  defineProps<{
    modelValue: Timezone
    modified?: boolean
    label?: string
    labelColor?: string
    referenceDate?: Temporal.ZonedDateTime | null
  }>(),
  {
    modified: false,
    label: "Shown in",
    labelColor: "",
    referenceDate: null,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: Timezone]
  reset: []
}>()

const effectiveReferenceDate = computed(() => {
  const refDate = props.referenceDate ?? Temporal.Now.zonedDateTimeISO()
  return refDate
})

function formatTimezoneTitle(timezone: Timezone): string {
  return `${timezone.gmtString} ${timezone.label}`.trim()
}

function isTimezoneSelectItem(item: TimezoneSelectItem | Timezone): item is TimezoneSelectItem {
  return "timezone" in item
}

function getTimezoneFromSelectItem(item: TimezoneSelectItem | Timezone): Timezone {
  return isTimezoneSelectItem(item) ? item.timezone : item
}

function formatTimezoneSelectItemLabel(item: TimezoneSelectItem | Timezone): string {
  return formatTimezoneTitle(getTimezoneFromSelectItem(item))
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
  return buildTimezonesForReferenceDate(effectiveReferenceDate.value)
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

function onChange(val: Timezone) {
  const normalizedTimezone = normalizeTimezone(val)
  emit("update:modelValue", normalizedTimezone)
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
</script>

<style scoped>
.compact-inline-select {
  --v-input-control-height: 26px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-padding-start: 0px;
  --v-field-padding-end: 0px;
  min-width: 0;
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

.compact-inline-select:deep(.v-input),
.compact-inline-select :deep(.v-input),
.compact-inline-select :deep(.v-field),
.compact-inline-select :deep(.v-field__field),
.compact-inline-select :deep(.v-select__selection),
.compact-inline-select :deep(.v-select__selection-text) {
  min-width: 0 !important;
}

.compact-inline-select :deep(.v-field) {
  background: transparent;
  border: 0;
  border-radius: 0;
}

.compact-inline-select :deep(.v-field__input) {
  flex-wrap: nowrap !important;
  min-width: 0 !important;
  overflow: hidden !important;
  padding-inline: 0 !important;
  padding-bottom: 0;
  padding-top: 0;
}

.compact-inline-select :deep(.v-select__selection) {
  display: block !important;
  flex: 1 1 0% !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.compact-inline-select :deep(.v-field__append-inner) {
  align-items: center !important;
  align-self: center !important;
  display: flex !important;
  height: 26px !important;
  min-height: 26px !important;
  padding-inline-start: 4px !important;
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}

.compact-inline-select :deep(.v-select__selection-text) {
  display: block !important;
  max-width: 100% !important;
  line-height: 22px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.compact-inline-select :deep(.v-field__overlay) {
  opacity: 0;
}

.compact-inline-select :deep(.v-select__menu-icon) {
  order: 1;
}

.timezone-select__field-row {
  gap: 2px;
}

.timezone-select__reset-button {
  margin-inline-start: -2px;
}

.timezone-select__item {
  min-height: 48px;
}

.timezone-select__item-title {
  color: rgba(0, 0, 0, 0.87);
}

.timezone-select__item--active {
  background-color: var(--timeful-selection-bg);
}

.timezone-select__item--active :deep(.timezone-select__item-title) {
  color: var(--timeful-selection-fg);
}
</style>
