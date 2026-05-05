<template>
  <span>
    <FormerlyKnownAs
      class="tw-mx-auto tw-mb-10 tw-mt-3 tw-max-w-6xl tw-pl-4 sm:tw-pl-12"
    />
    <!-- Video Ad (desktop only, when ads enabled) -->
    <div v-if="!isPhone && showAds" ref="videoAdContainer"></div>
    <div v-if="event" class="tw-mt-8 tw-h-full">
      <!-- Mark availability option dialog -->
      <MarkAvailabilityDialog
        v-model="choiceDialog"
        :initial-state="linkApple ? 'create_account_apple' : 'choices'"
        @sign-in-link-apple="signInLinkApple"
        @allow-google-calendar="
          () => setAvailabilityAutomatically(calendarTypes.GOOGLE)
        "
        @allow-outlook-calendar="
          () => setAvailabilityAutomatically(calendarTypes.OUTLOOK)
        "
        @set-availability-manually="setAvailabilityManually"
        @added-apple-calendar="addedAppleCalendar"
        @added-i-c-s-calendar="addedICSCalendar"
      />

      <!-- Google sign in not supported dialog -->
      <SignInNotSupportedDialog v-model="webviewDialog" />

      <!-- Guest dialog -->
      <GuestDialog
        v-model="guestDialog"
        :event="event"
        :respondents="event ? Object.keys(event.responses ?? {}) : []"
        @submit="handleGuestDialogSubmit"
      />

      <!-- Join sign up slot dialog-->
      <SignUpForSlotDialog
        v-if="currSignUpBlock"
        v-model="signUpForSlotDialog"
        :event="event"
        :sign-up-block="currSignUpBlock"
        @submit="signUpForBlock"
      />

      <!-- Edit event dialog -->
      <NewDialog
        v-model="editEventDialog"
        :type="eventType"
        :event="event"
        :contacts-payload="contactsPayload"
        edit
        no-tabs
      />

      <!-- Group invitation dialog -->
      <InvitationDialog
        v-if="isGroup"
        v-model="invitationDialog"
        :group="event"
        :calendar-permission-granted="calendarPermissionGranted"
        @refresh-event="refreshEvent"
        @set-availability-automatically="setAvailabilityAutomatically"
      ></InvitationDialog>

      <!-- Pages Not Visited dialog -->
      <v-dialog
        v-model="pagesNotVisitedDialog"
        max-width="400"
        content-class="tw-m-0"
      >
        <v-card>
          <v-card-title>Are you sure?</v-card-title>
          <v-card-text
            ><span class="tw-font-medium"
              >You're about to add your availability without filling out all
              pages of this Timeful.</span
            >
            Click the left and right arrows at the top to switch between
            pages.</v-card-text
          >
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="pagesNotVisitedDialog = false">Cancel</v-btn>
            <v-btn
              text
              color="primary"
              @click="
                () => {
                  saveChanges(true)
                  pagesNotVisitedDialog = false
                }
              "
              >Add anyways</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>

      <div
        class="tw-mx-auto tw-mt-4 lg:tw-flex lg:tw-items-start lg:tw-justify-center lg:tw-gap-6"
      >
        <PubliftAd
          :show-ad="showAds"
          fuse-id="meet_vrec_lhs"
          class="tw-hidden publift-l:tw-block"
        >
          <div
            class="tw-h-[600px] publift-l:tw-w-[160px] publift-xl:tw-w-[300px]"
          >
            <div
              id="meet_vrec_lhs"
              data-fuse="meet_vrec_lhs"
              class="tw-flex tw-items-center tw-justify-center"
            ></div>
          </div>
        </PubliftAd>
        <div class="tw-mx-auto tw-max-w-5xl tw-flex-1">
          <div v-if="!isSettingSpecificTimes" class="tw-mx-4">
            <!-- Title and copy link -->
            <div class="tw-flex tw-items-center tw-text-black">
              <div>
                <div
                  class="sm:mb-2 tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-2"
                >
                  <div
                    class="tw-text-xl sm:tw-text-3xl"
                    :class="
                      canEdit &&
                      '-tw-mx-2 -tw-my-1 tw-cursor-pointer tw-rounded tw-px-2 tw-py-1 tw-transition-all hover:tw-bg-light-gray'
                    "
                    @click="canEdit && editEvent()"
                  >
                    {{ event.name }}
                  </div>
                  <v-chip
                    v-if="event.when2meetHref && event.when2meetHref.length > 0"
                    :href="`https://when2meet.com${event.when2meetHref}`"
                    :small="isPhone"
                    class="tw-cursor-pointer tw-select-none tw-rounded tw-bg-light-gray tw-px-2 tw-font-medium sm:tw-px-3"
                    >Imported from when2meet</v-chip
                  >
                  <template v-if="isGroup">
                    <div class="">
                      <v-chip
                        :small="isPhone"
                        class="tw-cursor-pointer tw-select-none tw-rounded tw-bg-light-gray tw-px-2 tw-font-medium sm:tw-px-3"
                        @click="helpDialog = true"
                        >Availability group</v-chip
                      >
                    </div>
                    <HelpDialog v-model="helpDialog">
                      <template #header>Availability group</template>
                      <div class="mb-4">
                        Use availability groups to see group members' weekly
                        calendar availabilities from Google Calendar. Your
                        actual calendar events are NOT visible to others.
                      </div>
                    </HelpDialog>
                  </template>
                </div>
                <div class="tw-flex tw-items-baseline tw-gap-1">
                  <div
                    class="tw-text-sm tw-font-normal tw-text-very-dark-gray sm:tw-text-base"
                  >
                    {{ dateString }}
                  </div>
                  <template v-if="canEdit">
                    <v-btn
                      id="edit-event-btn"
                      text
                      class="tw-px-2 tw-text-sm tw-text-green"
                      @click="editEvent"
                    >
                      Edit {{ isGroup ? "group" : "event" }}
                    </v-btn>
                  </template>
                </div>
              </div>
              <v-spacer />
              <div class="tw-flex tw-flex-row tw-items-center tw-gap-2.5">
                <div v-if="isGroup">
                  <v-btn
                    v-if="
                      event.startOnMonday ? weekOffset != 1 : weekOffset != 0
                    "
                    :icon="isPhone"
                    text
                    class="tw-mr-1 tw-text-very-dark-gray sm:tw-mr-2.5"
                    @click="resetWeekOffset"
                  >
                    <v-icon class="sm:tw-mr-2">mdi-calendar-today</v-icon>
                    <span v-if="!isPhone">Today</span>
                  </v-btn>
                  <v-btn
                    :icon="isPhone"
                    :outlined="!isPhone"
                    :loading="loading"
                    class="tw-text-green"
                    @click="refreshCalendar"
                  >
                    <v-icon v-if="!isPhone" class="tw-mr-1">mdi-refresh</v-icon>
                    <span v-if="!isPhone" class="tw-mr-2">Refresh</span>
                    <v-icon v-else class="tw-text-green">mdi-refresh</v-icon>
                  </v-btn>
                </div>
                <div v-else>
                  <v-btn
                    :icon="isPhone"
                    :outlined="!isPhone"
                    class="tw-text-green"
                    @click="copyLink"
                  >
                    <span v-if="!isPhone" class="tw-mr-2 tw-text-green"
                      >Copy link</span
                    >
                    <v-icon v-if="!isPhone" class="tw-text-green"
                      >mdi-content-copy</v-icon
                    >
                    <v-icon v-else class="tw-text-green">mdi-share</v-icon>
                  </v-btn>
                </div>
                <div
                  v-if="!isPhone && (!isSignUp || canEdit)"
                  class="tw-flex tw-w-40"
                >
                  <template v-if="!isEditing">
                    <v-btn
                      v-if="!isGroup && !authUser && selectedGuestRespondent"
                      min-width="10.25rem"
                      class="tw-bg-green tw-text-white tw-transition-opacity"
                      :style="{ opacity: availabilityBtnOpacity }"
                      @click="editGuestAvailability"
                    >
                      {{
                        event.blindAvailabilityEnabled
                          ? "Edit availability"
                          : `Edit ${selectedGuestRespondent}'s availability`
                      }}
                    </v-btn>
                    <v-btn
                      v-else
                      width="10.25rem"
                      class="tw-text-white tw-transition-opacity"
                      :class="'tw-bg-green'"
                      :disabled="loading && !userHasResponded"
                      :style="{ opacity: availabilityBtnOpacity }"
                      @click="() => addAvailability()"
                    >
                      {{ actionButtonText }}
                    </v-btn>
                  </template>
                  <template v-else>
                    <v-btn
                      outlined
                      class="tw-mr-1 tw-w-20 tw-text-red"
                      @click="cancelEditing"
                    >
                      Cancel
                    </v-btn>
                    <v-btn
                      class="tw-w-20 tw-text-white"
                      :class="'tw-bg-green'"
                      @click="() => saveChanges()"
                    >
                      Save
                    </v-btn></template
                  >
                </div>
              </div>
            </div>

            <!-- Description -->
            <EventDescription
              v-model:event="event"
              :can-edit="String(event.ownerId ?? '') !== '0' && canEdit"
            />
          </div>

          <!-- Calendar -->

          <ScheduleOverlap
            ref="scheduleOverlap"
            v-model:week-offset="weekOffset"
            :event="scheduleOverlapEvent"
            :owner-is-premium="ownerIsPremium"
            :from-edit-event="fromEditEvent"
            :loading-calendar-events="loading"
            :calendar-events-map="calendarEventsMap"
            :calendar-permission-granted="calendarPermissionGranted"
            :calendar-availabilities="calendarAvailabilities"
            :cur-guest-id="curGuestId"
            :initial-timezone="initialTimezone as unknown as Timezone"
            :adding-availability-as-guest="addingAvailabilityAsGuest"
            @add-availability="addAvailability"
            @add-availability-as-guest="addAvailabilityAsGuest"
            @refresh-event="refreshEvent"
            @highlight-availability-btn="highlightAvailabilityBtn"
            @delete-availability="deleteAvailability"
            @set-cur-guest-id="(id) => (curGuestId = id)"
            @sign-up-for-block="initiateSignUpFlow"
          />
        </div>
        <PubliftAd
          :show-ad="showAds"
          fuse-id="meet_vrec_rhs"
          class="tw-hidden publift-l:tw-block"
        >
          <div
            class="tw-h-[600px] publift-l:tw-w-[160px] publift-xl:tw-w-[300px]"
          >
            <div
              id="meet_vrec_rhs"
              data-fuse="meet_vrec_rhs"
              class="tw-flex tw-items-center tw-justify-center"
            ></div>
          </div>
        </PubliftAd>
      </div>

      <PubliftAd
        :show-ad="showAds"
        fuse-id="meet_incontent_md"
        class="tw-my-4 tw-hidden !tw-rounded-none sm:tw-block publift-l:tw-hidden"
      >
        <div class="tw-h-[300px] publift-m:tw-h-[90px]">
          <div
            id="meet_incontent_md"
            data-fuse="meet_incontent_md"
            class="tw-flex tw-items-center tw-justify-center"
          ></div>
        </div>
      </PubliftAd>

      <!-- <CarbonAd :ownerIsPremium="ownerIsPremium" /> -->

      <template v-if="showFeedbackBtn">
        <div class="tw-w-full tw-border-t tw-border-solid tw-border-gray"></div>

        <div v-if="showFeedbackBtn" class="tw-flex tw-flex-col tw-items-center">
          <v-btn
            id="feedback-btn"
            block
            text
            class="tw-h-16"
            href="https://forms.gle/A96i4TTWeKgH3P1W6"
            target="_blank"
          >
            Give feedback to Timeful team
          </v-btn>
          <!-- <div
            class="tw-w-full tw-border-t tw-border-solid tw-border-gray"
          ></div> -->
          <!-- <v-btn
            class="tw-h-16"
            block
            text
            href="https://www.paypal.com/donate/?hosted_button_id=KWCH6LGJCP6E6"
            target="_blank"
          >
            Donate
          </v-btn> -->
          <div
            class="tw-w-full tw-border-t tw-border-solid tw-border-gray"
          ></div>
          <v-btn class="tw-h-16" block text :to="{ name: 'privacy-policy' }">
            Privacy Policy
          </v-btn>
        </div>
      </template>

      <div
        class="tw-mb-16 tw-hidden tw-flex-col tw-items-center tw-justify-between sm:tw-flex"
      >
        <router-link
          class="tw-text-xs tw-font-medium tw-text-gray"
          :to="{ name: 'privacy-policy' }"
        >
          Privacy Policy
        </router-link>
      </div>

      <div
        :class="isPhone ? (showAds ? 'tw-h-[125px]' : 'tw-h-8') : 'tw-h-8'"
      ></div>
      <!-- Bottom bar for phones -->
      <div
        v-if="!isSettingSpecificTimes && isPhone && (!isSignUp || canEdit)"
        class="tw-fixed tw-bottom-0 tw-z-20 tw-flex tw-w-full tw-flex-col"
        :style="showAds ? { bottom: '115px' } : {}"
      >
        <div
          class="tw-flex tw-h-[4rem] tw-w-full tw-items-center tw-px-4"
          :class="`${isIOS ? 'tw-pb-2' : ''} ${
            isScheduling ? 'tw-bg-blue' : 'tw-bg-green'
          }`"
        >
          <template v-if="!isEditing && !isScheduling">
            <v-btn
              v-if="!event.daysOnly && numResponses > 0"
              text
              class="tw-text-white"
              @click="scheduleEvent"
              >Schedule</v-btn
            >
            <v-spacer />
            <v-btn
              v-if="!isGroup && !authUser && selectedGuestRespondent"
              class="tw-bg-white tw-text-green tw-transition-opacity"
              :style="{ opacity: availabilityBtnOpacity }"
              @click="editGuestAvailability"
            >
              {{ mobileGuestActionButtonText }}
            </v-btn>
            <v-btn
              v-else
              class="tw-bg-white tw-text-green tw-transition-opacity"
              :disabled="loading && !userHasResponded"
              :style="{ opacity: availabilityBtnOpacity }"
              @click="() => addAvailability()"
            >
              {{ mobileActionButtonText }}
            </v-btn>
          </template>
          <template v-else-if="isEditing">
            <v-btn text class="tw-text-white" @click="cancelEditing">
              Cancel
            </v-btn>
            <v-spacer />
            <v-btn
              class="tw-bg-white tw-text-green"
              @click="() => saveChanges()"
            >
              Save
            </v-btn>
          </template>
          <template v-else-if="isScheduling">
            <v-btn text class="tw-text-white" @click="cancelScheduleEvent">
              Cancel
            </v-btn>
            <v-spacer />
            <v-btn
              :disabled="!allowScheduleEvent"
              class="tw-bg-white tw-text-blue"
              @click="confirmScheduleEvent"
            >
              Schedule
            </v-btn>
          </template>
        </div>
        <PubliftAd
          :show-ad="showAds"
          fuse-id=""
          class="tw-h-[115px] tw-w-full !tw-rounded-none !tw-p-0"
        >
          <div class="tw-h-[115px]"></div>
        </PubliftAd>
      </div>
      <!-- Fixed bottom ad for desktop -->
      <div
        v-if="!isPhone && showAds"
        class="tw-fixed tw-bottom-0 tw-left-0 tw-z-20 tw-w-full"
      >
        <PubliftAd
          :show-ad="showAds"
          fuse-id=""
          class="tw-h-[115px] tw-w-full !tw-rounded-none !tw-p-0"
        >
          <div class="tw-h-[115px]"></div>
        </PubliftAd>
      </div>
    </div>
  </span>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  toRef,
  onMounted,
  onBeforeUnmount,
  type PropType,
} from "vue"
import { useRouter, useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { Temporal } from "temporal-polyfill"
import {
  get,
  post,
  getDateRangeStringForEvent,
  isIOS as isIOSFn,
  sendPluginError,
  sendPluginSuccess,
  isValidPluginMessage,
  validateDOWPayload,
  normalizePluginSetSlots,
  resolvePluginTimezoneValue,
} from "@/utils"
import { validateEmail } from "@/utils"
import {
  getPluginEventTimeRange,
  normalizePluginResponses,
} from "@/views/event/pluginResponsesBoundary"

import NewDialog from "@/components/NewDialog.vue"
import ScheduleOverlap from "@/components/schedule_overlap/ScheduleOverlap.vue"
import GuestDialog from "@/components/GuestDialog.vue"
import SignUpForSlotDialog from "@/components/sign_up_form/SignUpForSlotDialog.vue"
import {
  errors,
  eventTypes,
  calendarTypes,
  allTimezones,
} from "@/constants"
import SignInNotSupportedDialog from "@/components/SignInNotSupportedDialog.vue"
import MarkAvailabilityDialog from "@/components/calendar_permission_dialogs/MarkAvailabilityDialog.vue"
import InvitationDialog from "@/components/groups/InvitationDialog.vue"
import HelpDialog from "@/components/HelpDialog.vue"
import EventDescription from "@/components/event/EventDescription.vue"
import FormerlyKnownAs from "@/components/FormerlyKnownAs.vue"
import PubliftAd from "@/components/event/PubliftAd.vue"
import { freemiumEnabled } from "@/utils/freemium"

import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { useEventLoader } from "@/composables/event/useEventLoader"
import { useEventEditing } from "@/composables/event/useEventEditing"
import { useEventRespondent } from "@/composables/event/useEventRespondent"
import type { SerializedEventDraft } from "@/composables/event/types"
import type { ScheduleOverlapInstance } from "@/composables/event/types"
import {
  toScheduleOverlapEvent,
  type Timezone,
} from "@/composables/schedule_overlap/types"
import type { Event, User } from "@/types"
import type { RawResponse, RawUser } from "@/types/transport"
import { fromRawUser } from "@/types/transport"

defineOptions({ name: "AppEvent" })

const props = defineProps({
  eventId: { type: String, required: true as const, default: "" },
  fromSignIn: { type: Boolean, default: false },
  editingMode: { type: Boolean, default: false },
  linkApple: { type: Boolean, default: false },
  initialTimezone: { type: Object, default: () => ({}) },
  contactsPayload: {
    type: Object as PropType<SerializedEventDraft>,
    default: () => ({}),
  },
})

const router = useRouter()
const route = useRoute()

const mainStore = useMainStore()
const { authUser, viewerHasPremiumAccess } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const scheduleOverlap = ref<ScheduleOverlapInstance | null>(null)
const videoAdContainer = ref<HTMLElement | null>(null)
const weekOffset = ref(0)

const invitationDialog = ref(false)
const helpDialog = ref(false)
const scheduleOverlapLoaded = ref(false)

const isEditing = computed(() => scheduleOverlap.value?.editing ?? false)
const isScheduling = computed(() => scheduleOverlap.value?.scheduling ?? false)
const allowScheduleEvent = computed(() => scheduleOverlap.value?.allowScheduleEvent ?? false)
const areUnsavedChanges = computed(() => scheduleOverlap.value?.unsavedChanges ?? false)
const selectedGuestRespondent = computed(() => scheduleOverlap.value?.selectedGuestRespondent)
const numResponses = computed(() => scheduleOverlap.value?.respondents.length ?? 0)
const isSettingSpecificTimes = computed(() => {
  const so = scheduleOverlap.value
  return so ? so.state === so.states.SET_SPECIFIC_TIMES : false
})

const isGroup = computed(() => (loader.event.value)?.type === eventTypes.GROUP)
const isSignUp = computed(() => Boolean((loader.event.value)?.isSignUpForm))
const isSpecificDates = computed(() => {
  const t = (loader.event.value)?.type
  return t === eventTypes.SPECIFIC_DATES || !t
})
const _isSpecificDates = isSpecificDates
const isWeekly = computed(() => (loader.event.value)?.type === eventTypes.DOW)
const _isWeekly = isWeekly
const eventType = computed(() => {
  if (isGroup.value) return "group"
  else if (isSignUp.value) return "signup"
  return "event"
})
const canEdit = computed(() => {
  const ev = loader.event.value
  return (ev?.ownerId ?? '') === '0' || authUser.value?._id === ev?.ownerId
})
const userHasResponded = computed(() => {
  const ev = loader.event.value
  return Boolean(authUser.value?._id && ev?.responses && authUser.value._id in ev.responses)
})
const dateString = computed(() => loader.event.value ? getDateRangeStringForEvent(loader.event.value) : "")
const showAds = computed(
  () =>
    freemiumEnabled &&
    !loader.ownerIsPremium.value &&
    !viewerHasPremiumAccess.value &&
    !isSettingSpecificTimes.value
)
const showFeedbackBtn = computed(() => isPhone.value)
const actionButtonText = computed(() => {
  if (isSignUp.value) return "Edit slots"
  else if (userHasResponded.value || isGroup.value) return "Edit availability"
  return "Add availability"
})
const mobileGuestActionButtonText = computed(() => {
  const ev = loader.event.value
  return ev?.blindAvailabilityEnabled
    ? "Edit availability"
    : `Edit ${selectedGuestRespondent.value ?? ""}'s availability`
})
const mobileActionButtonText = computed(() => {
  if (isSignUp.value) return "Edit slots"
  return userHasResponded.value ? "Edit availability" : "Add availability"
})
const isIOS = computed(() => isIOSFn())

const loader = useEventLoader({
  eventId: toRef(props, "eventId"),
  weekOffset,
  authUser: authUser as ReturnType<typeof computed<User | null>>,
  scheduleOverlapRef: scheduleOverlap,
  isEditing,
  userHasResponded,
  areUnsavedChanges,
})

const respondent = useEventRespondent({
  event: loader.event,
  authUser: authUser as ReturnType<typeof computed<User | null>>,
  scheduleOverlapRef: scheduleOverlap,
  refreshEvent: loader.refreshEvent,
})

const editing = useEventEditing({
  event: loader.event,
  eventId: toRef(props, "eventId"),
  authUser: authUser as ReturnType<typeof computed<User | null>>,
  scheduleOverlapRef: scheduleOverlap,
  isSignUp,
  isGroup,
  userHasResponded,
  curGuestId: respondent.curGuestId,
  addingAvailabilityAsGuest: respondent.addingAvailabilityAsGuest,
  calendarPermissionGranted: loader.calendarPermissionGranted,
  refreshEvent: loader.refreshEvent,
})

const {
  editEventDialog, choiceDialog, webviewDialog, guestDialog, pagesNotVisitedDialog,
  availabilityBtnOpacity, addAvailability, addAvailabilityAsGuest, cancelEditing,
  copyLink, deleteAvailability, editEvent, saveChanges,
  setAvailabilityAutomatically, setAvailabilityManually, editGuestAvailability,
  signInLinkApple, addedAppleCalendar, addedICSCalendar, highlightAvailabilityBtn,
  handleGuestDialogSubmit,
} = editing

const {
  curGuestId, addingAvailabilityAsGuest, currSignUpBlock,
  signUpForSlotDialog, initiateSignUpFlow, signUpForBlock,
} = respondent

const {
  event, loading, ownerIsPremium, calendarEventsMap, calendarAvailabilities,
  calendarPermissionGranted, fromEditEvent, refreshEvent, refreshCalendar,
} = loader

const scheduleOverlapEvent = computed(() =>
  toScheduleOverlapEvent(event.value as Event)
)

function resetWeekOffset() {
  weekOffset.value = 0
}

function loadVideoAd() {
  if (!isPhone.value && showAds.value && videoAdContainer.value) {
    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src =
      "https://live.primis.tech/live/liveView.php?s=122130&schain=1.0,1!publift.com,01KF27H3XMWD7H1S0HYBGVB3BR,1"
    videoAdContainer.value.appendChild(script)
  }
}

function initFusetag() {
  console.log("initFusetag called, blockingFuseIds: ", [
    "meet_vrec_lhs",
    "meet_vrec_rhs",
    "meet_incontent",
    "meet_incontent_md",
  ])
  const fusetag = window.fusetag ?? (window.fusetag = { que: [] })
  fusetag.que.push(function () {
    fusetag.pageInit?.({
      blockingFuseIds: [
        "meet_vrec_lhs",
        "meet_vrec_rhs",
        "meet_incontent",
        "meet_incontent_md",
      ],
    })
  })
}

const scheduleEvent = () => { scheduleOverlap.value?.scheduleEvent() }
const cancelScheduleEvent = () => { scheduleOverlap.value?.cancelScheduleEvent() }
const confirmScheduleEvent = () => { scheduleOverlap.value?.confirmScheduleEvent() }

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (areUnsavedChanges.value) {
    e.preventDefault()
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    e.returnValue = ""
    return
  }
  Reflect.deleteProperty(e, "returnValue")
}

interface PluginMessageData {
  type?: string
  requestId?: string
  payload?: {
    type?: string
    guestName?: string
    guestEmail?: string
    slots?: SlotEntry[]
    timezone?: string
  }
  command?: string
  ok?: boolean
  error?: { message?: string } | string
}

interface SlotEntry {
  start: string
  end: string
  status?: string
}

function handleMessage(e: MessageEvent<PluginMessageData>) {
  if (!isValidPluginMessage(e)) return
  const payload = e.data.payload
  if (payload?.type === "get-slots") {
    void getSlots(e)
  }
  if (payload?.type === "set-slots") {
    void setSlots(e)
  }
}

// TEMPORARY: Intercept plugin responses for debugging
function _interceptPluginResponses(e: MessageEvent<PluginMessageData>) {
  if (e.data.type === "FILL_CALENDAR_EVENT_RESPONSE") {
    const { command, requestId, ok, error: errData, payload } = e.data
    if (ok) {
      if (command === "get-slots" && payload?.slots) {
        const slots = payload.slots as unknown as Record<string, { name?: string; email?: string; availability?: unknown; ifNeeded?: unknown }>
        const timeIncrement = Number((payload as Record<string, unknown>).timeIncrement ?? 0)
        const timezoneValue = ((payload as Record<string, unknown>).timezone ?? "—") as string
        console.log(
          `[PLUGIN RESPONSE - SUCCESS] ${command} | timeIncrement: ${String(timeIncrement)} | timezone: ${timezoneValue}`
        )
        Object.entries(slots).forEach(([userId, u]) => {
          const label = [u.name, u.email].filter(Boolean).join(" ") || userId
          console.log(`  ${label}:`, { availability: u.availability, ifNeeded: u.ifNeeded })
        })
      } else {
        console.log(`[PLUGIN RESPONSE - SUCCESS] ${command ?? ""}`, {
          requestId,
          payload,
          timestamp: Temporal.Now.instant().toString(),
        })
      }
    } else {
      const errMsg = typeof errData === "object"
        ? errData.message ?? JSON.stringify(errData)
        : errData ?? ""
      console.error(`[PLUGIN RESPONSE - ERROR] ${command ?? ""}`, {
        requestId,
        error: errMsg,
        timestamp: Temporal.Now.instant().toString(),
      })
    }
  }
}

async function setSlots(e: MessageEvent<PluginMessageData>) {
  const requestId = e.data.requestId ?? ""
  const command = "set-slots"
  if (!requestId) {
    console.error("Missing requestId in plugin message")
    return
  }
  if (isGroup.value) {
    sendPluginError(requestId, command, "Group events are not supported yet")
    return
  }
  if (!event.value) {
    sendPluginError(requestId, command, "Event not loaded yet")
    return
  }
  const ev = event.value
  const timeIncrement = ev.timeIncrement ?? 15
  const payloadGuestName = e.data.payload?.guestName
  const hasGuestName = Boolean(payloadGuestName && payloadGuestName.length > 0)
  if (ev.blindAvailabilityEnabled) {
    const isOwner = ev.ownerId && authUser.value?._id === ev.ownerId
    if (!isOwner && hasGuestName) {
      sendPluginError(
        requestId,
        command,
        "Non-owners cannot set guest availability when 'Hide responses from respondents' is enabled."
      )
      return
    }
  }
  const forceGuestMode = hasGuestName
  const isGuest = forceGuestMode || !authUser.value
  let guestName = ""
  let guestEmail = ""
  if (isGuest) {
    const guestNameKey = `${ev._id ?? ''}.guestName`
    if (forceGuestMode) {
      guestName = payloadGuestName ?? ""
      localStorage[guestNameKey] = guestName
      if (ev.collectEmails) {
        guestEmail = (e.data.payload?.guestEmail) ?? ""
        if (!guestEmail || guestEmail.length === 0) {
          sendPluginError(
            requestId,
            command,
            "Guest email is required because this event collects emails. Please provide 'guestEmail' in the payload."
          )
          return
        }
        if (!validateEmail(guestEmail)) {
          sendPluginError(requestId, command, `Invalid email format: ${guestEmail}`)
          return
        }
      } else {
        guestEmail = e.data.payload?.guestEmail ?? ev.responses?.[guestName]?.email ?? ""
      }
    } else {
      const storedGuestName = localStorage[guestNameKey] as string | undefined
      if (!storedGuestName || storedGuestName.length === 0) {
        sendPluginError(
          requestId,
          command,
          "Guest name is required. Please provide 'guestName' in the payload or add your availability through the UI first."
        )
        return
      }
      guestName = storedGuestName
      guestEmail = e.data.payload?.guestEmail ?? ev.responses?.[guestName]?.email ?? ""
    }
  }
  let slots: SlotEntry[] = e.data.payload?.slots ?? []
  if (!Array.isArray(slots)) {
    sendPluginError(requestId, command, "Slots must be an array")
    return
  }
  const hasTimezone = Boolean(e.data.payload?.timezone)
  if (ev.type === eventTypes.DOW && slots.length > 0) {
    const validationResult = validateDOWPayload(slots, hasTimezone)
    if (validationResult) {
      sendPluginError(requestId, command, validationResult.error)
      return
    }
  }
  const timezoneValue = e.data.payload?.timezone
  if (timezoneValue) {
    if (!(timezoneValue in allTimezones)) {
      sendPluginError(
        requestId,
        command,
        `Invalid timezone: "${timezoneValue}". Please provide a valid IANA timezone name from the supported timezones list.`
      )
      return
    }
  }
  const effectiveTimezoneValue = timezoneValue ?? resolvePluginTimezoneValue()
  const timeSlotToRowCol =
    typeof scheduleOverlap.value?.getAllValidTimeRanges === "function"
      ? scheduleOverlap.value.getAllValidTimeRanges()
      : new Map()
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (!slot.start || !slot.end) {
      sendPluginError(requestId, command, `Slot at index ${String(i)} is missing required 'start' or 'end' field`)
      return
    }
    if (!slot.status) {
      sendPluginError(requestId, command, `Slot at index ${String(i)} is missing required 'status' field`)
      return
    }
    if (slot.status !== "available" && slot.status !== "if-needed") {
      sendPluginError(requestId, command, `Invalid status '${slot.status}' at index ${String(i)}. Must be 'available' or 'if-needed'`)
      return
    }
  }
  const normalizedSlotsResult = normalizePluginSetSlots(
    slots,
    effectiveTimezoneValue,
    ev.type
  )
  if (!normalizedSlotsResult.ok) {
    sendPluginError(requestId, command, normalizedSlotsResult.error)
    return
  }
  const normalizedSlots = normalizedSlotsResult.slots
  const allAvailabilityTimestamps: number[] = []
  const allIfNeededTimestamps: number[] = []
  const timestampStatusMap = new Map<number, string>()
  let isBrokenBounds = false
  normalizedSlots.forEach((slot, i: number) => {
    const userStartZdt = slot.parsedStart
    const userEndZdt = slot.parsedEnd

    const userStartMs = userStartZdt.epochMilliseconds
    const userEndMs = userEndZdt.epochMilliseconds

    const intWidth = userEndMs - userStartMs
    let coveredWidth = 0
    timeSlotToRowCol.forEach((value: { startTime: Temporal.ZonedDateTime; endTime: Temporal.ZonedDateTime }, _key: number) => {
      const slotStartMs = value.startTime.epochMilliseconds
      const slotEndMs = value.endTime.epochMilliseconds
      if (userStartMs <= slotEndMs && userEndMs >= slotStartMs) {
        const intersectionStartMs = Math.max(userStartMs, slotStartMs)
        const intersectionEndMs = Math.min(userEndMs, slotEndMs)
        coveredWidth += intersectionEndMs - intersectionStartMs
        const incrementMs = timeIncrement * 60 * 1000
        let currentTimeMs = intersectionStartMs
        while (currentTimeMs < intersectionEndMs) {
          const timestampKey = currentTimeMs
          if (timestampStatusMap.has(timestampKey)) {
            const existingStatus = timestampStatusMap.get(timestampKey)
            if (existingStatus !== slot.status) {
              sendPluginError(requestId, command, `Time slot at index ${String(i)} overlaps with another time slot with different status`)
              return
            }
          } else {
            timestampStatusMap.set(timestampKey, slot.status ?? "")
          }
          if (slot.status === "available") {
            allAvailabilityTimestamps.push(currentTimeMs)
          } else {
            allIfNeededTimestamps.push(currentTimeMs)
          }
          currentTimeMs += incrementMs
          if (currentTimeMs > intersectionEndMs) break
        }
      }
    })
    if (coveredWidth < intWidth) {
      sendPluginError(requestId, command, `Time slot at index ${String(i)} (${slot.start} to ${slot.end}) falls outside the event's date/time range.`)
      isBrokenBounds = true
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (isBrokenBounds) return
  try {
    const sanitizedId = props.eventId.replaceAll(".", "")
    const payload: Record<string, unknown> = {
      availability: allAvailabilityTimestamps,
      ifNeeded: allIfNeededTimestamps,
    }
    if (isGuest) {
      payload.guest = true
      payload.name = guestName
      payload.email = guestEmail
    } else {
      payload.guest = false
    }
    await post(`/events/${sanitizedId}/response`, payload)
    await loader.refreshEvent()
    sendPluginSuccess(requestId, command)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    sendPluginError(requestId, command, `Failed to set slots: ${msg}`)
  }
}

async function getSlots(e: MessageEvent<PluginMessageData>) {
  const requestId = e.data.requestId
  const command = "get-slots"
  if (!requestId) {
    console.error("Missing requestId in plugin message")
    return
  }
  if (!event.value) {
    sendPluginError(requestId, command, "Event not loaded yet")
    return
  }
  const ev = event.value

  let timezoneValue: string
  if (e.data.payload?.timezone) {
    const providedTimezone = e.data.payload.timezone
    if (!(providedTimezone in allTimezones)) {
      sendPluginError(requestId, command, `Invalid timezone: "${providedTimezone}". Please provide a valid IANA timezone name from the supported timezones list.`)
      return
    }
    timezoneValue = providedTimezone
  } else {
    timezoneValue = resolvePluginTimezoneValue()
  }
  const sanitizedId = props.eventId.replaceAll(".", "")
  const eventTimeRange = getPluginEventTimeRange(ev, weekOffset.value)
  if (!eventTimeRange) {
    sendPluginError(requestId, command, "Could not calculate timeMin and timeMax")
    return
  }
  const { timeMin, timeMax } = eventTimeRange
  try {
    let guestName: string | null = null
    if (typeof localStorage !== "undefined" && ev._id) {
      const guestNameKey = `${ev._id}.guestName`
      guestName = localStorage[guestNameKey] as string | null
    }
    let url = `/events/${sanitizedId}/responses?timeMin=${timeMin.toString()}&timeMax=${timeMax.toString()}`
    if (guestName && guestName.length > 0) {
      url += `&guestName=${encodeURIComponent(guestName)}`
    }
    const responses = await get<Record<string, RawResponse>>(url)
    const allSlots = normalizePluginResponses({
      rawResponses: responses,
      eventResponses: ev.responses,
      timezoneValue,
      eventType: ev.type,
    })
    const timeIncrement = ev.timeIncrement ?? 15
    sendPluginSuccess(requestId, command, { slots: allSlots, timeIncrement, timezone: timezoneValue })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    sendPluginError(requestId, command, `Failed to fetch responses: ${msg}`)
  }
}

// Initialization — equivalent to created()
void (async () => {
  window.addEventListener("beforeunload", onBeforeUnload)
  window.addEventListener("message", handleMessage)
  // for dev:
  // window.addEventListener("message", _interceptPluginResponses)

  try {
    await loader.refreshEvent()
    await loader.checkOwnerPremium()

    const ev = loader.event.value
    if (ev) {
      if (ev.type === eventTypes.GROUP) {
        if (route.name === "event") {
          void router.replace({ name: "group", params: { groupId: props.eventId } })
          return
        }
      } else {
        if (route.name === "group") {
          void router.replace({ name: "event", params: { eventId: props.eventId } })
          return
        }
      }

      const storedFlag = localStorage.getItem(`from-edit-event-${ev._id ?? ""}`)
      if (storedFlag) {
        localStorage.removeItem(`from-edit-event-${ev._id ?? ""}`)
        loader.fromEditEvent.value = true
      }
    }
  } catch (err: unknown) {
    const errObj = err as Record<string, unknown>
    if (errObj.error === errors.EventNotFound) {
      mainStore.showError("The specified event does not exist!")
      void router.replace({ name: "home" })
      return
    }
  }

  loader.loading.value = true
  const promises = [loader.fetchCalendarAvailabilities(), loader.fetchAuthUserCalendarEvents()]
  Promise.allSettled(promises).then(() => { loader.loading.value = false }).catch(() => undefined)

  get<RawUser>("/user/profile")
    .then((user) => { mainStore.setAuthUser(fromRawUser(user)) })
    .catch(() => { mainStore.setAuthUser(null) })
})()

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", onBeforeUnload)
  window.removeEventListener("message", handleMessage)
  // for dev:
  // window.removeEventListener("message", _interceptPluginResponses)
})

onMounted(() => {
  editEventDialog.value = Object.keys(props.contactsPayload).length > 0
  if (props.linkApple) choiceDialog.value = true
  loadVideoAd()
})

watch(loader.event, (ev) => {
  if (ev) {
    weekOffset.value = 0
    document.title = `${ev.name ?? ""} - Timeful`
  }
})

watch(loader.ownerPremiumChecked, () => {
  if (showAds.value) {
    window.enableStickyFooter = true
    initFusetag()
  }
})

watch(scheduleOverlap, (so) => {
  if (so && !scheduleOverlapLoaded.value) {
    scheduleOverlapLoaded.value = true
    if ((props.fromSignIn || props.editingMode) && !isGroup.value) {
      so.startEditing()
    }
    if (isGroup.value && !userHasResponded.value) {
      invitationDialog.value = true
    }
  }
})

watch(weekOffset, () => { loader.refreshCalendar() })

watch(() => authUser.value?.calendarAccounts, () => { void loader.fetchAuthUserCalendarEvents() })
</script>
