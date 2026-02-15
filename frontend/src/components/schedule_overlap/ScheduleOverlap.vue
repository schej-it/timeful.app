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
                <DaysOnlyCalendar
                  :event="event"
                  :page="page"
                  :month-days="monthDays"
                  :day-timeslot-class-style="dayTimeslotClassStyle"
                  :day-timeslot-von="dayTimeslotVon"
                  :has-prev-page="hasPrevPage"
                  :has-next-page="hasNextPage"
                  :days-of-week="daysOfWeek"
                  :hint-text="hintText"
                  :hint-text-shown="hintTextShown"
                  :is-phone="isPhone"
                  @prevPage="prevPage"
                  @nextPage="nextPage"
                  @resetCurTimeslot="resetCurTimeslot"
                  @closeHint="closeHint"
                />

                <ToolRow
                  v-if="!isPhone && !calendarOnly"
                  :event="event"
                  :state="state"
                  :states="states"
                  :cur-timezone.sync="curTimezone"
                  :show-best-times.sync="showBestTimes"
                  :hide-if-needed.sync="hideIfNeeded"
                  :is-weekly="isWeekly"
                  :calendar-permission-granted="calendarPermissionGranted"
                  :week-offset="weekOffset"
                  :num-responses="respondents.length"
                  :mobile-num-days.sync="mobileNumDays"
                  :allow-schedule-event="allowScheduleEvent"
                  :show-event-options="showEventOptions"
                  :time-type.sync="timeType"
                  @toggleShowEventOptions="toggleShowEventOptions"
                  @update:weekOffset="(val) => $emit('update:weekOffset', val)"
                  @scheduleEvent="scheduleEvent"
                  @cancelScheduleEvent="cancelScheduleEvent"
                  @confirmScheduleEvent="confirmScheduleEvent"
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
                    :key="i"
                    :id="time.id"
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
                      :key="i"
                      :id="time.id"
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
                  @scroll="onCalendarScroll"
                  class="tw-relative tw-flex tw-flex-col"
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
                    <template v-for="(day, i) in days">
                      <div
                        v-if="!day.isConsecutive"
                        :style="{ width: `${SPLIT_GAP_WIDTH}px` }"
                        :key="`${i}-gap`"
                      ></div>
                      <div :key="i" class="tw-flex-1 tw-bg-white">
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

                        <template v-for="(day, d) in days">
                          <div
                            v-if="!day.isConsecutive"
                            :style="{ width: `${SPLIT_GAP_WIDTH}px` }"
                            :key="`${d}-gap`"
                          ></div>
                          <div
                            :key="d"
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
                              v-for="calendarEvent in calendarEventsByDay[
                                d + page * maxDaysPerPage
                              ]"
                            >
                              <CalendarEventBlock
                                :blockStyle="getTimeBlockStyle(calendarEvent)"
                                :key="calendarEvent.id"
                                :calendarEvent="calendarEvent"
                                :isGroup="isGroup"
                                :isEditingAvailability="
                                  state === states.EDIT_AVAILABILITY
                                "
                                :noEventNames="noEventNames"
                                :transitionName="
                                  isGroup ? '' : 'fade-transition'
                                "
                              />
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
                                  titleOnly
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
                                  @click="handleSignUpBlockClick(block)"
                                >
                                  <SignUpCalendarBlock :signUpBlock="block" />
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
                                    titleOnly
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
                    :key="hintText"
                    v-if="!isPhone && hintTextShown"
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
                  :event="event"
                  :state="state"
                  :states="states"
                  :cur-timezone.sync="curTimezone"
                  :show-best-times.sync="showBestTimes"
                  :hide-if-needed.sync="hideIfNeeded"
                  :is-weekly="isWeekly"
                  :calendar-permission-granted="calendarPermissionGranted"
                  :week-offset="weekOffset"
                  :num-responses="respondents.length"
                  :mobile-num-days.sync="mobileNumDays"
                  :allow-schedule-event="allowScheduleEvent"
                  :show-event-options="showEventOptions"
                  :time-type.sync="timeType"
                  @toggleShowEventOptions="toggleShowEventOptions"
                  @update:weekOffset="(val) => $emit('update:weekOffset', val)"
                  @scheduleEvent="scheduleEvent"
                  @cancelScheduleEvent="cancelScheduleEvent"
                  @confirmScheduleEvent="confirmScheduleEvent"
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
                :signUpBlocks="signUpBlocksByDay.flat()"
                :signUpBlocksToAdd="signUpBlocksToAddByDay.flat()"
                :isEditing="state == states.EDIT_SIGN_UP_BLOCKS"
                :isOwner="isOwner"
                :alreadyResponded="alreadyRespondedToSignUpForm"
                :anonymous="event.blindAvailabilityEnabled"
                @update:signUpBlock="editSignUpBlock"
                @delete:signUpBlock="deleteSignUpBlock"
                @signUpForBlock="$emit('signUpForBlock', $event)"
              />
            </template>
            <template v-else-if="state === states.SET_SPECIFIC_TIMES">
              <SpecificTimesInstructions
                v-if="!isPhone"
                :numTempTimes="tempTimes.size"
                @saveTempTimes="saveTempTimes"
              />
            </template>
            <template v-else>
              <EditAvailabilitySidebar
                v-if="state == states.EDIT_AVAILABILITY"
                :event="event"
                :auth-user="authUser"
                :cur-guest-id="curGuestId"
                :adding-availability-as-guest="addingAvailabilityAsGuest"
                :user-has-responded="userHasResponded"
                :calendar-permission-granted="calendarPermissionGranted"
                :is-group="isGroup"
                :is-phone="isPhone"
                :calendar-events-map="calendarEventsMap"
                :shared-calendar-accounts="sharedCalendarAccounts"
                :availability-type.sync="availabilityType"
                :overlay-availability.sync="overlayAvailability"
                :show-overlay-availability-toggle="showOverlayAvailabilityToggle"
                :show-calendar-options="showCalendarOptions"
                :can-edit-guest-name="canEditGuestName"
                :buffer-time.sync="bufferTime"
                :working-hours.sync="workingHours"
                :cur-timezone="curTimezone"
                :guest-name-key="guestNameKey"
                @deleteAvailability="$emit('deleteAvailability')"
                @toggleCalendarAccount="toggleCalendarAccount"
                @toggleSubCalendarAccount="toggleSubCalendarAccount"
                @setCurGuestId="$emit('setCurGuestId', $event)"
                @refreshEvent="refreshEvent"
              />
              <template v-else>
                <RespondentsList
                  ref="respondentsList"
                  :event="event"
                  :eventId="event._id"
                  :days="allDays"
                  :times="times"
                  :curDate="getDateFromRowCol(curTimeslot.row, curTimeslot.col)"
                  :curRespondent="curRespondent"
                  :curRespondents="curRespondents"
                  :curTimeslot="curTimeslot"
                  :curTimeslotAvailability="curTimeslotAvailability"
                  :respondents="respondents"
                  :parsedResponses="parsedResponses"
                  :isOwner="isOwner"
                  :isGroup="isGroup"
                  :attendees="event.attendees"
                  :showCalendarEvents.sync="showCalendarEvents"
                  :responsesFormatted="responsesFormatted"
                  :timezone="curTimezone"
                  :show-best-times.sync="showBestTimes"
                  :hide-if-needed.sync="hideIfNeeded"
                  :start-calendar-on-monday.sync="startCalendarOnMonday"
                  :show-event-options="showEventOptions"
                  :guestAddedAvailability="guestAddedAvailability"
                  :addingAvailabilityAsGuest="addingAvailabilityAsGuest"
                  @toggleShowEventOptions="toggleShowEventOptions"
                  @addAvailability="$emit('addAvailability')"
                  @addAvailabilityAsGuest="$emit('addAvailabilityAsGuest')"
                  @mouseOverRespondent="mouseOverRespondent"
                  @mouseLeaveRespondent="mouseLeaveRespondent"
                  @clickRespondent="clickRespondent"
                  @editGuestAvailability="editGuestAvailability"
                  @refreshEvent="refreshEvent"
                />
              </template>
            </template>
          </div>
        </div>

        <ToolRow
          v-if="isPhone && !calendarOnly"
          class="tw-px-4"
          :event="event"
          :state="state"
          :states="states"
          :cur-timezone.sync="curTimezone"
          :show-best-times.sync="showBestTimes"
          :hide-if-needed.sync="hideIfNeeded"
          :start-calendar-on-monday.sync="startCalendarOnMonday"
          :is-weekly="isWeekly"
          :calendar-permission-granted="calendarPermissionGranted"
          :week-offset="weekOffset"
          :num-responses="respondents.length"
          :mobile-num-days.sync="mobileNumDays"
          :allow-schedule-event="allowScheduleEvent"
          :show-event-options="showEventOptions"
          :time-type.sync="timeType"
          @toggleShowEventOptions="toggleShowEventOptions"
          @update:weekOffset="(val) => $emit('update:weekOffset', val)"
          @scheduleEvent="scheduleEvent"
          @cancelScheduleEvent="cancelScheduleEvent"
          @confirmScheduleEvent="confirmScheduleEvent"
        />

        <!-- Fixed bottom section for mobile -->
        <div
          v-if="isPhone && !calendarOnly"
          class="tw-fixed tw-bottom-16 tw-z-20 tw-w-full"
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
                  class="tw-w-full"
                  v-model="availabilityType"
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
                  @update:weekOffset="(val) => $emit('update:weekOffset', val)"
                  :start-on-monday="event.startOnMonday"
                />
              </div>
            </div>
          </v-expand-transition>

          <!-- Respondents list -->
          <v-expand-transition>
            <div v-if="delayedShowStickyRespondents">
              <div class="tw-bg-white tw-p-4">
                <RespondentsList
                  :max-height="100"
                  :event="event"
                  :eventId="event._id"
                  :days="allDays"
                  :times="times"
                  :curDate="getDateFromRowCol(curTimeslot.row, curTimeslot.col)"
                  :curRespondent="curRespondent"
                  :curRespondents="curRespondents"
                  :curTimeslot="curTimeslot"
                  :curTimeslotAvailability="curTimeslotAvailability"
                  :respondents="respondents"
                  :parsedResponses="parsedResponses"
                  :isOwner="isOwner"
                  :isGroup="isGroup"
                  :attendees="event.attendees"
                  :showCalendarEvents.sync="showCalendarEvents"
                  :responsesFormatted="responsesFormatted"
                  :timezone="curTimezone"
                  :show-best-times.sync="showBestTimes"
                  :hide-if-needed.sync="hideIfNeeded"
                  :show-event-options="showEventOptions"
                  :guestAddedAvailability="guestAddedAvailability"
                  :addingAvailabilityAsGuest="addingAvailabilityAsGuest"
                  @toggleShowEventOptions="toggleShowEventOptions"
                  @addAvailability="$emit('addAvailability')"
                  @addAvailabilityAsGuest="$emit('addAvailabilityAsGuest')"
                  @mouseOverRespondent="mouseOverRespondent"
                  @mouseLeaveRespondent="mouseLeaveRespondent"
                  @clickRespondent="clickRespondent"
                  @editGuestAvailability="editGuestAvailability"
                  @refreshEvent="refreshEvent"
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
                :numTempTimes="tempTimes.size"
                @saveTempTimes="saveTempTimes"
              />
            </div>
          </v-expand-transition>
        </div>
      </div>
    </Tooltip>
  </span>
</template>

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

<script>
import {
  timeNumToTimeText,
  getDateHoursOffset,
  put,
  isPhone,
  utcTimeToLocalTime,
  dateToDowDate,
  isElementInViewport,
  lightOrDark,
  removeTransparencyFromHex,
  userPrefers12h,
  getCalendarAccountKey,
  prefersStartOnMonday,
} from "@/utils"
import {
  availabilityTypes,
  calendarOptionsDefaults,
  eventTypes,
  guestUserId,
  timeTypes,
  timeslotDurations,
} from "@/constants"
import { mapMutations, mapActions, mapState } from "vuex"
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import Advertisement from "@/components/event/Advertisement.vue"
import SignUpBlock from "@/components/sign_up_form/SignUpBlock.vue"
import SignUpCalendarBlock from "@/components/sign_up_form/SignUpCalendarBlock.vue"
import SignUpBlocksList from "@/components/sign_up_form/SignUpBlocksList.vue"
import ZigZag from "./ZigZag.vue"
import ConfirmDetailsDialog from "./ConfirmDetailsDialog.vue"
import ToolRow from "./ToolRow.vue"
import RespondentsList from "./RespondentsList.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import Tooltip from "../Tooltip.vue"

import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import CalendarEventBlock from "./CalendarEventBlock.vue" // Added import
import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"
import DaysOnlyCalendar from "./DaysOnlyCalendar.vue"
import EditAvailabilitySidebar from "./EditAvailabilitySidebar.vue"
import dragMixin from "./mixins/dragMixin.js"
import availabilityMixin from "./mixins/availabilityMixin.js"
import signUpMixin from "./mixins/signUpMixin.js"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

export default {
  name: "ScheduleOverlap",
  mixins: [dragMixin, availabilityMixin, signUpMixin],
  props: {
    event: { type: Object, required: true },
    fromEditEvent: { type: Boolean, default: false },

    loadingCalendarEvents: { type: Boolean, default: false }, // Whether we are currently loading the calendar events
    calendarEventsMap: { type: Object, default: () => {} }, // Object of different users' calendar events
    sampleCalendarEventsByDay: { type: Array, required: false }, // Sample calendar events to use for example calendars
    calendarPermissionGranted: { type: Boolean, default: false }, // Whether user has granted google calendar permissions

    weekOffset: { type: Number, default: 0 }, // Week offset used for displaying calendar events on weekly Timefuls

    alwaysShowCalendarEvents: { type: Boolean, default: false }, // Whether to show calendar events all the time
    noEventNames: { type: Boolean, default: false }, // Whether to show "busy" instead of the event name
    calendarOnly: { type: Boolean, default: false }, // Whether to only show calendar and not respondents or any other controls
    interactable: { type: Boolean, default: true }, // Whether to allow user to interact with component
    showSnackbar: { type: Boolean, default: true }, // Whether to show snackbar when availability is automatically filled in
    animateTimeslotAlways: { type: Boolean, default: false }, // Whether to animate timeslots all the time
    showHintText: { type: Boolean, default: true }, // Whether to show the hint text telling user what to do

    curGuestId: { type: String, default: "" }, // Id of the current guest being edited
    addingAvailabilityAsGuest: { type: Boolean, default: false }, // Whether the signed in user is adding availability as a guest

    initialTimezone: { type: Object, default: () => ({}) },

    // Availability Groups
    calendarAvailabilities: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      states: {
        HEATMAP: "heatmap", // Display heatmap of availabilities
        SINGLE_AVAILABILITY: "single_availability", // Show one person's availability
        SUBSET_AVAILABILITY: "subset_availability", // Show availability for a subset of people
        BEST_TIMES: "best_times", // Show only the times that work for most people
        EDIT_AVAILABILITY: "edit_availability", // Edit current user's availability
        EDIT_SIGN_UP_BLOCKS: "edit_sign_up_blocks", // Edit the slots on a sign up form
        SCHEDULE_EVENT: "schedule_event", // Schedule event on gcal
        SET_SPECIFIC_TIMES: "set_specific_times", // Set specific times for the event
      },
      state: "best_times",

      availability: new Set(), // The current user's availability
      ifNeeded: new Set(), // The current user's "if needed" availability
      tempTimes: new Set(), // The specific times that the user has selected for the event (pending save)
      unsavedChanges: false, // If there are unsaved availability changes
      curTimeslot: { row: -1, col: -1 }, // The currently highlighted timeslot
      timeslotSelected: false, // Whether a timeslot is selected (used to persist selection on desktop)
      curTimeslotAvailability: {}, // The users available for the current timeslot
      curRespondent: "", // Id of the active respondent (set on hover)
      curRespondents: [], // Id of currently selected respondents (set on click)
      sharedCalendarAccounts: {}, // The user's calendar accounts for changing calendar options for groups
      tooltipContent: "", // The content of the tooltip

      /* Edit options */
      availabilityType: availabilityTypes.AVAILABLE, // The current availability type
      overlayAvailability: false, // Whether to overlay everyone's availability when editing
      bufferTime: calendarOptionsDefaults.bufferTime, // Set in mounted()
      workingHours: calendarOptionsDefaults.workingHours, // Set in mounted()

      /* Event Options */
      showEventOptions:
        localStorage["showEventOptions"] == undefined
          ? false
          : localStorage["showEventOptions"] == "true",
      showBestTimes:
        localStorage["showBestTimes"] == undefined
          ? false
          : localStorage["showBestTimes"] == "true",
      hideIfNeeded: false,

      /* Variables for options */
      curTimezone: this.initialTimezone,
      curScheduledEvent: null, // The scheduled event represented in the form {hoursOffset, hoursLength, dayIndex}
      timeType:
        localStorage["timeType"] ??
        (userPrefers12h() ? timeTypes.HOUR12 : timeTypes.HOUR24), // Whether 12-hour or 24-hour
      showCalendarEvents: false,
      startCalendarOnMonday: prefersStartOnMonday(),

      /* Variables for scrolling */
      optionsVisible: false,
      calendarScrollLeft: 0, // The current scroll position of the calendar
      calendarMaxScroll: 0, // The maximum scroll amount of the calendar, scrolling to this point means we have scrolled to the end
      scrolledToRespondents: false, // whether we have scrolled to the respondents section
      delayedShowStickyRespondents: false, // showStickyRespondents variable but changes 100ms after the actual variable changes (to add some delay)
      delayedShowStickyRespondentsTimeout: null, // Timeout that sets delayedShowStickyRespondents

      /* Variables for pagination */
      page: 0,
      mobileNumDays: localStorage["mobileNumDays"]
        ? parseInt(localStorage["mobileNumDays"])
        : 3, // The number of days to show at a time on mobile
      pageHasChanged: false,

      /* Variables for hint */
      hintState: true,

      /** Groups */
      manualAvailability: {},

      /** Constants */
      months: [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ],
    }
  },
  computed: {
    ...mapState(["authUser", "overlayAvailabilitiesEnabled"]),
    /** Returns the width of the right side of the calendar */
    rightSideWidth() {
      if (this.isPhone) return "100%"
      return this.isSignUp ? "18rem" : "13rem"
    },
    /** Returns the days of the week in the correct order */
    daysOfWeek() {
      if (!this.event.daysOnly) {
        return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
      }
      return !this.startCalendarOnMonday
        ? ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
        : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    },
    /** Only allow scheduling when a curScheduledEvent exists */
    allowScheduleEvent() {
      return !!this.curScheduledEvent
    },
    curRespondentsSet() {
      return new Set(this.curRespondents)
    },

    /** Returns the max number of people in the curRespondents array available at any given time */
    curRespondentsMax() {
      let max = 0
      if (this.event.daysOnly) {
        for (const day of this.allDays) {
          const num = [
            ...(this.responsesFormatted.get(day.dateObject.getTime()) ??
              new Set()),
          ].filter((r) => this.curRespondentsSet.has(r)).length

          if (num > max) max = num
        }
      } else {
        for (let i = 0; i < this.event.dates.length; i++) {
          const date = new Date(this.event.dates[i])
          for (const time of this.times) {
            const num = [
              ...this.getRespondentsForHoursOffset(date, time.hoursOffset),
            ].filter((r) => this.curRespondentsSet.has(r)).length

            if (num > max) max = num
          }
        }
      }
      return max
    },
    /** Returns the day offset caused by the timezone offset. If the timezone offset changes the date, dayOffset != 0 */
    dayOffset() {
      return Math.floor((this.event.startTime - this.timezoneOffset / 60) / 24)
    },
    /** Returns all the days that are encompassed by startDate and endDate */
    allDays() {
      const days = []
      const datesSoFar = new Set()

      const getDateString = (date) => {
        let dateString = ""
        let dayString = ""
        const offsetDate = new Date(date)
        if (this.isSpecificTimes) {
          offsetDate.setTime(
            offsetDate.getTime() - this.timezoneOffset * 60 * 1000
          )
        } else {
          offsetDate.setDate(offsetDate.getDate() + this.dayOffset)
        }
        if (this.isSpecificDates) {
          dateString = `${
            this.months[offsetDate.getUTCMonth()]
          } ${offsetDate.getUTCDate()}`
          dayString = this.daysOfWeek[offsetDate.getUTCDay()]
        } else if (this.isGroup || this.isWeekly) {
          const tmpDate = dateToDowDate(
            this.event.dates,
            offsetDate,
            this.weekOffset,
            true
          )

          dateString = `${
            this.months[tmpDate.getUTCMonth()]
          } ${tmpDate.getUTCDate()}`
          dayString = this.daysOfWeek[tmpDate.getUTCDay()]
        }
        return { dateString, dayString }
      }

      if (
        this.isSpecificTimes &&
        (this.state === this.states.SET_SPECIFIC_TIMES ||
          this.event.times?.length === 0)
      ) {
        let prevDate = null // Stores the prevDate to check if the current date is consecutive to the previous date
        for (let i = 0; i < this.event.dates.length; ++i) {
          const date = new Date(this.event.dates[i])
          const localDate = new Date(
            date.getTime() - this.timezoneOffset * 60 * 1000
          )
          localDate.setUTCHours(0, 0, 0, 0)
          localDate.setTime(
            localDate.getTime() + this.timezoneOffset * 60 * 1000
          )

          if (!datesSoFar.has(localDate.getTime())) {
            datesSoFar.add(localDate.getTime())

            let isConsecutive = true
            if (prevDate) {
              isConsecutive =
                prevDate.getTime() === localDate.getTime() - 24 * 60 * 60 * 1000
            }
            const { dayString, dateString } = getDateString(localDate)
            days.push({
              dayText: dayString,
              dateString,
              dateObject: localDate,
              isConsecutive,
            })

            prevDate = new Date(localDate)
          }
        }
        return days
      }

      for (let i = 0; i < this.event.dates.length; ++i) {
        const date = new Date(this.event.dates[i])
        datesSoFar.add(date.getTime())

        const { dayString, dateString } = getDateString(date)
        days.push({
          dayText: dayString,
          dateString,
          dateObject: date,
        })
      }

      let dayIndex = 0
      for (let i = 0; i < this.event.dates.length; ++i) {
        const date = new Date(this.event.dates[i])
        // See if the date goes into the next day
        const localStart = new Date(
          date.getTime() - this.timezoneOffset * 60 * 1000
        )
        const localEnd = new Date(
          date.getTime() +
            this.event.duration * 60 * 60 * 1000 -
            this.timezoneOffset * 60 * 1000
        )
        const localEndIsMidnight =
          localEnd.getUTCHours() === 0 && localEnd.getUTCMinutes() === 0
        if (
          localStart.getUTCDate() !== localEnd.getUTCDate() &&
          !localEndIsMidnight
        ) {
          // The date goes into the next day. Split the date into two dates
          let nextDate = new Date(date)
          nextDate.setUTCDate(nextDate.getUTCDate() + 1)
          if (!datesSoFar.has(nextDate.getTime())) {
            datesSoFar.add(nextDate.getTime())

            const { dayString, dateString } = getDateString(nextDate)
            days.splice(dayIndex + 1, 0, {
              dayText: dayString,
              dateString,
              dateObject: nextDate,
              excludeTimes: true,
            })
            dayIndex++
          }
        }
        dayIndex++
      }

      let prevDate = null // Stores the prevDate to check if the current date is consecutive to the previous date
      for (let i = 0; i < days.length; ++i) {
        let isConsecutive = true
        if (prevDate) {
          isConsecutive =
            prevDate.getTime() ===
            days[i].dateObject.getTime() - 24 * 60 * 60 * 1000
        }

        days[i].isConsecutive = isConsecutive

        prevDate = new Date(days[i].dateObject)
      }

      return days
    },
    /** Returns a subset of all days based on the page number */
    days() {
      const slice = this.allDays.slice(
        this.page * this.maxDaysPerPage,
        (this.page + 1) * this.maxDaysPerPage
      )
      slice[0] = { ...slice[0], isConsecutive: true }
      return slice
    },
    /** Returns all the days of the month */
    monthDays() {
      const monthDays = []
      const allDaysSet = new Set(
        this.allDays.map((d) => d.dateObject.getTime())
      )

      // Calculate monthIndex and year from event start date and page num
      const date = new Date(this.event.dates[0])
      const monthIndex = date.getUTCMonth() + this.page
      const year = date.getUTCFullYear()

      const lastDayOfPrevMonth = new Date(Date.UTC(year, monthIndex, 0))
      const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))

      // Calculate num days from prev month, cur month, and next month to show
      const curDate = new Date(lastDayOfPrevMonth)
      let numDaysFromPrevMonth = 0
      const numDaysInCurMonth = lastDayOfCurMonth.getUTCDate()
      const numDaysFromNextMonth = 6 - lastDayOfCurMonth.getUTCDay()
      const hasDaysFromPrevMonth = !this.startCalendarOnMonday
        ? lastDayOfPrevMonth.getUTCDay() < 6
        : lastDayOfPrevMonth.getUTCDay() != 0
      if (hasDaysFromPrevMonth) {
        curDate.setUTCDate(
          curDate.getUTCDate() -
            (lastDayOfPrevMonth.getUTCDay() -
              (this.startCalendarOnMonday ? 1 : 0))
        )
        numDaysFromPrevMonth = lastDayOfPrevMonth.getUTCDay() + 1
      } else {
        curDate.setUTCDate(curDate.getUTCDate() + 1)
      }
      curDate.setUTCHours(this.event.startTime)

      // Add all days from prev month, cur month, and next month
      const totalDays =
        numDaysFromPrevMonth + numDaysInCurMonth + numDaysFromNextMonth
      for (let i = 0; i < totalDays; ++i) {
        // Only include days from the current month
        if (curDate.getUTCMonth() === lastDayOfCurMonth.getUTCMonth()) {
          monthDays.push({
            date: curDate.getUTCDate(),
            time: curDate.getTime(),
            dateObject: new Date(curDate),
            included: allDaysSet.has(curDate.getTime()),
          })
        } else {
          monthDays.push({
            date: "",
            time: curDate.getTime(),
            dateObject: new Date(curDate),
            included: false,
          })
        }

        curDate.setUTCDate(curDate.getUTCDate() + 1)
      }

      return monthDays
    },
    /** Map from datetime to whether that month day is included  */
    monthDayIncluded() {
      const includedMap = new Map()
      for (const monthDay of this.monthDays) {
        includedMap.set(monthDay.dateObject.getTime(), monthDay.included)
      }
      return includedMap
    },
    defaultState() {
      // Either the heatmap or the best_times state, depending on the toggle
      return this.showBestTimes ? this.states.BEST_TIMES : this.states.HEATMAP
    },
    editing() {
      // Returns whether currently in the editing state
      return (
        this.state === this.states.EDIT_AVAILABILITY ||
        this.state === this.states.EDIT_SIGN_UP_BLOCKS
      )
    },
    scheduling() {
      // Returns whether currently in the scheduling state
      return this.state === this.states.SCHEDULE_EVENT
    },
    isPhone() {
      return isPhone(this.$vuetify)
    },
    isOwner() {
      return this.authUser?._id === this.event.ownerId
    },
    isGuestEvent() {
      return this.event.ownerId === guestUserId
    },
    isSpecificDates() {
      return this.event.type === eventTypes.SPECIFIC_DATES || !this.event.type
    },
    isWeekly() {
      return this.event.type === eventTypes.DOW
    },
    isGroup() {
      return this.event.type === eventTypes.GROUP
    },
    isSignUp() {
      return this.event.isSignUpForm
    },
    isSpecificTimes() {
      return this.event.hasSpecificTimes
    },
    selectedGuestRespondent() {
      if (this.guestAddedAvailability) return this.guestName

      if (this.curRespondents.length !== 1) return ""

      const user = this.parsedResponses[this.curRespondents[0]].user
      return this.isGuest(user) ? user._id : ""
    },
    canEditGuestName() {
      return true
      // return this.isOwner || this.isGuestEvent // || this.curGuestId === this.selectedGuestRespondent
    },
    scheduledEventStyle() {
      const style = {}
      let top, height, isSecondSplit
      if (this.dragging) {
        top = this.dragStart.row
        height = this.dragCur.row - this.dragStart.row + 1
        isSecondSplit = this.dragStart.row >= this.splitTimes[0].length
      } else {
        top = this.curScheduledEvent.row
        height = this.curScheduledEvent.numRows
        isSecondSplit = this.curScheduledEvent.row >= this.splitTimes[0].length
      }

      if (isSecondSplit) {
        style.top = `calc(${top} * ${this.timeslotHeight}px + ${this.SPLIT_GAP_HEIGHT}px)`
      } else {
        style.top = `calc(${top} * ${this.timeslotHeight}px)`
      }
      style.height = `calc(${height} * ${this.timeslotHeight}px)`
      return style
    },
    signUpBlockBeingDraggedStyle() {
      const style = {}
      let top = 0,
        height = 0
      if (this.dragging) {
        top = this.dragStart.row
        height = this.dragCur.row - this.dragStart.row + 1
      }
      style.top = `calc(${top} * 1rem)`
      style.height = `calc(${height} * 1rem)`
      return style
    },
    /**
     * Returns a two dimensional array of times
     * IF endTime < startTime:
     * the first element is an array of times between 12am and end time and the second element is an array of times between start time and 12am
     * ELSE:
     * the first element is an array of times between start time and end time. the second element is an empty array
     * */
    splitTimes() {
      const splitTimes = [[], []]

      const utcStartTime = this.event.startTime
      const utcEndTime = this.event.startTime + this.event.duration
      const localStartTime = utcTimeToLocalTime(
        utcStartTime,
        this.timezoneOffset
      )
      const localEndTime = utcTimeToLocalTime(utcEndTime, this.timezoneOffset)

      // Weird timezones are timezones that are not a multiple of 60 minutes (e.g. GMT-2:30)
      const isWeirdTimezone = this.timezoneOffset % 60 !== 0
      const startTimeIsWeird = utcStartTime % 1 !== 0
      let timeOffset = 0
      if (isWeirdTimezone !== startTimeIsWeird) {
        timeOffset = -0.5
      }

      const getExtraTimes = (hoursOffset) => {
        if (this.timeslotDuration === timeslotDurations.FIFTEEN_MINUTES) {
          return [
            {
              hoursOffset: hoursOffset + 0.25,
            },
            {
              hoursOffset: hoursOffset + 0.5,
            },
            {
              hoursOffset: hoursOffset + 0.75,
            },
          ]
        } else if (this.timeslotDuration === timeslotDurations.THIRTY_MINUTES) {
          return [
            {
              hoursOffset: hoursOffset + 0.5,
            },
          ]
        }
        return []
      }

      if (this.state === this.states.SET_SPECIFIC_TIMES) {
        // Hours offset for specific times starts from minHours
        for (let i = 0; i <= 23; ++i) {
          const hoursOffset = i
          if (i === 9) {
            // add an id so we can scroll to it
            splitTimes[0].push({
              id: "time-9",
              hoursOffset,
              text: timeNumToTimeText(i, this.timeType === timeTypes.HOUR12),
            })
          } else {
            splitTimes[0].push({
              hoursOffset,
              text: timeNumToTimeText(i, this.timeType === timeTypes.HOUR12),
            })
          }
          splitTimes[0].push(...getExtraTimes(hoursOffset))
        }
        return splitTimes
      }

      if (localEndTime <= localStartTime && localEndTime !== 0) {
        for (let i = 0; i < localEndTime; ++i) {
          splitTimes[0].push({
            hoursOffset: this.event.duration - (localEndTime - i),
            text: timeNumToTimeText(i, this.timeType === timeTypes.HOUR12),
          })
          splitTimes[0].push(
            ...getExtraTimes(this.event.duration - (localEndTime - i))
          )
        }
        for (let i = 0; i < 24 - localStartTime; ++i) {
          const adjustedI = i + timeOffset
          splitTimes[1].push({
            hoursOffset: adjustedI,
            text: timeNumToTimeText(
              localStartTime + adjustedI,
              this.timeType === timeTypes.HOUR12
            ),
          })
          splitTimes[1].push(...getExtraTimes(adjustedI))
        }
      } else {
        for (let i = 0; i < this.event.duration; ++i) {
          const adjustedI = i + timeOffset
          const utcTimeNum = this.event.startTime + adjustedI
          const localTimeNum = utcTimeToLocalTime(
            utcTimeNum,
            this.timezoneOffset
          )

          splitTimes[0].push({
            hoursOffset: adjustedI,
            text: timeNumToTimeText(
              localTimeNum,
              this.timeType === timeTypes.HOUR12
            ),
          })
          splitTimes[0].push(...getExtraTimes(adjustedI))
        }
        if (timeOffset !== 0) {
          const localTimeNum = utcTimeToLocalTime(
            this.event.startTime + this.event.duration - 0.5,
            this.timezoneOffset
          )
          splitTimes[0].push({
            hoursOffset: this.event.duration - 0.5,
            text: timeNumToTimeText(
              localTimeNum,
              this.timeType === timeTypes.HOUR12
            ),
          })
          splitTimes[0].push(...getExtraTimes(this.event.duration - 0.5))
        }
        splitTimes[1] = []
      }

      return splitTimes
    },
    /** Returns the times that are encompassed by startTime and endTime */
    times() {
      return [...this.splitTimes[1], ...this.splitTimes[0]]
    },
    timeslotDuration() {
      return this.event.timeIncrement ?? timeslotDurations.FIFTEEN_MINUTES
    },
    timeslotHeight() {
      if (this.timeslotDuration === timeslotDurations.FIFTEEN_MINUTES) {
        return Math.floor(this.HOUR_HEIGHT / 4)
      } else if (this.timeslotDuration === timeslotDurations.THIRTY_MINUTES) {
        return Math.floor(this.HOUR_HEIGHT / 2)
      } else if (this.timeslotDuration === timeslotDurations.ONE_HOUR) {
        return this.HOUR_HEIGHT
      }
      return Math.floor(this.HOUR_HEIGHT / 4)
    },
    timezoneOffset() {
      if (!("offset" in this.curTimezone)) {
        return new Date().getTimezoneOffset()
      }

      if (
        this.event.type === eventTypes.DOW ||
        this.event.type === eventTypes.GROUP
      ) {
        return this.curTimezone.offset * -1
      }

      // Can't just get the offset directly from curTimezone because it doesn't account for dates in the future
      // when daylight savings might be in or out of effect, so instead, we get the timezone for the first date
      // of the event
      return (
        dayjs(this.event.dates[0]).tz(this.curTimezone.value).utcOffset() * -1 // Multiply by -1 because offset is flipped
      )
    },
    userHasResponded() {
      return this.authUser && this.authUser._id in this.parsedResponses
    },
    showLeftZigZag() {
      return this.calendarScrollLeft > 0
    },
    showRightZigZag() {
      return Math.ceil(this.calendarScrollLeft) < this.calendarMaxScroll
    },
    maxDaysPerPage() {
      return this.isPhone ? this.mobileNumDays : 7
    },
    hasNextPage() {
      if (this.event.daysOnly) {
        const lastDay = new Date(this.event.dates[this.event.dates.length - 1])
        const curDate = new Date(this.event.dates[0])
        const monthIndex = curDate.getUTCMonth() + this.page
        const year = curDate.getUTCFullYear()

        const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))

        return lastDayOfCurMonth.getTime() < lastDay.getTime()
      }

      return (
        this.allDays.length - (this.page + 1) * this.maxDaysPerPage > 0 ||
        this.event.type === eventTypes.GROUP
      )
    },
    hasPrevPage() {
      return this.page > 0 || this.event.type === eventTypes.GROUP
    },
    /** Returns whether the event has more than one page */
    hasPages() {
      return this.hasNextPage || this.hasPrevPage
    },

    showStickyRespondents() {
      return (
        this.isPhone &&
        !this.scrolledToRespondents &&
        (this.curTimeslot.row !== -1 ||
          this.curRespondent.length > 0 ||
          this.curRespondents.length > 0)
      )
    },

    // Hint stuff
    hintText() {
      if (this.isPhone) {
        switch (this.state) {
          case this.isGroup && this.states.EDIT_AVAILABILITY:
            return "Toggle which calendars are used. Tap and drag to edit your availability."
          case this.states.EDIT_AVAILABILITY:
            const daysOrTimes = this.event.daysOnly ? "days" : "times"
            if (this.availabilityType === availabilityTypes.IF_NEEDED) {
              return `Tap and drag to add your "if needed" ${daysOrTimes} in yellow.`
            }
            return `Tap and drag to add your "available" ${daysOrTimes} in green.`
          case this.states.SCHEDULE_EVENT:
            return "Tap and drag on the calendar to schedule a Google Calendar event during those times."
          default:
            return ""
        }
      }

      switch (this.state) {
        case this.isGroup && this.states.EDIT_AVAILABILITY:
          return "Toggle which calendars are used. Click and drag to edit your availability."
        case this.states.EDIT_AVAILABILITY:
          const daysOrTimes = this.event.daysOnly ? "days" : "times"
          if (this.availabilityType === availabilityTypes.IF_NEEDED) {
            return `Click and drag to add your "if needed" ${daysOrTimes} in yellow.`
          }
          return `Click and drag to add your "available" ${daysOrTimes} in green.`
        case this.states.SCHEDULE_EVENT:
          return "Click and drag on the calendar to schedule a Google Calendar event during those times."
        default:
          return ""
      }
    },
    hintClosed() {
      return !this.hintState || localStorage[this.hintStateLocalStorageKey]
    },
    hintStateLocalStorageKey() {
      return `closedHintText${this.state}` + ("&isGroup" ? this.isGroup : "")
    },
    hintTextShown() {
      return this.showHintText && this.hintText != "" && !this.hintClosed
    },

    timeslotClassStyle() {
      const classStyles = []
      for (let d = 0; d < this.days.length; ++d) {
        const day = this.days[d]
        for (let t = 0; t < this.splitTimes[0].length; ++t) {
          const time = this.splitTimes[0][t]
          classStyles.push(this.getTimeTimeslotClassStyle(day, time, d, t))
        }
        for (let t = 0; t < this.splitTimes[1].length; ++t) {
          const time = this.splitTimes[1][t]
          classStyles.push(
            this.getTimeTimeslotClassStyle(
              day,
              time,
              d,
              t + this.splitTimes[0].length
            )
          )
        }
      }
      return classStyles
    },
    dayTimeslotClassStyle() {
      const classStyles = []
      for (let i = 0; i < this.monthDays.length; ++i) {
        classStyles.push(
          this.getDayTimeslotClassStyle(this.monthDays[i].dateObject, i)
        )
      }
      return classStyles
    },
    timeslotVon() {
      const vons = []
      for (let d = 0; d < this.days.length; ++d) {
        for (let t = 0; t < this.times.length; ++t) {
          vons.push(this.getTimeslotVon(t, d))
        }
      }
      return vons
    },
    dayTimeslotVon() {
      const vons = []
      for (let i = 0; i < this.monthDays.length; ++i) {
        const row = Math.floor(i / 7)
        const col = i % 7
        vons.push(this.getTimeslotVon(row, col))
      }
      return vons
    },

    /** Whether to show spinner on top of availability grid */
    showLoader() {
      return (
        // Loading calendar events
        ((this.isGroup || this.alwaysShowCalendarEvents || this.editing) &&
          this.loadingCalendarEvents) ||
        // Loading responses
        this.loadingResponses.loading
      )
    },

    /** Localstorage key containing the guest's name */
    guestNameKey() {
      return `${this.event._id}.guestName`
    },
    /** The guest name stored in localstorage */
    guestName() {
      return localStorage[this.guestNameKey]
    },
    /** Whether a guest has added their availability (saved in localstorage) */
    guestAddedAvailability() {
      return (
        this.guestName?.length > 0 && this.guestName in this.parsedResponses
      )
    },

    // Options
    showOverlayAvailabilityToggle() {
      return this.respondents.length > 0 && this.overlayAvailabilitiesEnabled
    },
    showCalendarOptions() {
      return (
        !this.addingAvailabilityAsGuest &&
        this.calendarPermissionGranted &&
        (this.isGroup || (!this.isGroup && !this.userHasResponded))
      )
    },

  },
  methods: {
    ...mapMutations(["setAuthUser"]),
    ...mapActions(["showInfo", "showError", "showUpgradeDialog"]),

    // -----------------------------------
    //#region Date
    // -----------------------------------

    /** Returns a date object from the dayindex and hoursoffset given */
    getDateFromDayHoursOffset(dayIndex, hoursOffset) {
      return getDateHoursOffset(this.days[dayIndex].dateObject, hoursOffset)
    },
    /** Returns a date object from the row and column given on the current page */
    getDateFromRowCol(row, col) {
      if (this.event.daysOnly) {
        const dateObject = this.monthDays[row * 7 + col]?.dateObject
        if (!dateObject) return null
        return new Date(dateObject)
      } else {
        return this.getDateFromDayTimeIndex(
          this.maxDaysPerPage * this.page + col,
          row
        )
      }
    },
    isColConsecutive(col) {
      return Boolean(this.days[col]?.isConsecutive)
    },
    /** Returns a date object from the day index and time index given */
    getDateFromDayTimeIndex(dayIndex, timeIndex) {
      const hasSecondSplit = this.splitTimes[1].length > 0
      const isFirstSplit = timeIndex < this.splitTimes[0].length
      const time = isFirstSplit
        ? this.splitTimes[0][timeIndex]
        : this.splitTimes[1][timeIndex - this.splitTimes[0].length]
      let adjustedDayIndex = dayIndex
      if (hasSecondSplit) {
        if (isFirstSplit) {
          adjustedDayIndex = dayIndex - 1
        } else if (dayIndex === this.allDays.length - 1) {
          return null
        }
      }
      const day = this.allDays[adjustedDayIndex]
      if (!day || !time) return null
      if (day.excludeTimes) {
        return null
      }

      const date = getDateHoursOffset(day.dateObject, time.hoursOffset)
      if (this.isSpecificTimes) {
        // TODO: see if we need to do anything for 0.5 timezones
        if (
          this.state !== this.states.SET_SPECIFIC_TIMES &&
          this.event.times?.length > 0
        ) {
          if (!this.specificTimesSet.has(date.getTime())) {
            return null
          }
        }
      } else {
        // Return null for times outside of the correct range
        if (time.hoursOffset < 0 || time.hoursOffset >= this.event.duration) {
          return null
        }
      }
      return date
    },
    //#endregion

    // -----------------------------------
    //#region Respondent
    // -----------------------------------
    mouseOverRespondent(e, id) {
      if (this.curRespondents.length === 0) {
        if (this.state === this.defaultState) {
          this.state = this.states.SINGLE_AVAILABILITY
        }

        this.curRespondent = id
      }
    },
    mouseLeaveRespondent(e) {
      if (this.curRespondents.length === 0) {
        if (this.state === this.states.SINGLE_AVAILABILITY) {
          this.state = this.defaultState
        }

        this.curRespondent = ""
      }
    },
    clickRespondent(e, id) {
      this.state = this.states.SUBSET_AVAILABILITY
      this.curRespondent = ""

      if (this.curRespondentsSet.has(id)) {
        // Remove id
        this.curRespondents = this.curRespondents.filter((r) => r != id)

        // Go back to default state if all users deselected
        if (this.curRespondents.length === 0) {
          this.state = this.defaultState
        }
      } else {
        // Add id
        this.curRespondents.push(id)
      }

      e.stopPropagation()
    },
    deselectRespondents(e) {
      // Don't deselect respondents if toggled best times
      // or if this was fired by clicking on a timeslot
      if (
        e?.target?.previousElementSibling?.id === "show-best-times-toggle" ||
        e?.target?.firstChild?.firstChild?.id === "show-best-times-toggle" ||
        e?.target?.classList?.contains("timeslot") //&& this.isPhone)
      )
        return

      if (this.state === this.states.SUBSET_AVAILABILITY) {
        this.state = this.defaultState
      }

      this.curRespondents = []

      // Stop persisting timeslot
      this.timeslotSelected = false
      this.resetCurTimeslot()
    },

    isGuest(user) {
      return user._id == user.firstName
    },
    //#endregion

    showAvailability(row, col) {
      if (this.state === this.states.EDIT_AVAILABILITY && this.isPhone) {
        // Don't show currently selected timeslot when on phone and editing
        return
      }

      // Update current timeslot (the timeslot that has a dotted border around it)
      this.curTimeslot = { row, col }

      if (this.state === this.states.EDIT_AVAILABILITY || this.curRespondent) {
        // Don't show availability when editing or when respondent is selected
        return
      }

      const date = this.getDateFromRowCol(row, col)
      if (!date) return

      // Update current timeslot availability to show who is available for the given timeslot
      const available = this.responsesFormatted.get(date.getTime()) ?? new Set()
      for (const respondent of this.respondents) {
        if (available.has(respondent._id)) {
          this.curTimeslotAvailability[respondent._id] = true
        } else {
          this.curTimeslotAvailability[respondent._id] = false
        }
      }
    },
    //#endregion

    /** Returns true if the calendar event is in the first split */
    getIsTimeBlockInFirstSplit(timeBlock) {
      return (
        timeBlock.hoursOffset >= this.splitTimes[0][0].hoursOffset &&
        timeBlock.hoursOffset <=
          this.splitTimes[0][this.splitTimes[0].length - 1].hoursOffset
      )
    },
    /** Returns the style for the calendar event block */
    getTimeBlockStyle(timeBlock) {
      const style = {}
      const hasSecondSplit = this.splitTimes[1].length > 0
      if (!hasSecondSplit || this.getIsTimeBlockInFirstSplit(timeBlock)) {
        style.top = `calc(${
          timeBlock.hoursOffset - this.splitTimes[0][0].hoursOffset
        } * ${this.HOUR_HEIGHT}px)`
        style.height = `calc(${timeBlock.hoursLength} * ${this.HOUR_HEIGHT}px)`
      } else {
        style.top = `calc(${this.splitTimes[0].length} * ${
          this.timeslotHeight
        }px + ${this.SPLIT_GAP_HEIGHT}px + ${
          timeBlock.hoursOffset - this.splitTimes[1][0].hoursOffset
        } * ${this.HOUR_HEIGHT}px)`
        style.height = `calc(${timeBlock.hoursLength} * ${this.HOUR_HEIGHT}px)`
      }
      return style
    },
    /** Returns a class string and style object for the given time timeslot div */
    getTimeTimeslotClassStyle(day, time, d, t) {
      const row = t
      const col = d
      const date = this.getDateFromRowCol(row, col)
      const classStyle = this.getTimeslotClassStyle(date, row, col)

      // Add time timeslot specific stuff
      const isFirstSplit = t < this.splitTimes[0].length
      const isDisabled = !date

      // Animation
      if (this.animateTimeslotAlways || this.availabilityAnimEnabled) {
        classStyle.class += "animate-bg-color "
      }

      // Height
      classStyle.style.height = `${this.timeslotHeight}px`

      // Border style
      if (
        (this.respondents.length > 0 ||
          this.editing ||
          this.state === this.states.SET_SPECIFIC_TIMES) &&
        this.curTimeslot.row === row &&
        this.curTimeslot.col === col &&
        !isDisabled
      ) {
        // Dashed border for currently selected timeslot
        classStyle.class +=
          "tw-border tw-border-dashed tw-border-black tw-z-10 "
      } else {
        // Normal border
        if (date) {
          const localDate = new Date(
            date.getTime() - this.timezoneOffset * 60 * 1000
          )
          const fractionalTime = localDate.getMinutes()
          if (fractionalTime === 0) {
            classStyle.class += "tw-border-t "
          } else if (fractionalTime === 30) {
            classStyle.class += "tw-border-t "
            classStyle.style.borderTopStyle = "dashed"
          }
        }

        classStyle.class += "tw-border-r "
        if (col === 0 || !this.isColConsecutive(col))
          classStyle.class += "tw-border-l tw-border-l-gray "
        if (col === this.days.length - 1 || !this.isColConsecutive(col + 1))
          classStyle.class += "tw-border-r-gray "
        if (isFirstSplit && row === 0)
          classStyle.class += "tw-border-t tw-border-t-gray "
        if (!isFirstSplit && row === this.splitTimes[0].length)
          classStyle.class += "tw-border-t tw-border-t-gray "
        if (isFirstSplit && row === this.splitTimes[0].length - 1)
          classStyle.class += "tw-border-b tw-border-b-gray "
        if (
          !isFirstSplit &&
          row === this.splitTimes[0].length + this.splitTimes[1].length - 1
        )
          classStyle.class += "tw-border-b tw-border-b-gray "

        const totalRespondents =
          this.state === this.states.SUBSET_AVAILABILITY
            ? this.curRespondents.length
            : this.respondents.length
        if (
          this.state === this.states.EDIT_AVAILABILITY ||
          this.state === this.states.SINGLE_AVAILABILITY ||
          totalRespondents === 1
        ) {
          classStyle.class += "tw-border-[#999999] "
        } else {
          classStyle.class += "tw-border-[#DDDDDD99] "
        }
      }

      // Edit fill color and border color if day is not interactable
      if (isDisabled) {
        classStyle.class +=
          "tw-bg-light-gray-stroke tw-border-light-gray-stroke "
      }

      // Change default red:
      if (classStyle.style.backgroundColor === "#E523230D") {
        classStyle.style.backgroundColor = "#E5232333"
      }

      return classStyle
    },
    /** Returns the shared class string and style object for the given timeslot (either time timeslot or day timeslot) */
    getTimeslotClassStyle(date, row, col) {
      let c = ""
      const s = {}
      if (!date) return { class: c, style: s }

      const timeslotRespondents =
        this.responsesFormatted.get(date.getTime()) ?? new Set()

      // Fill style

      if (this.isSignUp) {
        c += "tw-bg-light-gray "
        return { class: c, style: s }
      }

      if (
        (!this.overlayAvailability &&
          this.state === this.states.EDIT_AVAILABILITY) ||
        this.state === this.states.SET_SPECIFIC_TIMES
      ) {
        // Set default background color to red (unavailable)
        s.backgroundColor = "#E523230D"

        // Show only current user availability
        const inDragRange = this.inDragRange(row, col)
        if (inDragRange) {
          // Set style if drag range goes over the current timeslot
          if (this.dragType === this.DRAG_TYPES.ADD) {
            if (this.state === this.states.SET_SPECIFIC_TIMES) {
              c += "tw-bg-white "
            } else {
              if (this.availabilityType === availabilityTypes.AVAILABLE) {
                s.backgroundColor = "#00994C77"
              } else if (
                this.availabilityType === availabilityTypes.IF_NEEDED
              ) {
                c += "tw-bg-yellow "
              }
            }
          } else if (this.dragType === this.DRAG_TYPES.REMOVE) {
            if (this.state === this.states.SET_SPECIFIC_TIMES) {
              c += "tw-bg-gray "
            }
          }
        } else {
          // Otherwise just show the current availability
          // Show current availability from availability set
          if (this.state === this.states.SET_SPECIFIC_TIMES) {
            if (this.tempTimes.has(date.getTime())) {
              c += "tw-bg-white "
            } else {
              c += "tw-bg-gray "
            }
          } else {
            if (this.availability.has(date.getTime())) {
              s.backgroundColor = "#00994C77"
            } else if (this.ifNeeded.has(date.getTime())) {
              c += "tw-bg-yellow "
            }
          }
        }
      }

      if (this.state === this.states.SINGLE_AVAILABILITY) {
        // Show only the currently selected respondent's availability
        const respondent = this.curRespondent
        if (timeslotRespondents.has(respondent)) {
          if (this.parsedResponses[respondent]?.ifNeeded?.has(date.getTime())) {
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
        this.overlayAvailability ||
        this.state === this.states.BEST_TIMES ||
        this.state === this.states.HEATMAP ||
        this.state === this.states.SCHEDULE_EVENT ||
        this.state === this.states.SUBSET_AVAILABILITY
      ) {
        let numRespondents
        let max

        if (
          this.state === this.states.BEST_TIMES ||
          this.state === this.states.HEATMAP ||
          this.state === this.states.SCHEDULE_EVENT
        ) {
          numRespondents = timeslotRespondents.size
          max = this.max
        } else if (this.state === this.states.SUBSET_AVAILABILITY) {
          numRespondents = [...timeslotRespondents].filter((r) =>
            this.curRespondentsSet.has(r)
          ).length

          max = this.curRespondentsMax
        } else if (this.overlayAvailability) {
          if (
            (this.userHasResponded || this.curGuestId?.length > 0) &&
            timeslotRespondents.has(this.authUser?._id ?? this.curGuestId)
          ) {
            // Subtract 1 because we do not want to include current user's availability
            numRespondents = timeslotRespondents.size - 1
            max = this.max
          } else {
            numRespondents = timeslotRespondents.size
            max = this.max
          }
        }

        const totalRespondents =
          this.state === this.states.SUBSET_AVAILABILITY
            ? this.curRespondents.length
            : this.respondents.length

        if (this.defaultState === this.states.BEST_TIMES) {
          if (max > 0 && numRespondents === max) {
            // Only set timeslot to green for the times that most people are available
            if (totalRespondents === 1 || this.overlayAvailability) {
              // Make single responses less saturated
              const green = "#00994C88"
              s.backgroundColor = green
            } else {
              const green = "#00994C"
              s.backgroundColor = green
            }
          }
        } else if (this.defaultState === this.states.HEATMAP) {
          if (numRespondents > 0) {
            if (totalRespondents === 1) {
              const respondentId =
                this.state === this.states.SUBSET_AVAILABILITY
                  ? this.curRespondents[0]
                  : this.respondents[0]._id
              if (
                this.parsedResponses[respondentId]?.ifNeeded?.has(
                  date.getTime()
                )
              ) {
                c += "tw-bg-yellow "
              } else {
                const green = "#00994C88"
                s.backgroundColor = green
              }
            } else {
              // Determine color of timeslot based on number of people available
              const frac = numRespondents / max
              const green = "#00994C"
              let alpha
              if (!this.overlayAvailability) {
                alpha = Math.floor(frac * (255 - 30))
                  .toString(16)
                  .toUpperCase()
                  .substring(0, 2)
                  .padStart(2, "0")
                if (
                  frac == 1 &&
                  ((this.curRespondents.length > 0 &&
                    max === this.curRespondents.length) ||
                    (this.curRespondents.length === 0 &&
                      max === this.respondents.length))
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

              s.backgroundColor = green + alpha
            }
          } else if (totalRespondents === 1) {
            const red = "#E523230D"
            s.backgroundColor = red
          }
        }
      }

      return { class: c, style: s }
    },
    getDayTimeslotClassStyle(date, i) {
      const row = Math.floor(i / 7)
      const col = i % 7

      let classStyle
      // Only compute class style for days that are included
      if (this.monthDayIncluded.get(date.getTime())) {
        classStyle = this.getTimeslotClassStyle(date, row, col)
        if (this.state === this.states.EDIT_AVAILABILITY) {
          classStyle.class += "tw-cursor-pointer "
        }

        const backgroundColor = classStyle.style.backgroundColor
        if (
          backgroundColor &&
          lightOrDark(removeTransparencyFromHex(backgroundColor)) === "dark"
        ) {
          classStyle.class += "tw-text-white "
        }
      } else {
        classStyle = {
          class: "tw-bg-off-white tw-text-gray ",
          style: {},
        }
      }

      // Change default red:
      if (classStyle.style.backgroundColor === "#E523230D") {
        classStyle.style.backgroundColor = "#E523233B"
      }

      // Change edit green
      // if (classStyle.style.backgroundColor === "#00994C88") {
      //   classStyle.style.backgroundColor = "#29BC6880"
      // }

      // Border style
      if (
        (this.respondents.length > 0 ||
          this.state === this.states.EDIT_AVAILABILITY) &&
        this.curTimeslot.row === row &&
        this.curTimeslot.col === col &&
        this.monthDayIncluded.get(date.getTime())
      ) {
        // Dashed border for currently selected timeslot
        classStyle.class +=
          "tw-outline-2 tw-outline-dashed tw-outline-black tw-z-10 "
      } else {
        // Normal border
        if (col === 0) classStyle.class += "tw-border-l tw-border-l-gray "
        classStyle.class += "tw-border-r tw-border-r-gray "
        if (col !== 7 - 1) {
          classStyle.style.borderRightStyle = "dashed"
        }

        if (row === 0) classStyle.class += "tw-border-t tw-border-t-gray "
        classStyle.class += "tw-border-b tw-border-b-gray "
        if (row !== Math.floor(this.monthDays.length / 7)) {
          classStyle.style.borderBottomStyle = "dashed"
        }
      }

      return classStyle
    },
    getTimeslotVon(row, col) {
      if (this.interactable) {
        return {
          click: () => {
            if (this.timeslotSelected) {
              // Get rid of persistent timeslot selection if clicked on the same timeslot that is currently being persisted
              if (
                row === this.curTimeslot.row &&
                col === this.curTimeslot.col
              ) {
                this.timeslotSelected = false
              }
            } else if (
              this.state !== this.states.EDIT_AVAILABILITY &&
              (this.userHasResponded || this.guestAddedAvailability)
            ) {
              // Persist timeslot selection if user has already responded
              this.timeslotSelected = true
            }

            this.showAvailability(row, col)
          },
          mousedown: () => {
            // Highlight availability button
            if (
              this.state === this.defaultState &&
              ((!this.isPhone &&
                !(this.userHasResponded || this.guestAddedAvailability)) ||
                this.respondents.length == 0)
            )
              this.highlightAvailabilityBtn()
          },
          mouseover: () => {
            // Only show availability on hover if timeslot is not being persisted
            if (!this.timeslotSelected) {
              this.showAvailability(row, col)
              if (!this.event.daysOnly) {
                const date = this.getDateFromRowCol(row, col)
                if (date) {
                  // Debug logging for hover slot
                  
                  date.setTime(date.getTime() - this.timezoneOffset * 60 * 1000)
                  const startDate = dayjs(date).utc()
                  const endDate = dayjs(date)
                    .utc()
                    .add(this.timeslotDuration, "minutes")
                    
                  
                  const timeFormat =
                    this.timeType === timeTypes.HOUR12 ? "h:mm A" : "HH:mm"
                  let dateFormat
                  if (this.isSpecificDates) {
                    dateFormat = "ddd, MMM D, YYYY"
                  } else {
                    dateFormat = "ddd"
                  }
                  
                  const formattedTimeRange = `${startDate.format(
                    dateFormat
                  )} ${startDate.format(timeFormat)} to ${endDate.format(
                    timeFormat
                  )}`
                  
                  
                  this.tooltipContent = formattedTimeRange
                }
              }
            }
          },
          mouseleave: () => {
            this.tooltipContent = ""
          },
        }
      }
      return {}
    },
    resetCurTimeslot() {
      // Only reset cur timeslot if it isn't being persisted
      if (this.timeslotSelected) return

      this.curTimeslotAvailability = {}
      for (const respondent of this.respondents) {
        this.curTimeslotAvailability[respondent._id] = true
      }
      this.curTimeslot = { row: -1, col: -1 }

      // End drag if mouse left time grid
      this.endDrag()
    },
    /** Returns all valid displayed time ranges using existing logic (for validation for set slots)
     * Returns an object that maps time slot Date objects to their row/col coordinates:
     * - Map keys: time slot startTime Date objects (using getTime() as the key)
     * - Map values: { row, col, startTime, endTime } objects
     */
    getAllValidTimeRanges() {
      const timeSlotToRowCol = new Map()
      
      // Skip if event is daysOnly (no time slots)
      if (this.event.daysOnly) {
        return timeSlotToRowCol
      }
      
      // Iterate through all displayed days (columns)
      for (let col = 0; col < this.days.length; col++) {
        // Iterate through all displayed times (rows)
        for (let row = 0; row < this.times.length; row++) {
          // Use existing getDateFromRowCol method - returns UTC Date representing the local time
          // For example, if event is 9 AM PST, this returns 2026-12-21T17:00:00.000Z (9 AM PST = 17:00 UTC)
          const date = this.getDateFromRowCol(row, col)
          if (!date) continue
          
          // getDateFromRowCol already returns the correct UTC Date representing the local time
          // No need to adjust - use it directly and add timeslot duration
          const startDate = dayjs(date).utc()
          const endDate = dayjs(date)
            .utc()
            .add(this.timeslotDuration, "minutes")
          
// Convert dayjs UTC objects to Date objects using UTC milliseconds directly
          const startTime = new Date(startDate.valueOf())
          const endTime = new Date(endDate.valueOf())

          // Map the startTime (using getTime() as key) to its row/col coordinates
          timeSlotToRowCol.set(startTime.getTime(), {
            row,
            col,
            startTime, // Date object matching exactly what hover tooltip displays
            endTime,   // Date object (startTime + timeslotDuration)
          })
        }
      }
      
      return timeSlotToRowCol
    },
    //#endregion

    // -----------------------------------
    //#region Editing
    // -----------------------------------
    startEditing() {
      this.state = this.isSignUp
        ? this.states.EDIT_SIGN_UP_BLOCKS
        : this.states.EDIT_AVAILABILITY
      this.availabilityType = availabilityTypes.AVAILABLE
      this.availability = new Set()
      this.ifNeeded = new Set()

      if (this.authUser && !this.addingAvailabilityAsGuest) {
        this.resetCurUserAvailability()
      }
      this.$nextTick(() => (this.unsavedChanges = false))
      this.pageHasChanged = false
    },
    stopEditing() {
      this.state = this.defaultState
      this.stopAvailabilityAnim()

      // Reset options
      this.availabilityType = availabilityTypes.AVAILABLE
      this.overlayAvailability = false
    },
    highlightAvailabilityBtn() {
      this.$emit("highlightAvailabilityBtn")
    },
    editGuestAvailability(id) {
      if (this.authUser) {
        this.$emit("addAvailabilityAsGuest")
      } else {
        this.startEditing()
      }

      this.$nextTick(() => {
        this.populateUserAvailability(id)
        this.$emit("setCurGuestId", id)
      })
    },
    refreshEvent() {
      this.$emit("refreshEvent")
    },
    //#endregion

    // -----------------------------------
    //#region Schedule event
    // -----------------------------------
    scheduleEvent() {
      this.state = this.states.SCHEDULE_EVENT
      this.$posthog.capture("schedule_event_button_clicked")
    },
    cancelScheduleEvent() {
      this.state = this.defaultState
    },

    /** Redirect user to Google Calendar to finish the creation of the event */
    confirmScheduleEvent(googleCalendar = true) {
      if (!this.curScheduledEvent) return
      // if (!isPremiumUser(this.authUser)) {
      //   this.showUpgradeDialog({
      //     type: upgradeDialogTypes.SCHEDULE_EVENT,
      //     data: {
      //       scheduledEvent: this.curScheduledEvent,
      //     },
      //   })
      //   return
      // }

      this.$posthog.capture("schedule_event_confirmed")
      // Get start date, and end date from the area that the user has dragged out
      const { col, row, numRows } = this.curScheduledEvent
      let startDate = this.getDateFromRowCol(row, col)
      let endDate = new Date(startDate)
      endDate.setMinutes(
        startDate.getMinutes() + this.timeslotDuration * numRows
      )

      if (this.isWeekly || this.isGroup) {
        // Determine offset based on current day of the week.
        // People expect the event to be scheduled in the future, not the past, which is why this check exists
        let offset = 0
        if (this.isGroup) {
          offset = this.weekOffset
        } else if (this.isWeekly) {
          if (new Date().getDay() > startDate.getDay()) {
            offset = 1
          }
        }

        // Transform startDate and endDate to be the current week offset
        startDate = dateToDowDate(this.event.dates, startDate, offset, true)
        endDate = dateToDowDate(this.event.dates, endDate, offset, true)
      }

      // Format email string separated by commas
      const emails = this.respondents.map((r) => {
        // Return email if they are not a guest, otherwise return their name
        if (r.email.length > 0) {
          return r.email
        } else {
          // return `${r.firstName} (no email)`
          return null
        }
      })
      const emailsString = encodeURIComponent(emails.filter(Boolean).join(","))

      const eventId = this.event.shortId ?? this.event._id

      let url = ""
      if (googleCalendar) {
        // Format start and end date to be in the format required by gcal (remove -, :, and .000)
        const start = startDate.toISOString().replace(/([-:]|\.000)/g, "")
        const end = endDate.toISOString().replace(/([-:]|\.000)/g, "")

        // Construct Google Calendar event creation template url
        url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          this.event.name
        )}&dates=${start}/${end}&details=${encodeURIComponent(
          "\n\nThis event was scheduled with Timeful: https://timeful.app/e/"
        )}${eventId}&ctz=${this.curTimezone.value}&add=${emailsString}`
      } else {
        url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
          this.event.name
        )}&body=${encodeURIComponent(
          "\n\nThis event was scheduled with Timeful: https://timeful.app/e/" +
            eventId
        )}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&location=${encodeURIComponent(
          this.event.location || ""
        )}&path=/calendar/action/compose&timezone=${this.curTimezone.value}`
      }

      // Navigate to url and reset state
      window.open(url, "_blank")
      this.state = this.defaultState
    },
    //#endregion
    // -----------------------------------
    //#region Options
    // -----------------------------------
    getLocalTimezone() {
      const split = new Date(this.event.dates[0])
        .toLocaleTimeString("en-us", { timeZoneName: "short" })
        .split(" ")
      const localTimezone = split[split.length - 1]

      return localTimezone
    },
    onShowBestTimesChange() {
      localStorage["showBestTimes"] = this.showBestTimes
      if (
        this.state == this.states.BEST_TIMES ||
        this.state == this.states.HEATMAP
      )
        this.state = this.defaultState
    },
    toggleShowEventOptions() {
      this.showEventOptions = !this.showEventOptions
      localStorage["showEventOptions"] = this.showEventOptions
    },
    //#endregion

    // -----------------------------------
    //#region Scroll
    // -----------------------------------
    onCalendarScroll(e) {
      this.calendarMaxScroll = e.target.scrollWidth - e.target.offsetWidth
      this.calendarScrollLeft = e.target.scrollLeft
    },
    onScroll(e) {
      this.checkElementsVisible()
    },
    /** Checks whether certain elements are visible and sets variables accoringly */
    checkElementsVisible() {
      const optionsSectionEl = this.$refs.optionsSection
      if (optionsSectionEl) {
        this.optionsVisible = isElementInViewport(optionsSectionEl, {
          bottomOffset: -64,
        })
      }

      const respondentsListEl = this.$refs.respondentsList?.$el
      if (respondentsListEl) {
        this.scrolledToRespondents = isElementInViewport(respondentsListEl, {
          bottomOffset: -64,
        })
      }
    },
    //#endregion

    // -----------------------------------
    //#region Pagination
    // -----------------------------------
    nextPage(e) {
      e.stopImmediatePropagation()
      if (this.event.type === eventTypes.GROUP) {
        // Go to next page if there are still more days left to see
        // Otherwise, update week offset
        if ((this.page + 1) * this.maxDaysPerPage < this.allDays.length) {
          this.page++
        } else {
          this.page = 0
          this.$emit("update:weekOffset", this.weekOffset + 1)
        }
      } else {
        this.page++
      }
      this.pageHasChanged = true
    },
    prevPage(e) {
      e.stopImmediatePropagation()
      if (this.event.type === eventTypes.GROUP) {
        // Go to prev page if there is a prev page
        // Otherwise, update week offset
        if (this.page > 0) {
          this.page--
        } else {
          this.page = Math.ceil(this.allDays.length / this.maxDaysPerPage) - 1
          this.$emit("update:weekOffset", this.weekOffset - 1)
        }
      } else {
        this.page--
      }
      this.pageHasChanged = true
    },
    //#endregion

    // -----------------------------------
    //#region Resize
    // -----------------------------------
    onResize() {
      this.setTimeslotSize()
    },
    //#endregion

    // -----------------------------------
    //#region hint
    // -----------------------------------
    closeHint() {
      this.hintState = false
      localStorage[this.hintStateLocalStorageKey] = true
    },
    //#endregion

    // -----------------------------------
    //#region Group
    // -----------------------------------

    /** Toggles calendar account - in groups to enable/disable calendars */
    toggleCalendarAccount(payload) {
      this.sharedCalendarAccounts[
        getCalendarAccountKey(payload.email, payload.calendarType)
      ].enabled = payload.enabled
      this.sharedCalendarAccounts = JSON.parse(
        JSON.stringify(this.sharedCalendarAccounts)
      )
    },

    /** Toggles sub calendar account - in groups to enable/disable sub calendars */
    toggleSubCalendarAccount(payload) {
      this.sharedCalendarAccounts[
        getCalendarAccountKey(payload.email, payload.calendarType)
      ].subCalendars[payload.subCalendarId].enabled = payload.enabled
      this.sharedCalendarAccounts = JSON.parse(
        JSON.stringify(this.sharedCalendarAccounts)
      )
    },

    /** Sets the initial sharedCalendarAccounts object */
    initSharedCalendarAccounts() {
      if (!this.authUser) return

      // Init shared calendar accounts to current calendar accounts
      this.sharedCalendarAccounts = JSON.parse(
        JSON.stringify(this.authUser.calendarAccounts)
      )

      // Disable all calendars
      for (const id in this.sharedCalendarAccounts) {
        this.sharedCalendarAccounts[id].enabled = false
        if (this.sharedCalendarAccounts[id].subCalendars) {
          for (const subCalendarId in this.sharedCalendarAccounts[id]
            .subCalendars) {
            this.sharedCalendarAccounts[id].subCalendars[
              subCalendarId
            ].enabled = false
          }
        }
      }

      // Enable calendars based on responses
      if (this.authUser._id in this.event.responses) {
        const enabledCalendars =
          this.event.responses[this.authUser._id].enabledCalendars

        for (const id in enabledCalendars) {
          this.sharedCalendarAccounts[id].enabled = true

          enabledCalendars[id].forEach((subCalendarId) => {
            this.sharedCalendarAccounts[id].subCalendars[
              subCalendarId
            ].enabled = true
          })
        }
      }
    },

    /** Based on the date, determine whether it has been touched */
    isTouched(date, availability = [...this.availability]) {
      const start = new Date(date)
      const end = new Date(date)
      end.setHours(end.getHours() + this.event.duration)

      for (const a of availability) {
        const availableTime = new Date(a).getTime()
        if (
          start.getTime() <= availableTime &&
          availableTime <= end.getTime()
        ) {
          return true
        }
      }

      return false
    },

    /** Returns a subset of availability for the current date */
    getAvailabilityForColumn(column, availability = [...this.availability]) {
      const subset = new Set()
      const availabilitySet = new Set(availability)
      for (
        let r = 0;
        r < this.splitTimes[0].length + this.splitTimes[1].length;
        ++r
      ) {
        const date = this.getDateFromRowCol(r, column)
        if (!date) continue

        if (availabilitySet.has(date.getTime())) {
          subset.add(date.getTime())
        }
      }

      return subset
    },

    /** Returns a copy of the manual availability, converted to dow dates */
    getManualAvailabilityDow(manualAvailability = this.manualAvailability) {
      if (!manualAvailability) return null

      const manualAvailabilityDow = {}
      for (const time in manualAvailability) {
        const dowTime = dateToDowDate(
          this.event.dates,
          new Date(parseInt(time)),
          this.weekOffset
        ).getTime()
        manualAvailabilityDow[dowTime] = [...manualAvailability[time]].map(
          (a) => dateToDowDate(this.event.dates, new Date(a), this.weekOffset)
        )
      }
      return manualAvailabilityDow
    },
    //#endregion
    // -----------------------------------
    //#region Specific times for specific days
    // -----------------------------------

    /** Saves the temporary times to the event */
    saveTempTimes() {
      // Set event times
      this.event.times = [...this.tempTimes]
        .map((t) => new Date(t))
        .sort((a, b) => a.getTime() - b.getTime())

      const { minHours, maxHours } = this.getMinMaxHoursFromTimes(
        this.event.times
      )

      // Set event dates to start at the new times
      for (let i = 0; i < this.event.dates.length; ++i) {
        const date = new Date(this.event.dates[i])
        date.setTime(date.getTime() - this.timezoneOffset * 60 * 1000)
        date.setUTCHours(minHours, 0, 0, 0)
        date.setTime(date.getTime() + this.timezoneOffset * 60 * 1000)
        this.event.dates[i] = date.toISOString()
      }

      // Set event duration to the difference between the max and min hours
      this.event.duration = maxHours - minHours + 1

      // Fix other fields
      if (this.event.remindees) {
        this.event.remindees = this.event.remindees.map((r) => r.email)
      }

      // Update event
      put(`/events/${this.event._id}`, this.event)
        .then(() => {
          this.state = this.defaultState
        })
        .catch((err) => {
          this.showError(err)
        })
    },

    /** Returns the min and max hours from the times */
    getMinMaxHoursFromTimes(times) {
      let minHours = 24
      let maxHours = 0
      for (const time of times) {
        const timeDate = new Date(time)
        const date = new Date(
          timeDate.getTime() - this.timezoneOffset * 60 * 1000
        )
        const localHours = date.getUTCHours()
        if (localHours < minHours) {
          minHours = localHours
        } else if (localHours > maxHours) {
          maxHours = localHours
        }
      }
      return { minHours, maxHours }
    },

    //#endregion

  },
  watch: {
    event: {
      immediate: true,
      handler() {
        this.initSharedCalendarAccounts()
        this.fetchResponses()
      },
    },
    state(nextState, prevState) {
      this.$nextTick(() => this.checkElementsVisible())

      // Reset scheduled event when exiting schedule event state
      if (prevState === this.states.SCHEDULE_EVENT) {
        this.curScheduledEvent = null
      } else if (prevState === this.states.EDIT_AVAILABILITY) {
        this.unsavedChanges = false
      }

      if (nextState === this.states.SET_SPECIFIC_TIMES) {
        this.$nextTick(() => {
          const time9 = document.getElementById("time-9")
          if (time9) {
            const yOffset = -150
            const y =
              time9.getBoundingClientRect().top + window.scrollY + yOffset
            window.scrollTo({ top: y, behavior: "smooth" })
          }
        })
      }
    },
    respondents: {
      immediate: true,
      handler() {
        this.curTimeslotAvailability = {}
        for (const respondent of this.respondents) {
          this.curTimeslotAvailability[respondent._id] = true
        }
      },
    },
    page() {
      this.$nextTick(() => {
        this.setTimeslotSize()
      })
    },
    allDays() {
      this.$nextTick(() => {
        this.setTimeslotSize()
      })
    },
    showStickyRespondents: {
      immediate: true,
      handler(cur) {
        clearTimeout(this.delayedShowStickyRespondentsTimeout)
        this.delayedShowStickyRespondentsTimeout = setTimeout(() => {
          this.delayedShowStickyRespondents = cur
        }, 100)
      },
    },
    maxDaysPerPage() {
      // Set page to 0 if user switches from portrait to landscape orientation and we're on an invalid page number,
      // i.e. we're on a page that displays 0 days
      if (this.page * this.maxDaysPerPage >= this.allDays.length) {
        this.page = 0
      }
    },
    mobileNumDays() {
      // Save mobile num days in localstorage
      localStorage["mobileNumDays"] = this.mobileNumDays

      // Set timeslot size because it has changed
      this.$nextTick(() => {
        this.setTimeslotSize()
      })
    },
    weekOffset() {
      if (this.event.type === eventTypes.GROUP) {
        this.fetchResponses()
      }
    },
    showBestTimes() {
      this.onShowBestTimesChange()
    },
    startCalendarOnMonday() {
      localStorage["startCalendarOnMonday"] = this.startCalendarOnMonday
    },
    timeType() {
      localStorage["timeType"] = this.timeType
    },
    fromEditEvent() {
      if (this.fromEditEvent && this.isSpecificTimes) {
        this.tempTimes = new Set(
          this.event.times.map((t) => new Date(t).getTime())
        )
        this.state = this.states.SET_SPECIFIC_TIMES
      }
    },
  },
  created() {
    this.resetCurUserAvailability()

    addEventListener("click", this.deselectRespondents)
  },
  mounted() {
    // Get query parameters from URL
    const urlParams = new URLSearchParams(window.location.search)

    // Set initial state
    if (
      this.event.hasSpecificTimes &&
      (this.fromEditEvent || !this.event.times || this.event.times.length === 0)
    ) {
      this.state = this.states.SET_SPECIFIC_TIMES
    } else if (urlParams.get("scheduled_event")) {
      const scheduledEvent = JSON.parse(urlParams.get("scheduled_event"))
      this.curScheduledEvent = scheduledEvent
      this.state = this.states.SCHEDULE_EVENT

      // Remove the scheduled_event parameter from URL to avoid reloading the same state
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("scheduled_event")
      window.history.replaceState({}, document.title, newUrl.toString())
    } else if (this.showBestTimes) {
      this.state = "best_times"
    } else {
      this.state = "heatmap"
    }

    // Set calendar options defaults
    if (this.authUser) {
      this.bufferTime =
        this.authUser?.calendarOptions?.bufferTime ??
        calendarOptionsDefaults.bufferTime
      this.workingHours =
        this.authUser?.calendarOptions?.workingHours ??
        calendarOptionsDefaults.workingHours
      if (this.isGroup) {
        if (this.event.responses[this.authUser._id]?.calendarOptions) {
          // Update calendar options if user has changed them for this specific group
          const { bufferTime, workingHours } =
            this.event.responses[this.authUser._id]?.calendarOptions
          if (bufferTime) this.bufferTime = bufferTime
          if (workingHours) this.workingHours = workingHours
        } else {
          this.bufferTime = calendarOptionsDefaults.bufferTime
          this.workingHours = calendarOptionsDefaults.workingHours
        }
      }
    }

    // Set initial calendar max scroll
    // this.calendarMaxScroll =
    //   this.$refs.calendar.scrollWidth - this.$refs.calendar.offsetWidth

    // Get timeslot size
    this.setTimeslotSize()
    addEventListener("resize", this.onResize)
    addEventListener("scroll", this.onScroll)
    // Parse sign up blocks and responses
    this.resetSignUpForm()
  },
  beforeDestroy() {
    removeEventListener("click", this.deselectRespondents)
    removeEventListener("resize", this.onResize)
    removeEventListener("scroll", this.onScroll)
  },
  components: {
    AvailabilityTypeToggle,
    DaysOnlyCalendar,
    EditAvailabilitySidebar,
    UserAvatarContent,
    ZigZag,
    ConfirmDetailsDialog,
    ToolRow,
    RespondentsList,
    Advertisement,
    GCalWeekSelector,
    SignUpBlock,
    SignUpCalendarBlock,
    SignUpBlocksList,
    CalendarEventBlock,
    SpecificTimesInstructions,
    Tooltip,
  },
}
</script>
