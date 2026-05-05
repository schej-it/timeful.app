<template>
  <div class="tw-grow">
    <div class="tw-flex tw-items-center tw-justify-between">
      <v-btn
        :class="daysOnlyGrid.hasPrevPage ? 'tw-visible' : 'tw-invisible'"
        class="tw-border-gray"
        outlined
        icon
        @click="daysOnlyGrid.actions.prevPage"
        ><v-icon>mdi-chevron-left</v-icon></v-btn
      >
      <div class="tw-text-lg tw-font-medium tw-capitalize sm:tw-text-xl">
        {{ daysOnlyGrid.curMonthText }}
      </div>
      <v-btn
        :class="daysOnlyGrid.hasNextPage ? 'tw-visible' : 'tw-invisible'"
        class="tw-border-gray"
        outlined
        icon
        @click="daysOnlyGrid.actions.nextPage"
        ><v-icon>mdi-chevron-right</v-icon></v-btn
      >
    </div>
    <div class="tw-flex tw-w-full">
      <div
        v-for="day in daysOnlyGrid.daysOfWeek"
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
        @mouseleave="daysOnlyGrid.actions.resetCurTimeslot()"
      >
        <div
          v-for="(day, i) in daysOnlyGrid.monthDays"
          :key="day.time.epochMilliseconds"
          class="timeslot tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-sm sm:tw-text-base"
          :class="daysOnlyGrid.dayTimeslotClassStyle[i].class"
          :style="daysOnlyGrid.dayTimeslotClassStyle[i].style"
          v-on="daysOnlyGrid.dayTimeslotVon[i]"
        >
          {{ day.date }}
        </div>
      </div>
      <ZigZag
        v-if="daysOnlyGrid.hasPrevPage"
        left
        class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-3"
      />
      <ZigZag
        v-if="daysOnlyGrid.hasNextPage"
        right
        class="tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-3"
      />
    </div>

    <v-expand-transition>
      <div
        v-if="!daysOnlyGrid.isPhone && daysOnlyGrid.hintTextShown"
        :key="daysOnlyGrid.hintText"
        class="tw-sticky tw-bottom-4 tw-z-10 tw-flex"
      >
        <div
          class="tw-mt-2 tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-rounded-md tw-bg-off-white tw-p-2 tw-px-[7px] tw-text-sm tw-text-very-dark-gray"
        >
          <div class="tw-flex tw-items-center tw-gap-1">
            <v-icon small>mdi-information-outline</v-icon>
            {{ daysOnlyGrid.hintText }}
          </div>
          <v-icon small @click="daysOnlyGrid.actions.closeHint()">mdi-close</v-icon>
        </div>
      </div>
    </v-expand-transition>

    <ToolRow
      v-if="!daysOnlyGrid.isPhone && !daysOnlyGrid.calendarOnly"
      :tool-row="daysOnlyGrid.toolRow"
    />
  </div>
</template>

<script setup lang="ts">
import type { ScheduleOverlapDaysOnlyGridViewModel } from "./scheduleOverlapViewModels"
import ToolRow from "./ToolRow.vue"
import ZigZag from "./ZigZag.vue"

defineOptions({
  name: "ScheduleOverlapDaysOnlyGrid",
})

defineProps<{
  daysOnlyGrid: ScheduleOverlapDaysOnlyGridViewModel
}>()
</script>
