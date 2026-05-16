<template>
  <ExpandableSection
    v-if="event.daysOnly || numResponses >= 1"
    label="Options"
    :model-value="showEventOptions"
    @update:model-value="$emit('toggleShowEventOptions')"
  >
    <div class="tw-flex tw-flex-col tw-gap-4 tw-pt-2">
      <v-switch
        v-if="numResponses > 1 && isPhone"
        id="show-best-times-toggle"
        class="event-options-switch"
        inset
        :input-value="showBestTimes"
        hide-details
        @change="(val: boolean) => $emit('update:showBestTimes', !!val)"
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">
            Show best {{ event.daysOnly ? "days" : "times" }}
          </div>
        </template>
      </v-switch>
      <v-switch
        v-if="numResponses >= 1 && !isGroup"
        id="hide-if-needed-toggle"
        class="event-options-switch"
        inset
        :input-value="hideIfNeeded"
        hide-details
        @change="(val: boolean) => $emit('update:hideIfNeeded', !!val)"
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">
            Hide if needed {{ event.daysOnly ? "days" : "times" }}
          </div>
        </template>
      </v-switch>
      <v-switch
        v-if="showCalendarEvents !== undefined && isGroup && !isPhone"
        class="event-options-switch"
        inset
        :input-value="showCalendarEvents"
        hide-details
        @change="(val: boolean) => $emit('update:showCalendarEvents', Boolean(val))"
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">Overlay calendar events</div>
        </template>
      </v-switch>

      <!-- Start on monday -->
      <v-switch
        v-if="event.daysOnly"
        id="start-calendar-on-monday-toggle"
        class="event-options-switch"
        inset
        :input-value="startCalendarOnMonday"
        hide-details
        @change="(val: boolean) => $emit('update:startCalendarOnMonday', !!val)"
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">Start on Monday</div>
        </template>
      </v-switch>
    </div>
  </ExpandableSection>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { eventTypes } from "@/constants"
import ExpandableSection from "@/components/ExpandableSection.vue"
import type { ScheduleOverlapEvent } from "@/composables/schedule_overlap/types"

const props = withDefaults(
  defineProps<{
    event: ScheduleOverlapEvent
    showBestTimes: boolean
    hideIfNeeded: boolean
    numResponses: number
    showEventOptions: boolean
    showCalendarEvents?: boolean
    startCalendarOnMonday?: boolean
  }>(),
  {
    showCalendarEvents: false,
    startCalendarOnMonday: false,
  }
)

defineEmits<{
  toggleShowEventOptions: []
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:showCalendarEvents": [value: boolean]
  "update:startCalendarOnMonday": [value: boolean]
}>()

const { isPhone } = useDisplayHelpers()

const isGroup = computed(() => props.event.type === eventTypes.GROUP)
</script>

<style scoped>
.event-options-switch {
  --v-input-control-height: 24px;
  --v-input-padding-top: 0px;
}

.event-options-switch :deep(.v-input__control) {
  max-width: 100%;
}

.event-options-switch :deep(.v-selection-control) {
  min-height: 24px;
  align-items: flex-start;
}

.event-options-switch :deep(.v-selection-control__wrapper) {
  margin-top: 1px;
}

.event-options-switch :deep(.v-selection-control__wrapper) {
  width: 34px !important;
  height: 19.2px !important;
}

.event-options-switch :deep(.v-switch__track) {
  min-width: 34px !important;
  width: 34px !important;
  height: 19.2px !important;
  padding: 0 !important;
  border: 2px solid #bdbdbd !important;
  border-radius: 14px !important;
  background-color: #bdbdbd !important;
  box-shadow: 0px 0.74px 4.46px 0px rgba(0, 0, 0, 0.1) !important;
  opacity: 1 !important;
}

.event-options-switch :deep(.v-selection-control__input) {
  width: 13px !important;
  height: 13px !important;
  transform: translateX(-8px) !important;
}

.event-options-switch :deep(.v-switch__thumb) {
  width: 13px !important;
  height: 13px !important;
  transform: none !important;
  background-color: #fff !important;
}

.event-options-switch :deep(.v-selection-control--dirty .v-selection-control__input) {
  transform: translateX(8px) !important;
}

.event-options-switch :deep(.v-selection-control--dirty .v-switch__track) {
  border-color: #29bc68 !important;
  background-color: #00994c !important;
  box-shadow: 0px 1.5px 4.5px 0px rgba(0, 0, 0, 0.2) !important;
  opacity: 1 !important;
}

.event-options-switch :deep(.v-label) {
  letter-spacing: normal;
  text-align: left;
}
</style>
