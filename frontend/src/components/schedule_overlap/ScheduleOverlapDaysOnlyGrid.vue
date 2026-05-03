<template>
  <div class="tw-grow">
    <div class="tw-flex tw-items-center tw-justify-between">
      <v-btn
        :class="hasPrevPage ? 'tw-visible' : 'tw-invisible'"
        class="tw-border-gray"
        outlined
        icon
        @click="$emit('prevPage')"
        ><v-icon>mdi-chevron-left</v-icon></v-btn
      >
      <div class="tw-text-lg tw-font-medium tw-capitalize sm:tw-text-xl">
        {{ curMonthText }}
      </div>
      <v-btn
        :class="hasNextPage ? 'tw-visible' : 'tw-invisible'"
        class="tw-border-gray"
        outlined
        icon
        @click="$emit('nextPage')"
        ><v-icon>mdi-chevron-right</v-icon></v-btn
      >
    </div>
    <div class="tw-flex tw-w-full">
      <div
        v-for="day in daysOfWeek"
        :key="day"
        class="tw-flex-1 tw-p-2 tw-text-center tw-text-base tw-capitalize tw-text-dark-gray"
      >
        {{ day }}
      </div>
    </div>
    <div class="tw-relative">
      <div
        id="drag-section"
        class="tw-grid tw-grid-cols-7"
        @mouseleave="$emit('resetCurTimeslot')"
      >
        <div
          v-for="(day, i) in monthDays"
          :key="day.time.epochMilliseconds"
          class="timeslot tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-sm sm:tw-text-base"
          :class="dayTimeslotClassStyle[i].class"
          :style="dayTimeslotClassStyle[i].style"
          v-on="dayTimeslotVon[i]"
        >
          {{ day.date }}
        </div>
      </div>
      <ZigZag
        v-if="hasPrevPage"
        left
        class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-3"
      />
      <ZigZag
        v-if="hasNextPage"
        right
        class="tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-3"
      />
    </div>

    <v-expand-transition>
      <div
        v-if="!isPhone && hintTextShown"
        :key="hintText"
        class="tw-sticky tw-bottom-4 tw-z-10 tw-flex"
      >
        <div
          class="tw-mt-2 tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-rounded-md tw-bg-off-white tw-p-2 tw-px-[7px] tw-text-sm tw-text-very-dark-gray"
        >
          <div class="tw-flex tw-items-center tw-gap-1">
            <v-icon small>mdi-information-outline</v-icon>
            {{ hintText }}
          </div>
          <v-icon small @click="$emit('closeHint')">mdi-close</v-icon>
        </div>
      </div>
    </v-expand-transition>

    <ToolRow
      v-if="!isPhone && !calendarOnly"
      :cur-timezone="curTimezone"
      :show-best-times="showBestTimes"
      :hide-if-needed="hideIfNeeded"
      :mobile-num-days="mobileNumDays"
      :time-type="timeType"
      :event="event"
      :state="state"
      :states="states"
      :timezone-reference-date="timezoneReferenceDate"
      :is-weekly="isWeekly"
      :calendar-permission-granted="calendarPermissionGranted"
      :week-offset="weekOffset"
      :num-responses="numResponses"
      :allow-schedule-event="allowScheduleEvent"
      :show-event-options="showEventOptions"
      @update:cur-timezone="$emit('update:curTimezone', $event)"
      @update:show-best-times="$emit('update:showBestTimes', $event)"
      @update:hide-if-needed="$emit('update:hideIfNeeded', $event)"
      @update:mobile-num-days="$emit('update:mobileNumDays', $event)"
      @update:time-type="$emit('update:timeType', $event)"
      @toggle-show-event-options="$emit('toggleShowEventOptions')"
      @update:week-offset="$emit('update:weekOffset', $event)"
      @schedule-event="$emit('scheduleEvent')"
      @cancel-schedule-event="$emit('cancelScheduleEvent')"
      @confirm-schedule-event="$emit('confirmScheduleEvent')"
    />
  </div>
</template>

<script setup lang="ts">
import type { Temporal } from "temporal-polyfill"
import type {
  EventLike,
  MonthDayItem,
  ScheduleOverlapState,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { ClassStyle } from "./scheduleOverlapRendering"
import ToolRow from "./ToolRow.vue"
import ZigZag from "./ZigZag.vue"

defineOptions({
  name: "ScheduleOverlapDaysOnlyGrid",
})

defineProps<{
  event: EventLike
  curMonthText: string
  hasPrevPage: boolean
  hasNextPage: boolean
  daysOfWeek: string[]
  monthDays: MonthDayItem[]
  dayTimeslotClassStyle: ClassStyle[]
  dayTimeslotVon: Record<string, () => void>[]
  isPhone: boolean
  hintTextShown: boolean
  hintText: string
  calendarOnly: boolean
  curTimezone: Timezone
  showBestTimes: boolean
  hideIfNeeded: boolean
  mobileNumDays: number
  timeType: string
  state: ScheduleOverlapState
  states: Record<string, ScheduleOverlapState>
  timezoneReferenceDate: Temporal.ZonedDateTime
  isWeekly: boolean
  calendarPermissionGranted: boolean
  weekOffset: number
  numResponses: number
  allowScheduleEvent: boolean
  showEventOptions: boolean
}>()

defineEmits<{
  prevPage: []
  nextPage: []
  resetCurTimeslot: []
  closeHint: []
  toggleShowEventOptions: []
  scheduleEvent: []
  cancelScheduleEvent: []
  confirmScheduleEvent: []
  "update:curTimezone": [timezone: Timezone]
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:mobileNumDays": [value: number]
  "update:timeType": [value: string]
  "update:weekOffset": [value: number]
}>()
</script>
