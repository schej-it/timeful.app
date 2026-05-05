<template>
  <div class="tw-fixed tw-z-20 tw-w-full" :style="{ bottom: overlay.bottomOffset }">
    <v-expand-transition>
      <template v-if="overlay.hintTextShown">
        <div :key="overlay.hintText">
          <div
            class="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-bg-light-gray tw-px-2 tw-py-2 tw-text-sm tw-text-very-dark-gray"
          >
            <div :class="`tw-flex tw-gap-${overlay.hintText.length > 60 ? 2 : 1}`">
              <v-icon small>mdi-information-outline</v-icon>
              <div>
                {{ overlay.hintText }}
              </div>
            </div>
            <v-icon small @click="emit('closeHint')">mdi-close</v-icon>
          </div>
        </div>
      </template>
    </v-expand-transition>

    <v-expand-transition>
        <div v-if="!overlay.isGroup && overlay.editing && !overlay.isSignUp">
          <div class="tw-bg-white tw-p-4">
            <AvailabilityTypeToggle
            :model-value="overlay.availabilityType"
            class="tw-w-full"
            @update:model-value="emit('update:availabilityType', $event as AvailabilityType)"
          />
        </div>
      </div>
    </v-expand-transition>

    <v-expand-transition>
      <div
        v-if="
          overlay.isWeekly &&
          overlay.editing &&
          overlay.calendarPermissionGranted
        "
      >
        <div class="tw-h-16 tw-text-sm">
          <GCalWeekSelector
            :week-offset="overlay.weekOffset"
            :event="overlay.event"
            :start-on-monday="overlay.event.startOnMonday"
            @update:week-offset="emit('update:weekOffset', $event)"
          />
        </div>
      </div>
    </v-expand-transition>

    <v-expand-transition>
      <div v-if="overlay.showStickyRespondents">
        <div class="tw-bg-white tw-p-4">
          <ScheduleOverlapRespondentsPanel
            :max-height="100"
            :panel="overlay.respondentsPanel"
            v-bind="respondentsPanelListeners"
          />
        </div>
      </div>
    </v-expand-transition>

    <v-expand-transition>
      <div
        v-if="overlay.state === states.SET_SPECIFIC_TIMES"
        class="-tw-mb-16 tw-bg-white tw-p-4"
      >
        <SpecificTimesInstructions
          :num-temp-times="overlay.numTempTimes"
          @save-temp-times="emit('saveTempTimes')"
        />
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import type { AvailabilityType } from "@/constants"
import { states } from "@/composables/schedule_overlap/types"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import ScheduleOverlapRespondentsPanel from "./ScheduleOverlapRespondentsPanel.vue"
import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"
import type { ScheduleOverlapMobileOverlayViewModel } from "./scheduleOverlapViewModels"

defineProps<{
  overlay: ScheduleOverlapMobileOverlayViewModel
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

const respondentsPanelListeners = {
  "onUpdate:showCalendarEvents": (value: boolean) => {
    emit("update:showCalendarEvents", value)
  },
  "onUpdate:showBestTimes": (value: boolean) => {
    emit("update:showBestTimes", value)
  },
  "onUpdate:hideIfNeeded": (value: boolean) => {
    emit("update:hideIfNeeded", value)
  },
  onToggleShowEventOptions: () => {
    emit("toggleShowEventOptions")
  },
  onAddAvailability: () => {
    emit("addAvailability")
  },
  onAddAvailabilityAsGuest: () => {
    emit("addAvailabilityAsGuest")
  },
  onMouseOverRespondent: (e: MouseEvent, userId: string) => {
    emit("mouseOverRespondent", e, userId)
  },
  onMouseLeaveRespondent: () => {
    emit("mouseLeaveRespondent")
  },
  onClickRespondent: (e: MouseEvent, userId: string) => {
    emit("clickRespondent", e, userId)
  },
  onEditGuestAvailability: (userId: string) => {
    emit("editGuestAvailability", userId)
  },
  onRefreshEvent: () => {
    emit("refreshEvent")
  },
} as const
</script>
