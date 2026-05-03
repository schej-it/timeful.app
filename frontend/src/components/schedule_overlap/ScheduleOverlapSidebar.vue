<template>
  <div
    class="tw-px-4 tw-py-4 sm:tw-sticky sm:tw-top-16 sm:tw-flex-none sm:tw-self-start sm:tw-py-0 sm:tw-pl-0 sm:tw-pr-0 sm:tw-pt-14"
    :style="{ width: rightSideWidth }"
  >
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
        :ref="signUpBlocksListRefSetter"
        :sign-up-blocks="signUpBlocks"
        :sign-up-blocks-to-add="signUpBlocksToAdd"
        :is-editing="state === states.EDIT_SIGN_UP_BLOCKS"
        :is-owner="isOwner"
        :already-responded="alreadyRespondedToSignUpForm"
        :anonymous="event.blindAvailabilityEnabled"
        @update:sign-up-block="emit('updateSignUpBlock', $event)"
        @delete:sign-up-block="emit('deleteSignUpBlock', $event)"
        @sign-up-for-block="emit('signUpForBlock', $event)"
      />
    </template>

    <template v-else-if="state === states.SET_SPECIFIC_TIMES">
      <SpecificTimesInstructions
        v-if="!isPhone"
        :num-temp-times="numTempTimes"
        @save-temp-times="emit('saveTempTimes')"
      />
    </template>

    <template v-else>
      <div
        v-if="state === states.EDIT_AVAILABILITY"
        class="tw-flex tw-flex-col tw-gap-5"
      >
        <div
          v-if="showEditingAsText"
          class="tw-flex tw-flex-wrap tw-items-baseline tw-gap-1 tw-text-sm tw-italic tw-text-dark-gray"
        >
          {{ availabilityActorActionText }} availability as
          <div
            v-if="curGuestId && canEditGuestName"
            class="tw-group tw-mt-0.5 tw-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1"
            @click="emit('openEditGuestNameDialog')"
          >
            <span class="tw-font-medium group-hover:tw-underline">{{
              curGuestId
            }}</span>
            <v-icon small>mdi-pencil</v-icon>
          </div>
          <span v-else>{{ availabilityActorName }}</span>
          <v-dialog
            :model-value="editGuestNameDialog"
            width="400"
            content-class="tw-m-0"
            @update:model-value="emit('update:editGuestNameDialog', $event)"
          >
            <v-card>
              <v-card-title>Edit guest name</v-card-title>
              <v-card-text>
                <v-text-field
                  :model-value="newGuestName"
                  label="Guest name"
                  autofocus
                  hide-details
                  @update:model-value="emit('update:newGuestName', $event)"
                  @keydown.enter="emit('saveGuestName')"
                ></v-text-field>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn
                  text
                  @click="emit('update:editGuestNameDialog', false)"
                  >Cancel</v-btn
                >
                <v-btn text color="primary" @click="emit('saveGuestName')"
                  >Save</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>

        <div class="tw-flex tw-flex-col tw-gap-3">
          <AvailabilityTypeToggle
            v-if="!isGroup && !isPhone"
            :model-value="availabilityType"
            class="tw-w-full"
            @update:model-value="onAvailabilityTypeUpdate"
          />
          <ColorLegend />
        </div>

        <CalendarAccounts
          v-if="showCalendarAccounts"
          :toggle-state="true"
          :event-id="event._id"
          :calendar-events-map="calendarEventsMap"
          :sync-with-backend="!isGroup"
          :allow-add-calendar-account="!isGroup"
          :initial-calendar-accounts-data="initialCalendarAccountsData"
          @toggle-calendar-account="emit('toggleCalendarAccount', $event)"
          @toggle-sub-calendar-account="emit('toggleSubCalendarAccount', $event)"
        ></CalendarAccounts>

        <div v-if="showOverlayAvailabilityToggle">
          <v-switch
            id="overlay-availabilities-toggle"
            inset
            :input-value="overlayAvailability"
            hide-details
            @change="emit('updateOverlayAvailability', $event)"
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

        <div
          v-if="!event.daysOnly && showCalendarOptions"
          :ref="optionsSectionRefSetter"
        >
          <ExpandableSection
            label="Options"
            :model-value="showEditOptions"
            @update:model-value="emit('toggleShowEditOptions')"
          >
            <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2.5">
              <v-dialog
                v-if="showCalendarOptions"
                :model-value="calendarOptionsDialog"
                width="500"
                @update:model-value="emit('update:calendarOptionsDialog', $event)"
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
                    <v-btn
                      icon
                      @click="emit('update:calendarOptionsDialog', false)"
                    >
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text
                    class="tw-flex tw-flex-col tw-gap-6 tw-pb-8 tw-pt-2"
                  >
                    <AlertText v-if="isGroup" class="-tw-mb-4">
                      Calendar options will only updated for the current group
                    </AlertText>

                    <BufferTimeSwitch
                      :buffer-time="bufferTime"
                      :sync-with-backend="!isGroup"
                      @update:buffer-time="onBufferTimeUpdate"
                    />

                    <WorkingHoursToggle
                      :working-hours="workingHours"
                      :timezone="curTimezone"
                      :sync-with-backend="!isGroup"
                      @update:working-hours="onWorkingHoursUpdate"
                    />
                  </v-card-text>
                </v-card>
              </v-dialog>
            </div>
          </ExpandableSection>
        </div>

        <div v-if="showDeleteAvailabilityAction">
          <v-dialog
            :model-value="deleteAvailabilityDialog"
            width="500"
            persistent
            @update:model-value="emit('update:deleteAvailabilityDialog', $event)"
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
                <v-btn
                  text
                  @click="emit('update:deleteAvailabilityDialog', false)"
                  >Cancel</v-btn
                >
                <v-btn text color="error" @click="emit('deleteAvailability')"
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

        <ScheduleOverlapRespondentsPanel
          :ref="respondentsListRefSetter"
          :show-calendar-events="showCalendarEvents"
          :show-best-times="showBestTimes"
          :hide-if-needed="hideIfNeeded"
          :max-height="100"
          :event="event"
          :event-id="event._id ?? ''"
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
          :timezone="curTimezone"
          :show-event-options="showEventOptions"
          :guest-added-availability="guestAddedAvailability"
          :adding-availability-as-guest="addingAvailabilityAsGuest"
          @update:show-calendar-events="emit('update:showCalendarEvents', $event)"
          @update:show-best-times="emit('update:showBestTimes', $event)"
          @update:hide-if-needed="emit('update:hideIfNeeded', $event)"
          @toggle-show-event-options="emit('toggleShowEventOptions')"
          @add-availability="emit('addAvailability')"
          @add-availability-as-guest="emit('addAvailabilityAsGuest')"
          @mouse-over-respondent="(e, userId) => emit('mouseOverRespondent', e, userId)"
          @mouse-leave-respondent="emit('mouseLeaveRespondent')"
          @click-respondent="(e, userId) => emit('clickRespondent', e, userId)"
          @edit-guest-availability="emit('editGuestAvailability', $event)"
          @refresh-event="emit('refreshEvent')"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComponentPublicInstance } from "vue"
import type { Temporal } from "temporal-polyfill"
import type { User } from "@/types"
import type { ZdtMap } from "@/utils"
import type { AvailabilityType } from "@/constants"
import type {
  CalendarEventsMap,
  EventLike,
  ParsedResponses,
  ScheduleOverlapState,
  SignUpBlockLite,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { CalendarAccountEntry } from "@/components/settings/CalendarAccounts.vue"
import { states } from "@/composables/schedule_overlap/types"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"
import PubliftAd from "@/components/event/PubliftAd.vue"
import SignUpBlocksList from "@/components/sign_up_form/SignUpBlocksList.vue"
import ExpandableSection from "../ExpandableSection.vue"
import AlertText from "../AlertText.vue"
import ColorLegend from "./ColorLegend.vue"
import AvailabilityTypeToggle from "./AvailabilityTypeToggle.vue"
import BufferTimeSwitch from "./BufferTimeSwitch.vue"
import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"
import WorkingHoursToggle from "./WorkingHoursToggle.vue"
import ScheduleOverlapRespondentsPanel from "./ScheduleOverlapRespondentsPanel.vue"

interface CalendarAccountOwner {
  firstName?: string
  lastName?: string
  calendarAccounts?: Record<string, CalendarAccountEntry>
}

const props = defineProps<{
  event: EventLike
  state: ScheduleOverlapState
  isSignUp: boolean
  isOwner: boolean
  isGroup: boolean
  isPhone: boolean
  authUser: CalendarAccountOwner | null
  alreadyRespondedToSignUpForm: boolean
  signUpBlocks: SignUpBlockLite[]
  signUpBlocksToAdd: SignUpBlockLite[]
  numTempTimes: number
  curGuestId?: string
  userHasResponded: boolean
  addingAvailabilityAsGuest: boolean
  canEditGuestName: boolean
  newGuestName: string
  editGuestNameDialog: boolean
  availabilityType: AvailabilityType
  showOverlayAvailabilityToggle: boolean
  overlayAvailability: boolean
  calendarPermissionGranted: boolean
  calendarEventsMap: CalendarEventsMap
  sharedCalendarAccounts: Record<string, CalendarAccountEntry>
  showCalendarOptions: boolean
  showEditOptions: boolean
  calendarOptionsDialog: boolean
  bufferTime: { enabled: boolean; time: number }
  workingHours: { enabled: boolean; startTime: number; endTime: number }
  curTimezone: Timezone
  deleteAvailabilityDialog: boolean
  showAds: boolean
  rightSideWidth: string
  days: unknown[]
  times: unknown[]
  curDate?: Temporal.ZonedDateTime
  curRespondent: string
  curRespondents: string[]
  curTimeslot: { dayIndex: number; timeIndex: number }
  curTimeslotAvailability: Record<string, boolean>
  respondents: User[]
  parsedResponses: ParsedResponses
  attendees?: { email: string; declined?: boolean }[]
  responsesFormatted: ZdtMap<Set<string>>
  showCalendarEvents: boolean
  showBestTimes: boolean
  hideIfNeeded: boolean
  showEventOptions: boolean
  guestAddedAvailability: boolean
  signUpBlocksListRefSetter: (value: Element | ComponentPublicInstance | null) => void
  optionsSectionRefSetter: (value: Element | ComponentPublicInstance | null) => void
  respondentsListRefSetter: (value: Element | ComponentPublicInstance | null) => void
}>()

const emit = defineEmits<{
  saveTempTimes: []
  openEditGuestNameDialog: []
  saveGuestName: []
  "update:newGuestName": [value: string]
  "update:editGuestNameDialog": [value: boolean]
  "update:availabilityType": [value: AvailabilityType]
  toggleCalendarAccount: [payload: { email?: string; calendarType?: string; enabled: boolean }]
  toggleSubCalendarAccount: [payload: { email?: string; calendarType?: string; subCalendarId: string | number; enabled: boolean }]
  updateOverlayAvailability: [value: unknown]
  toggleShowEditOptions: []
  "update:calendarOptionsDialog": [value: boolean]
  "update:bufferTime": [value: { enabled: boolean; time: number }]
  "update:workingHours": [value: { enabled: boolean; startTime: number; endTime: number }]
  "update:deleteAvailabilityDialog": [value: boolean]
  deleteAvailability: []
  updateSignUpBlock: [block: SignUpBlockLite]
  deleteSignUpBlock: [blockId: string]
  signUpForBlock: [block: SignUpBlockLite]
  "update:showCalendarEvents": [value: boolean]
  "update:showBestTimes": [value: boolean]
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

const showEditingAsText = computed(
  () =>
    !(
      props.calendarPermissionGranted &&
      !props.event.daysOnly &&
      !props.addingAvailabilityAsGuest
    )
)

const availabilityActorActionText = computed(() =>
  (props.userHasResponded && !props.addingAvailabilityAsGuest) || props.curGuestId
    ? "Editing"
    : "Adding"
)

const availabilityActorName = computed(() => {
  if (props.authUser && !props.addingAvailabilityAsGuest) {
    return `${props.authUser.firstName ?? ""} ${props.authUser.lastName ?? ""}`.trim()
  }
  if ((props.curGuestId ?? "").length > 0) {
    return props.curGuestId ?? ""
  }
  return "a guest"
})

const showCalendarAccounts = computed(
  () =>
    props.calendarPermissionGranted &&
    !props.event.daysOnly &&
    !props.addingAvailabilityAsGuest
)

const initialCalendarAccountsData = computed(() =>
  props.isGroup
    ? props.sharedCalendarAccounts
    : (props.authUser?.calendarAccounts ?? {})
)

const showDeleteAvailabilityAction = computed(
  () =>
    (!props.addingAvailabilityAsGuest && props.userHasResponded) ||
    Boolean(props.curGuestId)
)

const onAvailabilityTypeUpdate = (value: string) => {
  emit("update:availabilityType", value as AvailabilityType)
}

const onBufferTimeUpdate = (value: { enabled?: boolean; time?: number }) => {
  emit("update:bufferTime", {
    enabled: value.enabled ?? props.bufferTime.enabled,
    time: value.time ?? props.bufferTime.time,
  })
}

const onWorkingHoursUpdate = (value: {
  enabled?: boolean
  startTime?: number
  endTime?: number
}) => {
  emit("update:workingHours", {
    enabled: value.enabled ?? props.workingHours.enabled,
    startTime: value.startTime ?? props.workingHours.startTime,
    endTime: value.endTime ?? props.workingHours.endTime,
  })
}
</script>
