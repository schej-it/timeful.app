<template>
  <div
    class="tw-px-4 tw-py-4 sm:tw-sticky sm:tw-top-16 sm:tw-flex-none sm:tw-self-start sm:tw-py-0 sm:tw-pl-0 sm:tw-pr-0 sm:tw-pt-14"
    :style="{ width: sidebar.rightSideWidth }"
  >
    <template v-if="sidebar.isSignUp">
      <div class="tw-mb-2 tw-text-lg tw-text-black">Slots</div>
      <div v-if="!sidebar.isOwner" class="tw-mb-3 tw-flex tw-flex-col">
        <div
          class="tw-flex tw-flex-col tw-gap-1 tw-rounded-md tw-bg-light-gray tw-p-3 tw-text-xs tw-italic tw-text-dark-gray"
        >
          <div v-if="!sidebar.authUser || sidebar.alreadyRespondedToSignUpForm">
            <a class="tw-underline" :href="`mailto:${sidebar.event.ownerId}`"
              >Contact sign up creator</a
            >
            to edit your slot
          </div>
          <div v-if="sidebar.event.blindAvailabilityEnabled">
            Responses are only visible to creator
          </div>
        </div>
      </div>
      <SignUpBlocksList
        ref="signUpBlocksListRef"
        :sign-up-blocks="sidebar.signUpBlocks"
        :sign-up-blocks-to-add="sidebar.signUpBlocksToAdd"
        :is-editing="sidebar.state === states.EDIT_SIGN_UP_BLOCKS"
        :is-owner="sidebar.isOwner"
        :already-responded="sidebar.alreadyRespondedToSignUpForm"
        :anonymous="sidebar.event.blindAvailabilityEnabled"
        @update:sign-up-block="emit('updateSignUpBlock', $event)"
        @delete:sign-up-block="emit('deleteSignUpBlock', $event)"
        @sign-up-for-block="emit('signUpForBlock', $event)"
      />
    </template>

    <template v-else-if="sidebar.state === states.SET_SPECIFIC_TIMES">
      <SpecificTimesInstructions
        v-if="!sidebar.isPhone"
        :num-temp-times="sidebar.numTempTimes"
        @save-temp-times="emit('saveTempTimes')"
      />
    </template>

    <template v-else>
      <div
        v-if="sidebar.state === states.EDIT_AVAILABILITY"
        class="tw-flex tw-flex-col tw-gap-5"
      >
        <div
          v-if="showEditingAsText"
          class="tw-flex tw-flex-wrap tw-items-baseline tw-gap-1 tw-text-sm tw-italic tw-text-dark-gray"
        >
          {{ availabilityActorActionText }} availability as
          <div
            v-if="sidebar.curGuestId && sidebar.canEditGuestName"
            class="tw-group tw-mt-0.5 tw-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1"
            @click="emit('openEditGuestNameDialog')"
          >
            <span class="tw-font-medium group-hover:tw-underline">{{
              sidebar.curGuestId
            }}</span>
            <v-icon small>mdi-pencil</v-icon>
          </div>
          <span v-else>{{ availabilityActorName }}</span>
          <v-dialog
            :model-value="sidebar.editGuestNameDialog"
            width="400"
            content-class="tw-m-0"
            @update:model-value="emit('update:editGuestNameDialog', $event)"
          >
            <v-card>
              <v-card-title>Edit guest name</v-card-title>
              <v-card-text>
                <v-text-field
                  :model-value="sidebar.newGuestName"
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
            v-if="!sidebar.isGroup && !sidebar.isPhone"
            :model-value="sidebar.availabilityType"
            class="tw-w-full"
            @update:model-value="onAvailabilityTypeUpdate"
          />
          <ColorLegend />
        </div>

        <CalendarAccounts
          v-if="showCalendarAccounts"
          :toggle-state="true"
          :event-id="sidebar.event._id"
          :calendar-events-map="sidebar.calendarEventsMap"
          :sync-with-backend="!sidebar.isGroup"
          :allow-add-calendar-account="!sidebar.isGroup"
          :initial-calendar-accounts-data="initialCalendarAccountsData"
          @toggle-calendar-account="emit('toggleCalendarAccount', $event)"
          @toggle-sub-calendar-account="emit('toggleSubCalendarAccount', $event)"
        ></CalendarAccounts>

        <div v-if="sidebar.showOverlayAvailabilityToggle">
          <v-switch
            id="overlay-availabilities-toggle"
            inset
            :input-value="sidebar.overlayAvailability"
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
          v-if="!sidebar.event.daysOnly && sidebar.showCalendarOptions"
          ref="optionsSectionRef"
        >
          <ExpandableSection
            label="Options"
            :model-value="sidebar.showEditOptions"
            @update:model-value="emit('toggleShowEditOptions')"
          >
            <div class="tw-flex tw-flex-col tw-gap-5 tw-pt-2.5">
              <v-dialog
                v-if="sidebar.showCalendarOptions"
                :model-value="sidebar.calendarOptionsDialog"
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
                    <AlertText v-if="sidebar.isGroup" class="-tw-mb-4">
                      Calendar options will only updated for the current group
                    </AlertText>

                    <BufferTimeSwitch
                      :buffer-time="sidebar.bufferTime"
                      :sync-with-backend="!sidebar.isGroup"
                      @update:buffer-time="onBufferTimeUpdate"
                    />

                    <WorkingHoursToggle
                      :working-hours="sidebar.workingHours"
                      :timezone="sidebar.curTimezone"
                      :sync-with-backend="!sidebar.isGroup"
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
            :model-value="sidebar.deleteAvailabilityDialog"
            width="500"
            persistent
            @update:model-value="emit('update:deleteAvailabilityDialog', $event)"
          >
            <template #activator="{ props: activatorProps }">
              <span
                v-bind="activatorProps"
                class="tw-cursor-pointer tw-text-sm tw-text-red"
              >
                {{ !sidebar.isGroup ? "Delete availability" : "Leave group" }}
              </span>
            </template>

            <v-card>
              <v-card-title>Are you sure?</v-card-title>
              <v-card-text class="tw-text-sm tw-text-dark-gray"
                >Are you sure you want to
                {{
                  !sidebar.isGroup
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
                  >{{ !sidebar.isGroup ? "Delete" : "Leave" }}</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
      </div>

      <template v-else>
        <PubliftAd
          :show-ad="sidebar.showAds"
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
          ref="respondentsPanelRef"
          :max-height="100"
          :panel="sidebar.respondentsPanel"
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
import { computed, ref, type ComponentPublicInstance } from "vue"
import type { AvailabilityType } from "@/constants"
import type {
  SignUpBlockLite,
} from "@/composables/schedule_overlap/types"
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
import type { ScheduleOverlapSidebarViewModel } from "./scheduleOverlapViewModels"
const props = defineProps<{
  sidebar: ScheduleOverlapSidebarViewModel
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

const signUpBlocksListRef = ref<{ scrollToSignUpBlock?: (id: string) => void } | null>(null)
const optionsSectionRef = ref<HTMLElement | null>(null)
const respondentsPanelRef = ref<ComponentPublicInstance | null>(null)

const showEditingAsText = computed(
  () =>
    !(
      props.sidebar.calendarPermissionGranted &&
      !props.sidebar.event.daysOnly &&
      !props.sidebar.addingAvailabilityAsGuest
    )
)

const availabilityActorActionText = computed(() =>
  (props.sidebar.userHasResponded && !props.sidebar.addingAvailabilityAsGuest) ||
  props.sidebar.curGuestId
    ? "Editing"
    : "Adding"
)

const availabilityActorName = computed(() => {
  if (props.sidebar.authUser && !props.sidebar.addingAvailabilityAsGuest) {
    return `${props.sidebar.authUser.firstName ?? ""} ${props.sidebar.authUser.lastName ?? ""}`.trim()
  }
  if ((props.sidebar.curGuestId ?? "").length > 0) {
    return props.sidebar.curGuestId ?? ""
  }
  return "a guest"
})

const showCalendarAccounts = computed(
  () =>
    props.sidebar.calendarPermissionGranted &&
    !props.sidebar.event.daysOnly &&
    !props.sidebar.addingAvailabilityAsGuest
)

const initialCalendarAccountsData = computed(() =>
  props.sidebar.isGroup
    ? props.sidebar.sharedCalendarAccounts
    : (props.sidebar.authUser?.calendarAccounts ?? {})
)

const showDeleteAvailabilityAction = computed(
  () =>
    (!props.sidebar.addingAvailabilityAsGuest && props.sidebar.userHasResponded) ||
    Boolean(props.sidebar.curGuestId)
)

const onAvailabilityTypeUpdate = (value: string) => {
  emit("update:availabilityType", value as AvailabilityType)
}

const onBufferTimeUpdate = (value: { enabled?: boolean; time?: number }) => {
  emit("update:bufferTime", {
    enabled: value.enabled ?? props.sidebar.bufferTime.enabled,
    time: value.time ?? props.sidebar.bufferTime.time,
  })
}

const onWorkingHoursUpdate = (value: {
  enabled?: boolean
  startTime?: number
  endTime?: number
}) => {
  emit("update:workingHours", {
    enabled: value.enabled ?? props.sidebar.workingHours.enabled,
    startTime: value.startTime ?? props.sidebar.workingHours.startTime,
    endTime: value.endTime ?? props.sidebar.workingHours.endTime,
  })
}

defineExpose({
  scrollToSignUpBlock: (id: string) =>
    signUpBlocksListRef.value?.scrollToSignUpBlock?.(id),
  optionsSectionEl: optionsSectionRef,
  respondentsPanelEl: computed(
    () => (respondentsPanelRef.value?.$el as HTMLElement | undefined) ?? null
  ),
})
</script>
