<template>
  <div
      :class="timedGrid.calendarOnly ? 'tw-w-12' : ''"
      class="tw-w-8 tw-flex-none sm:tw-w-12"
    >
      <div
        :class="timedGrid.calendarOnly ? 'tw-invisible' : 'tw-visible'"
        class="tw-sticky tw-top-14 tw-z-10 -tw-ml-3 tw-mb-3 tw-h-11 tw-bg-white sm:tw-top-16 sm:tw-ml-0"
      >
        <div
          :class="timedGrid.hasPrevPage ? 'tw-visible' : 'tw-invisible'"
          class="tw-sticky tw-top-14 tw-ml-0.5 tw-self-start tw-pt-1.5 sm:tw-top-16 sm:-tw-ml-2"
        >
          <v-btn
            class="tw-border-gray"
            outlined
            icon
            @click="timedGrid.actions.prevPage"
            ><v-icon>mdi-chevron-left</v-icon></v-btn
          >
        </div>
      </div>

      <div :class="timedGrid.calendarOnly ? '' : '-tw-ml-3'" class="-tw-mt-[8px] sm:tw-ml-0">
        <div
          v-for="(time, i) in timedGrid.splitTimes[0]"
          :id="time.id"
          :key="i"
          class="tw-pr-1 tw-text-right tw-text-xs tw-font-light tw-uppercase sm:tw-pr-2"
          :style="{ height: `${timedGrid.timeslotHeight}px` }"
        >
          {{ time.text }}
        </div>
      </div>

      <template v-if="timedGrid.splitTimes[1].length > 0">
        <div
          :style="{
            height: `${SPLIT_GAP_HEIGHT}px`,
          }"
        ></div>
        <div
          v-if="timedGrid.splitTimes[1].length > 0"
          :class="timedGrid.calendarOnly ? '' : '-tw-ml-3'"
          class="sm:tw-ml-0"
        >
          <div
            v-for="(time, i) in timedGrid.splitTimes[1]"
            :id="time.id"
            :key="i"
            class="tw-pr-1 tw-text-right tw-text-xs tw-font-light tw-uppercase sm:tw-pr-2"
            :style="{ height: `${timedGrid.timeslotHeight}px` }"
          >
            {{ time.text }}
          </div>
        </div>
      </template>
  </div>

  <div class="tw-grow">
      <div
        class="tw-relative tw-flex tw-flex-col"
        @scroll="timedGrid.actions.calendarScroll"
      >
        <div
          :class="timedGrid.sampleCalendarEventsByDay ? undefined : 'tw-sticky tw-top-14'"
          class="tw-z-10 tw-flex tw-h-14 tw-items-center tw-bg-white sm:tw-top-16"
        >
          <template v-for="(day, i) in timedGrid.days" :key="i">
            <div
              v-if="!day.isConsecutive"
              :key="`${i}-gap`"
              :style="{ width: `${SPLIT_GAP_WIDTH}px` }"
            ></div>
            <div class="tw-flex-1 tw-bg-white">
              <div class="tw-text-center">
                <div
                  v-if="timedGrid.isSpecificDates || timedGrid.isGroup"
                  class="tw-text-[12px] tw-font-light tw-capitalize tw-text-very-dark-gray sm:tw-text-xs"
                >
                  {{ day.dateString }}
                </div>
                <div class="tw-text-base tw-capitalize sm:tw-text-lg">
                  {{ day.dayText }}
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="tw-flex tw-flex-col">
          <div class="tw-flex-1">
            <div
              id="drag-section"
              data-long-press-delay="500"
              class="tw-relative tw-flex"
              @mouseleave="timedGrid.actions.resetCurTimeslot()"
            >
              <div
                v-if="timedGrid.showLoader"
                class="tw-absolute tw-z-10 tw-grid tw-h-full tw-w-full tw-place-content-center"
              >
                <v-progress-circular class="tw-text-green" indeterminate />
              </div>

              <template v-for="(day, d) in timedGrid.days" :key="d">
                <div
                  v-if="!day.isConsecutive"
                  :key="`${d}-gap`"
                  :style="{ width: `${SPLIT_GAP_WIDTH}px` }"
                ></div>
                <div
                  class="tw-relative tw-flex-1"
                  :class="
                    ((timedGrid.isGroup && timedGrid.loadingCalendarEvents) || timedGrid.loadingResponsesLoading) &&
                    'tw-opacity-50'
                  "
                >
                  <div v-for="(_, t) in timedGrid.splitTimes[0]" :key="`${d}-${t}-0`" class="tw-w-full">
                    <div
                      class="timeslot"
                      :class="timedGrid.timeslotClassStyle[d * timedGrid.times.length + t]?.class"
                      :style="timedGrid.timeslotClassStyle[d * timedGrid.times.length + t]?.style"
                      v-on="timedGrid.timeslotVon[d * timedGrid.times.length + t]"
                    ></div>
                  </div>

                  <template v-if="timedGrid.splitTimes[1].length > 0">
                    <div
                      :style="{
                        height: `${SPLIT_GAP_HEIGHT}px`,
                      }"
                    ></div>
                    <div v-for="(_, t) in timedGrid.splitTimes[1]" :key="`${d}-${t}-1`" class="tw-w-full">
                      <div
                        class="timeslot"
                        :class="
                          timedGrid.timeslotClassStyle[d * timedGrid.times.length + t + timedGrid.splitTimes[0].length]
                            ?.class
                        "
                        :style="
                          timedGrid.timeslotClassStyle[d * timedGrid.times.length + t + timedGrid.splitTimes[0].length]
                            ?.style
                        "
                        v-on="
                          timedGrid.timeslotVon[d * timedGrid.times.length + t + timedGrid.splitTimes[0].length]
                        "
                      ></div>
                    </div>
                  </template>

                  <template
                    v-if="
                      !timedGrid.loadingCalendarEvents &&
                      (timedGrid.editing || timedGrid.alwaysShowCalendarEvents || timedGrid.showCalendarEvents)
                    "
                  >
                    <template
                      v-for="calendarEvent in timedGrid.calendarEventsByDay[d + timedGrid.page * timedGrid.maxDaysPerPage]"
                      :key="String(calendarEvent.id)"
                    >
                      <CalendarEventBlock
                        :block-style="timedGrid.getRenderedTimeBlockStyle(calendarEvent)"
                        :calendar-event="calendarEvent"
                        :is-group="timedGrid.isGroup"
                        :is-editing-availability="timedGrid.state === timedGrid.states.EDIT_AVAILABILITY"
                        :no-event-names="timedGrid.noEventNames"
                        :transition-name="timedGrid.isGroup ? '' : 'fade-transition'"
                      />
                    </template>
                  </template>

                  <div v-if="timedGrid.state === timedGrid.states.SCHEDULE_EVENT">
                    <div
                      v-if="
                        (timedGrid.dragStart && timedGrid.dragStart.col === d) ||
                        (!timedGrid.dragStart && timedGrid.curScheduledEvent && timedGrid.curScheduledEvent.col === d)
                      "
                      class="tw-absolute tw-w-full tw-select-none tw-p-px"
                      :style="timedGrid.scheduledEventStyle"
                      style="pointer-events: none"
                    >
                      <div
                        class="tw-h-full tw-w-full tw-overflow-hidden tw-text-ellipsis tw-rounded tw-border tw-border-solid tw-border-blue tw-bg-blue tw-p-px tw-text-xs"
                      >
                        <div class="tw-font-medium tw-text-white">
                          {{ timedGrid.event.name }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="timedGrid.state === timedGrid.states.EDIT_SIGN_UP_BLOCKS">
                    <div
                      v-if="timedGrid.dragStart && timedGrid.dragStart.col === d"
                      class="tw-absolute tw-w-full tw-select-none tw-p-px"
                      :style="timedGrid.signUpBlockBeingDraggedStyle"
                      style="pointer-events: none"
                    >
                      <SignUpCalendarBlock :title="timedGrid.newSignUpBlockName" title-only unsaved />
                    </div>
                  </div>

                  <div v-if="timedGrid.isSignUp">
                    <div v-for="block in timedGrid.signUpBlocksByDay[d + timedGrid.page * timedGrid.maxDaysPerPage]" :key="block._id">
                      <div
                        class="tw-absolute tw-w-full tw-select-none tw-p-px"
                        :style="timedGrid.getSignUpBlockStyle(block)"
                        @click="timedGrid.actions.signUpForBlock(block)"
                      >
                        <SignUpCalendarBlock :sign-up-block="block" />
                      </div>
                    </div>

                    <div
                      v-for="block in timedGrid.signUpBlocksToAddByDay[d + timedGrid.page * timedGrid.maxDaysPerPage]"
                      :key="block._id"
                    >
                      <div
                        class="tw-absolute tw-w-full tw-select-none tw-p-px"
                        :style="timedGrid.getSignUpBlockStyle(block)"
                      >
                        <SignUpCalendarBlock :title="block.name" title-only unsaved />
                      </div>
                    </div>
                  </div>

                  <div v-if="timedGrid.overlayAvailability">
                    <div
                      v-for="(timeBlock, tb) in timedGrid.overlaidAvailability[d]"
                      :key="tb"
                      class="tw-absolute tw-w-full tw-select-none tw-p-px"
                      :style="timedGrid.getRenderedTimeBlockStyle(timeBlock)"
                      style="pointer-events: none"
                    >
                      <div
                        class="tw-h-full tw-w-full tw-border-2"
                        :class="
                          timeBlock.type === 'available'
                            ? 'overlay-avail-shadow-green tw-border-[#00994CB3] tw-bg-[#00994C66]'
                            : 'overlay-avail-shadow-yellow tw-border-[#997700CC] tw-bg-[#FFE8B8B3]'
                        "
                      ></div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <ZigZag
          v-if="timedGrid.hasPrevPage"
          left
          class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-3"
        />
        <ZigZag
          v-if="timedGrid.hasNextPage"
          right
          class="tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-3"
        />
      </div>

      <v-expand-transition>
        <div
          v-if="!timedGrid.isPhone && timedGrid.hintTextShown"
          :key="timedGrid.hintText"
          class="tw-sticky tw-bottom-4 tw-z-10 tw-flex"
        >
          <div
            class="tw-mt-2 tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-rounded-md tw-bg-off-white tw-p-2 tw-px-[7px] tw-text-sm tw-text-very-dark-gray"
          >
          <div class="tw-flex tw-items-center tw-gap-1">
            <v-icon small>mdi-information-outline</v-icon>
            {{ timedGrid.hintText }}
          </div>
            <v-icon small @click="timedGrid.actions.closeHint()">mdi-close</v-icon>
          </div>
        </div>
      </v-expand-transition>

      <v-expand-transition>
        <div
          v-if="
            timedGrid.state !== timedGrid.states.EDIT_AVAILABILITY &&
            timedGrid.max !== timedGrid.respondentsLength &&
            Object.keys(timedGrid.fetchedResponses).length !== 0 &&
            !timedGrid.loadingResponsesLoading
          "
        >
          <div class="tw-mt-2 tw-text-sm tw-text-dark-gray">
            Note: There's no time when all
            {{ timedGrid.respondentsLength }} respondents are available.
          </div>
        </div>
      </v-expand-transition>

      <ToolRow
        v-if="!timedGrid.isPhone && !timedGrid.calendarOnly"
        :tool-row="timedGrid.toolRow"
      />
  </div>

  <div
    v-if="!timedGrid.calendarOnly"
    :class="timedGrid.calendarOnly ? 'tw-invisible' : 'tw-visible'"
    class="tw-sticky tw-top-14 tw-z-10 tw-mb-4 tw-h-11 tw-bg-white sm:tw-top-16"
  >
    <div
      :class="timedGrid.hasNextPage ? 'tw-visible' : 'tw-invisible'"
      class="tw-sticky tw-top-14 -tw-mr-2 tw-self-start tw-pt-1.5 sm:tw-top-16"
    >
      <v-btn class="tw-border-gray" outlined icon @click="timedGrid.actions.nextPage"
        ><v-icon>mdi-chevron-right</v-icon></v-btn
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  SPLIT_GAP_HEIGHT,
  SPLIT_GAP_WIDTH
} from "@/composables/schedule_overlap/types"
import type { ScheduleOverlapTimeGridViewModel } from "./scheduleOverlapViewModels"
import CalendarEventBlock from "./CalendarEventBlock.vue"
import SignUpCalendarBlock from "@/components/sign_up_form/SignUpCalendarBlock.vue"
import ToolRow from "./ToolRow.vue"
import ZigZag from "./ZigZag.vue"

defineOptions({
  name: "ScheduleOverlapTimeGrid",
})

defineProps<{
  timedGrid: ScheduleOverlapTimeGridViewModel
}>()
</script>
