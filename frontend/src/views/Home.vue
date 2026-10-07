<template>
  <span>
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
        class="tw-rounded-md tw-px-6 tw-py-4 sm:tw-mx-4 sm:tw-bg-[#f3f3f366]"
        v-if="!loading || eventsNotEmpty"
      >
        <div
          class="tw-mb-3 tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Tools
        </div>
        <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
          <div
            @click="convertW2M"
            class="tw-cursor-pointer tw-text-sm tw-font-normal tw-text-dark-gray tw-underline"
          >
            Convert When2meet to Timeful
          </div>
          <div
            @click="importTimeful"
            class="tw-cursor-pointer tw-text-sm tw-font-normal tw-text-dark-gray tw-underline"
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

<script>
import EventType from "@/components/EventType.vue"
import BottomFab from "@/components/BottomFab.vue"
import CreateSpeedDial from "@/components/CreateSpeedDial.vue"
import When2meetImportDialog from "@/components/When2meetImportDialog.vue"
import TimefulImportDialog from "@/components/TimefulImportDialog.vue"
import Dashboard from "@/components/home/Dashboard.vue"
import { mapState, mapActions, mapMutations } from "vuex"
import { eventTypes } from "@/constants"
import { isPhone, get } from "@/utils"

export default {
  name: "Home",

  metaInfo: {
    title: "Home - Timeful",
  },

  components: {
    EventType,
    BottomFab,
    CreateSpeedDial,
    When2meetImportDialog,
    TimefulImportDialog,
    Dashboard,
  },

  props: {
    contactsPayload: {
      type: Object,
      default: () => ({}),
    },
    openNewGroup: { type: Boolean, default: false },
  },

  data: () => ({
    loading: true,
    showW2MDialog: false,
    showImportDialog: false,
  }),

  mounted() {
    // If coming from enabling contacts, show the dialog. Checks if contactsPayload is not an Observer.
    this.setNewDialogOptions({
      show: Object.keys(this.contactsPayload).length > 0 || this.openNewGroup,
      contactsPayload: this.contactsPayload,
      openNewGroup: this.openNewGroup,
      eventOnly: false,
    })
  },

  computed: {
    ...mapState(["events", "authUser", "groupsEnabled"]),
    eventsNotEmpty() {
      return this.events.length > 0
    },
    isPhone() {
      return isPhone(this.$vuetify)
    },
  },

  methods: {
    ...mapMutations(["setAuthUser", "setNewDialogOptions"]),
    ...mapActions(["getEvents", "createNew"]),
    userRespondedToEvent(event) {
      return event.hasResponded ?? false
    },
    _createNew() {
      this.createNew({ eventOnly: false })
    },
    createFolder() {},
    convertW2M() {
      this.showW2MDialog = true
      this.$posthog?.capture("convert_when2meet_to_timeful_clicked")
    },
    importTimeful() {
      this.showImportDialog = true
      this.$posthog?.capture("import_timeful_event_clicked")
    },
  },

  created() {
    this.getEvents().then(() => {
      this.loading = false
    })
    get("/user/profile")
      .then((authUser) => {
        this.setAuthUser(authUser)
      })
      .catch(() => {
        this.setAuthUser(null)
      })
  },
}
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
