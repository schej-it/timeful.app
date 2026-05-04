<template>
  <div
      :class="calendarOnly ? 'tw-w-12' : ''"
      class="tw-w-8 tw-flex-none sm:tw-w-12"
    >
      <div
        :class="calendarOnly ? 'tw-invisible' : 'tw-visible'"
        class="tw-sticky tw-top-14 tw-z-10 -tw-ml-3 tw-mb-3 tw-h-11 tw-bg-white sm:tw-top-16 sm:tw-ml-0"
      >
        <div
          :class="hasPrevPage ? 'tw-visible' : 'tw-invisible'"
          class="tw-sticky tw-top-14 tw-ml-0.5 tw-self-start tw-pt-1.5 sm:tw-top-16 sm:-tw-ml-2"
        >
          <v-btn
            class="tw-border-gray"
            outlined
            icon
            @click="$emit('prevPage')"
            ><v-icon>mdi-chevron-left</v-icon></v-btn
          >
        </div>
      </div>

      <div :class="calendarOnly ? '' : '-tw-ml-3'" class="-tw-mt-[8px] sm:tw-ml-0">
        <div
          v-for="(time, i) in splitTimes[0]"
          :id="time.id"
          :key="i"
          class="tw-pr-1 tw-text-right tw-text-xs tw-font-light tw-uppercase sm:tw-pr-2"
          :style="{ height: `${timeslotHeight}px` }"
        >
          {{ time.text }}
        </div>
      </div>

      <template v-if="splitTimes[1].length > 0">
        <div
          :style="{
            height: `${SPLIT_GAP_HEIGHT}px`,
          }"
        ></div>
        <div
          v-if="splitTimes[1].length > 0"
          :class="calendarOnly ? '' : '-tw-ml-3'"
          class="sm:tw-ml-0"
        >
          <div
            v-for="(time, i) in splitTimes[1]"
            :id="time.id"
            :key="i"
            class="tw-pr-1 tw-text-right tw-text-xs tw-font-light tw-uppercase sm:tw-pr-2"
            :style="{ height: `${timeslotHeight}px` }"
          >
            {{ time.text }}
          </div>
        </div>
      </template>
  </div>

  <div class="tw-grow">
      <div
        class="tw-relative tw-flex tw-flex-col"
        @scroll="$emit('calendarScroll', $event)"
      >
        <div
          :class="sampleCalendarEventsByDay ? undefined : 'tw-sticky tw-top-14'"
          class="tw-z-10 tw-flex tw-h-14 tw-items-center tw-bg-white sm:tw-top-16"
        >
          <template v-for="(day, i) in days" :key="i">
            <div
              v-if="!day.isConsecutive"
              :key="`${i}-gap`"
              :style="{ width: `${SPLIT_GAP_WIDTH}px` }"
            ></div>
            <div class="tw-flex-1 tw-bg-white">
              <div class="tw-text-center">
                <div
                  v-if="isSpecificDates || isGroup"
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
              @mouseleave="$emit('resetCurTimeslot')"
            >
              <div
                v-if="showLoader"
                class="tw-absolute tw-z-10 tw-grid tw-h-full tw-w-full tw-place-content-center"
              >
                <v-progress-circular class="tw-text-green" indeterminate />
              </div>

              <template v-for="(day, d) in days" :key="d">
                <div
                  v-if="!day.isConsecutive"
                  :key="`${d}-gap`"
                  :style="{ width: `${SPLIT_GAP_WIDTH}px` }"
                ></div>
                <div
                  class="tw-relative tw-flex-1"
                  :class="
                    ((isGroup && loadingCalendarEvents) || loadingResponsesLoading) &&
                    'tw-opacity-50'
                  "
                >
                  <div v-for="(_, t) in splitTimes[0]" :key="`${d}-${t}-0`" class="tw-w-full">
                    <div
                      class="timeslot"
                      :class="timeslotClassStyle[d * times.length + t]?.class"
                      :style="timeslotClassStyle[d * times.length + t]?.style"
                      v-on="timeslotVon[d * times.length + t]"
                    ></div>
                  </div>

                  <template v-if="splitTimes[1].length > 0">
                    <div
                      :style="{
                        height: `${SPLIT_GAP_HEIGHT}px`,
                      }"
                    ></div>
                    <div v-for="(_, t) in splitTimes[1]" :key="`${d}-${t}-1`" class="tw-w-full">
                      <div
                        class="timeslot"
                        :class="
                          timeslotClassStyle[d * times.length + t + splitTimes[0].length]
                            ?.class
                        "
                        :style="
                          timeslotClassStyle[d * times.length + t + splitTimes[0].length]
                            ?.style
                        "
                        v-on="
                          timeslotVon[d * times.length + t + splitTimes[0].length]
                        "
                      ></div>
                    </div>
                  </template>

                  <template
                    v-if="
                      !loadingCalendarEvents &&
                      (editing || alwaysShowCalendarEvents || showCalendarEvents)
                    "
                  >
                    <template
                      v-for="calendarEvent in calendarEventsByDay[d + page * maxDaysPerPage]"
                      :key="String(calendarEvent.id)"
                    >
                      <CalendarEventBlock
                        :block-style="getRenderedTimeBlockStyle(calendarEvent)"
                        :calendar-event="calendarEvent"
                        :is-group="isGroup"
                        :is-editing-availability="state === states.EDIT_AVAILABILITY"
                        :no-event-names="noEventNames"
                        :transition-name="isGroup ? '' : 'fade-transition'"
                      />
                    </template>
                  </template>

                  <div v-if="state === states.SCHEDULE_EVENT">
                    <div
                      v-if="
                        (dragStart && dragStart.col === d) ||
                        (!dragStart && curScheduledEvent && curScheduledEvent.col === d)
                      "
                      class="tw-absolute tw-w-full tw-select-none tw-p-px"
                      :style="scheduledEventStyle"
                      style="pointer-events: none"
                    >
                      <div
                        class="tw-h-full tw-w-full tw-overflow-hidden tw-text-ellipsis tw-rounded tw-border tw-border-solid tw-border-blue tw-bg-blue tw-p-px tw-text-xs"
                      >
                        <div class="tw-font-medium tw-text-white">
                          {{ event.name }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="state === states.EDIT_SIGN_UP_BLOCKS">
                    <div
                      v-if="dragStart && dragStart.col === d"
                      class="tw-absolute tw-w-full tw-select-none tw-p-px"
                      :style="signUpBlockBeingDraggedStyle"
                      style="pointer-events: none"
                    >
                      <SignUpCalendarBlock :title="newSignUpBlockName" title-only unsaved />
                    </div>
                  </div>

                  <div v-if="isSignUp">
                    <div v-for="block in signUpBlocksByDay[d + page * maxDaysPerPage]" :key="block._id">
                      <div
                        class="tw-absolute tw-w-full tw-select-none tw-p-px"
                        :style="getSignUpBlockStyle(block)"
                        @click="$emit('signUpForBlock', block)"
                      >
                        <SignUpCalendarBlock :sign-up-block="block" />
                      </div>
                    </div>

                    <div
                      v-for="block in signUpBlocksToAddByDay[d + page * maxDaysPerPage]"
                      :key="block._id"
                    >
                      <div
                        class="tw-absolute tw-w-full tw-select-none tw-p-px"
                        :style="getSignUpBlockStyle(block)"
                      >
                        <SignUpCalendarBlock :title="block.name" title-only unsaved />
                      </div>
                    </div>
                  </div>

                  <div v-if="overlayAvailability">
                    <div
                      v-for="(timeBlock, tb) in overlaidAvailability[d]"
                      :key="tb"
                      class="tw-absolute tw-w-full tw-select-none tw-p-px"
                      :style="getRenderedTimeBlockStyle(timeBlock)"
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

      <v-expand-transition>
        <div
          v-if="
            state !== states.EDIT_AVAILABILITY &&
            max !== respondentsLength &&
            Object.keys(fetchedResponses).length !== 0 &&
            !loadingResponsesLoading
          "
        >
          <div class="tw-mt-2 tw-text-sm tw-text-dark-gray">
            Note: There's no time when all
            {{ respondentsLength }} respondents are available.
          </div>
        </div>
      </v-expand-transition>

      <ToolRow
        v-if="!isPhone && !calendarOnly"
        :tool-row="toolRow"
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

  <div
    v-if="!calendarOnly"
    :class="calendarOnly ? 'tw-invisible' : 'tw-visible'"
    class="tw-sticky tw-top-14 tw-z-10 tw-mb-4 tw-h-11 tw-bg-white sm:tw-top-16"
  >
    <div
      :class="hasNextPage ? 'tw-visible' : 'tw-invisible'"
      class="tw-sticky tw-top-14 -tw-mr-2 tw-self-start tw-pt-1.5 sm:tw-top-16"
    >
      <v-btn class="tw-border-gray" outlined icon @click="$emit('nextPage')"
        ><v-icon>mdi-chevron-right</v-icon></v-btn
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  SPLIT_GAP_HEIGHT,
  SPLIT_GAP_WIDTH,
} from "@/composables/schedule_overlap/types"
import type {
  CalendarEventLite,
  CalendarEventsByDay,
  DayItem,
  EventLike,
  FetchedResponse,
  RowCol,
  ScheduleOverlapState,
  ScheduledEvent,
  SignUpBlockLite,
  TimeItem,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type {
  ClassStyle,
  OverlaidAvailabilityBlock,
} from "./scheduleOverlapRendering"
import type { ScheduleOverlapToolRowViewModel } from "./scheduleOverlapViewModels"
import CalendarEventBlock from "./CalendarEventBlock.vue"
import SignUpCalendarBlock from "@/components/sign_up_form/SignUpCalendarBlock.vue"
import ToolRow from "./ToolRow.vue"
import ZigZag from "./ZigZag.vue"

defineOptions({
  name: "ScheduleOverlapTimeGrid",
})

defineProps<{
  event: EventLike
  calendarOnly: boolean
  hasPrevPage: boolean
  hasNextPage: boolean
  splitTimes: TimeItem[][]
  times: TimeItem[]
  timeslotHeight: number
  days: DayItem[]
  isSpecificDates: boolean
  isGroup: boolean
  sampleCalendarEventsByDay: unknown
  showLoader: boolean
  loadingCalendarEvents: boolean
  editing: boolean
  alwaysShowCalendarEvents: boolean
  showCalendarEvents: boolean
  calendarEventsByDay: CalendarEventsByDay
  state: ScheduleOverlapState
  states: Record<string, ScheduleOverlapState>
  page: number
  maxDaysPerPage: number
  dragStart: RowCol | null
  curScheduledEvent: ScheduledEvent | null
  scheduledEventStyle: Record<string, string>
  signUpBlockBeingDraggedStyle: Record<string, string>
  newSignUpBlockName: string
  isSignUp: boolean
  signUpBlocksByDay: SignUpBlockLite[][]
  signUpBlocksToAddByDay: SignUpBlockLite[][]
  overlayAvailability: boolean
  overlaidAvailability: OverlaidAvailabilityBlock[][]
  timeslotClassStyle: ClassStyle[]
  timeslotVon: Record<string, () => void>[]
  noEventNames: boolean
  hintTextShown: boolean
  hintText: string
  isPhone: boolean
  max: number
  respondentsLength: number
  fetchedResponses: Record<string, FetchedResponse | undefined>
  loadingResponsesLoading: boolean
  toolRow: ScheduleOverlapToolRowViewModel
  getRenderedTimeBlockStyle: (
    block: CalendarEventLite | OverlaidAvailabilityBlock
  ) => Record<string, string>
  getSignUpBlockStyle: (block: SignUpBlockLite) => Record<string, string>
}>()

defineEmits<{
  prevPage: []
  nextPage: []
  calendarScroll: [event: Event]
  resetCurTimeslot: []
  closeHint: []
  toggleShowEventOptions: []
  scheduleEvent: []
  cancelScheduleEvent: []
  confirmScheduleEvent: []
  signUpForBlock: [block: SignUpBlockLite]
  "update:curTimezone": [timezone: Timezone]
  "update:showBestTimes": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:mobileNumDays": [value: number]
  "update:timeType": [value: string]
  "update:weekOffset": [value: number]
}>()
</script>
