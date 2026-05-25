<template>
  <div>
    <div class="tw-flex tw-items-center tw-font-medium">
      <template v-if="!isOwner && event.blindAvailabilityEnabled">
        Your response
      </template>
      <template v-else>
        <div class="tw-mr-1 tw-text-lg">
          {{ !isGroup ? "Responses" : "Members" }}
        </div>
        <div class="tw-font-normal">
          <template v-if="curRespondents.length === 0">
            {{
              isCurTimeslotSelected
                ? `(${numUsersAvailable}/${respondents.length})`
                : `(${respondents.length})`
            }}
          </template>
          <template v-else>
            {{
              isCurTimeslotSelected
                ? `(${numCurRespondentsAvailable}/${curRespondents.length})`
                : `(${curRespondents.length})`
            }}
          </template>
        </div>
        <template v-if="allowExportCsv">
          <v-spacer />
          <v-menu right offset-x>
            <template #activator="{ props: activatorProps }">
              <v-btn variant="text" size="small" icon v-bind="activatorProps"
                ><v-icon>mdi-dots-vertical</v-icon></v-btn
              >
            </template>
            <v-list class="tw-py-1" density="compact">
              <v-dialog v-model="exportCsvDialog.visible" width="400">
                <template #activator="{ props: activatorProps }">
                  <v-list-item
                    id="export-csv-btn"
                    v-bind="activatorProps"
                    @click="trackExportCsvClick"
                  >
                    <v-list-item-title>Export CSV</v-list-item-title>
                  </v-list-item>
                </template>
                <v-card>
                  <v-card-title>Export CSV</v-card-title>
                  <v-card-text>
                    <div class="tw-mb-1">Select CSV format:</div>
                    <v-select
                      v-model="exportCsvDialog.type"
                      class="timeful-solo-field"
                      variant="solo"
                      hide-details
                      :items="exportCsvDialog.types"
                      item-title="text"
                      item-value="value"
                    />
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      variant="text"
                      :disabled="exportCsvDialog.loading"
                      @click="exportCsvDialog.visible = false"
                      >Cancel</v-btn
                    >
                    <v-btn
                      variant="text"
                      color="primary"
                      :loading="exportCsvDialog.loading"
                      @click="exportCsv"
                      >Export</v-btn
                    >
                  </v-card-actions>
                </v-card>
              </v-dialog>
            </v-list>
          </v-menu>
        </template>
      </template>
      <template v-if="isPhone">
        <v-spacer />
        <div
          class="tw-mt-2 tw-text-sm tw-font-normal tw-text-dark-gray"
          :class="showIfNeededStar ? 'tw-visible' : 'tw-invisible'"
        >
          * if needed
        </div>
      </template>
    </div>
    <div
      v-if="isOwner && !isPhone && event.blindAvailabilityEnabled"
      class="tw-mb-2 tw-mt-1 tw-text-xs tw-italic tw-text-very-dark-gray"
    >
      Responses are only visible to {{ isOwner ? "you" : "event creator" }}
    </div>
    <div
      ref="scrollableSection"
      class="tw-flex tw-flex-col"
      :style="
        maxHeight
          ? `max-height: ${maxHeight}px !important;`
          : !isPhone
          ? `max-height: ${respondentsListMaxHeight}px !important;`
          : ''
      "
    >
      <div class="tw-relative tw-overflow-hidden">
        <div
          ref="respondentsScrollView"
          class="-tw-ml-2 tw-pl-2 tw-pt-2 tw-text-sm"
          :class="
            isPhone && !maxHeight
              ? 'tw-overflow-hidden'
              : 'tw-overflow-y-auto tw-overflow-x-hidden'
          "
        >
          <div v-if="respondents.length === 0" class="tw-mb-6">
            <span
              v-if="!isOwner && event.blindAvailabilityEnabled"
              class="tw-text-very-dark-gray"
            >
              No response yet!
            </span>
            <span v-else class="tw-text-very-dark-gray">No responses yet!</span>
          </div>
          <template v-else>
            <transition-group
              name="list"
              tag="div"
              class="tw-grid tw-grid-cols-2 tw-gap-x-2 sm:tw-block"
            >
              <div
                v-for="user in orderedRespondents"
                :key="user._id"
                class="respondent-row tw-group tw-relative tw-flex tw-cursor-pointer tw-items-center tw-py-1 tw-text-sm tw-leading-5"
                @mouseover="(e: MouseEvent) => $emit('mouseOverRespondent', e, user._id ?? '')"
                @mouseleave="$emit('mouseLeaveRespondent')"
                @click="(e: MouseEvent) => clickRespondent(e, user._id ?? '')"
              >
                <div
                  class="tw-ml-1 tw-mr-3 tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center"
                >
                  <button
                    type="button"
                    class="respondent-control tw-flex tw-h-5 tw-w-5 tw-appearance-none tw-items-center tw-justify-center tw-border-0 tw-bg-transparent tw-p-0 tw-leading-none tw-shadow-none"
                    :aria-pressed="respondentSelected(user._id ?? '')"
                    :aria-label="
                      respondentSelected(user._id ?? '')
                        ? `Deselect ${user.firstName ?? 'respondent'}`
                        : `Select ${user.firstName ?? 'respondent'}`
                    "
                    @click.stop="(e: MouseEvent) => $emit('clickRespondent', e, user._id ?? '')"
                  >
                    <span
                      class="respondent-control__checkbox tw-flex tw-h-4 tw-w-4 tw-items-center tw-justify-center tw-rounded-[2px] tw-border-2 tw-border-solid tw-bg-white"
                      style="border-color: var(--timeful-primary-action-bg);"
                    >
                      <v-icon
                        v-if="respondentSelected(user._id ?? '')"
                        size="12"
                        color="primary"
                        class="tw-block"
                      >
                        mdi-check
                      </v-icon>
                    </span>
                    <span
                      class="respondent-control__avatar tw-flex tw-h-4 tw-w-4 tw-items-center tw-justify-center"
                    >
                      <UserAvatarContent
                        v-if="shouldUseRichAvatar(user)"
                        :user="user"
                        :size="16"
                      ></UserAvatarContent>
                      <v-avatar v-else :size="16">
                        <v-icon small>mdi-account</v-icon>
                      </v-avatar>
                    </span>
                  </button>
                </div>
                <div class="tw-flex tw-flex-col tw-justify-center">
                  <div
                    class="tw-mr-1 tw-text-sm tw-leading-5 tw-transition-all"
                    :class="respondentClass(user._id ?? '')"
                  >
                    {{
                      user.firstName +
                      " " +
                      user.lastName +
                      (respondentIfNeeded(user._id ?? '') ? "*" : "")
                    }}
                  </div>
                  <div
                    v-if="isOwner && event.collectEmails"
                    class="email-hover-target tw-flex tw-items-center tw-rounded-sm tw-p-px tw-text-xs tw-text-dark-gray tw-transition-all hover:tw-bg-light-gray"
                    :class="respondentClass(user._id ?? '')"
                    @mouseover.stop
                    @click.stop="copyEmailToClipboard(user.email)"
                  >
                    {{ user.email }}
                    <v-icon class="tw-ml-1 tw-text-xs">mdi-content-copy</v-icon>
                  </div>
                </div>
                <div
                  class="tw-absolute tw-right-0 tw-transition-none group-hover:tw-opacity-100 group-[&:has(.email-hover-target:hover)]:!tw-opacity-0"
                  :class="isPhone ? 'tw-opacity-100' : 'tw-opacity-0'"
                >
                  <template
                    v-if="isPhone && (isGuest(user) || (isOwner && !isGroup))"
                  >
                    <v-menu right offset-x>
                      <template #activator="{ props: activatorProps }">
                        <v-btn icon v-bind="activatorProps">
                          <v-icon small color="#4F4F4F">mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list class="tw-py-1" density="compact">
                        <v-list-item
                          v-if="isGuest(user)"
                          @click="$emit('editGuestAvailability', user._id ?? '')"
                        >
                          <v-list-item-title class="tw-flex tw-items-center">
                            <v-icon small class="tw-mr-2" color="#4F4F4F"
                              >mdi-pencil</v-icon
                            >
                            Edit
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                          v-if="isOwner && !isGroup"
                          @click="() => showDeleteAvailabilityDialog(user)"
                        >
                          <v-list-item-title class="tw-flex tw-items-center">
                            <v-icon small class="tw-mr-2" color="#4F4F4F"
                              >mdi-delete</v-icon
                            >
                            Delete
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </template>
                  <template v-else>
                    <v-btn
                      v-if="isGuest(user)"
                      icon
                      size="small"
                      class="tw-bg-white"
                      @click="$emit('editGuestAvailability', user._id ?? '')"
                      ><v-icon small color="#4F4F4F">mdi-pencil</v-icon></v-btn
                    >
                    <v-btn
                      v-if="isOwner && !isGroup"
                      icon
                      size="small"
                      class="tw-bg-white"
                      @click="() => showDeleteAvailabilityDialog(user)"
                      ><v-icon small class="hover:tw-text-red" color="#4F4F4F"
                        >mdi-delete</v-icon
                      ></v-btn
                    >
                  </template>
                </div>
              </div>
            </transition-group>
            <div class="tw-h-2"></div>
          </template>
        </div>
        <OverflowGradient
          v-if="hasMounted && !isPhone && respondentsScrollView && !maxHeight"
          class="tw-h-16"
          :scroll-container="respondentsScrollView"
          :show-arrow="false"
        />
      </div>

      <div
        v-if="!isPhone && respondents.length > 0"
        class="tw-col-span-full tw-mb-2 tw-mt-1 tw-text-sm tw-text-dark-gray"
        :class="showIfNeededStar ? 'tw-visible' : 'tw-invisible'"
      >
        * if needed
      </div>
      <div
        v-if="!maxHeight && pendingUsers.length > 0"
        class="tw-mb-4 sm:tw-mb-6"
      >
        <div class="tw-mb-2 tw-flex tw-items-center tw-font-medium">
          <div class="tw-mr-1 tw-text-lg">Pending</div>
          <div class="tw-font-normal">({{ pendingUsers.length }})</div>
        </div>
        <div>
          <div v-for="user in pendingUsers" :key="user.email">
            <div class="tw-relative tw-flex tw-items-center">
              <v-icon class="tw-ml-1 tw-mr-3" small>mdi-account</v-icon>
              <div class="tw-mr-1 tw-text-sm tw-transition-all">
                {{ user.email }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <template v-if="!isPhone">
        <v-btn
          v-if="
            !isGroup &&
            (authUser || guestAddedAvailability) &&
            (!event.blindAvailabilityEnabled || isOwner)
          "
          variant="text"
          color="primary"
          class="-tw-ml-2 tw-mb-4 tw-w-min tw-px-2"
          @click="
            () => {
              if (authUser) {
                $emit('addAvailabilityAsGuest')
              } else {
                $emit('addAvailability')
              }
            }
          "
        >
          {{
            authUser ? "+ Add guest availability" : "+ Add availability"
          }}</v-btn
        >
        <v-switch
          v-if="respondents.length > 1"
          id="show-best-times-toggle"
          class="schedule-overlap-compact-switch tw-mb-4"
          inset
          :model-value="showBestTimes"
          hide-details
          @update:model-value="
            (val: boolean | null) => $emit('update:showBestTimes', !!val)
          "
        >
          <template #label>
            <div class="tw-text-sm tw-text-black">
              Show best {{ event.daysOnly ? "days" : "times" }}
            </div>
          </template>
        </v-switch>
        <EventOptions
          :event="event"
          :show-event-options="showEventOptions"
          :show-best-times="showBestTimes"
          :hide-if-needed="hideIfNeeded"
          :show-all-hours="showAllHours"
          :show-calendar-events="showCalendarEvents"
          :start-calendar-on-monday="startCalendarOnMonday"
          :num-responses="respondents.length"
          @toggle-show-event-options="$emit('toggleShowEventOptions')"
          @update:show-best-times="(val) => $emit('update:showBestTimes', val)"
          @update:hide-if-needed="(val) => $emit('update:hideIfNeeded', val)"
          @update:show-all-hours="(val) => $emit('update:showAllHours', val)"
          @update:show-calendar-events="
            (val) => $emit('update:showCalendarEvents', val)
          "
          @update:start-calendar-on-monday="
            (val) => $emit('update:startCalendarOnMonday', val)
          "
        />
      </template>
    </div>

    <div
      v-if="(!isOwner || isPhone) && event.blindAvailabilityEnabled"
      class="tw-mt-2 tw-text-xs tw-italic tw-text-very-dark-gray"
    >
      Responses are only visible to {{ isOwner ? "you" : "event creator" }}
    </div>

    <v-dialog v-model="deleteAvailabilityDialog" width="500" persistent>
      <v-card>
        <v-card-title>Are you sure?</v-card-title>
        <v-card-text class="tw-text-sm tw-text-dark-gray"
          >Are you sure you want to delete
          <strong>{{ userToDelete?.firstName }}</strong
          >'s availability from this
          {{ isGroup ? "group" : "event" }}?</v-card-text
        >
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteAvailabilityDialog = false">Cancel</v-btn>
          <v-btn
            variant="text"
            color="error"
            @click="
              () => {
                deleteAvailability(userToDelete)
                deleteAvailabilityDialog = false
              }
            "
            >Delete</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-switch
      v-if="isGroup && isPhone"
      :class="maxHeight && 'tw-mt-2'"
      class="timeful-switch tw-mb-4"
      color="primary"
      inset
      :model-value="showCalendarEvents"
      hide-details
      @update:model-value="
        (val: boolean | null) => $emit('update:showCalendarEvents', !!val)
      "
    >
      <template #label>
        <div class="tw-text-sm tw-text-black">Overlay calendar events</div>
      </template>
    </v-switch>

    <v-btn
      v-if="
        !maxHeight &&
        isPhone &&
        !isGroup &&
        (authUser || guestAddedAvailability) &&
        (!event.blindAvailabilityEnabled || isOwner)
      "
      variant="text"
      color="primary"
      class="-tw-ml-2 tw-mt-4 tw-w-min tw-px-2"
      @click="
        () => {
          if (authUser) {
            $emit('addAvailabilityAsGuest')
          } else {
            $emit('addAvailability')
          }
        }
      "
    >
      {{ authUser ? "+ Add guest availability" : "+ Add availability" }}</v-btn
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { _delete } from "@/utils"
import { posthog } from "@/plugins/posthog"
import UserAvatarContent from "../UserAvatarContent.vue"
import EventOptions from "./EventOptions.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"
import type { ZdtMap } from "@/utils"
import type { Temporal } from "temporal-polyfill"
import type {
  ParsedResponses,
  ScheduleOverlapEvent,
  Timezone,
} from "@/composables/schedule_overlap/types"
import type { User } from "@/types"
import { useRespondentsCsvExport } from "./useRespondentsCsvExport"
import { useRespondentsListSizing } from "./useRespondentsListSizing"
import { useRespondentsListState } from "./useRespondentsListState"

const props = defineProps<{
  eventId: string
  event: ScheduleOverlapEvent
  days: unknown[]
  times: unknown[]
  curDate?: Temporal.ZonedDateTime
  curRespondent: string
  curRespondents: string[]
  curTimeslot: { dayIndex: number; timeIndex: number }
  curTimeslotAvailability: Record<string, boolean>
  respondents: User[]
  parsedResponses: ParsedResponses
  isOwner: boolean
  maxHeight?: number
  isGroup: boolean
  attendees?: { email: string; declined?: boolean }[]
  showCalendarEvents: boolean
  responsesFormatted: ZdtMap<Set<string>>
  timezone: Timezone
  showBestTimes: boolean
  hideIfNeeded: boolean
  showAllHours: boolean
  startCalendarOnMonday?: boolean
  showEventOptions: boolean
  guestAddedAvailability: boolean
  addingAvailabilityAsGuest: boolean
}>()

const emit = defineEmits<{
  mouseOverRespondent: [e: MouseEvent, userId: string]
  mouseLeaveRespondent: []
  clickRespondent: [e: MouseEvent, userId: string]
  editGuestAvailability: [userId: string]
  addAvailabilityAsGuest: []
  addAvailability: []
  refreshEvent: []
  "update:showBestTimes": [value: boolean]
  "update:showCalendarEvents": [value: boolean]
  "update:hideIfNeeded": [value: boolean]
  "update:showAllHours": [value: boolean]
  "update:startCalendarOnMonday": [value: boolean]
  toggleShowEventOptions: []
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
const { showError, showInfo } = mainStore

const { isPhone } = useDisplayHelpers()
const { scrollableSection, respondentsScrollView, respondentsListMaxHeight, hasMounted } =
  useRespondentsListSizing()

const {
  allowExportCsv,
  isCurTimeslotSelected,
  numUsersAvailable,
  numCurRespondentsAvailable,
  pendingUsers,
  showIfNeededStar,
  orderedRespondents,
  deleteAvailabilityDialog,
  userToDelete,
  respondentClass,
  respondentIfNeeded,
  respondentSelected,
  shouldUseRichAvatar,
  isGuest,
  showDeleteAvailabilityDialog,
} = useRespondentsListState({
  event: props.event,
  respondents: computed(() => props.respondents),
  curRespondents: computed(() => props.curRespondents),
  curTimeslotAvailability: computed(() => props.curTimeslotAvailability),
  parsedResponses: computed(() => props.parsedResponses),
  curDate: computed(() => props.curDate),
  hideIfNeeded: computed(() => props.hideIfNeeded),
  isGroup: computed(() => props.isGroup),
  attendees: computed(() => props.attendees),
  isOwner: computed(() => props.isOwner),
  isPhone,
})

const { exportCsvDialog, exportCsv, trackExportCsvClick } = useRespondentsCsvExport({
  eventId: props.eventId,
  event: props.event,
  parsedResponses: props.parsedResponses,
  respondentCount: props.respondents.length,
})

function clickRespondent(e: MouseEvent, userId: string) {
  e.stopImmediatePropagation()
  emit("clickRespondent", e, userId)
}

async function deleteAvailability(user: User | null) {
  if (!user) return
  try {
    await _delete(`/events/${props.eventId}/response`, {
      guest: isGuest(user),
      userId: user._id,
      name: user._id,
    })
    emit("refreshEvent")
    showInfo("Availability successfully deleted!")

    posthog.capture("Deleted availability of another user", {
      eventId: props.eventId,
      userId: user._id,
    })
  } catch (e: unknown) {
    console.error(e)
    showError("There was an error deleting that person's availability!")
  }
}

async function copyEmailToClipboard(email: string | undefined) {
  if (!email) return
  try {
    await navigator.clipboard.writeText(email)
    showInfo("Email copied to clipboard!")
  } catch (err: unknown) {
    console.error("Failed to copy email: ", err)
    showError("Failed to copy email.")
  }
}
</script>

<style scoped src="./ScheduleOverlapCompactSwitch.css"></style>

<style scoped>
.list-move {
  transition: transform 0.5s;
}

.respondent-control {
  position: relative;
  width: 20px;
  height: 20px;
}

.respondent-control__checkbox,
.respondent-control__avatar {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.respondent-control__checkbox {
  opacity: 0;
  visibility: hidden;
}

.respondent-control__avatar {
  opacity: 1;
  visibility: visible;
}

.respondent-row:hover .respondent-control__checkbox,
.respondent-control[aria-pressed="true"] .respondent-control__checkbox {
  opacity: 1;
  visibility: visible;
}

.respondent-row:hover .respondent-control__avatar,
.respondent-control[aria-pressed="true"] .respondent-control__avatar {
  opacity: 0;
  visibility: hidden;
}
</style>
