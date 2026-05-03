<template>
  <RespondentsList
    :show-calendar-events="showCalendarEvents"
    :show-best-times="showBestTimes"
    :hide-if-needed="hideIfNeeded"
    :max-height="maxHeight"
    :event="event"
    :event-id="eventId"
    :days="days"
    :times="times"
    :cur-date="curDate"
    :cur-respondent="curRespondent"
    :cur-respondents="curRespondents"
    :cur-timeslot="curTimeslot"
    :cur-timeslot-availability="curTimeslotAvailability"
    :respondents="respondents"
    :parsed-responses="parsedResponses"
    :is-owner="isOwner"
    :is-group="isGroup"
    :attendees="attendees"
    :responses-formatted="responsesFormatted"
    :timezone="timezone"
    :show-event-options="showEventOptions"
    :guest-added-availability="guestAddedAvailability"
    :adding-availability-as-guest="addingAvailabilityAsGuest"
    @update:show-calendar-events="$emit('update:showCalendarEvents', $event)"
    @update:show-best-times="$emit('update:showBestTimes', $event)"
    @update:hide-if-needed="$emit('update:hideIfNeeded', $event)"
    @toggle-show-event-options="$emit('toggleShowEventOptions')"
    @add-availability="$emit('addAvailability')"
    @add-availability-as-guest="$emit('addAvailabilityAsGuest')"
    @mouse-over-respondent="(e, userId) => $emit('mouseOverRespondent', e, userId)"
    @mouse-leave-respondent="$emit('mouseLeaveRespondent')"
    @click-respondent="(e, userId) => $emit('clickRespondent', e, userId)"
    @edit-guest-availability="$emit('editGuestAvailability', $event)"
    @refresh-event="$emit('refreshEvent')"
  />
</template>

<script setup lang="ts">
import type { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import type { ZdtMap } from "@/utils"
import RespondentsList from "./RespondentsList.vue"
import type {
  EventLike,
  ParsedResponses,
  Timezone,
} from "@/composables/schedule_overlap/types"

defineProps<{
  maxHeight?: number
  event: EventLike
  eventId: string
  days: unknown[]
  times: unknown[]
  curDate?: Temporal.ZonedDateTime
  curRespondent: string
  curRespondents: string[]
  curTimeslot: { dayIndex: number; timeIndex: number }
  curTimeslotAvailability: Record<string, boolean>
  respondents: User[]
  parsedResponses: ParsedResponses
  isOwner: boolean
  isGroup: boolean
  attendees?: { email: string; declined?: boolean }[]
  responsesFormatted: ZdtMap<Set<string>>
  timezone: Timezone
  showCalendarEvents: boolean
  showBestTimes: boolean
  hideIfNeeded: boolean
  showEventOptions: boolean
  guestAddedAvailability: boolean
  addingAvailabilityAsGuest: boolean
}>()

defineEmits<{
  "update:showBestTimes": [value: boolean]
  "update:showCalendarEvents": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  toggleShowEventOptions: []
  addAvailabilityAsGuest: []
  addAvailability: []
  mouseOverRespondent: [e: MouseEvent, userId: string]
  mouseLeaveRespondent: []
  clickRespondent: [e: MouseEvent, userId: string]
  editGuestAvailability: [userId: string]
  refreshEvent: []
}>()
</script>
