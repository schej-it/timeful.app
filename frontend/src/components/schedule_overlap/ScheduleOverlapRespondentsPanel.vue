<template>
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
  />
</template>

<script setup lang="ts">
import RespondentsList from "./RespondentsList.vue"
import type { ScheduleOverlapRespondentsPanelViewModel } from "./scheduleOverlapViewModels"

defineProps<{
  maxHeight?: number
  panel: ScheduleOverlapRespondentsPanelViewModel
}>()
</script>
