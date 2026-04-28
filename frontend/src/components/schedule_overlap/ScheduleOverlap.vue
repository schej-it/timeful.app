<template>
  <span>
    <Tooltip :content="tooltipContent">
      <div class="tw-select-none tw-py-4" style="-webkit-touch-callout: none">
        <div class="tw-flex tw-flex-col sm:tw-flex-row">
          <div
            class="tw-flex tw-grow tw-pl-4"
            :class="isSignUp ? '' : 'tw-pr-4'"
          >
            <template v-if="event.daysOnly">
              <div class="tw-grow">
                <div class="tw-flex tw-items-center tw-justify-between">
                  <v-btn
                    :class="hasPrevPage ? 'tw-visible' : 'tw-invisible'"
                    class="tw-border-gray"
                    outlined
                    icon
                    @click="prevPage"
                    ><v-icon>mdi-chevron-left</v-icon></v-btn
                  >
                  <div
                    class="tw-text-lg tw-font-medium tw-capitalize sm:tw-text-xl"
                  >
                    {{ curMonthText }}
                  </div>
                  <v-btn
                    :class="hasNextPage ? 'tw-visible' : 'tw-invisible'"
                    class="tw-border-gray"
                    outlined
                    icon
                    @click="nextPage"
                    ><v-icon>mdi-chevron-right</v-icon></v-btn
                  >
                </div>
                <!-- Header -->
                <div class="tw-flex tw-w-full">
                  <div
                    v-for="day in daysOfWeek"
                    :key="day"
                    class="tw-flex-1 tw-p-2 tw-text-center tw-text-base tw-capitalize tw-text-dark-gray"
                  >
                    {{ day }}
                  </div>
                </div>
                <!-- Days grid -->
                <div class="tw-relative">
                  <div
                    id="drag-section"
                    class="tw-grid tw-grid-cols-7"
                    @mouseleave="resetCurTimeslot"
                  >
                    <div
                      v-for="(day, i) in monthDays"
                      :key="day.time"
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
                      <v-icon small @click="closeHint">mdi-close</v-icon>
                    </div>
                  </div>
                </v-expand-transition>

                <ToolRow
                  v-if="!isPhone && !calendarOnly"
                  v-model:cur-timezone="curTimezone"
                  v-model:show-best-times="showBestTimes"
                  v-model:hide-if-needed="hideIfNeeded"
                  v-model:mobile-num-days="mobileNumDays"
                  v-model:time-type="timeType"
                  :event="event"
                  :state="state"
                  :states="states"
                  :timezone-reference-date="timezoneReferenceDate"
                  :is-weekly="isWeekly"
                  :calendar-permission-granted="calendarPermissionGranted"
                  :week-offset="weekOffset"
                  :num-responses="respondents.length"
                  :allow-schedule-event="allowScheduleEvent"
                  :show-event-options="showEventOptions"
                  @toggle-show-event-options="toggleShowEventOptions"
                  @update:week-offset="(val) => $emit('update:weekOffset', val)"
                  @schedule-event="scheduleEvent"
                  @cancel-schedule-event="cancelScheduleEvent"
                  @confirm-schedule-event="confirmScheduleEvent"
                />
              </div>
            </template>
            <template v-else>
              <!-- Times -->
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
                      @click="prevPage"
                      ><v-icon>mdi-chevron-left</v-icon></v-btn
                    >
                  </div>
                </div>

                <div
                  :class="calendarOnly ? '' : '-tw-ml-3'"
                  class="-tw-mt-[8px] sm:tw-ml-0"
                >
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

              <!-- Middle section -->
              <div class="tw-grow">
                <div
                  ref="calendar"
                  class="tw-relative tw-flex tw-flex-col"
                  @scroll="onCalendarScroll"
                >
                  <!-- Days -->
                  <div
                    :class="
                      sampleCalendarEventsByDay
                        ? undefined
                        : 'tw-sticky tw-top-14'
                    "
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

                  <!-- Calendar -->
                  <div class="tw-flex tw-flex-col">
                    <div class="tw-flex-1">
                      <div
                        id="drag-section"
                        data-long-press-delay="500"
                        class="tw-relative tw-flex"
                        @mouseleave="resetCurTimeslot"
                      >
                        <!-- Loader -->
                        <div
                          v-if="showLoader"
                          class="tw-absolute tw-z-10 tw-grid tw-h-full tw-w-full tw-place-content-center"
                        >
                          <v-progress-circular
                            class="tw-text-green"
                            indeterminate
                          />
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
                              ((isGroup && loadingCalendarEvents) ||
                                loadingResponses.loading) &&
                              'tw-opacity-50'
                            "
                          >
                            <!-- Timeslots -->
                            <div
                              v-for="(_, t) in splitTimes[0]"
                              :key="`${d}-${t}-0`"
                              class="tw-w-full"
                            >
                              <div
                                class="timeslot"
                                :class="
                                  timeslotClassStyle[d * times.length + t]
                                    ?.class
                                "
                                :style="
                                  timeslotClassStyle[d * times.length + t]
                                    ?.style
                                "
                                v-on="timeslotVon[d * times.length + t]"
                              ></div>
                            </div>

                            <template v-if="splitTimes[1].length > 0">
                              <div
                                :style="{
                                  height: `${SPLIT_GAP_HEIGHT}px`,
                                }"
                              ></div>
                              <div
                                v-for="(_, t) in splitTimes[1]"
                                :key="`${d}-${t}-1`"
                                class="tw-w-full"
                              >
                                <div
                                  class="timeslot"
                                  :class="
                                    timeslotClassStyle[
                                      d * times.length +
                                        t +
                                        splitTimes[0].length
                                    ]?.class
                                  "
                                  :style="
                                    timeslotClassStyle[
                                      d * times.length +
                                        t +
                                        splitTimes[0].length
                                    ]?.style
                                  "
                                  v-on="
                                    timeslotVon[
                                      d * times.length +
                                        t +
                                        splitTimes[0].length
                                    ]
                                  "
                                ></div>
                              </div>
                            </template>

                            <!-- Calendar events -->
                            <template
                              v-if="
                                !loadingCalendarEvents &&
                                (editing ||
                                  alwaysShowCalendarEvents ||
                                  showCalendarEvents)
                              "
                            >
                              <template
                                v-for="calendarEvent in calendarEventsByDay[
                                  d + page * maxDaysPerPage
                                ]"
                                :key="(calendarEvent.id as string | number)"
                              >
                                <CalendarEventBlock
                                  :block-style="getTimeBlockStyle(calendarEvent)"
                                  :calendar-event="calendarEvent"
                                  :is-group="isGroup"
                                  :is-editing-availability="
                                    state === states.EDIT_AVAILABILITY
                                  "
                                  :no-event-names="noEventNames"
                                  :transition-name="
                                    isGroup ? '' : 'fade-transition'
                                  "
                                />
                              </template>
                            </template>

                            <!-- Scheduled event -->
                            <div v-if="state === states.SCHEDULE_EVENT">
                              <div
                                v-if="
                                  (dragStart && dragStart.col === d) ||
                                  (!dragStart &&
                                    curScheduledEvent &&
                                    curScheduledEvent.col === d)
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

                            <!-- Sign up block being dragged -->
                            <div v-if="state === states.EDIT_SIGN_UP_BLOCKS">
                              <div
                                v-if="dragStart && dragStart.col === d"
                                class="tw-absolute tw-w-full tw-select-none tw-p-px"
                                :style="signUpBlockBeingDraggedStyle"
                                style="pointer-events: none"
                              >
                                <SignUpCalendarBlock
                                  :title="newSignUpBlockName"
                                  title-only
                                  unsaved
                                />
                              </div>
                            </div>

                            <div v-if="isSignUp">
                              <!-- Sign up blocks -->
                              <div
                                v-for="block in signUpBlocksByDay[
                                  d + page * maxDaysPerPage
                                ]"
                                :key="block._id"
                              >
                                <div
                                  class="tw-absolute tw-w-full tw-select-none tw-p-px"
                                  :style="{
                                    top: `calc(${block.hoursOffset} * 4 * 1rem)`,
                                    height: `calc(${block.hoursLength} * 4 * 1rem)`,
                                  }"
                                  @click="handleSignUpBlockClick(block, (b) => $emit('signUpForBlock', b))"
                                >
                                  <SignUpCalendarBlock :sign-up-block="block" />
                                </div>
                              </div>

                              <!-- Sign up blocks to be added after hitting 'save' -->
                              <div
                                v-for="block in signUpBlocksToAddByDay[
                                  d + page * maxDaysPerPage
                                ]"
                                :key="block._id"
                              >
                                <div
                                  class="tw-absolute tw-w-full tw-select-none tw-p-px"
                                  :style="{
                                    top: `calc(${block.hoursOffset} * 4 * 1rem)`,
                                    height: `calc(${block.hoursLength} * 4 * 1rem)`,
                                  }"
                                >
                                  <SignUpCalendarBlock
                                    :title="block.name"
                                    title-only
                                    unsaved
                                  />
                                </div>
                              </div>
                            </div>

                            <!-- Overlaid availabilities -->
                            <div v-if="overlayAvailability">
                              <div
                                v-for="(timeBlock, tb) in overlaidAvailability[
                                  d
                                ]"
                                :key="tb"
                                class="tw-absolute tw-w-full tw-select-none tw-p-px"
                                :style="getTimeBlockStyle(timeBlock)"
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

                <!-- Hint text (desktop) -->
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
                      <v-icon small @click="closeHint">mdi-close</v-icon>
                    </div>
                  </div>
                </v-expand-transition>

                <v-expand-transition>
                  <div
                    v-if="
                      state !== states.EDIT_AVAILABILITY &&
                      max !== respondents.length &&
                      Object.keys(fetchedResponses).length !== 0 &&
                      !loadingResponses.loading
                    "
                  >
                    <div class="tw-mt-2 tw-text-sm tw-text-dark-gray">
                      Note: There's no time when all
                      {{ respondents.length }} respondents are available.
                    </div>
                  </div>
                </v-expand-transition>

                <ToolRow
                  v-if="!isPhone && !calendarOnly"
                  v-model:cur-timezone="curTimezone"
                  v-model:show-best-times="showBestTimes"
                  v-model:hide-if-needed="hideIfNeeded"
                  v-model:mobile-num-days="mobileNumDays"
                  v-model:time-type="timeType"
                  :event="event"
                  :state="state"
                  :states="states"
                  :timezone-reference-date="timezoneReferenceDate"
                  :is-weekly="isWeekly"
                  :calendar-permission-granted="calendarPermissionGranted"
                  :week-offset="weekOffset"
                  :num-responses="respondents.length"
                  :allow-schedule-event="allowScheduleEvent"
                  :show-event-options="showEventOptions"
                  @toggle-show-event-options="toggleShowEventOptions"
                  @update:week-offset="(val) => $emit('update:weekOffset', val)"
                  @schedule-event="scheduleEvent"
                  @cancel-schedule-event="cancelScheduleEvent"
                  @confirm-schedule-event="confirmScheduleEvent"
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
                  <v-btn class="tw-border-gray" outlined icon @click="nextPage"
                    ><v-icon>mdi-chevron-right</v-icon></v-btn
                  >
                </div>
              </div>
            </template>
          </div>

          <!-- Right hand side content -->

          <div
            v-if="!calendarOnly"
            class="tw-px-4 tw-py-4 sm:tw-sticky sm:tw-top-16 sm:tw-flex-none sm:tw-self-start sm:tw-py-0 sm:tw-pl-0 sm:tw-pr-0 sm:tw-pt-14"
            :style="{ width: rightSideWidth }"
          >
            <!-- Show section on the right depending on some if conditions -->
            <template v-if="isSignUp">
              <div class="tw-mb-2 tw-text-lg tw-text-black">Slots</div>
              <div v-if="!isOwner" class="tw-mb-3 tw-flex tw-flex-col">
                <div
                  class="tw-flex tw-flex-col tw-gap-1 tw-rounded-md tw-bg-light-gray tw-p-3 tw-text-xs tw-italic tw-text-dark-gray"
                >
                  <div v-if="!authUser || alreadyRespondedToSignUpForm">
                    <a class="tw-underline" :href="`mailto:${event.ownerId}`"
                      >Contact sign up creator</a
                    >
                    to edit your slot
                  </div>
                  <div v-if="event.blindAvailabilityEnabled">
                    Responses are only visible to creator
                  </div>
                </div>
              </div>
              <SignUpBlocksList
                ref="signUpBlocksList"
                :sign-up-blocks="signUpBlocksByDay.flat()"
                :sign-up-blocks-to-add="signUpBlocksToAddByDay.flat()"
                :is-editing="state == states.EDIT_SIGN_UP_BLOCKS"
                :is-owner="isOwner"
                :already-responded="alreadyRespondedToSignUpForm"
                :anonymous="event.blindAvailabilityEnabled"
                @update:sign-up-block="(payload) => editSignUpBlock(payload as SignUpBlockLite)"
                @delete:sign-up-block="(payload) => deleteSignUpBlock((payload as SignUpBlockLite)._id)"
                @sign-up-for-block="$emit('signUpForBlock', $event)"
              />
            </template>
            <template v-else-if="state === states.SET_SPECIFIC_TIMES">
              <SpecificTimesInstructions
                v-if="!isPhone"
                :num-temp-times="tempTimes.size"
                @save-temp-times="saveTempTimes"
              />
            </template>
            <template v-else>
              <div
                v-if="state == states.EDIT_AVAILABILITY"
                class="tw-flex tw-flex-col tw-gap-5"
              >
                <div
                  v-if="
                    !(
                      calendarPermissionGranted &&
                      !event.daysOnly &&
                      !addingAvailabilityAsGuest
                    )
                  "
                  class="tw-flex tw-flex-wrap tw-items-baseline tw-gap-1 tw-text-sm tw-italic tw-text-dark-gray"
                >
                  {{
                    (userHasResponded && !addingAvailabilityAsGuest) ||
                    curGuestId
                      ? "Editing"
                      : "Adding"
                  }}
                  availability as
                  <div
                    v-if="curGuestId && canEditGuestName"
                    class="tw-group tw-mt-0.5 tw-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1"
                    @click="openEditGuestNameDialog"
                  >
                    <span class="tw-font-medium group-hover:tw-underline">{{
                      curGuestId
                    }}</span>
                    <v-icon small>mdi-pencil</v-icon>
                  </div>
                  <span v-else>
                    {{
                      authUser && !addingAvailabilityAsGuest
                        ? `${authUser.firstName} ${authUser.lastName}`
                        : curGuestId?.length > 0
                        ? curGuestId
                        : "a guest"
                    }}
                  </span>
                  <v-dialog
                    v-model="editGuestNameDialog"
                    width="400"
                    content-class="tw-m-0"
                  >
                    <v-card>
                      <v-card-title>Edit guest name</v-card-title>
                      <v-card-text>
                        <v-text-field
                          v-model="newGuestName"
                          label="Guest name"
                          autofocus
                          hide-details
                          @keydown.enter="saveGuestName"
                        ></v-text-field>
                      </v-card-text>
                      <v-card-actions>
                        <v-spacer />
                        <v-btn text @click="editGuestNameDialog = false"
                          >Cancel</v-btn
                        >
                        <v-btn text color="primary" @click="saveGuestName"
                          >Save</v-btn
                        >
                      </v-card-actions>
                    </v-card>
                  </v-dialog>
                </div>
                <div class="tw-flex tw-flex-col tw-gap-3">
                  <AvailabilityTypeToggle
                    v-if="!isGroup && !isPhone"
                    v-model="availabilityType"
                    class="tw-w-full"
                  />
                  <ColorLegend />
                </div>
                <!-- User's calendar accounts -->
                <CalendarAccounts
                  v-if="
                    calendarPermissionGranted &&
                    !event.daysOnly &&
                    !addingAvailabilityAsGuest
                  "
                  :toggle-state="true"
                  :event-id="event._id"
                  :calendar-events-map="calendarEventsMap"
                  :sync-with-backend="!isGroup"
                  :allow-add-calendar-account="!isGroup"
                  :initial-calendar-accounts-data="
                    isGroup ? sharedCalendarAccounts : (authUser?.calendarAccounts ?? {})
                  "
                  @toggle-calendar-account="toggleCalendarAccount"
                  @toggle-sub-calendar-account="toggleSubCalendarAccount"
                ></CalendarAccounts>

                <div v-if="showOverlayAvailabilityToggle">
                  <v-switch
                    id="overlay-availabilities-toggle"
                    inset
                    :input-value="overlayAvailability"
                    hide-details
                    @change="updateOverlayAvailability"
                  >
                    <template #label>
                      <div class="tw-text-sm tw-text-black">
                        Overlay availabilities
                      </div>
                    </template>
                  </v-switch>

                  <div class="tw-mt-2 tw-text-xs tw-text-dark-gray">
                    View everyone's availability while inputting your own
                  </div>
                </div>

                <!-- Options section -->
                <div
                  v-if="!event.daysOnly && showCalendarOptions"
                  ref="optionsSection"
                >
                  <ExpandableSection
                    label="Options"
                    :model-value="showEditOptions"
                    @update:model-value="toggleShowEditOptions"
                  >
                    <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2.5">
                      <v-dialog
                        v-if="showCalendarOptions"
                        v-model="calendarOptionsDialog"
                        width="500"
                      >
                        <template #activator="{ props: activatorProps }">
                          <v-btn
                            outlined
                            class="tw-border-gray tw-text-sm"
                            v-bind="activatorProps"
                          >
                            Calendar options...
                          </v-btn>
                        </template>

                        <v-card>
                          <v-card-title class="tw-flex">
                            <div>Calendar options</div>
                            <v-spacer />
                            <v-btn icon @click="calendarOptionsDialog = false">
                              <v-icon>mdi-close</v-icon>
                            </v-btn>
                          </v-card-title>
                          <v-card-text
                            class="tw-flex tw-flex-col tw-gap-6 tw-pb-8 tw-pt-2"
                          >
                            <AlertText v-if="isGroup" class="-tw-mb-4">
                              Calendar options will only updated for the current
                              group
                            </AlertText>

                            <BufferTimeSwitch
                              v-model:buffer-time="bufferTime"
                              :sync-with-backend="!isGroup"
                            />

                            <WorkingHoursToggle
                              v-model:working-hours="workingHours"
                              :timezone="curTimezone"
                              :sync-with-backend="!isGroup"
                            />
                          </v-card-text>
                        </v-card>
                      </v-dialog>
                    </div>
                  </ExpandableSection>
                </div>

                <!-- Delete availability button -->
                <div
                  v-if="
                    (!addingAvailabilityAsGuest && userHasResponded) ||
                    curGuestId
                  "
                >
                  <v-dialog
                    v-model="deleteAvailabilityDialog"
                    width="500"
                    persistent
                  >
                    <template #activator="{ props: activatorProps }">
                      <span
                        v-bind="activatorProps"
                        class="tw-cursor-pointer tw-text-sm tw-text-red"
                      >
                        {{ !isGroup ? "Delete availability" : "Leave group" }}
                      </span>
                    </template>

                    <v-card>
                      <v-card-title>Are you sure?</v-card-title>
                      <v-card-text class="tw-text-sm tw-text-dark-gray"
                        >Are you sure you want to
                        {{
                          !isGroup
                            ? "delete your availability from this event?"
                            : "leave this group?"
                        }}</v-card-text
                      >
                      <v-card-actions>
                        <v-spacer />
                        <v-btn text @click="deleteAvailabilityDialog = false"
                          >Cancel</v-btn
                        >
                        <v-btn
                          text
                          color="error"
                          @click="handleDeleteAvailability"
                          >{{ !isGroup ? "Delete" : "Leave" }}</v-btn
                        >
                      </v-card-actions>
                    </v-card>
                  </v-dialog>
                </div>
              </div>
              <template v-else>
                <PubliftAd
                  :show-ad="showAds"
                  fuse-id="meet_incontent"
                  class="-tw-mx-4 tw-my-4 tw-block !tw-rounded-none sm:tw-hidden"
                >
                  <div class="tw-h-[375px] publift-m:tw-h-[90px]">
                    <div
                      id="meet_incontent"
                      data-fuse="meet_incontent"
                      class="tw-flex tw-items-center tw-justify-center"
                    ></div>
                  </div>
                </PubliftAd>
                <RespondentsList
                  v-model:show-calendar-events="showCalendarEvents"
                  v-model:show-best-times="showBestTimes"
                  v-model:hide-if-needed="hideIfNeeded"
                  :max-height="100"
                  :event="event"
                  :event-id="event._id ?? ''"
                  :days="allDays"
                  :times="times"
                  :cur-date="getDateFromRowCol(curTimeslot.row, curTimeslot.col) ?? undefined"
                  :cur-respondent="curRespondent"
                  :cur-respondents="curRespondents"
                  :cur-timeslot="{ dayIndex: curTimeslot.col, timeIndex: curTimeslot.row }"
                  :cur-timeslot-availability="curTimeslotAvailability"
                  :respondents="respondents"
                  :parsed-responses="parsedResponses"
                  :is-owner="isOwner"
                  :is-group="isGroup"
                  :attendees="formattedAttendees"
                  :responses-formatted="responsesFormatted"
                  :timezone="curTimezone"
                  :show-event-options="showEventOptions"
                  :guest-added-availability="guestAddedAvailability"
                  :adding-availability-as-guest="addingAvailabilityAsGuest"
                  @toggle-show-event-options="toggleShowEventOptions"
                  @add-availability="$emit('addAvailability')"
                  @add-availability-as-guest="$emit('addAvailabilityAsGuest')"
                  @mouse-over-respondent="mouseOverRespondent"
                  @mouse-leave-respondent="() => mouseLeaveRespondent()"
                  @click-respondent="clickRespondent"
                  @edit-guest-availability="editGuestAvailability"
                  @refresh-event="refreshEvent"
                />
              </template>
            </template>
          </div>
        </div>

        <ToolRow
          v-if="isPhone && !calendarOnly"
          v-model:cur-timezone="curTimezone"
          v-model:show-best-times="showBestTimes"
          v-model:hide-if-needed="hideIfNeeded"
          v-model:start-calendar-on-monday="startCalendarOnMonday"
          v-model:mobile-num-days="mobileNumDays"
          v-model:time-type="timeType"
          class="tw-px-4"
          :event="event"
          :state="state"
          :states="states"
          :timezone-reference-date="timezoneReferenceDate"
          :is-weekly="isWeekly"
          :calendar-permission-granted="calendarPermissionGranted"
          :week-offset="weekOffset"
          :num-responses="respondents.length"
          :allow-schedule-event="allowScheduleEvent"
          :show-event-options="showEventOptions"
          @toggle-show-event-options="toggleShowEventOptions"
          @update:week-offset="(val) => $emit('update:weekOffset', val)"
          @schedule-event="scheduleEvent"
          @cancel-schedule-event="cancelScheduleEvent"
          @confirm-schedule-event="confirmScheduleEvent"
        />

        <!-- Fixed bottom section for mobile -->
        <div
          v-if="isPhone && !calendarOnly"
          class="tw-fixed tw-z-20 tw-w-full"
          :style="{ bottom: showAds ? 'calc(4rem + 115px)' : '4rem' }"
        >
          <!-- Hint text (mobile) -->
          <v-expand-transition>
            <template v-if="hintTextShown">
              <div :key="hintText">
                <div
                  :class="`tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-1 tw-bg-light-gray tw-px-2 tw-py-2 tw-text-sm tw-text-very-dark-gray`"
                >
                  <div
                    :class="`tw-flex tw-gap-${hintText.length > 60 ? 2 : 1}`"
                  >
                    <v-icon small>mdi-information-outline</v-icon>
                    <div>
                      {{ hintText }}
                    </div>
                  </div>
                  <v-icon small @click="closeHint">mdi-close</v-icon>
                </div>
              </div>
            </template>
          </v-expand-transition>

          <!-- Fixed pos availability toggle (mobile) -->
          <v-expand-transition>
            <div v-if="!isGroup && editing && !isSignUp">
              <div class="tw-bg-white tw-p-4">
                <AvailabilityTypeToggle
                  v-model="availabilityType"
                  class="tw-w-full"
                />
              </div>
            </div>
          </v-expand-transition>

          <!-- GCal week selector -->
          <v-expand-transition>
            <div v-if="isWeekly && editing && calendarPermissionGranted">
              <div class="tw-h-16 tw-text-sm">
                <GCalWeekSelector
                  :week-offset="weekOffset"
                  :event="event"
                  :start-on-monday="event.startOnMonday"
                  @update:week-offset="(val) => $emit('update:weekOffset', val)"
                />
              </div>
            </div>
          </v-expand-transition>

          <!-- Respondents list -->
          <v-expand-transition>
            <div v-if="delayedShowStickyRespondents">
              <div class="tw-bg-white tw-p-4">
                <RespondentsList
                  v-model:show-calendar-events="showCalendarEvents"
                  v-model:show-best-times="showBestTimes"
                  v-model:hide-if-needed="hideIfNeeded"
                  :max-height="100"
                  :event="event"
                  :event-id="event._id ?? ''"
                  :days="allDays"
                  :times="times"
                  :cur-date="getDateFromRowCol(curTimeslot.row, curTimeslot.col) ?? undefined"
                  :cur-respondent="curRespondent"
                  :cur-respondents="curRespondents"
                  :cur-timeslot="{ dayIndex: curTimeslot.col, timeIndex: curTimeslot.row }"
                  :cur-timeslot-availability="curTimeslotAvailability"
                  :respondents="respondents"
                  :parsed-responses="parsedResponses"
                  :is-owner="isOwner"
                  :is-group="isGroup"
                  :attendees="formattedAttendees"
                  :responses-formatted="responsesFormatted"
                  :timezone="curTimezone"
                  :show-event-options="showEventOptions"
                  :guest-added-availability="guestAddedAvailability"
                  :adding-availability-as-guest="addingAvailabilityAsGuest"
                  @toggle-show-event-options="toggleShowEventOptions"
                  @add-availability="$emit('addAvailability')"
                  @add-availability-as-guest="$emit('addAvailabilityAsGuest')"
                  @mouse-over-respondent="mouseOverRespondent"
                  @mouse-leave-respondent="mouseLeaveRespondent"
                  @click-respondent="clickRespondent"
                  @edit-guest-availability="editGuestAvailability"
                  @refresh-event="refreshEvent"
                />
              </div>
            </div>
          </v-expand-transition>

          <!-- Specific times instructions -->
          <v-expand-transition>
            <div
              v-if="state === states.SET_SPECIFIC_TIMES"
              class="-tw-mb-16 tw-bg-white tw-p-4"
            >
              <SpecificTimesInstructions
                :num-temp-times="tempTimes.size"
                @save-temp-times="saveTempTimes"
              />
            </div>
          </v-expand-transition>
        </div>
      </div>
    </Tooltip>
  </span>
</template>

<script setup lang="ts">
import {
  ref, computed, watch, nextTick, shallowRef, onMounted, onBeforeUnmount,
} from "vue"
import { useDisplay } from "vuetify"
import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
import { post, lightOrDark, removeTransparencyFromHex, isTouchEnabled } from "@/utils"
import {
  availabilityTypes, calendarOptionsDefaults, eventTypes, guestUserId, timeTypes,
} from "@/constants"
import { useMainStore } from "@/stores/main"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"
import PubliftAd from "@/components/event/PubliftAd.vue"
import SignUpCalendarBlock from "@/components/sign_up_form/SignUpCalendarBlock.vue"
import SignUpBlocksList from "@/components/sign_up_form/SignUpBlocksList.vue"
import ZigZag from "./ZigZag.vue"
import ToolRow from "./ToolRow.vue"
import RespondentsList from "./RespondentsList.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import ExpandableSection from "../ExpandableSection.vue"
import WorkingHoursToggle from "./WorkingHoursToggle.vue"
import AlertText from "../AlertText.vue"
import Tooltip from "../Tooltip.vue"
import ColorLegend from "./ColorLegend.vue"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import BufferTimeSwitch from "./BufferTimeSwitch.vue"
import CalendarEventBlock from "./CalendarEventBlock.vue"
import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"
import { useCalendarGrid } from "@/composables/schedule_overlap/useCalendarGrid"
import { useCalendarEvents } from "@/composables/schedule_overlap/useCalendarEvents"
import type { UseCalendarEventsReturn } from "@/composables/schedule_overlap/useCalendarEvents"
import { useAvailabilityData } from "@/composables/schedule_overlap/useAvailabilityData"
import { useDragPaint } from "@/composables/schedule_overlap/useDragPaint"
import type { UseDragPaintReturn } from "@/composables/schedule_overlap/useDragPaint"
import { useEventScheduling } from "@/composables/schedule_overlap/useEventScheduling"
import { useSignUpForm } from "@/composables/schedule_overlap/useSignUpForm"
import { useScheduleOverlapUI } from "@/composables/schedule_overlap/useScheduleOverlapUI"
import type { UseScheduleOverlapUIReturn } from "@/composables/schedule_overlap/useScheduleOverlapUI"
import {
  states, DRAG_TYPES, SPLIT_GAP_HEIGHT, SPLIT_GAP_WIDTH, HOUR_HEIGHT,
} from "@/composables/schedule_overlap/types"
import type {
  RowCol, Timezone, ScheduleOverlapState, EventLike, CalendarEventLite, CalendarEventsByDay,
  CalendarOptions, ScheduledEvent, SignUpBlockLite,
} from "@/composables/schedule_overlap/types"

dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

// ── Props / Emits ──────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    event: EventLike
    ownerIsPremium?: boolean
    fromEditEvent?: boolean
    loadingCalendarEvents?: boolean
    calendarEventsMap?: Record<string, { calendarEvents: CalendarEventLite[] }>
    sampleCalendarEventsByDay?: CalendarEventsByDay
    calendarPermissionGranted?: boolean
    weekOffset?: number
    alwaysShowCalendarEvents?: boolean
    noEventNames?: boolean
    calendarOnly?: boolean
    interactable?: boolean
    showSnackbar?: boolean
    animateTimeslotAlways?: boolean
    showHintText?: boolean
    curGuestId?: string
    addingAvailabilityAsGuest?: boolean
    initialTimezone?: Timezone
    calendarAvailabilities?: Record<string, CalendarEventLite[]>
  }>(),
  {
    ownerIsPremium: false,
    fromEditEvent: false,
    loadingCalendarEvents: false,
    calendarEventsMap: () => ({}),
    calendarPermissionGranted: false,
    weekOffset: 0,
    alwaysShowCalendarEvents: false,
    noEventNames: false,
    sampleCalendarEventsByDay: () => [],
    calendarOnly: false,
    interactable: true,
    showSnackbar: true,
    animateTimeslotAlways: false,
    showHintText: true,
    curGuestId: "",
    addingAvailabilityAsGuest: false,
    initialTimezone: () => ({} as Timezone),
    calendarAvailabilities: () => ({}),
  }
)

const emit = defineEmits<{
  "update:weekOffset": [n: number]
  highlightAvailabilityBtn: []
  addAvailabilityAsGuest: []
  setCurGuestId: [id: string]
  refreshEvent: []
  signUpForBlock: [block: Record<string, unknown>]
  addAvailability: []
  deleteAvailability: []
}>()

// ── Store / Vuetify ────────────────────────────────────────────────────
const mainStore = useMainStore()
const { smAndDown } = useDisplay()
const isPhone = computed(() => smAndDown.value)
const isSignUp = computed(() => Boolean(props.event.isSignUpForm))
const isGroup = computed(() => props.event.type === eventTypes.GROUP)
const isOwner = computed(() => mainStore.authUser?._id === props.event.ownerId)
const _isGuestEvent = computed(() => props.event.ownerId === guestUserId)
const authUser = computed(() => mainStore.authUser)

const eventRef = computed(() => props.event)
const weekOffsetRef = computed(() => props.weekOffset)

const guestNameKey = computed(() => `${String(props.event._id)}.guestName`)
const guestName = computed<string | undefined>(() => (localStorage[guestNameKey.value] as string | undefined) ?? undefined)

const curTimezone = ref<Timezone>(props.initialTimezone)

// Pre-create state ref to break grid ↔ UI circular dep
const state = ref<ScheduleOverlapState>(states.BEST_TIMES)

// Template refs
const signUpBlocksListRef = ref<{ scrollToSignUpBlock?: (id: string) => void } | null>(null)
const optionsSectionRef = ref<HTMLElement | null>(null)
const respondentsListRef = ref<{ $el?: HTMLElement } | null>(null)

// ── 1. useCalendarGrid ─────────────────────────────────────────────────
const grid = useCalendarGrid({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  state,
  isPhone,
})

const nextPage = (e?: Event) => {
  ;(e as MouseEvent | undefined)?.stopImmediatePropagation()
  grid.nextPage(e ?? new Event('click'), (n) => { emit("update:weekOffset", n); })
}
const prevPage = (e?: Event) => {
  ;(e as MouseEvent | undefined)?.stopImmediatePropagation()
  grid.prevPage(e ?? new Event('click'), (n) => { emit("update:weekOffset", n); })
}

// ── 2. Proxy stubs for circular deps ──────────────────────────────────
let calEventsResolved: UseCalendarEventsReturn | null = null
const calendarEventsByDayProxy = computed(() => calEventsResolved?.calendarEventsByDay.value ?? [])
const groupCalendarEventsByDayProxy = computed<Record<string, CalendarEventsByDay>>(
  () => calEventsResolved?.groupCalendarEventsByDay.value ?? {}
)
const bufferTimeShared = shallowRef<{ enabled: boolean; time: number }>({ ...calendarOptionsDefaults.bufferTime })
const workingHoursShared = shallowRef<{ enabled: boolean; startTime: number; endTime: number }>({ ...calendarOptionsDefaults.workingHours })
const getAvailFromCalEventsProxy = (
  ...args: Parameters<UseCalendarEventsReturn["getAvailabilityFromCalendarEvents"]>
): Set<number> => calEventsResolved?.getAvailabilityFromCalendarEvents(...args) ?? new Set()

let uiResolved: UseScheduleOverlapUIReturn | null = null
const defaultStateProxy = computed(() => uiResolved?.defaultState.value ?? states.HEATMAP)
const allowDragProxy = computed(() => uiResolved?.allowDrag.value ?? false)
const availabilityTypeProxy = computed(
  () => uiResolved?.availabilityType.value ?? availabilityTypes.AVAILABLE
)

let dragPaintResolved: UseDragPaintReturn | null = null
const endDragProxy = () => dragPaintResolved?.endDrag()

// Pre-create drag refs to break dragPaint ↔ eventScheduling circular dep
const draggingShared = ref(false)
const dragStartShared = ref<RowCol | null>(null)
const dragCurShared = ref<RowCol | null>(null)

// ── 3. useAvailabilityData ─────────────────────────────────────────────
const avail = useAvailabilityData({
  event: eventRef,
  weekOffset: weekOffsetRef,
  state,
  curGuestId: computed(() => props.curGuestId),
  addingAvailabilityAsGuest: computed(() => props.addingAvailabilityAsGuest),
  showSnackbar: computed(() => props.showSnackbar),
  calendarPermissionGranted: computed(() => props.calendarPermissionGranted),
  loadingCalendarEvents: computed(() => props.loadingCalendarEvents),
  allDays: grid.allDays,
  days: grid.days,
  times: grid.times,
  splitTimes: grid.splitTimes,
  timeslotDuration: grid.timeslotDuration,
  page: grid.page,
  maxDaysPerPage: grid.maxDaysPerPage,
  isGroup,
  isOwner,
  guestNameKey,
  guestName,
  getDateFromRowCol: grid.getDateFromRowCol,
  calendarEventsByDay: calendarEventsByDayProxy,
  groupCalendarEventsByDay: groupCalendarEventsByDayProxy,
  bufferTime: bufferTimeShared,
  workingHours: workingHoursShared,
  getAvailabilityFromCalendarEvents: getAvailFromCalEventsProxy,
  refreshEvent: () => { emit("refreshEvent"); },
})

// ── 4. useCalendarEvents ───────────────────────────────────────────────
const calEvents = useCalendarEvents({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  calendarEventsMap: computed(
    () => props.calendarEventsMap
  ),
  sampleCalendarEventsByDay: computed(() => props.sampleCalendarEventsByDay),
  calendarAvailabilities: computed(
    () => props.calendarAvailabilities
  ),
  addingAvailabilityAsGuest: computed(() => props.addingAvailabilityAsGuest),
  calendarOnly: computed(() => props.calendarOnly),
  allDays: grid.allDays,
  times: grid.times,
  timeslotDuration: grid.timeslotDuration,
  timezoneOffset: grid.timezoneOffset,
  isGroup,
  guestName,
  getDateFromDayTimeIndex: grid.getDateFromDayTimeIndex,
  fetchedResponses: avail.fetchedResponses,
  loadingResponses: avail.loadingResponses,
  onResponsesFetched: () => { avail.getResponsesFormatted(); },
})
calEventsResolved = calEvents

// Sync calEvents buffer/hours into shared refs so avail sees updated values
watch(calEvents.bufferTime, (val) => { bufferTimeShared.value = { ...val } }, { immediate: true })
watch(calEvents.workingHours, (val) => { workingHoursShared.value = { ...val } }, { immediate: true })

// ── 5. useEventScheduling ──────────────────────────────────────────────
const eventSched = useEventScheduling({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  state,
  defaultState: defaultStateProxy,
  splitTimes: grid.splitTimes,
  timeslotDuration: grid.timeslotDuration,
  timeslotHeight: grid.timeslotHeight,
  timezoneOffset: grid.timezoneOffset,
  isWeekly: grid.isWeekly,
  isGroup,
  isSpecificTimes: grid.isSpecificTimes,
  getDateFromRowCol: grid.getDateFromRowCol,
  getMinMaxHoursFromTimes: grid.getMinMaxHoursFromTimes,
  dragging: draggingShared,
  dragStart: dragStartShared,
  dragCur: dragCurShared,
  tempTimes: avail.tempTimes,
  respondents: avail.respondents,
})

// ── 6. useSignUpForm ───────────────────────────────────────────────────
const signUpForm = useSignUpForm({
  event: eventRef,
  isSignUp,
  days: grid.days,
  isOwner,
  dragStart: dragStartShared,
})

// ── 7. useDragPaint ────────────────────────────────────────────────────
const drag = useDragPaint({
  event: eventRef,
  state,
  isSignUp,
  weekOffset: weekOffsetRef,
  splitTimes: grid.splitTimes,
  times: grid.times,
  days: grid.days,
  monthDays: grid.monthDays,
  monthDayIncluded: grid.monthDayIncluded,
  columnOffsets: grid.columnOffsets,
  timeslot: grid.timeslot,
  availability: avail.availability,
  ifNeeded: avail.ifNeeded,
  tempTimes: avail.tempTimes,
  availabilityType: availabilityTypeProxy,
  signUpBlocksByDay: signUpForm.signUpBlocksByDay,
  signUpBlocksToAddByDay: signUpForm.signUpBlocksToAddByDay,
  manualAvailability: avail.manualAvailability,
  curScheduledEvent: eventSched.curScheduledEvent,
  maxSignUpBlockRowSize: signUpForm.maxSignUpBlockRowSize,
  allowDrag: allowDragProxy,
  getDateFromRowCol: grid.getDateFromRowCol,
  getAvailabilityForColumn: avail.getAvailabilityForColumn,
  createSignUpBlock: signUpForm.createSignUpBlock,
  scrollToSignUpBlock: (id: string) => signUpBlocksListRef.value?.scrollToSignUpBlock?.(id),
})
dragPaintResolved = drag

// Sync drag state into shared refs with flush:sync so eventSched sees them immediately
watch(drag.dragging, (val) => { draggingShared.value = val }, { flush: "sync" })
watch(drag.dragStart, (val) => { dragStartShared.value = val }, { flush: "sync" })
watch(drag.dragCur, (val) => { dragCurShared.value = val }, { flush: "sync" })

// ── 8. useScheduleOverlapUI ────────────────────────────────────────────
const guestAddedAvailability = computed(
  () =>
    Boolean(guestName.value?.length && guestName.value in avail.parsedResponses.value)
)

const ui = useScheduleOverlapUI({
  isPhone,
  isSignUp,
  isGroup,
  showHintText: computed(() => props.showHintText),
  state,
  parsedResponses: avail.parsedResponses,
  curTimeslot: avail.curTimeslot,
  endDrag: endDragProxy,
  timeslotSelected: avail.timeslotSelected,
  curTimeslotAvailability: avail.curTimeslotAvailability,
  respondents: avail.respondents,
  curGuestId: computed(() => props.curGuestId),
  guestName,
  guestAddedAvailability,
  optionsSectionRef,
  respondentsListRef,
})
uiResolved = ui

// ── Destructure composable returns for template access ─────────────────
const {
  page, mobileNumDays, pageHasChanged, timeslot: _timeslot, calendarScrollLeft: _calendarScrollLeft, calendarMaxScroll: _calendarMaxScroll,
  timeType, startCalendarOnMonday, isSpecificDates, isWeekly, isSpecificTimes,
  daysOfWeek, timezoneOffset, timezoneReferenceDate, dayOffset: _dayOffset, timeslotDuration, timeslotHeight,
  specificTimesSet: _specificTimesSet, splitTimes, times, allDays, days, monthDays, monthDayIncluded,
  curMonthText, columnOffsets: _columnOffsets, showLeftZigZag: _showLeftZigZag, showRightZigZag: _showRightZigZag, hasNextPage, hasPrevPage, hasPages: _hasPages,
  maxDaysPerPage, isColConsecutive, getDateFromDayHoursOffset: _getDateFromDayHoursOffset, getDateFromDayTimeIndex: _getDateFromDayTimeIndex,
  getDateFromRowCol, setTimeslotSize, onResize, onCalendarScroll, getLocalTimezone: _getLocalTimezone,
  getMinMaxHoursFromTimes: _getMinMaxHoursFromTimes,
} = grid

const {
  sharedCalendarAccounts, bufferTime, workingHours, hasRefreshedAuthUser: _hasRefreshedAuthUser,
  calendarEventsByDay, groupCalendarEventsByDay: _groupCalendarEventsByDay, initSharedCalendarAccounts,
  toggleCalendarAccount: _toggleCalendarAccount, toggleSubCalendarAccount: _toggleSubCalendarAccount, getAvailabilityFromCalendarEvents: _getAvailabilityFromCalendarEvents,
  fetchResponses, refreshAuthUser: _refreshAuthUser,
} = calEvents

// Wrapper functions to handle optional payload fields from CalendarAccounts component
const toggleCalendarAccount = (payload: { email?: string; calendarType?: string; enabled: boolean }) => {
  if (payload.email && payload.calendarType) {
    _toggleCalendarAccount({ email: payload.email, calendarType: payload.calendarType, enabled: payload.enabled })
  }
}

const toggleSubCalendarAccount = (payload: { email?: string; calendarType?: string; subCalendarId: string | number; enabled: boolean }) => {
  if (payload.email && payload.calendarType) {
    _toggleSubCalendarAccount({ email: payload.email, calendarType: payload.calendarType, subCalendarId: String(payload.subCalendarId), enabled: payload.enabled })
  }
}

const {
  availability, ifNeeded, tempTimes, availabilityAnimEnabled, availabilityAnimTimeouts: _availabilityAnimTimeouts,
  unsavedChanges, hideIfNeeded, manualAvailability: _manualAvailability, fetchedResponses, loadingResponses,
  responsesFormatted, curTimeslot, curTimeslotAvailability, timeslotSelected,
  availabilityArray: _availabilityArray, ifNeededArray: _ifNeededArray, parsedResponses, respondents, userHasResponded, max,
  getRespondentsForHoursOffset: _getRespondentsForHoursOffset, getResponsesFormatted, populateUserAvailability,
  resetCurUserAvailability, resetCurTimeslot, animateAvailability: _animateAvailability, stopAvailabilityAnim,
  setAvailabilityAutomatically: _setAvailabilityAutomatically, reanimateAvailability, isTouched: _isTouched, getAvailabilityForColumn: _getAvailabilityForColumn,
  getManualAvailabilityDow: _getManualAvailabilityDow, curRespondentsMaxFor, showAvailability, submitAvailability: _submitAvailability,
  deleteAvailability: _deleteAvailability, getAllValidTimeRanges: _getAllValidTimeRanges,
} = avail

const {
  curScheduledEvent, allowScheduleEvent, scheduledEventStyle, signUpBlockBeingDraggedStyle,
  scheduleEvent, cancelScheduleEvent, confirmScheduleEvent, saveTempTimes,
} = eventSched

const {
  signUpBlocksByDay, signUpBlocksToAddByDay, newSignUpBlockName, maxSignUpBlockRowSize: _maxSignUpBlockRowSize,
  alreadyRespondedToSignUpForm, createSignUpBlock: _createSignUpBlock, editSignUpBlock, deleteSignUpBlock,
  resetSignUpForm: _resetSignUpForm, resetSignUpBlocksToAddByDay: _resetSignUpBlocksToAddByDay, submitNewSignUpBlocks: _submitNewSignUpBlocks, handleSignUpBlockClick,
} = signUpForm

const {
  dragging, dragType, dragStart, dragCur: _dragCur, normalizeXY: _normalizeXY, clampRow: _clampRow, clampCol: _clampCol,
  getRowColFromXY: _getRowColFromXY, inDragRange, startDrag, moveDrag, endDrag,
} = drag

const {
  showBestTimes, showEditOptions, showEventOptions, showCalendarEvents, availabilityType,
  overlayAvailability, deleteAvailabilityDialog, calendarOptionsDialog, editGuestNameDialog,
  newGuestName, tooltipContent, optionsVisible: _optionsVisible, scrolledToRespondents: _scrolledToRespondents, delayedShowStickyRespondents,
  delayedShowStickyRespondentsTimeout, hintState: _hintState, curRespondent, curRespondents, defaultState,
  editing, scheduling: _scheduling, allowDrag: _allowDrag, curRespondentsSet, rightSideWidth, showStickyRespondents: _showStickyRespondents,
  hintStateLocalStorageKey: _hintStateLocalStorageKey, hintText, hintClosed: _hintClosed, hintTextShown, showOverlayAvailabilityToggle,
  selectedGuestRespondent: _selectedGuestRespondent, canEditGuestName, mouseOverRespondent, mouseLeaveRespondent,
  clickRespondent, deselectRespondents, isGuest: _isGuest, checkElementsVisible, onScroll,
  toggleShowEditOptions, toggleShowEventOptions, onShowBestTimesChange,
  updateOverlayAvailability, closeHint,
} = ui

// ── Watchers ────────────────────────────────────────────────────────────
watch(
  ui.showStickyRespondents,
  (cur) => {
    if (delayedShowStickyRespondentsTimeout.value != null) {
      clearTimeout(delayedShowStickyRespondentsTimeout.value)
    }
    delayedShowStickyRespondentsTimeout.value = setTimeout(() => {
      delayedShowStickyRespondents.value = cur
    }, 100)
  },
  { immediate: true }
)

watch(showBestTimes, () => { onShowBestTimesChange(); })

watch(availability, () => {
  if (state.value === states.EDIT_AVAILABILITY) unsavedChanges.value = true
})

watch(calEvents.calendarEventsByDay, (val, oldVal) => {
  if (JSON.stringify(val) !== JSON.stringify(oldVal)) reanimateAvailability()
})

watch(calEvents.bufferTime, (cur, prev) => {
  if (cur.enabled !== prev.enabled || cur.enabled) reanimateAvailability()
})
watch(calEvents.workingHours, (cur, prev) => {
  if (cur.enabled !== prev.enabled || cur.enabled) reanimateAvailability()
})

watch(eventRef, () => {
  initSharedCalendarAccounts()
  fetchResponses()
}, { immediate: true })

watch(weekOffsetRef, () => {
  if (props.event.type === eventTypes.GROUP) fetchResponses()
})

watch(hideIfNeeded, () => { getResponsesFormatted(); })

watch(parsedResponses, () => {
  getResponsesFormatted()
  if (
    props.event.type === eventTypes.GROUP &&
    state.value === states.EDIT_AVAILABILITY &&
    mainStore.authUser?._id
  ) {
    availability.value = new Set()
    populateUserAvailability(mainStore.authUser._id)
  }
})

watch(state, (nextState, prevState) => {
  void nextTick(() => { checkElementsVisible(); })
  if (prevState === states.SCHEDULE_EVENT) {
    curScheduledEvent.value = null
  } else if (prevState === states.EDIT_AVAILABILITY) {
    unsavedChanges.value = false
  }
  if (nextState === states.SET_SPECIFIC_TIMES) {
    void nextTick(() => {
      const time9 = document.getElementById("time-9")
      if (time9) {
        const y = time9.getBoundingClientRect().top + window.scrollY - 150
        window.scrollTo({ top: y, behavior: "smooth" })
      }
    })
  }
})

watch(page, () => nextTick(() => { setTimeslotSize(); }))
watch(allDays, () => nextTick(() => { setTimeslotSize(); }))
watch(mobileNumDays, () => nextTick(() => { setTimeslotSize(); }))

watch(
  () => props.fromEditEvent,
  () => {
    if (props.fromEditEvent && isSpecificTimes.value) {
      tempTimes.value = new Set(
        (props.event.times ?? []).map((t) => new Date(t).getTime())
      )
      state.value = states.SET_SPECIFIC_TIMES
    }
  }
)

watch(
  respondents,
  () => {
    curTimeslotAvailability.value = {}
    for (const r of respondents.value) {
      if (r._id) curTimeslotAvailability.value[r._id] = true
    }
  },
  { immediate: true }
)

// ── Local computed ──────────────────────────────────────────────────────
const showAds = computed(
  () =>
    !props.ownerIsPremium &&
    !mainStore.isPremiumUser &&
    state.value !== states.SET_SPECIFIC_TIMES
)

const showLoader = computed(
  () =>
    ((isGroup.value || props.alwaysShowCalendarEvents || editing.value) &&
      props.loadingCalendarEvents) ||
    loadingResponses.value.loading
)

const showCalendarOptions = computed(
  () =>
    !props.addingAvailabilityAsGuest &&
    props.calendarPermissionGranted &&
    (isGroup.value || !userHasResponded.value)
)

const curRespondentsMax = computed(() =>
  curRespondentsMaxFor(curRespondentsSet.value, allDays.value)
)

const formattedAttendees = computed(() =>
  props.event.attendees as { email: string; declined?: boolean }[] | undefined
)

const overlaidAvailability = computed(() => {
  const result: { hoursOffset: number; hoursLength: number; type: string }[][] = []
  days.value.forEach((_day, d) => {
    result.push([])
    let idx = 0
    const addBlock = (time: { hoursOffset: number }, t: number) => {
      const date = getDateFromRowCol(t, d)
      if (!date) return
      const dAdd =
        dragging.value && inDragRange(t, d) && dragType.value === DRAG_TYPES.ADD
      const dRemove =
        dragging.value && inDragRange(t, d) && dragType.value === DRAG_TYPES.REMOVE
      if (
        dAdd ||
        (!dRemove &&
          (availability.value.has(date.getTime()) || ifNeeded.value.has(date.getTime())))
      ) {
        const type = dAdd
          ? availabilityType.value
          : availability.value.has(date.getTime())
            ? availabilityTypes.AVAILABLE
            : availabilityTypes.IF_NEEDED
        if (idx in result[d]) {
          if (result[d][idx].type === type) {
            result[d][idx].hoursLength += 0.25
          } else {
            result[d].push({ hoursOffset: time.hoursOffset, hoursLength: 0.25, type })
            idx++
          }
        } else {
          result[d].push({ hoursOffset: time.hoursOffset, hoursLength: 0.25, type })
        }
      } else if (idx in result[d]) {
        idx++
      }
    }
    for (let t = 0; t < splitTimes.value[0].length; ++t)
      addBlock(splitTimes.value[0][t], t)
    if (idx in result[d]) idx++
    for (let t = 0; t < splitTimes.value[1].length; ++t)
      addBlock(splitTimes.value[1][t], t + splitTimes.value[0].length)
  })
  return result
})

const timeslotClassStyle = computed(() => {
  const out: { class: string; style: Record<string, string> }[] = []
  for (let d = 0; d < days.value.length; ++d) {
    const day = days.value[d]
    for (let t = 0; t < splitTimes.value[0].length; ++t)
      out.push(getTimeTimeslotClassStyle(day as unknown as Record<string, unknown>, splitTimes.value[0][t], d, t))
    for (let t = 0; t < splitTimes.value[1].length; ++t)
      out.push(
        getTimeTimeslotClassStyle(
          day as unknown as Record<string, unknown>, splitTimes.value[1][t], d, t + splitTimes.value[0].length
        )
      )
  }
  return out
})

const dayTimeslotClassStyle = computed(() =>
  monthDays.value.map((day, i) => getDayTimeslotClassStyle(day.dateObject, i))
)

const timeslotVon = computed(() => {
  const vons: Record<string, () => void>[] = []
  for (let d = 0; d < days.value.length; ++d)
    for (let t = 0; t < times.value.length; ++t)
      vons.push(getTimeslotVon(t, d))
  return vons
})

const dayTimeslotVon = computed(() =>
  monthDays.value.map((_day, i) => getTimeslotVon(Math.floor(i / 7), i % 7))
)

// ── Local helper functions ──────────────────────────────────────────────
function getTimeslotClassStyle(
  date: Date | null,
  row: number,
  col: number
): { class: string; style: Record<string, string> } {
  let c = ""
  const s: Record<string, string> = {}
  if (!date) return { class: c, style: s }

  const timeslotRespondents =
    responsesFormatted.value.get(date.getTime()) ?? new Set<string>()

  if (isSignUp.value) {
    c += "tw-bg-light-gray "
    return { class: c, style: s }
  }

  if (
    (!overlayAvailability.value && state.value === states.EDIT_AVAILABILITY) ||
    state.value === states.SET_SPECIFIC_TIMES
  ) {
    s.backgroundColor = "#E523230D"
    const inRange = inDragRange(row, col)
    if (inRange) {
      if (dragType.value === DRAG_TYPES.ADD) {
        if (state.value === states.SET_SPECIFIC_TIMES) {
          c += "tw-bg-white "
        } else if (availabilityType.value === availabilityTypes.AVAILABLE) {
          s.backgroundColor = "#00994C77"
        } else {
          c += "tw-bg-yellow "
        }
      } else if (state.value === states.SET_SPECIFIC_TIMES) {
        c += "tw-bg-gray "
      }
    } else {
      if (state.value === states.SET_SPECIFIC_TIMES) {
        c += tempTimes.value.has(date.getTime()) ? "tw-bg-white " : "tw-bg-gray "
      } else {
        if (availability.value.has(date.getTime())) s.backgroundColor = "#00994C77"
        else if (ifNeeded.value.has(date.getTime())) c += "tw-bg-yellow "
      }
    }
  }

  if (state.value === states.SINGLE_AVAILABILITY) {
    const respondent = curRespondent.value
    if (timeslotRespondents.has(respondent)) {
      if (parsedResponses.value[respondent].ifNeeded?.has(date.getTime())) {
        c += "tw-bg-yellow "
      } else {
        s.backgroundColor = "#00994C77"
      }
    } else {
      s.backgroundColor = "#E523230D"
    }
    return { class: c, style: s }
  }

  if (
    overlayAvailability.value ||
    state.value === states.BEST_TIMES ||
    state.value === states.HEATMAP ||
    state.value === states.SCHEDULE_EVENT ||
    state.value === states.SUBSET_AVAILABILITY
  ) {
    let numRespondents = 0
    let maxVal = 0
    if (
      state.value === states.BEST_TIMES ||
      state.value === states.HEATMAP ||
      state.value === states.SCHEDULE_EVENT
    ) {
      numRespondents = timeslotRespondents.size
      maxVal = max.value
    } else if (state.value === states.SUBSET_AVAILABILITY) {
      numRespondents = [...timeslotRespondents].filter((r) =>
        curRespondentsSet.value.has(r)
      ).length
      maxVal = curRespondentsMax.value
    } else if (overlayAvailability.value) {
      if (
        (userHasResponded.value || props.curGuestId.length > 0) &&
        timeslotRespondents.has(mainStore.authUser?._id ?? props.curGuestId)
      ) {
        numRespondents = timeslotRespondents.size - 1
        maxVal = max.value
      } else {
        numRespondents = timeslotRespondents.size
        maxVal = max.value
      }
    }

    const totalRespondents =
      state.value === states.SUBSET_AVAILABILITY
        ? curRespondents.value.length
        : respondents.value.length

    if (defaultState.value === states.BEST_TIMES) {
      if (maxVal > 0 && numRespondents === maxVal) {
        s.backgroundColor =
          totalRespondents === 1 || overlayAvailability.value
            ? "#00994C88"
            : "#00994C"
      }
    } else if (defaultState.value === states.HEATMAP) {
      if (numRespondents > 0) {
        if (totalRespondents === 1) {
          const rid =
            state.value === states.SUBSET_AVAILABILITY
              ? curRespondents.value[0]
              : respondents.value[0]._id
          if (rid && parsedResponses.value[rid].ifNeeded?.has(date.getTime())) {
            c += "tw-bg-yellow "
          } else {
            s.backgroundColor = "#00994C88"
          }
        } else {
          const frac = numRespondents / maxVal
          let alpha: string
          if (!overlayAvailability.value) {
            alpha = Math.floor(frac * (255 - 30))
              .toString(16)
              .toUpperCase()
              .substring(0, 2)
              .padStart(2, "0")
            if (
              frac === 1 &&
              ((curRespondents.value.length > 0 &&
                maxVal === curRespondents.value.length) ||
                (curRespondents.value.length === 0 &&
                  maxVal === respondents.value.length))
            ) {
              alpha = "FF"
            }
          } else {
            alpha = Math.floor(frac * (255 - 85))
              .toString(16)
              .toUpperCase()
              .substring(0, 2)
              .padStart(2, "0")
          }
          s.backgroundColor = "#00994C" + alpha
        }
      } else if (totalRespondents === 1) {
        s.backgroundColor = "#E523230D"
      }
    }
  }
  return { class: c, style: s }
}

function getTimeTimeslotClassStyle(
  _day: Record<string, unknown>,
  _time: { hoursOffset: number },
  d: number,
  t: number
): { class: string; style: Record<string, string> } {
  const row = t
  const col = d
  const date = getDateFromRowCol(row, col)
  const cs = getTimeslotClassStyle(date, row, col)
  const isFirstSplit = t < splitTimes.value[0].length
  const isDisabled = !date

  if (props.animateTimeslotAlways || availabilityAnimEnabled.value) {
    cs.class += "animate-bg-color "
  }
  cs.style.height = `${String(timeslotHeight.value)}px`

  if (
    (respondents.value.length > 0 ||
      editing.value ||
      state.value === states.SET_SPECIFIC_TIMES) &&
    curTimeslot.value.row === row &&
    curTimeslot.value.col === col &&
    !isDisabled
  ) {
    cs.class += "tw-border tw-border-dashed tw-border-black tw-z-10 "
  } else {
    if (date) {
      const localDate = new Date(date.getTime() - timezoneOffset.value * 60 * 1000)
      const frac = localDate.getMinutes()
      if (frac === 0) cs.class += "tw-border-t "
      else if (frac === 30) {
        cs.class += "tw-border-t "
        cs.style.borderTopStyle = "dashed"
      }
    }
    cs.class += "tw-border-r "
    if (col === 0 || !isColConsecutive(col)) cs.class += "tw-border-l tw-border-l-gray "
    if (col === days.value.length - 1 || !isColConsecutive(col + 1))
      cs.class += "tw-border-r-gray "
    if (isFirstSplit && row === 0) cs.class += "tw-border-t tw-border-t-gray "
    if (!isFirstSplit && row === splitTimes.value[0].length)
      cs.class += "tw-border-t tw-border-t-gray "
    if (isFirstSplit && row === splitTimes.value[0].length - 1)
      cs.class += "tw-border-b tw-border-b-gray "
    if (
      !isFirstSplit &&
      row === splitTimes.value[0].length + splitTimes.value[1].length - 1
    )
      cs.class += "tw-border-b tw-border-b-gray "

    const total =
      state.value === states.SUBSET_AVAILABILITY
        ? curRespondents.value.length
        : respondents.value.length
    if (
      state.value === states.EDIT_AVAILABILITY ||
      state.value === states.SINGLE_AVAILABILITY ||
      total === 1
    ) {
      cs.class += "tw-border-[#999999] "
    } else {
      cs.class += "tw-border-[#DDDDDD99] "
    }
  }

  if (isDisabled) cs.class += "tw-bg-light-gray-stroke tw-border-light-gray-stroke "
  if (cs.style.backgroundColor === "#E523230D") cs.style.backgroundColor = "#E5232333"
  return cs
}

function getDayTimeslotClassStyle(
  date: Date,
  i: number
): { class: string; style: Record<string, string> } {
  const row = Math.floor(i / 7)
  const col = i % 7
  let cs: { class: string; style: Record<string, string> }

  if (monthDayIncluded.value.get(date.getTime())) {
    cs = getTimeslotClassStyle(date, row, col)
    if (state.value === states.EDIT_AVAILABILITY) cs.class += "tw-cursor-pointer "
    const bg = cs.style.backgroundColor
    if (bg && lightOrDark(removeTransparencyFromHex(bg)) === "dark") {
      cs.class += "tw-text-white "
    }
  } else {
    cs = { class: "tw-bg-off-white tw-text-gray ", style: {} }
  }

  if (cs.style.backgroundColor === "#E523230D") cs.style.backgroundColor = "#E523233B"

  if (
    (respondents.value.length > 0 || state.value === states.EDIT_AVAILABILITY) &&
    curTimeslot.value.row === row &&
    curTimeslot.value.col === col &&
    monthDayIncluded.value.get(date.getTime())
  ) {
    cs.class += "tw-outline-2 tw-outline-dashed tw-outline-black tw-z-10 "
  } else {
    if (col === 0) cs.class += "tw-border-l tw-border-l-gray "
    cs.class += "tw-border-r tw-border-r-gray "
    if (col !== 6) cs.style.borderRightStyle = "dashed"
    if (row === 0) cs.class += "tw-border-t tw-border-t-gray "
    cs.class += "tw-border-b tw-border-b-gray "
    if (row !== Math.floor(monthDays.value.length / 7))
      cs.style.borderBottomStyle = "dashed"
  }
  return cs
}

function getTimeslotVon(row: number, col: number): Record<string, () => void> {
  if (!props.interactable) return {}
  return {
    click: () => {
      if (timeslotSelected.value) {
        if (row === curTimeslot.value.row && col === curTimeslot.value.col) {
          timeslotSelected.value = false
        }
      } else if (
        state.value !== states.EDIT_AVAILABILITY &&
        (userHasResponded.value || guestAddedAvailability.value)
      ) {
        timeslotSelected.value = true
      }
      showAvailability(row, col)
    },
    mousedown: () => {
      if (
        state.value === defaultState.value &&
        ((!isPhone.value &&
          !(userHasResponded.value || guestAddedAvailability.value)) ||
          respondents.value.length === 0)
      ) {
        emit("highlightAvailabilityBtn")
      }
    },
    mouseover: () => {
      if (!timeslotSelected.value) {
        showAvailability(row, col)
        if (!props.event.daysOnly) {
          const date = getDateFromRowCol(row, col)
          if (date) {
            date.setTime(date.getTime() - timezoneOffset.value * 60 * 1000)
            const start = dayjs(date).utc()
            const end = dayjs(date)
              .utc()
              .add(timeslotDuration.value, "minutes")
            const tf = timeType.value === timeTypes.HOUR12 ? "h:mm A" : "HH:mm"
            const df = grid.isSpecificDates.value ? "ddd, MMM D, YYYY" : "ddd"
            tooltipContent.value = `${start.format(df)} ${start.format(tf)} to ${end.format(tf)}`
          }
        }
      }
    },
    mouseleave: () => {
      tooltipContent.value = ""
    },
  }
}

function getIsTimeBlockInFirstSplit(timeBlock: { hoursOffset: number }): boolean {
  const s0 = splitTimes.value[0]
  return (
    s0.length > 0 &&
    timeBlock.hoursOffset >= s0[0].hoursOffset &&
    timeBlock.hoursOffset <= s0[s0.length - 1].hoursOffset
  )
}

function getTimeBlockStyle(
  timeBlock: { hoursOffset?: number; hoursLength?: number } & Record<string, unknown>
): Record<string, string> {
  const style: Record<string, string> = {}
  const s0 = splitTimes.value[0]
  const hasSecondSplit = splitTimes.value[1].length > 0
  const hoursOffset = timeBlock.hoursOffset ?? 0
  const hoursLength = timeBlock.hoursLength ?? 0
  if (!hasSecondSplit || getIsTimeBlockInFirstSplit(timeBlock as { hoursOffset: number; hoursLength: number })) {
    style.top = `calc(${String(hoursOffset - (s0[0]?.hoursOffset ?? 0))} * ${String(HOUR_HEIGHT)}px)`
    style.height = `calc(${String(hoursLength)} * ${String(HOUR_HEIGHT)}px)`
  } else {
    const s1 = splitTimes.value[1]
    style.top = `calc(${String(s0.length)} * ${String(timeslotHeight.value)}px + ${String(SPLIT_GAP_HEIGHT)}px + ${String(
      hoursOffset - (s1[0]?.hoursOffset ?? 0)
    )} * ${String(HOUR_HEIGHT)}px)`
    style.height = `calc(${String(hoursLength)} * ${String(HOUR_HEIGHT)}px)`
  }
  return style
}

function startEditing() {
  state.value = isSignUp.value ? states.EDIT_SIGN_UP_BLOCKS : states.EDIT_AVAILABILITY
  availabilityType.value = availabilityTypes.AVAILABLE
  availability.value = new Set()
  ifNeeded.value = new Set()
  if (mainStore.authUser && !props.addingAvailabilityAsGuest) {
    resetCurUserAvailability()
  }
  void nextTick(() => (unsavedChanges.value = false))
  pageHasChanged.value = false
}

function _stopEditing() {
  state.value = defaultState.value
  stopAvailabilityAnim()
  availabilityType.value = availabilityTypes.AVAILABLE
  overlayAvailability.value = false
}

function refreshEvent() {
  emit("refreshEvent")
}

function editGuestAvailability(id: string) {
  if (mainStore.authUser) {
    emit("addAvailabilityAsGuest")
  } else {
    startEditing()
  }
  void nextTick(() => {
    populateUserAvailability(id)
    emit("setCurGuestId", id)
  })
}

function handleDeleteAvailability() {
  emit('deleteAvailability')
  deleteAvailabilityDialog.value = false
}

function openEditGuestNameDialog() {
  newGuestName.value = props.curGuestId
  editGuestNameDialog.value = true
}

async function saveGuestName() {
  const name = newGuestName.value.trim()
  if (name.length === 0) {
    mainStore.showError("Guest name cannot be empty")
    return
  }
  if (name === props.curGuestId) {
    editGuestNameDialog.value = false
    return
  }
  try {
    await post(`/events/${props.event._id ?? ""}/rename-user`, {
      oldName: props.curGuestId,
      newName: name,
    })
    localStorage[guestNameKey.value] = name
    mainStore.showInfo("Guest name updated successfully")
    editGuestNameDialog.value = false
    emit("setCurGuestId", name)
    refreshEvent()
  } catch (err: unknown) {
    const e = err as { parsed?: { error?: string }; message?: string }
    mainStore.showError(e.parsed?.error ?? e.message ?? "Failed to update guest name")
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────
resetCurUserAvailability(initSharedCalendarAccounts)

let _resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)

  if (
    props.event.hasSpecificTimes &&
    (props.fromEditEvent || !props.event.times || props.event.times.length === 0)
  ) {
    state.value = states.SET_SPECIFIC_TIMES
  } else if (urlParams.get("scheduled_event")) {
    const se = JSON.parse(urlParams.get("scheduled_event") ?? "") as ScheduledEvent
    curScheduledEvent.value = se
    state.value = states.SCHEDULE_EVENT
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete("scheduled_event")
    window.history.replaceState({}, document.title, newUrl.toString())
  } else if (showBestTimes.value) {
    state.value = states.BEST_TIMES
  } else {
    state.value = states.HEATMAP
  }

  const authUser = mainStore.authUser
  if (authUser) {
    bufferTime.value = (authUser.calendarOptions?.bufferTime ?? { enabled: false, time: 15 }) as { enabled: boolean; time: number }
    workingHours.value = (authUser.calendarOptions?.workingHours ?? { enabled: false, startTime: 9, endTime: 17 }) as { enabled: boolean; startTime: number; endTime: number }
    if (isGroup.value) {
      const responses = props.event.responses as Record<string, { calendarOptions?: CalendarOptions }> | undefined
      const groupOpts: CalendarOptions | undefined = responses?.[authUser._id ?? ""]?.calendarOptions
      if (groupOpts) {
        bufferTime.value = groupOpts.bufferTime
        workingHours.value = groupOpts.workingHours
      } else {
        bufferTime.value = { enabled: false, time: 15 }
        workingHours.value = { enabled: false, startTime: 9, endTime: 17 }
      }
    }
  }

  setTimeslotSize()
  addEventListener("resize", onResize)
  addEventListener("scroll", onScroll)

  const dragSection = document.getElementById("drag-section")
  if (dragSection) {
    _resizeObserver = new ResizeObserver(() => { setTimeslotSize(); })
    _resizeObserver.observe(dragSection)
  }

  if (!props.calendarOnly && dragSection) {
    if (isTouchEnabled()) {
      dragSection.addEventListener("touchstart", startDrag)
      dragSection.addEventListener("touchmove", moveDrag)
      dragSection.addEventListener("touchend", endDrag)
      dragSection.addEventListener("touchcancel", endDrag)
    }
    dragSection.addEventListener("mousedown", startDrag)
    dragSection.addEventListener("mousemove", moveDrag)
    dragSection.addEventListener("mouseup", endDrag)
  }

  signUpForm.resetSignUpForm()
  addEventListener("click", deselectRespondents)
})

onBeforeUnmount(() => {
  removeEventListener("click", deselectRespondents)
  removeEventListener("resize", onResize)
  removeEventListener("scroll", onScroll)
  _resizeObserver?.disconnect()
})

defineExpose({
  editing,
  scheduling: _scheduling,
  allowScheduleEvent,
  unsavedChanges,
  selectedGuestRespondent: _selectedGuestRespondent,
  pageHasChanged,
  hasPages: _hasPages,
  respondents,
  state,
  states,
  startEditing,
  stopEditing: _stopEditing,
  setAvailabilityAutomatically: _setAvailabilityAutomatically,
  populateUserAvailability,
  submitAvailability: _submitAvailability,
  submitNewSignUpBlocks: _submitNewSignUpBlocks,
  deleteAvailability: _deleteAvailability,
  resetCurUserAvailability,
  resetSignUpForm: _resetSignUpForm,
  scheduleEvent,
  cancelScheduleEvent,
  confirmScheduleEvent,
  getAllValidTimeRanges: _getAllValidTimeRanges,
})
</script>

<style scoped>
.animate-bg-color {
  transition: background-color 0.25s ease-in-out;
}

.break {
  flex-basis: 100%;
  height: 0;
}
</style>

<style>
/* Make timezone select element the same width as content */
#timezone-select {
  width: 5px;
}
</style>
