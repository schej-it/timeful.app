<template>
  <v-app>
    <DiscordBanner />
    <AutoSnackbar color="error" :text="error" />
    <AutoSnackbar color="tw-bg-blue" :text="info" />
    <SignInNotSupportedDialog v-model="webviewDialog" />
    <SignInDialog
      v-model="signInDialog"
      @sign-in="_signIn"
      @email-sign-in="_emailSignIn"
    />
    <NewDialog
      v-model="newDialogOptions.show"
      :type="newDialogOptions.openNewGroup ? 'group' : 'event'"
      :contacts-payload="newDialogOptions.contactsPayload"
      :no-tabs="newDialogOptions.eventOnly"
      :folder-id="newDialogOptions.folderId"
    />
    <UpgradeDialog
      :model-value="upgradeDialogVisible"
      @update:model-value="handleUpgradeDialogInput"
    />
    <UpvoteRedditSnackbar />
    <div
      v-if="showHeader"
      class="tw-fixed tw-z-40 tw-h-14 tw-w-screen tw-bg-white sm:tw-h-16"
      dark
    >
      <div
        class="tw-relative tw-m-auto tw-flex tw-h-full tw-max-w-6xl tw-items-center tw-justify-center tw-px-4"
      >
        <router-link :to="{ name: 'home' }">
          <Logo type="timeful" />
        </router-link>
        <v-expand-x-transition>
          <span
            v-if="isPremiumUser"
            class="tw-ml-2 tw-cursor-default tw-rounded-md tw-bg-[linear-gradient(-25deg,#0a483d,#00994c,#126045,#0a483d)] tw-px-2 tw-py-1 tw-text-sm tw-font-semibold tw-text-white tw-opacity-80"
          >
            Premium
          </span>
        </v-expand-x-transition>

        <v-spacer />

        <v-btn
          v-if="$route.name === 'event'"
          id="top-right-create-btn"
          text
          @click="() => _createNew(true)"
        >
          Create an event
        </v-btn>
        <v-btn
          v-if="showFeedbackBtn"
          id="feedback-btn"
          text
          href="https://forms.gle/A96i4TTWeKgH3P1W6"
          target="_blank"
          @click="trackFeedbackClick"
        >
          Give feedback
        </v-btn>
        <!-- <v-btn
          v-if="!isPhone"
          text
          href="https://www.paypal.com/donate/?hosted_button_id=KWCH6LGJCP6E6"
          target="_blank"
        >
          Donate
        </v-btn> -->
        <v-btn
          v-if="$route.name === 'home' && !isPhone"
          color="primary"
          class="tw-mx-2 tw-rounded-md"
          :style="{
            boxShadow: '0px 2px 8px 0px #00994C80 !important',
          }"
          @click="() => _createNew()"
        >
          + Create new
        </v-btn>
        <div v-if="authUser" class="sm:tw-ml-4">
          <AuthUserMenu />
        </div>
        <v-btn v-else id="top-right-sign-in-btn" text @click="signIn">
          Sign in
        </v-btn>
      </div>
    </div>

    <v-main>
      <div class="tw-flex tw-h-screen tw-flex-col">
        <div
          class="tw-relative tw-flex-1 tw-overscroll-auto"
          :class="routerViewClass"
        >
          <router-view v-if="loaded" :key="$route.fullPath" />
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useHead } from "@unhead/vue"
import { storeToRefs } from "pinia"
import { get, getLocation, post, signInGoogle, signInOutlook } from "@/utils"
import { authTypes, calendarTypes } from "@/constants"
import isWebview from "is-ua-webview"
import { posthog } from "@/plugins/posthog"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import type { User } from "@/types"

useHead({ htmlAttrs: { lang: "en-US" } })

const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()
const {
  authUser, error, info, upgradeDialogVisible, newDialogOptions, isPremiumUser,
} = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const loaded = ref(false)
const webviewDialog = ref(false)
const signInDialog = ref(false)

const showHeader = computed(() =>
  route.name !== "landing" &&
  route.name !== "auth" &&
  route.name !== "sign-in" &&
  route.name !== "sign-up" &&
  route.name !== "privacy-policy"
)

const showFeedbackBtn = computed(() => !isPhone.value || route.name === "home")

const routerViewClass = computed(() => {
  if (!showHeader.value) return ""
  return isPhone.value ? "tw-pt-12 " : "tw-pt-14 "
})

function handleScroll() {
  // scrollY tracked externally if needed; kept for scroll listener lifecycle
}

function _createNew(eventOnly = false) {
  posthog.capture("create_new_button_clicked", { eventOnly })
  mainStore.createNew({ eventOnly })
}

function signIn() {
  if (route.name === "event" || route.name === "group" || route.name === "signUp") {
    if (isWebview(navigator.userAgent)) {
      webviewDialog.value = true
      return
    }
  }
  void router.push({ name: "sign-in" })
}

function _signIn(calendarType: string) {
  if (route.name === "event" || route.name === "group" || route.name === "signUp") {
    let state: Record<string, unknown> | undefined
    if (route.name === "event") {
      state = { eventId: route.params.eventId, type: authTypes.EVENT_SIGN_IN }
    } else if (route.name === "group") {
      state = { groupId: route.params.groupId, type: authTypes.GROUP_SIGN_IN }
    }
    if (calendarType === calendarTypes.GOOGLE) {
      signInGoogle({ state, selectAccount: true })
    } else if (calendarType === calendarTypes.OUTLOOK) {
      signInOutlook({ state, selectAccount: true })
    }
  }
}

function _emailSignIn(user: User) {
  mainStore.setAuthUser(user)
  posthog.identify(user._id, {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  })
  if (route.name === "landing") {
    void router.push({ name: "home" })
  }
}

function setFeatureFlags() {
  mainStore.setFeatureFlagsLoaded(true)
}

function trackFeedbackClick() {
  posthog.capture("give_feedback_button_clicked")
}

function handleUpgradeDialogInput(value: boolean) {
  if (!value) mainStore.hideUpgradeDialog()
}

// created() equivalent
void (async () => {
  await get("/user/profile")
    .then((user) => {
      const u = user as User
      mainStore.setAuthUser(u)
      posthog.identify(u._id, {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      })
    })
    .catch(() => {
      mainStore.setAuthUser(null)
    })
    .finally(() => {
      loaded.value = true
    })

  window.addEventListener("scroll", handleScroll)
  void mainStore.getEvents()
})()

onMounted(() => {
  // scrollY initialised in handleScroll
})

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll)
})

watch(
  () => route.fullPath,
  async () => {
    const originalHref = window.location.href
    if (route.name) posthog.capture("$pageview")

    if (route.query.p) {
      let location = null
      try {
        location = await getLocation()
      } catch {
        // user probably has adblocker
      }
      void post("/analytics/scanned-poster", { url: originalHref, location })
    }
  },
  { immediate: true }
)

watch(
  authUser,
  () => {
    setFeatureFlags()
  },
  { immediate: true }
)
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=DM+Sans&display=swap");

html {
  overflow-y: auto !important;
  /* overscroll-behavior: none; */
  scroll-behavior: smooth;
}

* {
  font-family: "DM Sans", sans-serif;
  /* touch-action: manipulation !important; */
}

.v-messages__message {
  font-size: theme("fontSize.xs");
  line-height: 1.25;
}
.v-input--selection-controls {
  margin-top: 0px !important;
  padding-top: 0px !important;
}

/** Buttons */
.v-btn {
  letter-spacing: unset !important;
  text-transform: unset !important;
}
.v-btn:not(.v-btn--round, .v-btn-toggle > .v-btn).v-size--default {
  height: 38px !important;
  border-radius: theme("borderRadius.md") !important;
}

.v-btn.v-btn--is-elevated {
  -webkit-box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.15) !important;
  -moz-box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.15) !important;
  box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid theme("colors.light-gray-stroke");
}

.v-btn.v-btn--is-elevated.tw-bg-white {
  -webkit-box-shadow: 0px 1px 4px 0px rgba(0, 0, 0, 0.25) !important;
  -moz-box-shadow: 0px 1px 4px 0px rgba(0, 0, 0, 0.25) !important;
  box-shadow: 0px 1px 4px 0px rgba(0, 0, 0, 0.25) !important;
  border: 1px solid theme("colors.off-white");
}

.v-btn.v-btn--is-elevated.primary,
.v-btn.v-btn--is-elevated.tw-bg-green,
.v-btn.v-btn--is-elevated.tw-bg-white.tw-text-green {
  -webkit-box-shadow: 0px 2px 8px 0px #00994c80 !important;
  -moz-box-shadow: 0px 2px 8px 0px #00994c80 !important;
  box-shadow: 0px 2px 8px 0px #00994c80 !important;
  border: 1px solid theme("colors.light-green") !important;
}

.v-btn.v-btn--is-elevated.tw-bg-very-dark-gray {
  -webkit-box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.25) !important;
  -moz-box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.25) !important;
  box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.25) !important;
  border: 1px solid theme("colors.dark-gray") !important;
}

.v-btn.v-btn--is-elevated.tw-bg-blue,
.v-btn.v-btn--is-elevated.tw-bg-white.tw-text-blue {
  -webkit-box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.25) !important;
  -moz-box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.25) !important;
  box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.25) !important;
  border: 1px solid theme("colors.light-blue") !important;
}

/** Drop shadows */
.v-text-field.v-text-field--solo:not(.v-text-field--solo-flat)
  > .v-input__control
  > .v-input__slot {
  filter: drop-shadow(0 0.5px 2px rgba(0, 0, 0, 0.1)) !important;
  box-shadow: inset 0 -1px 0 0 rgba(0, 0, 0, 0.1) !important;
  border-radius: theme("borderRadius.md") !important;
  border: 1px solid #4f4f4f1f !important;
}
.v-menu__content {
  box-shadow: 0px 5px 5px -1px rgba(0, 0, 0, 0.1),
    0px 8px 10px 0.5px rgba(0, 0, 0, 0.07), 0px 3px 14px 1px rgba(0, 0, 0, 0.06) !important;
}
.overlay-avail-shadow-green {
  box-shadow: 0px 3px 6px 0px #1c7d454d !important;
}
.overlay-avail-shadow-yellow {
  box-shadow: 0px 2px 8px 0px #e5a8004d !important;
}

/** Switch  */
.v-input--switch--inset .v-input--selection-controls__input {
  margin-right: 0 !important;
  transform: scale(80%) !important;
}
.v-input--switch__track.primary--text {
  border: 2px theme("colors.light-green") solid !important;
}
.v-input--switch__track {
  border: 2px theme("colors.gray") solid !important;
  background-color: theme("colors.gray") !important;
  box-shadow: 0px 0.74px 4.46px 0px rgba(0, 0, 0, 0.1) !important;
}
.v-input--is-label-active .v-input--switch__track {
  background-color: currentColor !important;
  box-shadow: 0px 1.5px 4.5px 0px rgba(0, 0, 0, 0.2) !important;
}
.v-input--switch--inset .v-input--switch__track,
.v-input--switch--inset .v-input--selection-controls__input {
  opacity: 1 !important;
}
.v-input--switch__thumb {
  background-color: white !important;
}
.v-text-field__details {
  padding: 0 !important;
}

/** Error color */
.error--text .v-input__slot {
  outline: red solid;
  border-radius: 3px;
}
</style>
