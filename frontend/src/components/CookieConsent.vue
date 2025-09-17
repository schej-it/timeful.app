<template>
  <div
    v-if="showBanner"
    class="tw-fixed tw-bottom-5 tw-right-5 tw-z-50 tw-w-80 tw-max-w-[calc(100vw-40px)] tw-rounded-xl tw-bg-white tw-shadow-2xl max-[480px]:tw-bottom-2.5 max-[480px]:tw-left-2.5 max-[480px]:tw-w-[calc(100vw-20px)] max-[480px]:tw-max-w-none"
  >
    <div
      class="tw-flex tw-items-center tw-justify-between tw-px-4 tw-pt-4 tw-font-medium"
    >
      <h3>We value your privacy</h3>
      <button
        @click="showBanner = false"
        class="tw-text-gray-400 hover:tw-bg-gray-100 hover:tw-text-gray-700 tw-flex tw-h-6 tw-w-6 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-border-0 tw-bg-transparent tw-p-0 tw-text-xl tw-transition-all tw-duration-200"
      >
        &times;
      </button>
    </div>

    <p
      class="tw-text-gray-600 tw-m-0 tw-px-4 tw-py-2 tw-text-xs tw-leading-tight"
    >
      We use cookies for analytics to improve our product. Choose your
      preferences below.
    </p>

    <v-expand-transition>
      <div
        class="tw-flex tw-flex-col tw-gap-2 tw-px-4 tw-py-2"
        v-if="showCustomizeSection"
      >
        <v-checkbox v-model="preferences.necessary" disabled hide-details>
          <template v-slot:label>
            <span class="tw-text-gray-700 tw-flex-1 tw-text-sm tw-font-medium"
              >Essential</span
            >
          </template>
        </v-checkbox>

        <v-checkbox v-model="preferences.analytics" hide-details>
          <template v-slot:label>
            <span class="tw-text-gray-700 tw-flex-1 tw-text-sm tw-font-medium"
              >Analytics</span
            >
          </template>
        </v-checkbox>

        <!-- <v-checkbox v-model="preferences.advertising" hide-details>
        <template v-slot:label>
          <span class="tw-flex-1 tw-text-gray-700 tw-font-medium tw-text-sm">Advertising</span>
        </template>
      </v-checkbox> -->
      </div>
    </v-expand-transition>

    <div class="tw-px-4 tw-py-3">
      <div
        v-if="!showCustomizeSection"
        class="tw-flex tw-flex-col tw-gap-2 sm:tw-w-auto sm:tw-flex-row"
      >
        <button
          @click="showCustomizeSection = !showCustomizeSection"
          class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-border tw-border-solid tw-border-gray tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-very-dark-gray sm:tw-w-auto"
        >
          Customize
        </button>
        <button
          @click="rejectAll"
          class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-border tw-border-solid tw-border-gray tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-very-dark-gray sm:tw-w-auto"
        >
          Reject all
        </button>
        <button
          @click="acceptAll"
          class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-bg-green tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-white sm:tw-w-auto"
        >
          Accept all
        </button>
      </div>
      <button
        v-else
        @click="acceptSelected"
        class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-bg-blue tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-white"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "CookieConsent",
  data() {
    return {
      showCustomizeSection: false,
      showBanner: false,
      preferences: {
        necessary: true,
        analytics: true,
        advertising: true,
      },
    }
  },
  created() {
    this.checkConsentStatus()
  },
  methods: {
    checkConsentStatus() {
      const consent = localStorage.getItem("cookieConsent")
      if (!consent) {
        this.showBanner = true
      } else {
        try {
          const consentData = JSON.parse(consent)
          this.preferences = { ...consentData.preferences }
        } catch (e) {
          // malformed consent, show banner to reset
          this.showBanner = true
        }
      }
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

    acceptSelected() {
      this.saveConsent()
    },

    saveConsent() {
      const consentData = {
        timestamp: new Date().toISOString(),
        preferences: this.preferences,
      }

      localStorage.setItem("cookieConsent", JSON.stringify(consentData))
      this.showBanner = false

      window.location.reload()
    },
    goToSettings() {
      this.$router.push({
        name: "cookie-settings",
        query: {
          analytics: this.preferences.analytics ? "1" : "0",
          advertising: this.preferences.advertising ? "1" : "0",
        },
      })
    },
  },
}
</script>
