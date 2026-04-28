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
import type { EventLike } from "@/composables/schedule_overlap/types"

const props = withDefaults(
  defineProps<{
    event: EventLike
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
