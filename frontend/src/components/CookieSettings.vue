<template>
  <div class="mx-auto tw-w-full md:tw-w-2/3 lg:tw-w-1/2 tw-px-5 tw-pt-10">
    <h2 class="tw-mb-2.5 tw-text-xl tw-font-semibold">Cookie Preferences</h2>
    <div class="tw-mb-5 tw-flex tw-flex-col tw-gap-6">
      <div class="tw-rounded-lg tw-border tw-bg-white tw-p-5">
        <v-checkbox v-model="preferences.necessary" disabled>
          <template v-slot:label>
            <div>
              <strong class="tw-text-gray-800 tw-text-base tw-font-semibold">
                Necessary Cookies
              </strong>
            </div>
          </template>
        </v-checkbox>
        <div
          class="tw-text-gray-600 tw-mt-4 tw-pl-0 tw-text-sm tw-leading-relaxed md:tw-mt-0 md:tw-pl-8"
        >
          <p>
            These cookies are essential for the website to function properly.
            They enable basic features like page navigation, user
            authentication, and form submissions.
          </p>
        </div>
      </div>

      <div class="tw-rounded-lg tw-border tw-bg-white tw-p-5">
        <v-checkbox v-model="preferences.analytics">
          <template v-slot:label>
            <div>
              <strong class="tw-text-gray-800 tw-text-base tw-font-semibold">
                Analytics Cookies
              </strong>
            </div>
          </template>
        </v-checkbox>
        <div
          class="tw-text-gray-600 tw-mt-4 tw-pl-0 tw-text-sm tw-leading-relaxed md:tw-mt-0 md:tw-pl-8"
        >
          <p>
            <strong>Services used:</strong> PostHog Analytics, Google Analytics
            (via Google Tag Manager)
          </p>
          <p>
            These cookies help us understand how visitors interact with our
            website by collecting and reporting information anonymously. This
            helps us improve our website's performance and user experience.
          </p>
        </div>
      </div>

      <div class="tw-rounded-lg tw-border tw-bg-white tw-p-5">
        <div>
          <v-checkbox v-model="preferences.advertising">
            <template v-slot:label>
              <div>
                <strong class="tw-text-gray-800 tw-text-base tw-font-semibold">
                  Advertising Cookies
                </strong>
              </div>
            </template>
          </v-checkbox>
        </div>
        <div
          class="tw-text-gray-600 tw-mt-4 tw-pl-0 tw-text-sm tw-leading-relaxed md:tw-mt-0 md:tw-pl-8"
        >
          <p><strong>Services used:</strong> Google AdSense</p>
          <p>
            These cookies are used to make advertising messages more relevant to
            you. They may be set by our advertising partners through our site to
            build a profile of your interests and show you relevant ads on other
            sites.
          </p>
        </div>
      </div>
    </div>

    <div class="tw-flex tw-flex-wrap tw-gap-2">
      <button
        @click="savePreferences"
        class="tw-rounded-md tw-bg-blue tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-bg-light-blue"
      >
        Save Preferences
      </button>
      <button
        @click="acceptAll"
        class="tw-rounded-md tw-bg-green tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-bg-dark-green"
      >
        Accept All
      </button>
      <button
        @click="rejectAll"
        class="tw-rounded-md tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-very-dark-gray"
      >
        Reject All (except necessary)
      </button>
    </div>
  </div>
</template>

<script>
import { getCookieConsent, setCookieConsent } from "@/utils/cookie_utils"

export default {
  name: "CookieSettings",
  data() {
    return {
      preferences: {
        necessary: true,
        analytics: true,
        advertising: true,
      },
    }
  },
  mounted() {
    this.loadCurrentSettings()
  },
  methods: {
    loadCurrentSettings() {
      const consent = getCookieConsent()
      if (consent) {
        this.preferences = { ...consent.preferences }
      }
    },

    savePreferences() {
      this.saveConsent()
    },

    acceptAll() {
      this.preferences = {
        necessary: true,
        analytics: true,
        advertising: true,
      }
      this.saveConsent()
    },

    rejectAll() {
      this.preferences = {
        necessary: true,
        analytics: false,
        advertising: false,
      }
      this.saveConsent()
    },
    saveConsent() {
      setCookieConsent(this.preferences)
      window.location.reload()
    },
  },
}
</script>
