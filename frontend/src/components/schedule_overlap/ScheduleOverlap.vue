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
                    class="tw-flex-1 tw-p-2 tw-text-center tw-text-base tw-capitalize tw-text-dark-gray"
                  >
                    {{ day }}
                  </div>
                </div>
                <!-- Days grid -->
                <div
                  id="drag-section"
                  class="tw-grid tw-grid-cols-7"
                  @mouseleave="resetCurTimeslot"
                >
                  <div
                    v-for="(day, i) in monthDays"
                    :key="day.time"
                    class="timeslot tw-aspect-square tw-p-2 tw-text-sm sm:tw-text-base"
                    :class="dayTimeslotClassStyle[i].class"
                    :style="dayTimeslotClassStyle[i].style"
                    v-on="dayTimeslotVon[i]"
                  >
                    {{ day.date }}
                  </div>
                </div>

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
              <div
                class="tw-flex tw-flex-col tw-gap-5"
                v-if="state == states.EDIT_AVAILABILITY"
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
                          @keydown.enter="saveGuestName"
                          hide-details
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
                    class="tw-w-full"
                    v-model="availabilityType"
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
                  :toggleState="true"
                  :eventId="event._id"
                  :calendar-events-map="calendarEventsMap"
                  :syncWithBackend="!isGroup"
                  :allowAddCalendarAccount="!isGroup"
                  @toggleCalendarAccount="toggleCalendarAccount"
                  @toggleSubCalendarAccount="toggleSubCalendarAccount"
                  :initialCalendarAccountsData="
                    isGroup ? sharedCalendarAccounts : authUser.calendarAccounts
                  "
                ></CalendarAccounts>

                <div v-if="showOverlayAvailabilityToggle">
                  <v-switch
                    id="overlay-availabilities-toggle"
                    inset
                    :input-value="overlayAvailability"
                    @change="updateOverlayAvailability"
                    hide-details
                  >
                    <template v-slot:label>
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
                    :value="showEditOptions"
                    @input="toggleShowEditOptions"
                  >
                    <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2.5">
                      <v-dialog
                        v-if="showCalendarOptions"
                        v-model="calendarOptionsDialog"
                        width="500"
                      >
                        <template v-slot:activator="{ on, attrs }">
                          <v-btn
                            outlined
                            class="tw-border-gray tw-text-sm"
                            v-on="on"
                            v-bind="attrs"
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
                              :bufferTime.sync="bufferTime"
                              :syncWithBackend="!isGroup"
                            />

                            <WorkingHoursToggle
                              :workingHours.sync="workingHours"
                              :timezone="curTimezone"
                              :syncWithBackend="!isGroup"
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
                    <template v-slot:activator="{ on, attrs }">
                      <span
                        v-bind="attrs"
                        v-on="on"
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
                          @click="
                            $emit('deleteAvailability')
                            deleteAvailabilityDialog = false
                          "
                          >{{ !isGroup ? "Delete" : "Leave" }}</v-btn
                        >
                      </v-card-actions>
                    </v-card>
                  </v-dialog>
                </div>
              </div>
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
  dateCompare,
  getDateHoursOffset,
  post,
  put,
  isBetween,
  clamp,
  isPhone,
  utcTimeToLocalTime,
  splitTimeBlocksByDay,
  getTimeBlock,
  dateToDowDate,
  _delete,
  get,
  getDateDayOffset,
  isDateBetween,
  generateEnabledCalendarsPayload,
  isTouchEnabled,
  isElementInViewport,
  lightOrDark,
  removeTransparencyFromHex,
  userPrefers12h,
  getCalendarAccountKey,
  getISODateString,
  getDateWithTimezone,
  timeNumToTimeString,
  isPremiumUser,
  prefersStartOnMonday,
} from "@/utils"
import {
  availabilityTypes,
  calendarOptionsDefaults,
  eventTypes,
  guestUserId,
  timeTypes,
  timeslotDurations,
  upgradeDialogTypes,
} from "@/constants"
import { mapMutations, mapActions, mapState } from "vuex"
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"
import Advertisement from "@/components/event/Advertisement.vue"
import SignUpBlock from "@/components/sign_up_form/SignUpBlock.vue"
import SignUpCalendarBlock from "@/components/sign_up_form/SignUpCalendarBlock.vue"
import SignUpBlocksList from "@/components/sign_up_form/SignUpBlocksList.vue"
import ZigZag from "./ZigZag.vue"
import ConfirmDetailsDialog from "./ConfirmDetailsDialog.vue"
import ToolRow from "./ToolRow.vue"
import RespondentsList from "./RespondentsList.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import ExpandableSection from "../ExpandableSection.vue"
import WorkingHoursToggle from "./WorkingHoursToggle.vue"
import AlertText from "../AlertText.vue"
import Tooltip from "../Tooltip.vue"
import ColorLegend from "./ColorLegend.vue"

import dayjs from "dayjs"
import ObjectID from "bson-objectid"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import BufferTimeSwitch from "./BufferTimeSwitch.vue"
import CalendarEventBlock from "./CalendarEventBlock.vue" // Added import
import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

export default {
  name: "ScheduleOverlap",
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
      availabilityAnimTimeouts: [], // Timeouts for availability animation
      availabilityAnimEnabled: false, // Whether to animate timeslots changing colors
      maxAnimTime: 1200, // Max amount of time for availability animation
      unsavedChanges: false, // If there are unsaved availability changes
      curTimeslot: { row: -1, col: -1 }, // The currently highlighted timeslot
      timeslotSelected: false, // Whether a timeslot is selected (used to persist selection on desktop)
      curTimeslotAvailability: {}, // The users available for the current timeslot
      curRespondent: "", // Id of the active respondent (set on hover)
      curRespondents: [], // Id of currently selected respondents (set on click)
      sharedCalendarAccounts: {}, // The user's calendar accounts for changing calendar options for groups
      fetchedResponses: {}, // Responses fetched from the server for the dates currently shown
      loadingResponses: { loading: false, lastFetched: new Date().getTime() }, // Whether we're currently fetching the responses
      responsesFormatted: new Map(), // Map where date/time is mapped to the people that are available then
      tooltipContent: "", // The content of the tooltip

      /* Sign up form */
      signUpBlocksByDay: [], // The current event's sign up blocks by day
      signUpBlocksToAddByDay: [], // The sign up blocks to be added after hitting 'save'

      /* Edit options */
      showEditOptions:
        localStorage["showEditOptions"] == undefined
          ? false
          : localStorage["showEditOptions"] == "true",
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

      /* Variables for drag stuff */
      DRAG_TYPES: {
        ADD: "add",
        REMOVE: "remove",
      },
      SPLIT_GAP_HEIGHT: 40,
      SPLIT_GAP_WIDTH: 20,
      HOUR_HEIGHT: 60,
      timeslot: {
        width: 0,
        height: 0,
      },
      dragging: false,
      dragType: "add",
      dragStart: null,
      dragCur: null,

      /* Variables for options */
      curTimezone: this.initialTimezone,
      curScheduledEvent: null, // The scheduled event represented in the form {hoursOffset, hoursLength, dayIndex}
      timeType:
        localStorage["timeType"] ??
        (userPrefers12h() ? timeTypes.HOUR12 : timeTypes.HOUR24), // Whether 12-hour or 24-hour
      showCalendarEvents: false,
      startCalendarOnMonday: prefersStartOnMonday(),

      /* Dialogs */
      deleteAvailabilityDialog: false,
      calendarOptionsDialog: false,
      editGuestNameDialog: false,
      newGuestName: "",

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

      hasRefreshedAuthUser: false,

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
    /** Returns the availability as an array */
    availabilityArray() {
      return [...this.availability].map((item) => new Date(item))
    },
    /** Returns the if needed availability as an array */
    ifNeededArray() {
      return [...this.ifNeeded].map((item) => new Date(item))
    },
    allowDrag() {
      return (
        this.state === this.states.EDIT_AVAILABILITY ||
        this.state === this.states.EDIT_SIGN_UP_BLOCKS ||
        this.state === this.states.SCHEDULE_EVENT ||
        this.state === this.states.SET_SPECIFIC_TIMES
      )
    },
    /** Returns an array of calendar events for all of the authUser's enabled calendars, separated by the day they occur on */
    calendarEventsByDay() {
      // If this is an example calendar
      if (this.sampleCalendarEventsByDay) return this.sampleCalendarEventsByDay

      // If the user isn't logged in or is adding availability as a guest
      if (!this.authUser || this.addingAvailabilityAsGuest) return []

      let events = []
      let event

      const calendarAccounts = this.isGroup
        ? this.sharedCalendarAccounts
        : this.authUser.calendarAccounts

      // Adds events from calendar accounts that are enabled
      for (const id in calendarAccounts) {
        if (!calendarAccounts[id].enabled) continue

        if (this.calendarEventsMap.hasOwnProperty(id)) {
          for (const index in this.calendarEventsMap[id].calendarEvents) {
            event = this.calendarEventsMap[id].calendarEvents[index]

            // Check if we need to update authUser (to get latest subcalendars)
            const subCalendars = calendarAccounts[id].subCalendars
            if (!subCalendars || !(event.calendarId in subCalendars)) {
              // authUser doesn't contain the subCalendar, so push event to events without checking if subcalendar is enabled
              // and queue the authUser to be refreshed
              events.push(event)
              if (!this.hasRefreshedAuthUser && !this.isGroup) {
                this.refreshAuthUser()
              }
              continue
            }

            // Push event to events if subcalendar is enabled
            if (subCalendars[event.calendarId].enabled) {
              events.push(event)
            }
          }
        }
      }

      const eventsCopy = JSON.parse(JSON.stringify(events))

      const calendarEventsByDay = splitTimeBlocksByDay(
        this.event,
        eventsCopy,
        this.weekOffset,
        this.timezoneOffset
      )

      return calendarEventsByDay
    },
    /** [SPECIFIC TO GROUPS] Returns an object mapping user ids to their calendar events separated by the day they occur on */
    groupCalendarEventsByDay() {
      if (this.event.type !== eventTypes.GROUP) return {}

      const userIdToEventsByDay = {}
      for (const userId in this.event.responses) {
        if (userId === this.authUser._id) {
          userIdToEventsByDay[userId] = this.calendarEventsByDay
        } else if (userId in this.calendarAvailabilities) {
          userIdToEventsByDay[userId] = splitTimeBlocksByDay(
            this.event,
            this.calendarAvailabilities[userId],
            this.weekOffset,
            this.timezoneOffset
          )
        }
      }

      return userIdToEventsByDay
    },
    curRespondentsSet() {
      return new Set(this.curRespondents)
    },

    // -----------------------------------
    //#region Sign up form
    // -----------------------------------

    /** Returns the name of the new sign up block being dragged */
    newSignUpBlockName() {
      return `Slot #${
        this.signUpBlocksByDay.flat().length +
        this.signUpBlocksToAddByDay.flat().length +
        1
      }`
    },

    /** Returns the max allowable drag */
    maxSignUpBlockRowSize() {
      if (!this.dragStart || !this.isSignUp) return null

      const selectedDay = this.signUpBlocksByDay[this.dragStart.col]
      const selectedDayToAdd = this.signUpBlocksToAddByDay[this.dragStart.col]

      if (selectedDay.length === 0 && selectedDayToAdd.length === 0) return null

      let maxSize = Infinity
      for (const block of [...selectedDay, ...selectedDayToAdd]) {
        if (block.hoursOffset * 4 > this.dragStart.row) {
          maxSize = Math.min(
            maxSize,
            block.hoursOffset * 4 - this.dragStart.row
          )
        }
      }

      return maxSize
    },

    /** Whether the current user has already responded to the sign up form */
    alreadyRespondedToSignUpForm() {
      if (!this.authUser || !this.signUpBlocksByDay) return false

      return this.signUpBlocksByDay.some((dayBlocks) =>
        dayBlocks.some((block) =>
          block.responses?.some(
            (response) => response.userId === this.authUser._id
          )
        )
      )
    },

    //#endregion

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
    /** Returns the text to show for the current month */
    curMonthText() {
      const date = new Date(this.event.dates[0])
      const monthIndex = date.getUTCMonth() + this.page
      const year = date.getUTCFullYear()
      const lastDayOfCurMonth = new Date(Date.UTC(year, monthIndex + 1, 0))

      const monthText = this.months[lastDayOfCurMonth.getUTCMonth()]
      const yearText = lastDayOfCurMonth.getUTCFullYear()
      return `${monthText} ${yearText}`
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
    respondents() {
      return Object.values(this.parsedResponses)
        .map((r) => r.user)
        .filter(Boolean)
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
    /** Parses the responses to the Timeful, makes necessary changes based on the type of event, and returns it */
    parsedResponses() {
      const parsed = {}

      // Return calendar availability if group
      if (this.event.type === eventTypes.GROUP) {
        for (const userId in this.event.responses) {
          const calendarEventsByDay = this.groupCalendarEventsByDay[userId]
          if (calendarEventsByDay) {
            // Get manual availability and convert to DOW dates
            const fetchedManualAvailability = this.getManualAvailabilityDow(
              this.fetchedResponses[userId]?.manualAvailability
            )
            const curManualAvailability =
              userId === this.authUser._id
                ? this.getManualAvailabilityDow(this.manualAvailability)
                : {}

            // Get availability from calendar events and use manual availability on the
            // "touched" days
            const availability = this.getAvailabilityFromCalendarEvents({
              calendarEventsByDay,
              includeTouchedAvailability: true,
              fetchedManualAvailability: fetchedManualAvailability ?? {},
              curManualAvailability: curManualAvailability ?? {},
              calendarOptions:
                userId === this.authUser._id
                  ? {
                      bufferTime: this.bufferTime,
                      workingHours: this.workingHours,
                    }
                  : this.fetchedResponses[userId]?.calendarOptions ?? undefined,
            })

            parsed[userId] = {
              ...this.event.responses[userId],
              availability: availability,
            }
          } else {
            parsed[userId] = {
              ...this.event.responses[userId],
              availability: new Set(),
            }
          }
        }
        return parsed
      }

      // Return only current user availability if using blind availabilities and user is not owner
      if (this.event.blindAvailabilityEnabled && !this.isOwner) {
        const guestName = localStorage[this.guestNameKey]
        const userId = this.authUser?._id ?? guestName
        if (userId in this.event.responses) {
          const user = {
            ...this.event.responses[userId].user,
            _id: userId,
          }
          parsed[userId] = {
            ...this.event.responses[userId],
            availability: new Set(
              this.fetchedResponses[userId]?.availability?.map((a) =>
                new Date(a).getTime()
              )
            ),
            ifNeeded: new Set(
              this.fetchedResponses[userId]?.ifNeeded?.map((a) =>
                new Date(a).getTime()
              )
            ),
            user: user,
          }
        }
        return parsed
      }

      // Otherwise, parse responses so that if _id is null (i.e. guest user), then it is set to the guest user's name
      for (const k of Object.keys(this.event.responses)) {
        const newUser = {
          ...this.event.responses[k].user,
          _id: k,
        }
        parsed[k] = {
          ...this.event.responses[k],
          availability: new Set(
            this.fetchedResponses[k]?.availability?.map((a) =>
              new Date(a).getTime()
            )
          ),
          ifNeeded: new Set(
            this.fetchedResponses[k]?.ifNeeded?.map((a) =>
              new Date(a).getTime()
            )
          ),
          user: newUser,
        }
      }
      return parsed
    },
    max() {
      let max = 0
      for (const [dateTime, availability] of this.responsesFormatted) {
        if (availability.size > max) {
          max = availability.size
        }
      }

      return max
    },
    /** Returns a set containing the times for the event if it has specific times */
    specificTimesSet() {
      return new Set(this.event.times?.map((t) => new Date(t).getTime()) ?? [])
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

    /** Returns an array of time blocks representing the current user's availability
     * (used for displaying current user's availability on top of everybody else's availability)
     */
    overlaidAvailability() {
      const overlaidAvailability = []
      this.days.forEach((day, d) => {
        overlaidAvailability.push([])
        let curBlockIndex = 0
        const addOverlaidAvailabilityBlocks = (time, t) => {
          const date = this.getDateFromRowCol(t, d)
          if (!date) return

          const dragAdd =
            this.dragging &&
            this.inDragRange(t, d) &&
            this.dragType === this.DRAG_TYPES.ADD
          const dragRemove =
            this.dragging &&
            this.inDragRange(t, d) &&
            this.dragType === this.DRAG_TYPES.REMOVE

          // Check if timeslot is available or if needed or in the drag region
          if (
            dragAdd ||
            (!dragRemove &&
              (this.availability.has(date.getTime()) ||
                this.ifNeeded.has(date.getTime())))
          ) {
            // Determine whether to render as available or if needed block
            let type = availabilityTypes.AVAILABLE
            if (dragAdd) {
              type = this.availabilityType
            } else {
              type = this.availability.has(date.getTime())
                ? availabilityTypes.AVAILABLE
                : availabilityTypes.IF_NEEDED
            }

            if (curBlockIndex in overlaidAvailability[d]) {
              if (overlaidAvailability[d][curBlockIndex].type === type) {
                // Increase block length if matching type and curBlockIndex exists
                overlaidAvailability[d][curBlockIndex].hoursLength += 0.25
              } else {
                // Add a new block because type is different
                overlaidAvailability[d].push({
                  hoursOffset: time.hoursOffset,
                  hoursLength: 0.25,
                  type,
                })
                curBlockIndex++
              }
            } else {
              // Add a new block because block doesn't exist for current index
              overlaidAvailability[d].push({
                hoursOffset: time.hoursOffset,
                hoursLength: 0.25,
                type,
              })
            }
          } else if (curBlockIndex in overlaidAvailability[d]) {
            // Only increment cur block index if block already exists at the current index
            curBlockIndex++
          }
        }
        for (let t = 0; t < this.splitTimes[0].length; ++t) {
          addOverlaidAvailabilityBlocks(this.splitTimes[0][t], t)
        }
        if (curBlockIndex in overlaidAvailability[d]) {
          curBlockIndex++
        }
        for (let t = 0; t < this.splitTimes[1].length; ++t) {
          addOverlaidAvailabilityBlocks(
            this.splitTimes[1][t],
            t + this.splitTimes[0].length
          )
        }
      })
      return overlaidAvailability
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

    /** Returns an array of the x-offsets of the columns, taking into account the split gaps from non-consecutive days */
    columnOffsets() {
      const offsets = []
      let accumulatedOffset = 0
      for (let i = 0; i < this.days.length; ++i) {
        offsets.push(accumulatedOffset)
        if (!this.days[i].isConsecutive) {
          accumulatedOffset += this.SPLIT_GAP_WIDTH
        }
        accumulatedOffset += this.timeslot.width
      }
      return offsets
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

    // -----------------------------------
    //#region Aggregate user availability
    // -----------------------------------

    /** Fetches responses from server */
    fetchResponses() {
      if (this.calendarOnly) {
        this.fetchedResponses = this.event.responses
        return
      }

      let timeMin, timeMax
      if (this.event.type === eventTypes.GROUP) {
        if (this.event.dates.length > 0) {
          // Fetch the date range for the current week
          timeMin = new Date(this.event.dates[0])
          timeMax = new Date(this.event.dates[this.event.dates.length - 1])
          timeMax.setDate(timeMax.getDate() + 1)

          // Convert dow dates to discrete dates
          timeMin = dateToDowDate(
            this.event.dates,
            timeMin,
            this.weekOffset,
            true
          )
          timeMax = dateToDowDate(
            this.event.dates,
            timeMax,
            this.weekOffset,
            true
          )
        }
      } else {
        if (this.allDays.length > 0) {
          // Fetch the entire time range of availabilities
          timeMin = new Date(this.allDays[0].dateObject)
          timeMax = new Date(this.allDays[this.allDays.length - 1].dateObject)
          timeMax.setDate(timeMax.getDate() + 1)
        }
      }

      if (!timeMin || !timeMax) return

      // Fetch responses between timeMin and timeMax
      let url = `/events/${
        this.event._id
      }/responses?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`
      
      // Add guestName query parameter if user is a guest
      if (this.guestName && this.guestName.length > 0) {
        url += `&guestName=${encodeURIComponent(this.guestName)}`
      }
      
      get(url)
        .then((responses) => {
          this.fetchedResponses = responses
          this.getResponsesFormatted()
        })
        .catch((err) => {
          this.showError(
            "There was an error fetching availability! Please refresh the page."
          )
        })
    },
    /** Formats the responses in a map where date/time is mapped to the people that are available then */
    getResponsesFormatted() {
      const lastFetched = new Date().getTime()
      this.loadingResponses.loading = true
      this.loadingResponses.lastFetched = lastFetched

      this.$worker
        .run(
          (days, times, parsedResponses, daysOnly, hideIfNeeded) => {
            // Define functions locally because we can't import functions
            const splitTimeNum = (timeNum) => {
              const hours = Math.floor(timeNum)
              const minutes = Math.floor((timeNum - hours) * 60)
              return { hours, minutes }
            }
            const getDateHoursOffset = (date, hoursOffset) => {
              const { hours, minutes } = splitTimeNum(hoursOffset)
              const newDate = new Date(date)
              newDate.setHours(newDate.getHours() + hours)
              newDate.setMinutes(newDate.getMinutes() + minutes)
              return newDate
            }

            // Create array of all dates in the event
            const dates = []
            if (daysOnly) {
              for (const day of days) {
                dates.push(day.dateObject)
              }
            } else {
              for (const day of days) {
                for (const time of times) {
                  // Iterate through all the times
                  const date = getDateHoursOffset(
                    day.dateObject,
                    time.hoursOffset
                  )
                  dates.push(date)
                }
              }
            }

            // Create a map mapping time to the respondents available during that time
            const formatted = new Map()
            for (const date of dates) {
              formatted.set(date.getTime(), new Set())

              // Check every response and see if they are available for the given time
              for (const response of Object.values(parsedResponses)) {
                // Check availability array
                if (
                  response.availability?.has(date.getTime()) ||
                  (response.ifNeeded?.has(date.getTime()) && !hideIfNeeded)
                ) {
                  formatted.get(date.getTime()).add(response.user._id)
                  continue
                }
              }
            }
            return formatted
          },
          [
            this.allDays,
            this.times,
            this.parsedResponses,
            this.event.daysOnly,
            this.hideIfNeeded,
          ]
        )
        .then((formatted) => {
          // Only set responses formatted for the latest request
          if (lastFetched >= this.loadingResponses.lastFetched) {
            this.responsesFormatted = formatted
          }
        })
        .finally(() => {
          if (this.loadingResponses.lastFetched === lastFetched) {
            this.loadingResponses.loading = false
          }
        })
    },
    /** Returns a set of respondents for the given date/time */
    getRespondentsForHoursOffset(date, hoursOffset) {
      const d = getDateHoursOffset(date, hoursOffset)
      return this.responsesFormatted.get(d.getTime()) ?? new Set()
    },
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

    // -----------------------------------
    //#region Current user availability
    // -----------------------------------
    async refreshAuthUser() {
      this.hasRefreshedAuthUser = true
      await get("/user/profile").then((authUser) => {
        this.setAuthUser(authUser)
      })
    },
    /** resets cur user availability to the response stored on the server */
    resetCurUserAvailability() {
      if (this.event.type === eventTypes.GROUP) {
        this.initSharedCalendarAccounts()
        this.manualAvailability = {}
      }

      this.availability = new Set()
      this.ifNeeded = new Set()
      if (this.userHasResponded) {
        this.populateUserAvailability(this.authUser._id)
      }
    },
    /** Populates the availability set for the auth user from the responses object stored on the server */
    populateUserAvailability(id) {
      this.availability =
        new Set(this.parsedResponses[id]?.availability) ?? new Set()
      this.ifNeeded = new Set(this.parsedResponses[id]?.ifNeeded) ?? new Set()
      this.$nextTick(() => (this.unsavedChanges = false))
    },
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
    /** Returns a set containing the available times based on the given calendar events object */
    getAvailabilityFromCalendarEvents({
      calendarEventsByDay = [],
      includeTouchedAvailability = false, // Whether to include manual availability for touched days
      fetchedManualAvailability = {}, // Object mapping unix timestamp to array of manual availability (fetched from server)
      curManualAvailability = {}, // Manual availability with edits (takes precedence over fetchedManualAvailability)
      calendarOptions = calendarOptionsDefaults, // User id of the user we are getting availability for
    }) {
      const availability = new Set()

      for (let i = 0; i < this.allDays.length; ++i) {
        const day = this.allDays[i]
        const date = day.dateObject

        if (includeTouchedAvailability) {
          const endDate = getDateHoursOffset(
            date,
            this.times.length * (this.timeslotDuration / 60)
          )

          // Check if manual availability has been added for the current date
          let manualAvailabilityAdded = false

          for (const time in curManualAvailability) {
            if (date.getTime() <= time && time <= endDate.getTime()) {
              curManualAvailability[time].forEach((a) => {
                availability.add(new Date(a).getTime())
              })
              delete curManualAvailability[time]
              manualAvailabilityAdded = true
              break
            }
          }

          if (manualAvailabilityAdded) continue

          for (const time in fetchedManualAvailability) {
            if (date.getTime() <= time && time <= endDate.getTime()) {
              fetchedManualAvailability[time].forEach((a) => {
                availability.add(new Date(a).getTime())
              })
              delete fetchedManualAvailability[time]
              manualAvailabilityAdded = true
              break
            }
          }

          if (manualAvailabilityAdded) continue
        }

        // Calculate buffer time
        const bufferTimeInMS = calendarOptions.bufferTime.enabled
          ? calendarOptions.bufferTime.time * 1000 * 60
          : 0

        // Calculate working hours
        const startTimeString = timeNumToTimeString(
          calendarOptions.workingHours.startTime
        )
        const isoDateString = getISODateString(getDateWithTimezone(date), true)
        const workingHoursStartDate = dayjs
          .tz(`${isoDateString} ${startTimeString}`, this.curTimezone.value)
          .toDate()
        let duration =
          calendarOptions.workingHours.endTime -
          calendarOptions.workingHours.startTime
        if (duration <= 0) duration += 24
        const workingHoursEndDate = getDateHoursOffset(
          workingHoursStartDate,
          duration
        )

        for (let j = 0; j < this.times.length; ++j) {
          const startDate = this.getDateFromDayTimeIndex(i, j)
          if (!startDate) continue
          const endDate = getDateHoursOffset(
            startDate,
            this.timeslotDuration / 60
          )

          // Working hours
          if (calendarOptions.workingHours.enabled) {
            if (
              endDate.getTime() <= workingHoursStartDate.getTime() ||
              startDate.getTime() >= workingHoursEndDate.getTime()
            ) {
              continue
            }
          }

          // Check if there exists a calendar event that overlaps [startDate, endDate]
          const index = calendarEventsByDay[i]?.findIndex((e) => {
            const startDateBuffered = new Date(
              e.startDate.getTime() - bufferTimeInMS
            )
            const endDateBuffered = new Date(
              e.endDate.getTime() + bufferTimeInMS
            )

            const notIntersect =
              dateCompare(endDate, startDateBuffered) <= 0 ||
              dateCompare(startDate, endDateBuffered) >= 0
            return !notIntersect && !e.free
          })
          if (index === -1) {
            availability.add(startDate.getTime())
          }
        }
      }
      return availability
    },
    /** Constructs the availability array using calendarEvents array */
    setAvailabilityAutomatically() {
      // This is not a computed property because we should be able to change it manually from what it automatically fills in
      this.availability = new Set()
      const tmpAvailability = this.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: this.calendarEventsByDay,
        calendarOptions: {
          bufferTime: this.bufferTime,
          workingHours: this.workingHours,
        },
      })

      const pageStartDate = getDateDayOffset(
        new Date(this.event.dates[0]),
        this.page * this.maxDaysPerPage
      )
      const pageEndDate = getDateDayOffset(pageStartDate, this.maxDaysPerPage)
      this.animateAvailability(tmpAvailability, pageStartDate, pageEndDate)
    },
    /** Animate the filling out of availability using setTimeout, between startDate and endDate */
    animateAvailability(availability, startDate, endDate) {
      this.availabilityAnimEnabled = true
      this.availabilityAnimTimeouts = []

      let msPerGroup = 25
      let blocksPerGroup = 2
      if (
        (availability.size / blocksPerGroup) * msPerGroup >
        this.maxAnimTime
      ) {
        blocksPerGroup = (availability.size * msPerGroup) / this.maxAnimTime
      }
      let availabilityArray = [...availability]
      availabilityArray = availabilityArray.filter((a) =>
        isDateBetween(a, startDate, endDate)
      )

      for (let i = 0; i < availabilityArray.length / blocksPerGroup + 1; ++i) {
        const timeout = setTimeout(() => {
          for (const a of availabilityArray.slice(
            i * blocksPerGroup,
            i * blocksPerGroup + blocksPerGroup
          )) {
            this.availability.add(a)
          }
          this.availability = new Set(this.availability)
          if (i >= availabilityArray.length / blocksPerGroup) {
            // Make sure the entire availability has been added (will not be guaranteed when only animating a portion of availability)
            this.availability = new Set(availability)
            this.availabilityAnimTimeouts.push(
              setTimeout(() => {
                this.availabilityAnimEnabled = false

                if (this.showSnackbar) {
                  this.showInfo("Your availability has been autofilled!")
                }
                this.unsavedChanges = false
              }, 500)
            )
          }
        }, i * msPerGroup)

        this.availabilityAnimTimeouts.push(timeout)
      }
    },
    stopAvailabilityAnim() {
      for (const timeout of this.availabilityAnimTimeouts) {
        clearTimeout(timeout)
      }
      this.availabilityAnimEnabled = false
    },
    async submitAvailability(guestPayload = { name: "", email: "" }) {
      let payload = {}

      let type = ""
      // If this is a group submit enabled calendars, otherwise submit availability
      if (this.isGroup) {
        type = "group availability and calendars"
        payload = generateEnabledCalendarsPayload(this.sharedCalendarAccounts)
        payload.manualAvailability = {}
        for (const day of Object.keys(this.manualAvailability)) {
          payload.manualAvailability[day] = [
            ...this.manualAvailability[day],
          ].map((a) => new Date(a))
        }
        payload.calendarOptions = {
          bufferTime: this.bufferTime,
          workingHours: this.workingHours,
        }
      } else {
        type = "availability"
        payload.availability = this.availabilityArray
        payload.ifNeeded = this.ifNeededArray
        if (this.authUser && !this.addingAvailabilityAsGuest) {
          payload.guest = false
        } else {
          payload.guest = true
          payload.name = guestPayload.name
          payload.email = guestPayload.email
          // Store with event._id (current format used by guestNameKey)
          localStorage[this.guestNameKey] = guestPayload.name
          // Also store with shortId or _id (to match eventId prop format used in Event.vue)
          // This allows refreshEvent() to read it immediately without needing event._id first
          const eventIdKey = `${this.event.shortId ?? this.event._id}.guestName`
          localStorage[eventIdKey] = guestPayload.name
        }
      }

      await post(`/events/${this.event._id}/response`, payload)

      // Update analytics
      const addedIfNeededTimes = this.ifNeededArray.length > 0
      if (this.authUser) {
        if (this.authUser._id in this.parsedResponses) {
          this.$posthog?.capture(`Edited ${type}`, {
            eventId: this.event._id,
            addedIfNeededTimes,
          })
        } else {
          this.$posthog?.capture(`Added ${type}`, {
            eventId: this.event._id,
            addedIfNeededTimes,
            // bufferTime: this.bufferTime,
            bufferTime: this.bufferTime.time,
            bufferTimeActive: this.bufferTime.enabled,
            workingHoursEnabled: this.workingHours.enabled,
            workingHoursStartTime: this.workingHours.startTime,
            workingHoursEndTime: this.workingHours.endTime,
          })
        }
      } else {
        if (guestPayload.name in this.parsedResponses) {
          this.$posthog?.capture(`Edited ${type} as guest`, {
            eventId: this.event._id,
            addedIfNeededTimes,
          })
        } else {
          this.$posthog?.capture(`Added ${type} as guest`, {
            eventId: this.event._id,
            addedIfNeededTimes,
          })
        }
      }

      this.refreshEvent()
      this.unsavedChanges = false
    },
    async submitNewSignUpBlocks() {
      if (
        this.signUpBlocksToAddByDay.flat().length +
          this.signUpBlocksByDay.flat().length ===
        0
      ) {
        this.showError("Please add at least one sign-up block!")
        return false
      }

      for (let i = 0; i < this.signUpBlocksToAddByDay.length; ++i) {
        this.signUpBlocksByDay[i] = this.signUpBlocksByDay[i].concat(
          this.signUpBlocksToAddByDay[i]
        )
        this.signUpBlocksToAddByDay[i] = []
      }

      const payload = {
        name: this.event.name,
        duration: this.event.duration,
        dates: this.event.dates,
        type: this.event.type,
        signUpBlocks: this.signUpBlocksByDay.flat().map((block) => {
          return {
            _id: block._id,
            name: block.name,
            capacity: block.capacity,
            startDate: block.startDate,
            endDate: block.endDate,
          }
        }),
      }

      put(`/events/${this.event._id}`, payload)
        .then(() => {
          // window.location.reload()
        })
        .catch((err) => {
          console.error(err)
          this.showError(
            "There was a problem editing this event! Please try again later."
          )
        })

      return true
    },

    async deleteAvailability(name = "") {
      const payload = {}
      if (this.authUser && !this.addingAvailabilityAsGuest) {
        payload.guest = false
        payload.userId = this.authUser._id

        this.$posthog?.capture("Deleted availability", {
          eventId: this.event._id,
        })
      } else {
        payload.guest = true
        payload.name = name

        this.$posthog?.capture("Deleted availability as guest", {
          eventId: this.event._id,
          name,
        })
      }
      await _delete(`/events/${this.event._id}/response`, payload)
      this.availability = new Set()
      if (this.isGroup) this.$router.replace({ name: "home" })
      else this.refreshEvent()
    },
    //#endregion

    // -----------------------------------
    //#region Timeslot
    // -----------------------------------
    setTimeslotSize() {
      /* Gets the dimensions of each timeslot and assigns it to the timeslot variable */
      const timeslotEl = document.querySelector(".timeslot")
      if (timeslotEl) {
        ;({ width: this.timeslot.width, height: this.timeslot.height } =
          timeslotEl.getBoundingClientRect())
      }
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
    openEditGuestNameDialog() {
      this.newGuestName = this.curGuestId
      this.editGuestNameDialog = true
    },
    async saveGuestName() {
      const newName = this.newGuestName.trim()
      if (newName.length === 0) {
        this.showError("Guest name cannot be empty")
        return
      }
      if (newName === this.curGuestId) {
        this.editGuestNameDialog = false
        return
      }
      try {
        await post(`/events/${this.event._id}/rename-user`, {
          oldName: this.curGuestId,
          newName,
        })
        // Store with event._id (current format used by guestNameKey)
        localStorage[this.guestNameKey] = newName
        // Also store with shortId or _id (to match eventId prop format used in Event.vue)
        const eventIdKey = `${this.event.shortId ?? this.event._id}.guestName`
        localStorage[eventIdKey] = newName
        this.showInfo("Guest name updated successfully")
        this.editGuestNameDialog = false
        this.$emit("setCurGuestId", newName)
        this.refreshEvent()
      } catch (err) {
        const errorMessage = err.parsed?.error || err.message || "Failed to update guest name"
        this.showError(errorMessage)
      }
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
    //#region Drag Stuff
    // -----------------------------------
    normalizeXY(e) {
      /* Normalize the touch event to be relative to element */
      let pageX, pageY
      if ("touches" in e) {
        // is a touch event
        ;({ pageX, pageY } = e.touches[0])
      } else {
        // is a mouse event
        ;({ pageX, pageY } = e)
      }
      const { left, top } = e.currentTarget.getBoundingClientRect()
      const x = pageX - left
      const y = pageY - top - window.scrollY
      return { x, y }
    },
    clampRow(row) {
      if (this.event.daysOnly) {
        row = clamp(row, 0, Math.floor(this.monthDays.length / 7))
      } else {
        row = clamp(row, 0, this.times.length - 1)
      }
      return row
    },
    clampCol(col) {
      if (this.event.daysOnly) {
        col = clamp(col, 0, 7 - 1)
      } else {
        col = clamp(col, 0, this.days.length - 1)
      }
      return col
    },
    /** Returns row, col for the timeslot we are currently hovering over given the x and y position */
    getRowColFromXY(x, y) {
      const { width, height } = this.timeslot
      let col = Math.floor(x / width)
      if (!this.event.daysOnly) {
        col = this.columnOffsets.length
        for (let i = 0; i < this.columnOffsets.length; ++i) {
          if (x < this.columnOffsets[i]) {
            col = i - 1
            break
          }
        }
      }
      let row = Math.floor(y / height)

      // Account for split gap
      if (!this.event.daysOnly && row > this.splitTimes[0].length) {
        const adjustedRow = Math.floor((y - this.SPLIT_GAP_HEIGHT) / height)
        if (adjustedRow >= this.splitTimes[0].length) {
          // Make sure we don't go to a lesser index
          row = adjustedRow
        }
      }

      row = this.clampRow(row)
      col = this.clampCol(col)
      return {
        row,
        col,
      }
    },
    endDrag() {
      if (!this.allowDrag) return

      if (!this.dragStart || !this.dragCur) return

      // Update availability set based on drag region
      if (
        this.state === this.states.EDIT_AVAILABILITY ||
        this.state === this.states.SET_SPECIFIC_TIMES
      ) {
        // Determine colInc and rowInc
        let colInc =
          (this.dragCur.col - this.dragStart.col) /
          Math.abs(this.dragCur.col - this.dragStart.col)
        let rowInc =
          (this.dragCur.row - this.dragStart.row) /
          Math.abs(this.dragCur.row - this.dragStart.row)
        if (isNaN(colInc)) colInc = 1
        if (isNaN(rowInc)) rowInc = 1

        // Determine iteration variables
        let rowStart = this.dragStart.row
        let rowMax = this.dragCur.row + rowInc
        let colStart = this.dragStart.col
        let colMax = this.dragCur.col + colInc

        // Correct iteration variables if days only
        if (this.event.daysOnly) {
          colStart = 0
          colMax = 7
          colInc = 1
        }

        // Iterate all selected time slots and either add or remove them
        for (let r = rowStart; r != rowMax; r += rowInc) {
          for (let c = colStart; c != colMax; c += colInc) {
            const date = this.getDateFromRowCol(r, c)
            if (!date) continue

            if (this.event.daysOnly) {
              // Don't add to availability set if month day is not included
              const isMonthDayIncluded =
                this.monthDayIncluded.get(date.getTime()) &&
                this.inDragRange(r, c)
              if (!isMonthDayIncluded) continue
            }

            if (this.dragType === this.DRAG_TYPES.ADD) {
              if (this.state === this.states.SET_SPECIFIC_TIMES) {
                this.tempTimes.add(date.getTime())
              } else {
                // Add / remove time from availability set
                if (this.availabilityType === availabilityTypes.AVAILABLE) {
                  this.availability.add(date.getTime())
                  this.ifNeeded.delete(date.getTime())
                } else if (
                  this.availabilityType === availabilityTypes.IF_NEEDED
                ) {
                  this.ifNeeded.add(date.getTime())
                  this.availability.delete(date.getTime())
                }
              }
            } else if (this.dragType === this.DRAG_TYPES.REMOVE) {
              if (this.state === this.states.SET_SPECIFIC_TIMES) {
                this.tempTimes.delete(date.getTime())
              } else {
                // Add / remove time from availability set
                this.availability.delete(date.getTime())
                this.ifNeeded.delete(date.getTime())
              }
            }

            // Edit manualAvailability set if event is a GROUP
            if (this.event.type === eventTypes.GROUP) {
              const discreteDate = dateToDowDate(
                this.event.dates,
                date,
                this.weekOffset,
                true
              )
              const startDateOfDay = dateToDowDate(
                this.event.dates,
                this.days[c].dateObject,
                this.weekOffset,
                true
              )

              // If date not touched, then add all of the existing calendar availabilities and mark it as touched
              if (!(startDateOfDay.getTime() in this.manualAvailability)) {
                // Create new set
                this.manualAvailability[startDateOfDay.getTime()] = new Set()

                // Add the existing calendar availabilities
                const existingAvailability = this.getAvailabilityForColumn(c)
                for (const a of existingAvailability) {
                  const convertedDate = dateToDowDate(
                    this.event.dates,
                    new Date(a),
                    this.weekOffset,
                    true
                  )
                  this.manualAvailability[startDateOfDay.getTime()].add(
                    convertedDate.getTime()
                  )
                }
              }

              // Add / remove time from manual availability set
              if (this.dragType === this.DRAG_TYPES.ADD) {
                this.manualAvailability[startDateOfDay.getTime()].add(
                  discreteDate.getTime()
                )
              } else if (this.dragType === this.DRAG_TYPES.REMOVE) {
                this.manualAvailability[startDateOfDay.getTime()].delete(
                  discreteDate.getTime()
                )
              }
            }
          }
        }
        this.availability = new Set(this.availability)
      } else if (this.state === this.states.SCHEDULE_EVENT) {
        // Update scheduled event
        const col = this.dragStart.col
        const row = this.dragStart.row
        const numRows = this.dragCur.row - this.dragStart.row + 1

        if (numRows > 0) {
          this.curScheduledEvent = { col, row, numRows }
        } else {
          this.curScheduledEvent = null
        }
      } else if (this.state === this.states.EDIT_SIGN_UP_BLOCKS) {
        // Update sign up blocks
        const dayIndex = this.dragStart.col
        const hoursOffset = this.dragStart.row / 4
        const hoursLength = (this.dragCur.row - this.dragStart.row + 1) / 4
        if (hoursLength > 0) {
          this.signUpBlocksToAddByDay[dayIndex].push(
            this.createSignUpBlock(dayIndex, hoursOffset, hoursLength)
          )
        }
      }

      // Set dragging defaults
      this.dragging = false
      this.dragStart = null
      this.dragCur = null
    },
    inDragRange(row, col) {
      /* Returns whether the given row and col is within the drag range */
      if (this.dragging) {
        if (this.event.daysOnly) {
          if (
            isBetween(row, this.dragStart.row, this.dragCur.row) ||
            isBetween(row, this.dragCur.row, this.dragStart.row)
          ) {
            if (this.dragCur.row < this.dragStart.row) {
              return (
                (this.dragCur.row === row && this.dragCur.col <= col) ||
                (this.dragStart.row === row && this.dragStart.col >= col) ||
                (this.dragStart.row !== row && this.dragCur.row !== row)
              )
            } else if (this.dragCur.row > this.dragStart.row) {
              return (
                (this.dragCur.row === row && this.dragCur.col >= col) ||
                (this.dragStart.row === row && this.dragStart.col <= col) ||
                (this.dragStart.row !== row && this.dragCur.row !== row)
              )
            } else {
              // cur row == start row
              return (
                isBetween(col, this.dragStart.col, this.dragCur.col) ||
                isBetween(col, this.dragCur.col, this.dragStart.col)
              )
            }
          }
          return false
        }

        return (
          (isBetween(row, this.dragStart.row, this.dragCur.row) ||
            isBetween(row, this.dragCur.row, this.dragStart.row)) &&
          (isBetween(col, this.dragStart.col, this.dragCur.col) ||
            isBetween(col, this.dragCur.col, this.dragStart.col))
        )
      }
      return false
    },
    moveDrag(e) {
      if (!this.allowDrag) return
      if (e.touches?.length > 1) return // If dragging with more than one finger
      if (!this.dragStart) return

      e.preventDefault()
      let { row, col } = this.getRowColFromXY(
        ...Object.values(this.normalizeXY(e))
      )

      if (
        this.maxSignUpBlockRowSize &&
        row >= this.dragStart.row + this.maxSignUpBlockRowSize
      ) {
        row = this.dragStart.row + this.maxSignUpBlockRowSize - 1
      } else if (this.state === this.states.SCHEDULE_EVENT) {
        const isFirstSplit = this.dragStart.row < this.splitTimes[0].length
        if (isFirstSplit) {
          row = Math.min(row, this.splitTimes[0].length - 1)
        }
      }

      this.dragCur = { row, col }
    },
    startDrag(e) {
      const { row, col } = this.getRowColFromXY(
        ...Object.values(this.normalizeXY(e))
      )

      // If sign up form, check if trying to drag in a block
      if (this.isSignUp) {
        for (const block of this.signUpBlocksByDay[col].concat(
          this.signUpBlocksToAddByDay[col]
        )) {
          if (
            isBetween(
              row,
              block.hoursOffset * 4,
              (block.hoursOffset + block.hoursLength) * 4 - 1
            )
          ) {
            this.$refs.signUpBlocksList.scrollToSignUpBlock(block._id)
            return
          }
        }
      }

      if (!this.allowDrag) return
      if (e.touches?.length > 1) return // If dragging with more than one finger

      const date = this.getDateFromRowCol(row, col)
      if (!date) return

      // Dont start dragging if day not included in daysonly event
      if (this.event.daysOnly && !this.monthDayIncluded.get(date.getTime())) {
        return
      }

      this.dragging = true
      this.dragStart = { row, col }
      this.dragCur = { row, col }

      // Prevent scroll
      e.preventDefault()

      // Set drag type
      if (this.isSignUp) {
        this.dragType = this.DRAG_TYPES.ADD
      } else if (
        (this.state === this.states.SET_SPECIFIC_TIMES &&
          this.tempTimes.has(date.getTime())) ||
        (this.availabilityType === availabilityTypes.AVAILABLE &&
          this.availability.has(date.getTime())) ||
        (this.availabilityType === availabilityTypes.IF_NEEDED &&
          this.ifNeeded.has(date.getTime()))
      ) {
        this.dragType = this.DRAG_TYPES.REMOVE
      } else {
        this.dragType = this.DRAG_TYPES.ADD
      }
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
    toggleShowEditOptions() {
      this.showEditOptions = !this.showEditOptions
      localStorage["showEditOptions"] = this.showEditOptions
    },
    toggleShowEventOptions() {
      this.showEventOptions = !this.showEventOptions
      localStorage["showEventOptions"] = this.showEventOptions
    },
    updateOverlayAvailability(val) {
      this.overlayAvailability = !!val
      this.$posthog.capture("overlay_availability_toggled", {
        enabled: !!val,
      })
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
    //#region Sign up form
    // -----------------------------------

    /** Creates a sign up block for the current day and hour offset */
    createSignUpBlock(dayIndex, hoursOffset, hoursLength) {
      const timeBlock = getTimeBlock(
        this.days[dayIndex].dateObject,
        hoursOffset,
        hoursLength
      )

      return {
        _id: ObjectID().toString(),
        capacity: 1,
        name: this.newSignUpBlockName,
        ...timeBlock,
        hoursOffset,
        hoursLength,
      }
    },

    /** Updates the sign up block with the same id */
    editSignUpBlock(signUpBlock) {
      this.signUpBlocksByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlock._id === block._id) {
            this.signUpBlocksByDay[dayIndex][blockIndex] = signUpBlock
            this.signUpBlocksByDay = [...this.signUpBlocksByDay]
            return
          }
        })
      })

      this.signUpBlocksToAddByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlock._id === block._id) {
            this.signUpBlocksToAddByDay[dayIndex][blockIndex] = signUpBlock
            this.signUpBlocksToAddByDay = [...this.signUpBlocksToAddByDay]
            return
          }
        })
      })
    },

    /** Deletes the sign up block with the id */
    deleteSignUpBlock(signUpBlockId) {
      this.signUpBlocksByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlockId === block._id) {
            this.signUpBlocksByDay[dayIndex].splice(blockIndex, 1)
            return
          }
        })
      })

      this.signUpBlocksToAddByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlockId === block._id) {
            this.signUpBlocksToAddByDay[dayIndex].splice(blockIndex, 1)
            return
          }
        })
      })
    },

    /** Reloads all the data for the sign up form */
    resetSignUpForm() {
      /** Split sign up blocks by day */
      this.signUpBlocksByDay = splitTimeBlocksByDay(
        this.event,
        this.event.signUpBlocks ?? []
      )

      this.resetSignUpBlocksToAddByDay()

      /** Populate sign up block responses */
      for (const userId in this.event.signUpResponses) {
        const signUpResponse = this.event.signUpResponses[userId]
        for (const signUpBlockId of signUpResponse.signUpBlockIds) {
          const signUpBlock = this.signUpBlocksByDay
            .flat()
            .find((signUpBlock) => signUpBlock._id === signUpBlockId)

          if (!signUpBlock.responses) signUpBlock.responses = []
          signUpBlock.responses.push(signUpResponse)
        }
      }
    },

    /** Initialize sign up blocks to be added array */
    resetSignUpBlocksToAddByDay() {
      this.signUpBlocksToAddByDay = []
      for (const day of this.signUpBlocksByDay) {
        this.signUpBlocksToAddByDay.push([])
      }
    },

    /** Emits sign up for block to parent element */
    handleSignUpBlockClick(block) {
      const blockFull = (block.responses?.length || 0) >= block.capacity
      if (!this.alreadyRespondedToSignUpForm && !blockFull && !this.isOwner)
        this.$emit("signUpForBlock", block)
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

    /** Recalculate availability the calendar based on calendar events */
    reanimateAvailability() {
      if (
        this.state === this.states.EDIT_AVAILABILITY &&
        this.authUser &&
        !(this.authUser?._id in this.event.responses) && // User hasn't responded yet
        !this.loadingCalendarEvents &&
        (!this.unsavedChanges || this.availabilityAnimEnabled)
      ) {
        for (const timeout of this.availabilityAnimTimeouts) {
          clearTimeout(timeout)
        }
        this.setAvailabilityAutomatically()
      }
    },
  },
  watch: {
    availability() {
      if (this.state === this.states.EDIT_AVAILABILITY) {
        this.unsavedChanges = true
      }
    },
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
    calendarEventsByDay(val, oldVal) {
      if (JSON.stringify(val) !== JSON.stringify(oldVal)) {
        this.reanimateAvailability()
      }
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
    hideIfNeeded() {
      this.getResponsesFormatted()
    },
    parsedResponses() {
      // Theoretically, parsed responses should only be changing for groups
      this.getResponsesFormatted()

      // Repopulate user availability when editing availability (this happens when switching weeks in a group)
      if (
        this.event.type === eventTypes.GROUP &&
        this.state === this.states.EDIT_AVAILABILITY &&
        this.authUser
      ) {
        this.availability = new Set()
        this.populateUserAvailability(this.authUser._id)
      }
    },
    showBestTimes() {
      this.onShowBestTimesChange()
    },
    startCalendarOnMonday() {
      localStorage["startCalendarOnMonday"] = this.startCalendarOnMonday
    },
    bufferTime(cur, prev) {
      if (cur.enabled !== prev.enabled || cur.enabled) {
        this.reanimateAvailability()
      }
    },
    workingHours(cur, prev) {
      if (cur.enabled !== prev.enabled || cur.enabled) {
        this.reanimateAvailability()
      }
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
    if (!this.calendarOnly) {
      const timesEl = document.getElementById("drag-section")
      if (isTouchEnabled()) {
        timesEl.addEventListener("touchstart", this.startDrag)
        timesEl.addEventListener("touchmove", this.moveDrag)
        timesEl.addEventListener("touchend", this.endDrag)
        timesEl.addEventListener("touchcancel", this.endDrag)
      }
      timesEl.addEventListener("mousedown", this.startDrag)
      timesEl.addEventListener("mousemove", this.moveDrag)
      timesEl.addEventListener("mouseup", this.endDrag)
    }

    // Parse sign up blocks and responses
    this.resetSignUpForm()
  },
  beforeDestroy() {
    removeEventListener("click", this.deselectRespondents)
    removeEventListener("resize", this.onResize)
    removeEventListener("scroll", this.onScroll)
  },
  components: {
    AlertText,
    AvailabilityTypeToggle,
    ColorLegend,
    ExpandableSection,
    BufferTimeSwitch,
    UserAvatarContent,
    ZigZag,
    ConfirmDetailsDialog,
    ToolRow,
    CalendarAccounts,
    RespondentsList,
    Advertisement,
    GCalWeekSelector,
    WorkingHoursToggle,
    SignUpBlock,
    SignUpCalendarBlock,
    SignUpBlocksList,
    CalendarEventBlock, // Added component registration
    SpecificTimesInstructions, // Added component registration
    Tooltip,
  },
}
</script>
