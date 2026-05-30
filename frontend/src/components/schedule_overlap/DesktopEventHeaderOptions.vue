<template>
  <div
    v-if="showBestTimesToggle || hasSecondaryOptions"
    id="desktop-header-display-options"
    class="desktop-event-header-options"
  >
    <div
      v-if="showBestTimesToggle"
      id="desktop-header-show-best-times"
      class="desktop-event-header-options__best-times-slot"
    >
      <v-switch
        id="show-best-times-header-toggle"
        class="desktop-event-header-control schedule-overlap-compact-switch desktop-event-header-options__best-times-switch"
        inset
        :model-value="showBestTimes"
        hide-details
        @update:model-value="
          (value: boolean | null) => emit('update:showBestTimes', !!value)
        "
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">
            Best {{ event.daysOnly ? "days" : "times" }}
          </div>
        </template>
      </v-switch>
    </div>

    <div
      v-if="hasSecondaryOptions"
      id="desktop-header-more-options"
      class="desktop-event-header-options__menu"
    >
      <EventOptions
        variant="menu"
        :event="event"
        :show-best-times="showBestTimes"
        :hide-if-needed="hideIfNeeded"
        :show-all-hours="showAllHours"
        :show-calendar-events="showCalendarEvents"
        :start-calendar-on-monday="startCalendarOnMonday"
        :num-responses="numResponses"
        :include-show-best-times="false"
        menu-button-label="More options"
        menu-activator-class="desktop-event-header-control desktop-event-header-options__menu-button tw-justify-between"
        @update:hide-if-needed="emit('update:hideIfNeeded', $event)"
        @update:show-all-hours="emit('update:showAllHours', $event)"
        @update:show-calendar-events="emit('update:showCalendarEvents', $event)"
        @update:start-calendar-on-monday="
          emit('update:startCalendarOnMonday', $event)
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { eventTypes } from "@/constants"
import type { ScheduleOverlapEvent } from "@/composables/schedule_overlap/types"
import EventOptions from "./EventOptions.vue"

defineOptions({ name: "DesktopEventHeaderOptions" })

const props = withDefaults(
  defineProps<{
    event: ScheduleOverlapEvent
    numResponses: number
    showBestTimes: boolean
    hideIfNeeded: boolean
    showAllHours?: boolean
    showCalendarEvents?: boolean
    startCalendarOnMonday?: boolean
  }>(),
  {
    showAllHours: undefined,
    showCalendarEvents: false,
    startCalendarOnMonday: false,
  }
)

const emit = defineEmits<{
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:showAllHours": [value: boolean]
  "update:showCalendarEvents": [value: boolean]
  "update:startCalendarOnMonday": [value: boolean]
}>()

const isGroup = computed(() => props.event.type === eventTypes.GROUP)
const showBestTimesToggle = computed(() => props.numResponses > 1)
const hasSecondaryOptions = computed(
  () =>
    (props.numResponses >= 1 && !isGroup.value) ||
    (!props.event.daysOnly && props.showAllHours !== undefined) ||
    isGroup.value ||
    props.event.daysOnly
)
</script>

<style scoped src="./ScheduleOverlapCompactSwitch.css"></style>

<style scoped>
.desktop-event-header-options {
  display: contents;
}

.desktop-event-header-options__best-times-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.desktop-event-header-options__menu {
  min-width: 0;
}

.desktop-event-header-options__best-times-switch {
  --v-input-control-height: var(--desktop-event-header-control-height);
  width: auto;
  height: 100%;
}

.desktop-event-header-options__best-times-switch :deep(.v-input) {
  height: 100%;
}

.desktop-event-header-options__best-times-switch :deep(.v-input__control),
.desktop-event-header-options__best-times-switch :deep(.v-selection-control) {
  height: 100%;
  min-height: var(--desktop-event-header-control-height);
}

.desktop-event-header-options__best-times-switch :deep(.v-selection-control) {
  align-items: center;
  justify-content: center;
}

.desktop-event-header-options__best-times-switch :deep(.v-label) {
  padding-inline-start: 0;
  margin-inline-start: 0.35rem;
}

.desktop-event-header-options__best-times-switch :deep(.v-selection-control__wrapper) {
  margin-top: 0;
}

.desktop-event-header-options__menu-button {
  border-color: #e0e0e0;
}
</style>
