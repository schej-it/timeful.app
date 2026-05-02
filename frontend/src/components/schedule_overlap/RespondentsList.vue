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
              <v-btn icon v-bind="activatorProps"
                ><v-icon>mdi-dots-vertical</v-icon></v-btn
              >
            </template>
            <v-list class="tw-py-1" dense>
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
                      solo
                      hide-details
                      :items="exportCsvDialog.types"
                      item-text="text"
                      item-value="value"
                    />
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      text
                      :disabled="exportCsvDialog.loading"
                      @click="exportCsvDialog.visible = false"
                      >Cancel</v-btn
                    >
                    <v-btn
                      text
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
            class="tw-grid tw-grid-cols-2 tw-gap-x-2 sm:tw-block"
          >
            <div
              v-for="user in orderedRespondents"
              :key="user._id"
              class="tw-group tw-relative tw-flex tw-cursor-pointer tw-items-center tw-py-1"
              @mouseover="(e: MouseEvent) => $emit('mouseOverRespondent', e, user._id ?? '')"
              @mouseleave="$emit('mouseLeaveRespondent')"
              @click="(e: MouseEvent) => clickRespondent(e, user._id ?? '')"
            >
              <div class="tw-relative tw-flex tw-items-center">
                <div class="tw-ml-1 tw-mr-3">
                  <UserAvatarContent
                    v-if="!isGuest(user)"
                    :user="user"
                    :size="16"
                  ></UserAvatarContent>
                  <v-avatar v-else :size="16">
                    <v-icon small>mdi-account</v-icon>
                  </v-avatar>
                </div>

                <v-simple-checkbox
                  color="primary"
                  :value="respondentSelected(user._id ?? '')"
                  class="tw-absolute -tw-top-[2px] tw-left-0 tw-bg-white tw-opacity-0 group-hover:tw-opacity-100 group-[&:has(.email-hover-target:hover)]:!tw-opacity-0"
                  :class="
                    respondentSelected(user._id ?? '')
                      ? 'tw-opacity-100'
                      : 'tw-opacity-0'
                  "
                  @click="(e: MouseEvent) => $emit('clickRespondent', e, user._id ?? '')"
                />
              </div>
              <div class="tw-flex tw-flex-col">
                <div
                  class="tw-mr-1 tw-transition-all"
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
                    <v-list class="tw-py-1" dense>
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
                    small
                    icon
                    class="tw-bg-white"
                    @click="$emit('editGuestAvailability', user._id ?? '')"
                    ><v-icon small color="#4F4F4F">mdi-pencil</v-icon></v-btn
                  >
                  <v-btn
                    v-if="isOwner && !isGroup"
                    small
                    icon
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
      <div class="tw-relative">
        <OverflowGradient
          v-if="hasMounted && !isPhone && respondentsScrollView"
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
          text
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
          class="tw-mb-4"
          inset
          :input-value="showBestTimes"
          hide-details
          @change="(val: unknown) => $emit('update:showBestTimes', !!val)"
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
          :show-calendar-events="showCalendarEvents"
          :start-calendar-on-monday="startCalendarOnMonday"
          :num-responses="respondents.length"
          @toggle-show-event-options="$emit('toggleShowEventOptions')"
          @update:show-best-times="(val) => $emit('update:showBestTimes', val)"
          @update:hide-if-needed="(val) => $emit('update:hideIfNeeded', val)"
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
          <v-btn text @click="deleteAvailabilityDialog = false">Cancel</v-btn>
          <v-btn
            text
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
      class="tw-mb-4"
      inset
      :input-value="showCalendarEvents"
      hide-details
      @change="(val: unknown) => $emit('update:showCalendarEvents', Boolean(val))"
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
      text
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
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue"
import { storeToRefs } from "pinia"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { _delete, getLocale, zdtSetHas } from "@/utils"
import { posthog } from "@/plugins/posthog"
import UserAvatarContent from "../UserAvatarContent.vue"
import EventOptions from "./EventOptions.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"
import { Temporal } from "temporal-polyfill"
import type { ZdtMap } from "@/utils"
import type { EventLike, ParsedResponses, Timezone } from "@/composables/schedule_overlap/types"
import type { User } from "@/types"

interface RespondentUser {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
}

const props = defineProps<{
  eventId: string
  event: EventLike
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
  "update:startCalendarOnMonday": [value: boolean]
  toggleShowEventOptions: []
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
const { showError, showInfo } = mainStore

const { isPhone } = useDisplayHelpers()

const scrollableSection = ref<HTMLElement | null>(null)
const respondentsScrollView = ref<HTMLElement | null>(null)

const deleteAvailabilityDialog = ref(false)
const exportCsvDialog = reactive({
  visible: false,
  loading: false,
  type: "datesToAvailable",
  types: [
    { text: "Dates <> people available", value: "datesToAvailable" },
    { text: "Name <> dates available", value: "nameToDates" },
  ],
})
const userToDelete = ref<User | null>(null)
const desktopMaxHeight = ref(0)
const respondentsListMinHeight = 400
let oldCurRespondents: string[] = []
const curRespondentsAddedTime = reactive<Record<string, Temporal.ZonedDateTime>>({})
const hasMounted = ref(false)

const allowExportCsv = computed(() => {
  if (props.isGroup || isPhone.value) return false
  return props.event.blindAvailabilityEnabled
    ? props.isOwner && props.respondents.length > 0
    : props.respondents.length > 0
})

const curRespondentsSet = computed(() => new Set(props.curRespondents))

const isCurTimeslotSelected = computed(
  () =>
    props.curTimeslot.dayIndex !== -1 && props.curTimeslot.timeIndex !== -1
)

const numUsersAvailable = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  props.curTimeslot
  let numUsers = 0
  for (const key in props.curTimeslotAvailability) {
    if (props.curTimeslotAvailability[key]) numUsers++
  }
  return numUsers
})

const numCurRespondentsAvailable = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  props.curTimeslot
  let numUsers = 0
  for (const key in props.curTimeslotAvailability) {
    if (props.curTimeslotAvailability[key] && curRespondentsSet.value.has(key))
      numUsers++
  }
  return numUsers
})

const pendingUsers = computed(() => {
  if (!props.isGroup) return []
  const respondentEmailsSet = new Set(
    props.respondents.map((r) => r.email?.toLowerCase() ?? "")
  )
  return (props.attendees ?? []).filter((a) => {
    if (!a.declined && !respondentEmailsSet.has(a.email.toLowerCase())) {
      return true
    }
    return false
  })
})

const showIfNeededStar = computed(() => {
  if (props.hideIfNeeded) return false
  for (const user of props.respondents) {
    if (respondentIfNeeded(user._id ?? "")) return true
  }
  return false
})

const orderedRespondents = computed(() => {
  const ordered = [...props.respondents]
  ordered.sort((a, b) => {
    const aId = a._id ?? ""
    const bId = b._id ?? ""
    if (curRespondentsSet.value.has(aId) && curRespondentsSet.value.has(bId)) {
      return Temporal.ZonedDateTime.compare(curRespondentsAddedTime[aId], curRespondentsAddedTime[bId])
    } else if (curRespondentsSet.value.has(aId) && !curRespondentsSet.value.has(bId)) {
      return -1
    } else if (!curRespondentsSet.value.has(aId) && curRespondentsSet.value.has(bId)) {
      return 1
    }
    return (a.firstName ?? "").localeCompare(b.firstName ?? "")
  })
  return ordered
})

const respondentsListMaxHeight = computed(() =>
  Math.max(desktopMaxHeight.value, respondentsListMinHeight)
)

function clickRespondent(e: MouseEvent, userId: string) {
  e.stopImmediatePropagation()
  emit("clickRespondent", e, userId)
}

function respondentClass(id: string) {
  const c: string[] = []
  if (curRespondentsSet.value.has(id)) {
    // intentionally empty
  } else if (props.curRespondents.length > 0) {
    c.push("tw-text-gray")
  }

  if (
    (curRespondentsSet.value.has(id) || props.curRespondents.length === 0) &&
    respondentIfNeeded(id)
  ) {
    c.push("tw-bg-yellow")
  }

  if (!props.curTimeslotAvailability[id]) {
    c.push("tw-line-through")
    c.push("tw-text-gray")
  }
  return c
}

function respondentIfNeeded(id: string) {
  if (!props.curDate || props.hideIfNeeded) return false
  return Boolean(
    props.parsedResponses[id].ifNeeded &&
      zdtSetHas(props.parsedResponses[id].ifNeeded, props.curDate)
  )
}

function respondentSelected(id: string) {
  return curRespondentsSet.value.has(id)
}

function isGuest(user: User) {
  return user._id === user.firstName
}

function showDeleteAvailabilityDialog(user: User) {
  deleteAvailabilityDialog.value = true
  userToDelete.value = user
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

function getDateString(date: Temporal.ZonedDateTime | Temporal.PlainDate) {
  const locale = getLocale()
  if (props.event.daysOnly) {
    // For days-only events, return the plain date string
    if (date instanceof Temporal.PlainDate) {
      return date.toString()
    }
    return date.toPlainDate().toString()
  }
  // For time-specific events, return localized datetime string
  return (
    '"' + date.toLocaleString(locale) + '"'
  )
}

function exportCsv() {
  const csv: string[][] = []
  const increment = 15
  const durationHours = props.event.duration?.total("hours") ?? 0
  const numIterations = props.event.daysOnly
    ? 1
    : (durationHours * 60) / increment

  const responses = Object.values(props.parsedResponses).sort((a, b) =>
    ((a.user as RespondentUser).firstName ?? "").localeCompare(
      (b.user as RespondentUser).firstName ?? ""
    )
  )

  if (exportCsvDialog.type === "datesToAvailable") {
    const header = ["Date / Time"]
    header.push(
      ...responses.map((r) => {
        const u = r.user as RespondentUser
        return `${u.firstName ?? ""} ${u.lastName ?? ""}`
      })
    )
    csv.push(header)

    for (const date of props.event.dates as unknown as string[]) {
      let curDate = Temporal.ZonedDateTime.from(date)
      for (let i = 0; i < numIterations; ++i) {
        const row = [getDateString(curDate)]
        for (const response of responses) {
          if (zdtSetHas(response.availability, curDate)) {
            row.push("Available")
          } else if (response.ifNeeded && zdtSetHas(response.ifNeeded, curDate)) {
            row.push("If needed")
          } else {
            row.push("")
          }
        }
        csv.push(row)
        curDate = curDate.add({ minutes: increment })
      }
    }
  } else if (exportCsvDialog.type === "nameToDates") {
    csv.push(["Name", "Date / Times available"])

    for (const response of responses) {
      const u = response.user as RespondentUser
      const row = [`${u.firstName ?? ""} ${u.lastName ?? ""}`]

      for (const date of props.event.dates as unknown as string[]) {
        let curDate = Temporal.ZonedDateTime.from(date)
        for (let i = 0; i < numIterations; ++i) {
          if (
            zdtSetHas(response.availability, curDate) ||
            (response.ifNeeded && zdtSetHas(response.ifNeeded, curDate))
          ) {
            row.push(getDateString(curDate))
          } else {
            row.push("")
          }
          curDate = curDate.add({ minutes: increment })
        }
      }
      csv.push(row)
    }
  }

  // Source: https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
  const csvString =
    "data:text/csv;charset=utf-8," + csv.map((e) => e.join(",")).join("\n")
  const encodedUri = encodeURI(csvString)

  // Source: https://stackoverflow.com/questions/7034754/how-to-set-a-file-name-using-window-open
  const downloadLink = document.createElement("a")
  downloadLink.href = encodedUri
  downloadLink.download = `${props.event.name ?? "export"}.csv`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
}

function trackExportCsvClick() {
  posthog.capture("export_csv_clicked", {
    eventId: props.eventId,
    numRespondents: props.respondents.length,
  })
}

function setDesktopMaxHeight() {
  const el = scrollableSection.value
  if (el) {
    const { top } = el.getBoundingClientRect()
    desktopMaxHeight.value = window.innerHeight - top - 32
  } else {
    desktopMaxHeight.value = 0
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

onMounted(() => {
  setDesktopMaxHeight()
  addEventListener("resize", setDesktopMaxHeight)
  void nextTick(() => {
    hasMounted.value = true
  })
})

onBeforeUnmount(() => {
  removeEventListener("resize", setDesktopMaxHeight)
})

watch(
  () => props.curRespondents,
  () => {
    const oldSet = new Set(oldCurRespondents)
    const newSet = new Set(props.curRespondents)

    const addedRespondents = props.curRespondents.filter((id) => !oldSet.has(id))
    const removedRespondents = oldCurRespondents.filter((id) => !newSet.has(id))

    for (const id of addedRespondents) {
      curRespondentsAddedTime[id] = Temporal.Now.zonedDateTimeISO()
    }
    for (const id of removedRespondents) {
      Reflect.deleteProperty(curRespondentsAddedTime, id)
    }

    oldCurRespondents = [...props.curRespondents]
  },
  { deep: true }
)
</script>

<style scoped>
.list-move {
  transition: transform 0.5s;
}
</style>
