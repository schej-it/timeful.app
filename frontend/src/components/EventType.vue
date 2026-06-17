<!-- Displays an event type (i.e. created or joined) on the home page -->
<template>
  <div class="tw-mb-5">
    <div
      class="tw-flex tw-flex-row tw-items-center tw-justify-between tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
    >
      <div class="tw-flex tw-flex-col">
        {{ eventType.header }}
        <div
          v-if="showCreatedEventsUsage"
          class="tw-flex tw-items-baseline tw-gap-2 tw-text-sm tw-font-normal tw-text-very-dark-gray"
        >
          <div>
            {{ authUser?.numEventsCreated }} / {{ numFreeEvents }} free events
            created
          </div>
          <div
            class="tw-cursor-pointer tw-select-none tw-text-xs tw-font-medium tw-text-green tw-underline"
            @click="openUpgradeDialog"
          >
            Upgrade
          </div>
        </div>
      </div>
      <v-btn
        v-if="isCreatedEventsSection"
        variant="text"
        class="tw-hidden tw-text-very-dark-gray sm:tw-block"
        @click="openFolderFeedbackDialog"
      >
        <v-icon class="tw-mr-2 tw-text-lg">mdi-folder-plus</v-icon>
        New folder
      </v-btn>
      <div
        v-if="hasOverflowEvents"
        class="tw-mt-2 tw-cursor-pointer tw-text-sm tw-font-normal tw-text-very-dark-gray sm:tw-hidden"
        @click="toggleShowAll"
      >
        Show {{ showAllLabel }}<v-icon :class="showAll && 'tw-rotate-180'">mdi-chevron-down</v-icon>
      </div>
    </div>

    <div
      v-if="eventType.events.length === 0"
      class="tw-my-3 tw-text-very-dark-gray"
    >
      {{ emptyText.length > 0 ? emptyText : "No events yet!" }}
    </div>
    <div
      v-else
      class="tw-grid tw-grid-cols-1 tw-my-3 tw-gap-3 sm:tw-grid-cols-2 lg:tw-grid-cols-3"
    >
      <EventItem
        v-for="(event, i) in visibleEvents"
        :key="i"
        class="tw-cursor-pointer"
        :event="event"
      />
    </div>
    <!-- Show more events sections -->
    <div v-if="hasOverflowEvents">
      <v-expand-transition>
        <div
          v-if="showAll"
          class="tw-grid tw-grid-cols-1 tw-my-3 tw-gap-3 sm:tw-grid-cols-2 lg:tw-grid-cols-3"
        >
          <EventItem
            v-for="(event, i) in overflowEvents"
            :key="i"
            class="tw-cursor-pointer"
            :event="event"
          />
        </div>
      </v-expand-transition>
      <div
        class="tw-mt-4 tw-hidden tw-cursor-pointer tw-text-sm tw-text-very-dark-gray sm:tw-block"
        @click="toggleShowAll"
      >
        Show {{ showAllLabel }}<v-icon :class="showAll && 'tw-rotate-180'">mdi-chevron-down</v-icon>
      </div>
    </div>
    <FeatureNotReadyDialog v-model="showFeatureNotReadyDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useDisplay } from "vuetify"
import EventItem from "@/components/EventItem.vue"
import FeatureNotReadyDialog from "@/components/FeatureNotReadyDialog.vue"
import { storeToRefs } from "pinia"
import { posthog } from "@/plugins/posthog"
import { numFreeEvents, upgradeDialogTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import type { Event } from "@/types"

const props = withDefaults(
  defineProps<{
    eventType: { header: string; events: Event[] }
    emptyText?: string
  }>(),
  { emptyText: "" }
)

const display = useDisplay()
const showFeatureNotReadyDialog = ref(false)
const showAll = ref(false)

const defaultNumEventsToShow = computed(() => (display.lgAndUp.value ? 6 : 4))
const sortedEvents = computed(() => props.eventType.events)
const isCreatedEventsSection = computed(
  () => props.eventType.header === "Events I created"
)
const showCreatedEventsUsage = computed(
  () =>
    isCreatedEventsSection.value &&
    enablePaywall.value &&
    !viewerHasPremiumAccess.value
)
const hasOverflowEvents = computed(
  () => props.eventType.events.length > defaultNumEventsToShow.value
)
const visibleEvents = computed(() =>
  sortedEvents.value.slice(0, defaultNumEventsToShow.value)
)
const overflowEvents = computed(() =>
  sortedEvents.value.slice(defaultNumEventsToShow.value)
)
const showAllLabel = computed(() => (showAll.value ? "less" : "more"))

const mainStore = useMainStore()
const { authUser, enablePaywall, viewerHasPremiumAccess } = storeToRefs(mainStore)

const toggleShowAll = () => {
  showAll.value = !showAll.value
}
const openUpgradeDialog = () => {
  mainStore.showUpgradeDialog({ type: upgradeDialogTypes.UPGRADE_MANUALLY })
}
const openFolderFeedbackDialog = () => {
  showFeatureNotReadyDialog.value = true
  posthog.capture("create_folder_clicked")
}
</script>
