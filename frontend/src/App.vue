<template>
  <v-app>
    <DiscordBanner />
    <AutoSnackbar color="error" :text="error" />
    <AutoSnackbar color="tw-bg-blue" :text="info" />
    <SignInNotSupportedDialog v-model="webviewDialog" />
    <SignInDialog v-model="signInDialog" @signIn="_signIn" />
    <NewDialog
      v-model="newDialogOptions.show"
      :type="newDialogOptions.openNewGroup ? 'group' : 'event'"
      :contactsPayload="newDialogOptions.contactsPayload"
      :no-tabs="newDialogOptions.eventOnly"
      :folder-id="newDialogOptions.folderId"
    />
    <UpgradeDialog
      :value="upgradeDialogVisible"
      @input="handleUpgradeDialogInput"
    />
    <UpvoteRedditSnackbar />
    <CookieConsent />
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
          href="https://forms.gle/9AgRy4PQfWfVuBnw8"
          target="_blank"
          @click="trackFeedbackClick"
        >
          Give feedback
        </v-btn>
        <v-btn
          v-if="!isPhone"
          text
          href="https://www.paypal.com/donate/?hosted_button_id=KWCH6LGJCP6E6"
          target="_blank"
        >
          Donate
        </v-btn>
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

<script>
import { mapMutations, mapState, mapActions, mapGetters } from "vuex"
import {
  get,
  getLocation,
  isPhone,
  post,
  signInGoogle,
  signInOutlook,
  isPremiumUser,
} from "@/utils"
import {
  authTypes,
  calendarTypes,
  eventTypes,
  numFreeEvents,
  upgradeDialogTypes,
} from "@/constants"
import AutoSnackbar from "@/components/AutoSnackbar"
import AuthUserMenu from "@/components/AuthUserMenu.vue"
import SignInNotSupportedDialog from "@/components/SignInNotSupportedDialog.vue"
import UpvoteRedditSnackbar from "@/components/UpvoteRedditSnackbar.vue"
import Logo from "@/components/Logo.vue"
import isWebview from "is-ua-webview"
import NewDialog from "./components/NewDialog.vue"
import UpgradeDialog from "@/components/pricing/UpgradeDialog.vue"
import SignInDialog from "@/components/SignInDialog.vue"
import DiscordBanner from "@/components/DiscordBanner.vue"
import CookieConsent from "@/components/CookieConsent.vue"

export default {
  name: "App",

  metaInfo: {
    htmlAttrs: {
      lang: "en-US",
    },
  },

  components: {
    AutoSnackbar,
    AuthUserMenu,
    SignInNotSupportedDialog,
    NewDialog,
    UpvoteRedditSnackbar,
    Logo,
    UpgradeDialog,
    SignInDialog,
    DiscordBanner,
    CookieConsent,
  },

  data: () => ({
    mounted: false,
    loaded: false,
    scrollY: 0,
    webviewDialog: false,
    signInDialog: false,
  }),

  computed: {
    ...mapGetters(["isPremiumUser"]),
    ...mapState([
      "authUser",
      "error",
      "info",
      "enablePaywall",
      "upgradeDialogVisible",
      "newDialogOptions",
    ]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
    showHeader() {
      return (
        this.$route.name !== "landing" &&
        this.$route.name !== "auth" &&
        this.$route.name !== "privacy-policy"
      )
    },
    showFeedbackBtn() {
      return !this.isPhone || this.$route.name === "home"
    },
    routerViewClass() {
      let c = ""
      if (this.showHeader) {
        if (this.isPhone) {
          c += "tw-pt-12 "
        } else {
          c += "tw-pt-14 "
        }
      }
      return c
    },
  },

  methods: {
    ...mapMutations([
      "setAuthUser",
      "setSignUpFormEnabled",
      "setPricingPageConversion",
      "setEnablePaywall",
      "setFeatureFlagsLoaded",
    ]),
    ...mapActions([
      "getEvents",
      "showUpgradeDialog",
      "hideUpgradeDialog",
      "createNew",
    ]),
    handleScroll(e) {
      this.scrollY = window.scrollY
    },
    _createNew(eventOnly = false) {
      this.$posthog.capture("create_new_button_clicked", {
        eventOnly: eventOnly,
      })
      this.createNew({ eventOnly })
    },
    signIn() {
      if (
        this.$route.name === "event" ||
        this.$route.name === "group" ||
        this.$route.name === "signUp"
      ) {
        if (isWebview(navigator.userAgent)) {
          this.webviewDialog = true
          return
        }
        this.signInDialog = true
      }
    },
    _signIn(calendarType) {
      if (
        this.$route.name === "event" ||
        this.$route.name === "group" ||
        this.$route.name === "signUp"
      ) {
        let state
        if (this.$route.name === "event") {
          state = {
            eventId: this.$route.params.eventId,
            type: authTypes.EVENT_SIGN_IN,
          }
        } else if (this.$route.name === "group") {
          state = {
            groupId: this.$route.params.groupId,
            type: authTypes.GROUP_SIGN_IN,
          }
        }
        if (calendarType === calendarTypes.GOOGLE) {
          signInGoogle({
            state,
            selectAccount: true,
          })
        } else if (calendarType === calendarTypes.OUTLOOK) {
          signInOutlook({
            state,
            selectAccount: true,
          })
        }
      }
    },
    setFeatureFlags() {
      if (!this.$posthog) return

      // this.setSignUpFormEnabled(this.$posthog.isFeatureEnabled("sign-up-form"))
      // this.setPricingPageConversion(
      // this.$posthog.getFeatureFlag("pricing-page-conversion")
      // )
      // )
      // this.setEnablePaywall(this.$posthog.isFeatureEnabled("enable-paywall"))
      this.setFeatureFlagsLoaded(true)
    },
    trackFeedbackClick() {
      this.$posthog.capture("give_feedback_button_clicked")
    },
    handleUpgradeDialogInput(value) {
      if (!value) {
        this.hideUpgradeDialog()
      }
    },
  },

  async created() {
    await get("/user/profile")
      .then((authUser) => {
        this.setAuthUser(authUser)

        this.$posthog?.identify(authUser._id, {
          email: authUser.email,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
        })
      })
      .catch(() => {
        this.setAuthUser(null)
      })
      .finally(() => {
        this.loaded = true
      })

    // Event listeners
    window.addEventListener("scroll", this.handleScroll)

    this.getEvents()
  },

  mounted() {
    this.mounted = true
    this.scrollY = window.scrollY
  },

  beforeDestroy() {
    window.removeEventListener("scroll", this.handleScroll)
  },

  watch: {
    $route: {
      immediate: true,
      async handler() {
        const originalHref = window.location.href
        if (this.$route.name) {
          this.$posthog?.capture("$pageview")
        }

        // Check for poster query parameter
        if (this.$route.query.p) {
          let location = null
          try {
            location = await getLocation()
          } catch (e) {
            // User probably has adblocker
          }

          post("/analytics/scanned-poster", {
            url: originalHref,
            location,
          })
        }
      },
    },
    authUser: {
      immediate: true,
      handler() {
        if (this.$posthog) {
          this.setFeatureFlags()
          // Check feature flags (only if posthog is enabled)
          // this.$posthog.setPersonPropertiesForFlags({
          //   email: this.authUser?.email,
          // })
          // this.$posthog.onFeatureFlags(() => {
          //   this.setFeatureFlags()
          // })
        }
      },
    },
  },
}
</script>
