<template>
  <span>
    <FormerlyKnownAs
      class="tw-mx-auto tw-mb-10 tw-mt-3 tw-max-w-6xl tw-pl-4 sm:tw-pl-12"
    />
    <div
      class="tw-mx-auto tw-mb-24 tw-mt-4 tw-max-w-6xl tw-space-y-4 sm:tw-mb-12 sm:tw-mt-7"
    >
      <!-- Preload images -->
      <div class="tw-hidden">
        <img src="@/assets/doodles/boba/0.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/1.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/2.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/3.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/4.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/5.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/6.jpg" alt="preload" />
        <img src="@/assets/doodles/boba/7.jpg" alt="preload" />
      </div>
      <div
        v-if="loading && !eventsNotEmpty"
        class="tw-flex tw-h-[calc(100vh-10rem)] tw-w-full tw-items-center tw-justify-center"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          :size="20"
          :width="2"
        ></v-progress-circular>
      </div>

      <v-fade-transition>
        <Dashboard v-if="!loading || eventsNotEmpty" />
      </v-fade-transition>

      <div
        v-if="!loading || eventsNotEmpty"
        class="tw-rounded-md tw-px-6 tw-py-4 sm:tw-mx-4 sm:tw-bg-[#f3f3f366]"
      >
        <div
          class="tw-mb-3 tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Tools
        </div>
        <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
          <div
            class="tw-cursor-pointer tw-text-sm tw-font-normal tw-text-dark-gray tw-underline"
            @click="convertW2M"
          >
            Convert When2meet to Timeful
          </div>
          <div
            class="tw-cursor-pointer tw-text-sm tw-font-normal tw-text-dark-gray tw-underline"
            @click="importTimeful"
          >
            Import Timeful Event
          </div>
        </div>
      </div>

      <div v-if="!loading || eventsNotEmpty" class="tw-flex tw-justify-center">
        <div
          class="animate-boba tw-size-48 tw-bg-contain tw-bg-no-repeat sm:tw-size-48"
        ></div>
      </div>

      <div class="tw-flex tw-flex-col tw-items-center tw-justify-between">
        <router-link
          class="tw-text-xs tw-font-medium tw-text-gray"
          :to="{ name: 'privacy-policy' }"
        >
          Privacy Policy
        </router-link>
      </div>

      <!-- FAB -->
      <BottomFab
        v-if="isPhone"
        id="create-event-btn"
        @click="() => _createNew()"
      >
        <v-icon>mdi-plus</v-icon>
      </BottomFab>

      <!-- When2meet Import Dialog -->
      <When2meetImportDialog v-model="showW2MDialog" />

      <!-- Timeful Import Dialog -->
      <TimefulImportDialog v-model="showImportDialog" />
    </div>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useHead } from "@unhead/vue"
import BottomFab from "@/components/BottomFab.vue"
import When2meetImportDialog from "@/components/When2meetImportDialog.vue"
import TimefulImportDialog from "@/components/TimefulImportDialog.vue"
import Dashboard from "@/components/home/Dashboard.vue"
import { get } from "@/utils"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { posthog } from "@/plugins/posthog"
import FormerlyKnownAs from "@/components/FormerlyKnownAs.vue"
import type { SerializedEventDraft } from "@/composables/event/types"
import type { User } from "@/types"

defineOptions({ name: 'AppHome' })

useHead({ title: "Home - Timeful" })

const props = withDefaults(
  defineProps<{
    contactsPayload?: SerializedEventDraft
    openNewGroup?: boolean
  }>(),
  { contactsPayload: () => ({}), openNewGroup: false }
)

const mainStore = useMainStore()
const { events } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const loading = ref(true)
const showW2MDialog = ref(false)
const showImportDialog = ref(false)

const eventsNotEmpty = computed(() => events.value.length > 0)

onMounted(() => {
  mainStore.setNewDialogOptions({
    show:
      Object.keys(props.contactsPayload).length > 0 ||
      props.openNewGroup,
    contactsPayload: props.contactsPayload,
    openNewGroup: props.openNewGroup,
    eventOnly: false,
  })
})

function _createNew() {
  mainStore.createNew({ eventOnly: false })
}

function convertW2M() {
  showW2MDialog.value = true
  posthog.capture("convert_when2meet_to_timeful_clicked")
}

function importTimeful() {
  showImportDialog.value = true
  posthog.capture("import_timeful_event_clicked")
}

// created
const eventsPromise = mainStore.getEvents()
if (eventsPromise) {
  void eventsPromise.then(() => {
    loading.value = false
  })
} else {
  loading.value = false
}
get<User>("/user/profile")
  .then((user) => {
    mainStore.setAuthUser(user)
  })
  .catch(() => {
    mainStore.setAuthUser(null)
  })
</script>

<style>
@keyframes boba {
  0% {
    background-image: url("@/assets/doodles/boba/0.jpg");
  }
  12.5% {
    background-image: url("@/assets/doodles/boba/1.jpg");
  }
  25% {
    background-image: url("@/assets/doodles/boba/2.jpg");
  }
  37.5% {
    background-image: url("@/assets/doodles/boba/3.jpg");
  }
  50% {
    background-image: url("@/assets/doodles/boba/4.jpg");
  }
  62.5% {
    background-image: url("@/assets/doodles/boba/5.jpg");
  }
  75% {
    background-image: url("@/assets/doodles/boba/6.jpg");
  }
  87.5% {
    background-image: url("@/assets/doodles/boba/7.jpg");
  }
  100% {
    background-image: url("@/assets/doodles/boba/0.jpg");
  }
}

.animate-boba {
  animation: boba 1.04s steps(1) infinite;
  animation-play-state: paused;
  transition: animation-play-state 0s 1.04s;
}

.animate-boba:hover {
  animation-play-state: running;
  transition: animation-play-state 0s;
}
</style>
