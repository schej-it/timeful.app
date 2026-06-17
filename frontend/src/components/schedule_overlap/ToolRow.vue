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
            :modified="toolRow.timezoneModified"
            :reference-date="toolRow.timezoneReferenceDate"
            @update:model-value="(val) => toolRow.actions.updateCurTimezone(val)"
            @reset="toolRow.actions.resetCurTimezone()"
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
            :show-all-hours="toolRow.showAllHours"
            :start-calendar-on-monday="toolRow.startCalendarOnMonday"
            :num-responses="toolRow.numResponses"
            @update:show-best-times="(val) => toolRow.actions.updateShowBestTimes(val)"
            @update:hide-if-needed="(val) => toolRow.actions.updateHideIfNeeded(val)"
            @update:show-all-hours="(val) => toolRow.actions.updateShowAllHours(val)"
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
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import TimezoneSelector from "./TimezoneSelector.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import EventOptions from "./EventOptions.vue"
import { timeTypes } from "@/constants"
import type { ScheduleOverlapToolRowViewModel } from "./scheduleOverlapViewModels"

defineProps<{
  toolRow: ScheduleOverlapToolRowViewModel
}>()

const { isPhone } = useDisplayHelpers()

const mobileNumDaysOptions = [
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
]
const timeTypeOptions = [
  { label: "12h", value: timeTypes.HOUR12 },
  { label: "24h", value: timeTypes.HOUR24 },
]

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

.tool-row-inline-select :deep(.v-field--variant-underlined .v-field__outline::before) {
  border-bottom-color: var(--timeful-grid-line-color);
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
