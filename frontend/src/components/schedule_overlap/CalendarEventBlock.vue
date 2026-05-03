<template>
  <transition :name="transitionName" appear>
    <div
      class="tw-absolute tw-w-full tw-select-none tw-p-px"
      :style="blockStyle"
      style="pointer-events: none"
    >
      <div
        class="tw-h-full tw-w-full tw-overflow-hidden tw-text-ellipsis tw-rounded tw-border tw-border-solid tw-p-1 tw-text-xs"
        :class="containerClass"
      >
        <div :class="textColor" class="ph-no-capture tw-font-medium">
          {{ noEventNames ? "BUSY" : calendarEvent.summary }}
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { CalendarEventLite } from "@/composables/schedule_overlap/types"

const props = withDefaults(
  defineProps<{
    blockStyle?: Record<string, string>
    calendarEvent: CalendarEventLite
    isGroup: boolean
    isEditingAvailability: boolean
    noEventNames: boolean
    transitionName: string
  }>(),
  { blockStyle: () => ({}) }
)

const containerClass = computed(() => {
  if (props.calendarEvent.free) {
    return props.isGroup && !props.isEditingAvailability
      ? "tw-border-white tw-bg-light-blue tw-opacity-50"
      : "tw-border-dashed tw-border-blue"
  } else {
    return props.isGroup && !props.isEditingAvailability
      ? "tw-border-white tw-bg-light-blue"
      : "tw-border-blue"
  }
})

const textColor = computed(() => {
  const color =
    props.isGroup && !props.isEditingAvailability
      ? "white"
      : props.noEventNames
      ? "dark-gray"
      : "blue"
  return `tw-text-${color}`
})
</script>
