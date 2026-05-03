<!-- Displays an event type (i.e. created or joined) on the home page -->
<template>
  <div class="tw-mb-5">
    <div
      class="tw-flex tw-flex-row tw-items-center tw-justify-between tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
    >
      <div class="tw-flex tw-flex-col">
        {{ eventType.header }}
        <div
          v-if="
            eventType.header === 'Events I created' &&
            enablePaywall &&
            !isPremiumUser
          "
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
        v-if="eventType.header === 'Events I created'"
        text
        class="tw-hidden tw-text-very-dark-gray sm:tw-block"
        @click="createFolder"
      >
        <v-icon class="tw-mr-2 tw-text-lg">mdi-folder-plus</v-icon>
        New folder
      </v-btn>
      <div
        v-if="eventType.events.length > defaultNumEventsToShow"
        class="tw-mt-2 tw-cursor-pointer tw-text-sm tw-font-normal tw-text-very-dark-gray sm:tw-hidden"
        @click="toggleShowAll"
      >
        Show {{ showAll ? "less" : "more"
        }}<v-icon :class="showAll && 'tw-rotate-180'">mdi-chevron-down</v-icon>
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
      class="tw-gr id-cols-1 tw-my-3 tw-grid tw-gap-3 sm:tw-grid-cols-2 lg:tw-grid-cols-3"
    >
      <EventItem
        v-for="(event, i) in sortedEvents.slice(0, defaultNumEventsToShow)"
        :key="i"
        class="tw-cursor-pointer"
        :event="event"
      />
    </div>
    <!-- Show more events sections -->
    <!-- TODO: might want to change for less code repeat -->
    <div v-if="eventType.events.length > defaultNumEventsToShow">
      <v-expand-transition>
        <div
          v-if="showAll"
          class="tw-gr id-cols-1 tw-my-3 tw-grid tw-gap-3 sm:tw-grid-cols-2 lg:tw-grid-cols-3"
        >
          <EventItem
            v-for="(event, i) in sortedEvents.slice(
              defaultNumEventsToShow,
              eventType.events.length
            )"
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
        Show {{ showAll ? "less" : "more"
        }}<v-icon :class="showAll && 'tw-rotate-180'">mdi-chevron-down</v-icon>
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
import { isPremiumUser as isPremiumUserUtil } from "@/utils/general_utils"
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

const mainStore = useMainStore()
const { authUser, enablePaywall } = storeToRefs(mainStore)
const isPremiumUser = computed(() => isPremiumUserUtil(authUser.value))

const toggleShowAll = () => {
  showAll.value = !showAll.value
}
const openUpgradeDialog = () => {
  mainStore.showUpgradeDialog({ type: upgradeDialogTypes.UPGRADE_MANUALLY })
}
const createFolder = () => {
  showFeatureNotReadyDialog.value = true
  posthog.capture("create_folder_clicked")
}
</script>
