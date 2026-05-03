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
                                  :block-style="
                                    getRenderedTimeBlockStyleForTemplate(
                                      calendarEvent
                                    )
                                  "
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
                                  :style="getSignUpBlockStyle(block)"
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
                                  :style="getSignUpBlockStyle(block)"
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
                                :style="
                                  getRenderedTimeBlockStyleForTemplate(
                                    timeBlock
                                  )
                                "
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
                @update:sign-up-block="editSignUpBlock"
                @delete:sign-up-block="deleteSignUpBlock"
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
  ref, computed, nextTick,
} from "vue"
import { useDisplay } from "vuetify"
import { Temporal } from "temporal-polyfill"
import {
  post,
  ZdtSet,
} from "@/utils"
import {
  availabilityTypes, eventTypes, guestUserId, UTC
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
import {
  buildDayGridTimeslotClassStyles,
  buildOverlaidAvailability,
  buildTimeGridTimeslotClassStyles,
  formatTooltipContent,
  getSignUpBlockStyle,
  getTimeBlockStyle,
} from "./scheduleOverlapRendering"
import { useCalendarGrid } from "@/composables/schedule_overlap/useCalendarGrid"
import { useCalendarEvents } from "@/composables/schedule_overlap/useCalendarEvents"
import { useAvailabilityData } from "@/composables/schedule_overlap/useAvailabilityData"
import { useDragPaint } from "@/composables/schedule_overlap/useDragPaint"
import { useEventScheduling } from "@/composables/schedule_overlap/useEventScheduling"
import { useSignUpForm } from "@/composables/schedule_overlap/useSignUpForm"
import { useScheduleOverlapUI } from "@/composables/schedule_overlap/useScheduleOverlapUI"
import { useScheduleOverlapController } from "./useScheduleOverlapController"
import {
  states, SPLIT_GAP_HEIGHT, SPLIT_GAP_WIDTH,
} from "@/composables/schedule_overlap/types"
import type {
  FetchedResponse, RowCol, Timezone, ScheduleOverlapState, EventLike, CalendarEventLite, CalendarEventsByDay, CalendarEventsMap,
  SignUpBlockLite,
} from "@/composables/schedule_overlap/types"

// ── Props / Emits ──────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    event: EventLike
    ownerIsPremium?: boolean
    fromEditEvent?: boolean
    loadingCalendarEvents?: boolean
    calendarEventsMap?: CalendarEventsMap
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
  signUpForBlock: [block: SignUpBlockLite]
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
const state = ref<ScheduleOverlapState>(states.BEST_TIMES)
const showBestTimes = ref<boolean>(
  localStorage.showBestTimes === undefined
    ? false
    : localStorage.showBestTimes === "true"
)
const defaultState = computed<ScheduleOverlapState>(() =>
  showBestTimes.value ? states.BEST_TIMES : states.HEATMAP
)
const availabilityType = ref(availabilityTypes.AVAILABLE)
const allowDrag = computed(
  () =>
    state.value === states.EDIT_AVAILABILITY ||
    state.value === states.EDIT_SIGN_UP_BLOCKS ||
    state.value === states.SCHEDULE_EVENT ||
    state.value === states.SET_SPECIFIC_TIMES
)
const dragging = ref(false)
const dragStart = ref<RowCol | null>(null)
const dragCur = ref<RowCol | null>(null)
const fetchedResponses = ref<Record<string, FetchedResponse | undefined>>({})
const loadingResponses = ref({
  loading: false,
  lastFetched: Temporal.Now.instant().toZonedDateTimeISO(UTC),
})

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
// ── 2. useCalendarEvents ───────────────────────────────────────────────
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
  fetchedResponses,
  loadingResponses,
})

// ── 3. useAvailabilityData ─────────────────────────────────────────────
const avail = useAvailabilityData({
  event: eventRef,
  weekOffset: weekOffsetRef,
  state,
  fetchedResponses,
  loadingResponses,
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
  calendarEventsByDay: calEvents.calendarEventsByDay,
  groupCalendarEventsByDay: calEvents.groupCalendarEventsByDay,
  bufferTime: calEvents.bufferTime,
  workingHours: calEvents.workingHours,
  getAvailabilityFromCalendarEvents: calEvents.getAvailabilityFromCalendarEvents,
  refreshEvent: () => { emit("refreshEvent"); },
})

// ── 4. useEventScheduling ──────────────────────────────────────────────
const eventSched = useEventScheduling({
  event: eventRef,
  weekOffset: weekOffsetRef,
  curTimezone,
  state,
  defaultState,
  splitTimes: grid.splitTimes,
  timeslotDuration: grid.timeslotDuration,
  timeslotHeight: grid.timeslotHeight,
  timezoneOffset: grid.timezoneOffset,
  isWeekly: grid.isWeekly,
  isGroup,
  isSpecificTimes: grid.isSpecificTimes,
  getDateFromRowCol: grid.getDateFromRowCol,
  getMinMaxHoursFromTimes: grid.getMinMaxHoursFromTimes,
  dragging,
  dragStart,
  dragCur,
  tempTimes: avail.tempTimes,
  respondents: avail.respondents,
})

// ── 5. useSignUpForm ───────────────────────────────────────────────────
const signUpForm = useSignUpForm({
  event: eventRef,
  isSignUp,
  days: grid.days,
  isOwner,
  dragStart,
})

// ── 6. useDragPaint ────────────────────────────────────────────────────
const drag = useDragPaint({
  event: eventRef,
  state,
  isSignUp,
  weekOffset: weekOffsetRef,
  dragging,
  dragStart,
  dragCur,
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
  availabilityType,
  signUpBlocksByDay: signUpForm.signUpBlocksByDay,
  signUpBlocksToAddByDay: signUpForm.signUpBlocksToAddByDay,
  manualAvailability: avail.manualAvailability,
  curScheduledEvent: eventSched.curScheduledEvent,
  maxSignUpBlockRowSize: signUpForm.maxSignUpBlockRowSize,
  allowDrag,
  getDateFromRowCol: grid.getDateFromRowCol,
  getAvailabilityForColumn: avail.getAvailabilityForColumn,
  createSignUpBlock: signUpForm.createSignUpBlock,
  scrollToSignUpBlock: (id: string) => signUpBlocksListRef.value?.scrollToSignUpBlock?.(id),
})

// ── 7. useScheduleOverlapUI ────────────────────────────────────────────
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
  showBestTimes,
  defaultState,
  allowDrag,
  availabilityType,
  parsedResponses: avail.parsedResponses,
  curTimeslot: avail.curTimeslot,
  endDrag: drag.endDrag,
  timeslotSelected: avail.timeslotSelected,
  curTimeslotAvailability: avail.curTimeslotAvailability,
  respondents: avail.respondents,
  curGuestId: computed(() => props.curGuestId),
  guestName,
  guestAddedAvailability,
  optionsSectionRef,
  respondentsListRef,
})

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
  unsavedChanges, hideIfNeeded, manualAvailability: _manualAvailability,
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
  dragType, normalizeXY: _normalizeXY, clampRow: _clampRow, clampCol: _clampCol,
  getRowColFromXY: _getRowColFromXY, inDragRange, startDrag, moveDrag, endDrag,
} = drag

const {
  showEditOptions, showEventOptions, showCalendarEvents,
  overlayAvailability, deleteAvailabilityDialog, calendarOptionsDialog, editGuestNameDialog,
  newGuestName, tooltipContent, optionsVisible: _optionsVisible, scrolledToRespondents: _scrolledToRespondents,
  delayedShowStickyRespondents, delayedShowStickyRespondentsTimeout, hintState: _hintState, curRespondent,
  curRespondents, editing, scheduling: _scheduling, curRespondentsSet, rightSideWidth,
  showStickyRespondents: _showStickyRespondents,
  hintStateLocalStorageKey: _hintStateLocalStorageKey, hintText, hintClosed: _hintClosed, hintTextShown, showOverlayAvailabilityToggle,
  selectedGuestRespondent: _selectedGuestRespondent, canEditGuestName, mouseOverRespondent, mouseLeaveRespondent,
  clickRespondent, deselectRespondents, isGuest: _isGuest, checkElementsVisible, onScroll,
  toggleShowEditOptions, toggleShowEventOptions, onShowBestTimesChange,
  updateOverlayAvailability, closeHint,
} = ui

useScheduleOverlapController({
  event: eventRef,
  fromEditEvent: computed(() => props.fromEditEvent),
  calendarOnly: computed(() => props.calendarOnly),
  weekOffset: weekOffsetRef,
  isGroup,
  isSpecificTimes,
  showBestTimes,
  state,
  availability,
  parsedResponses,
  respondents,
  curTimeslotAvailability,
  unsavedChanges,
  hideIfNeeded,
  page,
  allDays,
  mobileNumDays,
  tempTimes,
  calendarEventsByDay,
  bufferTime,
  workingHours,
  curScheduledEvent,
  delayedShowStickyRespondents,
  delayedShowStickyRespondentsTimeout,
  showStickyRespondents: ui.showStickyRespondents,
  authUser,
  setTimeslotSize,
  onResize,
  onScroll,
  startDrag,
  moveDrag,
  endDrag,
  deselectRespondents,
  resetSignUpForm: _resetSignUpForm,
  resetCurUserAvailability,
  initSharedCalendarAccounts,
  fetchResponses,
  reanimateAvailability,
  getResponsesFormatted,
  populateUserAvailability,
  checkElementsVisible,
  onShowBestTimesChange,
})

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
  return buildOverlaidAvailability({
    daysLength: days.value.length,
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    getDateFromRowCol,
    dragging: dragging.value,
    inDragRange,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
  })
})

const timeslotClassStyle = computed(() => {
  if (isSignUp.value) {
    return Array.from(
      { length: days.value.length * times.value.length },
      () => ({ class: "tw-bg-light-gray ", style: {} })
    )
  }

  return buildTimeGridTimeslotClassStyles({
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    getDateFromRowCol,
    state: state.value,
    overlayAvailability: overlayAvailability.value,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
    tempTimes: tempTimes.value,
    responsesFormatted: responsesFormatted.value,
    parsedResponses: parsedResponses.value,
    curRespondent: curRespondent.value,
    curRespondents: curRespondents.value,
    curRespondentsSet: curRespondentsSet.value,
    respondents: respondents.value,
    curRespondentsMax: curRespondentsMax.value,
    max: max.value,
    defaultState: defaultState.value,
    userHasResponded: userHasResponded.value,
    curGuestId: props.curGuestId,
    authUserId: mainStore.authUser?._id,
    inDragRange,
    animateTimeslotAlways: props.animateTimeslotAlways,
    availabilityAnimEnabled: availabilityAnimEnabled.value,
    timeslotHeight: timeslotHeight.value,
    timezoneOffset: timezoneOffset.value,
    curTimeslot: curTimeslot.value,
    editing: editing.value,
    isColConsecutive,
    daysLength: days.value.length,
    firstSplitLength: splitTimes.value[0].length,
    lastRow: splitTimes.value[0].length + splitTimes.value[1].length - 1,
  })
})

const dayTimeslotClassStyle = computed(() =>
  buildDayGridTimeslotClassStyles({
    monthDays: monthDays.value.map((day) => day.dateObject),
    state: state.value,
    overlayAvailability: overlayAvailability.value,
    dragType: dragType.value,
    availabilityType: availabilityType.value,
    availability: availability.value,
    ifNeeded: ifNeeded.value,
    tempTimes: tempTimes.value,
    responsesFormatted: responsesFormatted.value,
    parsedResponses: parsedResponses.value,
    curRespondent: curRespondent.value,
    curRespondents: curRespondents.value,
    curRespondentsSet: curRespondentsSet.value,
    respondents: respondents.value,
    curRespondentsMax: curRespondentsMax.value,
    max: max.value,
    defaultState: defaultState.value,
    userHasResponded: userHasResponded.value,
    curGuestId: props.curGuestId,
    authUserId: mainStore.authUser?._id,
    inDragRange,
    monthDayIncluded: monthDayIncluded.value,
    curTimeslot: curTimeslot.value,
    lastMonthRow: Math.floor(monthDays.value.length / 7),
  })
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
            tooltipContent.value = formatTooltipContent({
              date,
              curTimezone: curTimezone.value,
              timeslotDuration: timeslotDuration.value,
              timeType: timeType.value,
              isSpecificDates: grid.isSpecificDates.value,
            })
          }
        }
      }
    },
    mouseleave: () => {
      tooltipContent.value = ""
    },
  }
}

function getRenderedTimeBlockStyleForTemplate(
  timeBlock: { hoursOffset?: Temporal.Duration; hoursLength?: Temporal.Duration }
): Record<string, string> {
  return getTimeBlockStyle({
    timeBlock,
    firstSplitTimes: splitTimes.value[0],
    secondSplitTimes: splitTimes.value[1],
    timeslotHeight: timeslotHeight.value,
  })
}

function startEditing() {
  state.value = isSignUp.value ? states.EDIT_SIGN_UP_BLOCKS : states.EDIT_AVAILABILITY
  availabilityType.value = availabilityTypes.AVAILABLE
  availability.value = new ZdtSet()
  ifNeeded.value = new ZdtSet()
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
