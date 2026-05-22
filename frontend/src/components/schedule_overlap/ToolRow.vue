<template>
  <div>
    <div
      class="tw-flex tw-min-h-[5rem] tw-flex-1 tw-items-center tw-justify-center tw-text-sm sm:tw-mt-0 sm:tw-justify-between"
    >
      <div
        :class="
          toolRow.state === toolRow.states.EDIT_AVAILABILITY
            ? 'tw-justify-center'
            : 'tw-justify-between'
        "
        class="tw-flex tw-flex-1 tw-flex-wrap tw-gap-x-4 tw-gap-y-2 tw-py-4 sm:tw-justify-start sm:tw-gap-x-4"
      >
        <!-- Select timezone -->
        <div v-if="!toolRow.event.daysOnly" class="tw-flex tw-items-center tw-gap-2">
          <TimezoneSelector
            class="tw-w-full sm:tw-w-[unset]"
            :model-value="toolRow.curTimezone"
            :reference-date="toolRow.timezoneReferenceDate"
            @update:model-value="(val) => toolRow.actions.updateCurTimezone(val)"
          />
          <v-select
            :model-value="toolRow.timeType"
            :items="timeTypeOptions"
            item-title="label"
            item-value="value"
            class="tool-row-inline-select tool-row-inline-select--compact tw-z-20 -tw-mt-px tw-w-16 tw-text-sm"
            color="primary"
            density="compact"
            hide-details
            variant="underlined"
            @update:model-value="(value) => value && toolRow.actions.updateTimeType(value)"
          >
            <template #item="{ item, props: itemProps }">
              <div
                v-bind="stripGeneratedTitle(itemProps)"
                class="tool-row-inline-select__item"
                :class="{
                  'tool-row-inline-select__item--active': item.raw.value === toolRow.timeType,
                }"
              >
                {{ item.raw.label }}
              </div>
            </template>
            <template #selection="{ item }">
              <div class="tool-row-inline-select__selection-text">
                {{ item.raw.label }}
              </div>
            </template>
          </v-select>
        </div>
        <div
          v-if="isPhone && !toolRow.event.daysOnly"
          class="tw-flex tw-basis-full tw-items-center tw-gap-x-2 tw-py-4"
        >
          Show
          <v-select
            :model-value="toolRow.mobileNumDays"
            :items="mobileNumDaysOptions"
            item-title="label"
            item-value="value"
            class="tool-row-inline-select -tw-mt-px tw-flex-none tw-shrink tw-basis-24 tw-text-sm"
            color="primary"
            density="compact"
            hide-details
            variant="underlined"
            @update:model-value="
              (value) => typeof value === 'number' && toolRow.actions.updateMobileNumDays(value)
            "
          >
            <template #item="{ item, props: itemProps }">
              <div
                v-bind="stripGeneratedTitle(itemProps)"
                class="tool-row-inline-select__item"
                :class="{
                  'tool-row-inline-select__item--active':
                    item.raw.value === toolRow.mobileNumDays,
                }"
              >
                {{ item.raw.label }}
              </div>
            </template>
            <template #selection="{ item }">
              <div class="tool-row-inline-select__selection-text">
                {{ item.raw.label }}
              </div>
            </template>
          </v-select>
          at a time
        </div>

        <template
          v-if="toolRow.state !== toolRow.states.EDIT_AVAILABILITY && isPhone"
        >
          <EventOptions
            class="tw-mt-2 tw-w-full"
            :event="toolRow.event"
            :show-best-times="toolRow.showBestTimes"
            :hide-if-needed="toolRow.hideIfNeeded"
            :show-event-options="toolRow.showEventOptions"
            :start-calendar-on-monday="toolRow.startCalendarOnMonday"
            :num-responses="toolRow.numResponses"
            @update:show-best-times="(val) => toolRow.actions.updateShowBestTimes(val)"
            @update:hide-if-needed="(val) => toolRow.actions.updateHideIfNeeded(val)"
            @toggle-show-event-options="toolRow.actions.toggleShowEventOptions()"
            @update:start-calendar-on-monday="
              (val) => toolRow.actions.updateStartCalendarOnMonday(val)
            "
          />
        </template>
        <template
          v-if="
            toolRow.state === toolRow.states.EDIT_AVAILABILITY &&
            toolRow.isWeekly &&
            !isPhone
          "
        >
          <v-spacer />
          <div class="tw-min-w-fit">
            <GCalWeekSelector
              v-if="toolRow.calendarPermissionGranted"
              :week-offset="toolRow.weekOffset"
              :event="toolRow.event"
              :start-on-monday="toolRow.event.startOnMonday"
              @update:week-offset="(val) => toolRow.actions.updateWeekOffset(val)"
            />
          </div>
        </template>
      </div>

      <div
        v-if="showScheduleEventButton"
        style="width: 181.5px"
        class="tw-hidden sm:tw-flex"
      >
        <template v-if="toolRow.state !== toolRow.states.SCHEDULE_EVENT">
          <v-btn
            variant="outlined"
            class="tw-w-full tw-text-blue"
            @click="(e: MouseEvent) => toolRow.actions.scheduleEvent(e)"
          >
            <v-icon small>mdi-calendar-check</v-icon>
            <span class="tw-ml-2">Schedule event</span>
          </v-btn>
        </template>
        <template v-else>
          <v-btn
            variant="outlined"
            class="tw-mr-1 tw-text-red"
            @click="(e: MouseEvent) => toolRow.actions.cancelScheduleEvent(e)"
          >
            Cancel
          </v-btn>
          <v-menu offset-y class="tw-z-20">
            <template #activator="{ props: activatorProps }">
              <v-btn
                :disabled="!toolRow.allowScheduleEvent"
                class="tw-bg-blue tw-text-white"
                v-bind="activatorProps"
              >
                Schedule
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click="toolRow.actions.confirmScheduleEvent(true)">
                <v-img
                  src="@/assets/gcal_logo.png"
                  class="tw-mr-2 tw-flex-none"
                  height="20"
                  width="20"
                />
                <div class="tw-flex tw-min-w-0 tw-flex-col">
                  <v-list-item-title>Google Calendar</v-list-item-title>
                </div>
              </v-list-item>
              <v-list-item @click="toolRow.actions.confirmScheduleEvent(false)">
                <v-img
                  src="@/assets/outlook_logo.svg"
                  class="tw-mr-2 tw-flex-none"
                  height="20"
                  width="20"
                />
                <div class="tw-flex tw-min-w-0 tw-flex-col">
                  <v-list-item-title>Outlook</v-list-item-title>
                </div>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </div>
    </div>

    <!-- <Advertisement
      class="tw-mt-5 sm:tw-mt-10"
      :ownerId="event.ownerId"
    ></Advertisement> -->

    <!-- <div v-if="!isPremiumUser">
      <ins
        class="adsbygoogle"
        style="display: block"
        data-ad-client="ca-pub-4082178684015354"
        data-ad-slot="7343574524"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import TimezoneSelector from "./TimezoneSelector.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import EventOptions from "./EventOptions.vue"
import { timeTypes } from "@/constants"
import { isAnonymousOwnerEvent, isSignedInOwner } from "@/composables/event/eventOwnership"
import type { ScheduleOverlapToolRowViewModel } from "./scheduleOverlapViewModels"

const props = defineProps<{
  toolRow: ScheduleOverlapToolRowViewModel
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const { isPhone } = useDisplayHelpers()

const mobileNumDaysOptions = [
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
]
const timeTypeOptions = [
  { label: "12h", value: timeTypes.HOUR12 },
  { label: "24h", value: timeTypes.HOUR24 },
]

const guestEvent = computed(() => isAnonymousOwnerEvent(props.toolRow.event))
const isOwner = computed(() => isSignedInOwner(props.toolRow.event, authUser.value))
const showScheduleEventButton = computed(
  () =>
    !props.toolRow.event.daysOnly &&
    props.toolRow.numResponses > 0 &&
    props.toolRow.state !== props.toolRow.states.EDIT_AVAILABILITY &&
    (guestEvent.value || isOwner.value)
)

function stripGeneratedTitle(
  itemProps: Record<string, unknown>
): Record<string, unknown> {
  const { title: _title, ...rest } = itemProps
  return rest
}
</script>

<style scoped>
.tool-row-inline-select :deep(.v-field__input) {
  padding-inline: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.tool-row-inline-select--compact :deep(.v-field__append-inner) {
  padding-inline-start: 4px !important;
}

.tool-row-inline-select__item,
.tool-row-inline-select__selection-text {
  color: rgba(0, 0, 0, 0.87);
}

.tool-row-inline-select__item {
  align-items: center;
  cursor: pointer;
  display: flex;
  min-height: 48px;
  padding: 0 16px;
}

.tool-row-inline-select__item--active {
  background-color: var(--timeful-selection-bg);
  color: var(--timeful-selection-fg);
}
</style>
