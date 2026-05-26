<template>
  <section v-if="event.daysOnly || numResponses >= 1" class="tw-flex tw-flex-col">
    <div class="tw-text-base tw-font-medium tw-text-black">Options</div>
    <div class="tw-flex tw-flex-col tw-gap-4 tw-pt-2">
      <v-switch
        v-if="numResponses > 1"
        id="show-best-times-toggle"
        class="event-options-switch schedule-overlap-compact-switch"
        inset
        :model-value="showBestTimes"
        hide-details
        @update:model-value="
          (val: boolean | null) => $emit('update:showBestTimes', !!val)
        "
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
        class="event-options-switch schedule-overlap-compact-switch"
        inset
        :model-value="hideIfNeeded"
        hide-details
        @update:model-value="
          (val: boolean | null) => $emit('update:hideIfNeeded', !!val)
        "
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">
            Hide if needed {{ event.daysOnly ? "days" : "times" }}
          </div>
        </template>
      </v-switch>
      <v-switch
        v-if="!event.daysOnly && showAllHours !== undefined"
        id="show-all-hours-toggle"
        class="event-options-switch schedule-overlap-compact-switch"
        inset
        :model-value="showAllHours"
        hide-details
        @update:model-value="
          (val: boolean | null) => $emit('update:showAllHours', !!val)
        "
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">Show all hours</div>
        </template>
      </v-switch>
      <v-switch
        v-if="showCalendarEvents !== undefined && isGroup && !isPhone"
        class="event-options-switch schedule-overlap-compact-switch"
        inset
        :model-value="showCalendarEvents"
        hide-details
        @update:model-value="
          (val: boolean | null) => $emit('update:showCalendarEvents', !!val)
        "
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">Overlay calendar events</div>
        </template>
      </v-switch>

      <!-- Start on monday -->
      <v-switch
        v-if="event.daysOnly"
        id="start-calendar-on-monday-toggle"
        class="event-options-switch schedule-overlap-compact-switch"
        inset
        :model-value="startCalendarOnMonday"
        hide-details
        @update:model-value="
          (val: boolean | null) => $emit('update:startCalendarOnMonday', !!val)
        "
      >
        <template #label>
          <div class="tw-text-sm tw-text-black">Start on Monday</div>
        </template>
      </v-switch>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { eventTypes } from "@/constants"
import type { ScheduleOverlapEvent } from "@/composables/schedule_overlap/types"

const props = withDefaults(
  defineProps<{
    event: ScheduleOverlapEvent
    showBestTimes: boolean
    hideIfNeeded: boolean
    numResponses: number
    showAllHours?: boolean
    showCalendarEvents?: boolean
    startCalendarOnMonday?: boolean
  }>(),
  {
    showCalendarEvents: false,
    startCalendarOnMonday: false,
  }
)

defineEmits<{
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:showAllHours": [value: boolean]
  "update:showCalendarEvents": [value: boolean]
  "update:startCalendarOnMonday": [value: boolean]
}>()

const { isPhone } = useDisplayHelpers()

const isGroup = computed(() => props.event.type === eventTypes.GROUP)
</script>

<style scoped src="./ScheduleOverlapCompactSwitch.css"></style>
