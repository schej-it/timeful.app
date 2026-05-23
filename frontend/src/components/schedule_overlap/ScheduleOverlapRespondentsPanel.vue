<template>
  <div ref="panelEl">
    <RespondentsList
      :show-calendar-events="panel.showCalendarEvents"
      :show-best-times="panel.showBestTimes"
      :hide-if-needed="panel.hideIfNeeded"
      :max-height="maxHeight"
      :event="panel.event"
      :event-id="panel.eventId"
      :days="panel.days"
      :times="panel.times"
      :cur-date="panel.curDate"
      :cur-respondent="panel.curRespondent"
      :cur-respondents="panel.curRespondents"
      :cur-timeslot="panel.curTimeslot"
      :cur-timeslot-availability="panel.curTimeslotAvailability"
      :respondents="panel.respondents"
      :parsed-responses="panel.parsedResponses"
      :is-owner="panel.isOwner"
      :is-group="panel.isGroup"
      :attendees="panel.attendees"
      :responses-formatted="panel.responsesFormatted"
      :timezone="panel.timezone"
      :show-event-options="panel.showEventOptions"
      :guest-added-availability="panel.guestAddedAvailability"
      :adding-availability-as-guest="panel.addingAvailabilityAsGuest"
      @update:show-calendar-events="emit('update:showCalendarEvents', $event)"
      @update:show-best-times="emit('update:showBestTimes', $event)"
      @update:hide-if-needed="emit('update:hideIfNeeded', $event)"
      @update:start-calendar-on-monday="emit('update:startCalendarOnMonday', $event)"
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
</template>

<script setup lang="ts">
import { ref } from "vue"
import RespondentsList from "./RespondentsList.vue"
import type { ScheduleOverlapRespondentsPanelViewModel } from "./scheduleOverlapViewModels"

defineProps<{
  maxHeight?: number
  panel: ScheduleOverlapRespondentsPanelViewModel
}>()

const emit = defineEmits<{
  "update:showCalendarEvents": [value: boolean]
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:startCalendarOnMonday": [value: boolean]
  toggleShowEventOptions: []
  addAvailabilityAsGuest: []
  addAvailability: []
  mouseOverRespondent: [e: MouseEvent, userId: string]
  mouseLeaveRespondent: []
  clickRespondent: [e: MouseEvent, userId: string]
  editGuestAvailability: [userId: string]
  refreshEvent: []
}>()

const panelEl = ref<HTMLElement | null>(null)

defineExpose({
  panelEl,
})
</script>
