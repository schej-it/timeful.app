<template>
  <div class="tw-fixed tw-z-20 tw-w-full" :style="{ bottom: bottomOffset }">
    <v-expand-transition>
      <template v-if="hintTextShown">
        <div :key="hintText">
          <div
            class="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-bg-light-gray tw-px-2 tw-py-2 tw-text-sm tw-text-very-dark-gray"
          >
            <div :class="`tw-flex tw-gap-${hintText.length > 60 ? 2 : 1}`">
              <v-icon small>mdi-information-outline</v-icon>
              <div>
                {{ hintText }}
              </div>
            </div>
            <v-icon small @click="emit('closeHint')">mdi-close</v-icon>
          </div>
        </div>
      </template>
    </v-expand-transition>

    <v-expand-transition>
      <div v-if="!isGroup && editing && !isSignUp">
        <div class="tw-bg-white tw-p-4">
          <AvailabilityTypeToggle
            :model-value="availabilityType"
            class="tw-w-full"
            @update:model-value="emit('update:availabilityType', $event as AvailabilityType)"
          />
        </div>
      </div>
    </v-expand-transition>

    <v-expand-transition>
      <div v-if="isWeekly && editing && calendarPermissionGranted">
        <div class="tw-h-16 tw-text-sm">
          <GCalWeekSelector
            :week-offset="weekOffset"
            :event="event"
            :start-on-monday="event.startOnMonday"
            @update:week-offset="emit('update:weekOffset', $event)"
          />
        </div>
      </div>
    </v-expand-transition>

    <v-expand-transition>
      <div v-if="showStickyRespondents">
        <div class="tw-bg-white tw-p-4">
          <ScheduleOverlapRespondentsPanel
            :max-height="100"
            :panel="respondentsPanel"
            @update:show-calendar-events="emit('update:showCalendarEvents', $event)"
            @update:show-best-times="emit('update:showBestTimes', $event)"
            @update:hide-if-needed="emit('update:hideIfNeeded', $event)"
            @toggle-show-event-options="emit('toggleShowEventOptions')"
            @add-availability="emit('addAvailability')"
            @add-availability-as-guest="emit('addAvailabilityAsGuest')"
            @mouse-over-respondent="(e, userId) => emit('mouseOverRespondent', e, userId)"
            @mouse-leave-respondent="emit('mouseLeaveRespondent')"
            @click-respondent="(e, userId) => emit('clickRespondent', e, userId)"
            @edit-guest-availability="emit('editGuestAvailability', $event)"
            @refresh-event="emit('refreshEvent')"
          />
        </div>
      </div>
    </v-expand-transition>

    <v-expand-transition>
      <div
        v-if="state === states.SET_SPECIFIC_TIMES"
        class="-tw-mb-16 tw-bg-white tw-p-4"
      >
        <SpecificTimesInstructions
          :num-temp-times="numTempTimes"
          @save-temp-times="emit('saveTempTimes')"
        />
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import type { AvailabilityType } from "@/constants"
import type {
  EventLike,
  ScheduleOverlapState,
} from "@/composables/schedule_overlap/types"
import { states } from "@/composables/schedule_overlap/types"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import ScheduleOverlapRespondentsPanel from "./ScheduleOverlapRespondentsPanel.vue"
import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"
import type { ScheduleOverlapRespondentsPanelViewModel } from "./respondentsPanelTypes"

defineProps<{
  bottomOffset: string
  hintTextShown: boolean
  hintText: string
  isGroup: boolean
  editing: boolean
  isSignUp: boolean
  availabilityType: AvailabilityType
  isWeekly: boolean
  calendarPermissionGranted: boolean
  weekOffset: number
  event: EventLike
  showStickyRespondents: boolean
  respondentsPanel: ScheduleOverlapRespondentsPanelViewModel
  state: ScheduleOverlapState
  numTempTimes: number
}>()

const emit = defineEmits<{
  closeHint: []
  "update:availabilityType": [value: AvailabilityType]
  "update:weekOffset": [value: number]
  "update:showCalendarEvents": [value: boolean]
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  toggleShowEventOptions: []
  addAvailabilityAsGuest: []
  addAvailability: []
  mouseOverRespondent: [e: MouseEvent, userId: string]
  mouseLeaveRespondent: []
  clickRespondent: [e: MouseEvent, userId: string]
  editGuestAvailability: [userId: string]
  refreshEvent: []
  saveTempTimes: []
}>()
</script>
