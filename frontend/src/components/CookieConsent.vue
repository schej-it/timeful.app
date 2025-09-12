<template>
  <div v-if="showBanner" class="tw-fixed tw-bottom-5 tw-left-5 tw-w-80 tw-max-w-[calc(100vw-40px)] tw-bg-white tw-rounded-xl tw-shadow-2xl tw-z-50 max-[480px]:tw-bottom-2.5 max-[480px]:tw-left-2.5 max-[480px]:tw-w-[calc(100vw-20px)] max-[480px]:tw-max-w-none">
    <div class="tw-flex tw-justify-between tw-items-center tw-px-4 tw-pt-4 tw-font-medium">
      <h3>🍪 We use cookies</h3>
      <button @click="showBanner = false" class="tw-bg-transparent tw-border-0 tw-text-xl tw-text-gray-400 tw-cursor-pointer tw-p-0 tw-w-6 tw-h-6 tw-flex tw-items-center tw-justify-center tw-rounded tw-transition-all tw-duration-200 hover:tw-bg-gray-100 hover:tw-text-gray-700">&times;</button>
    </div>

    <p class="tw-px-4 tw-py-2 tw-m-0 tw-text-xs tw-text-gray-600 tw-leading-tight">
      We use cookies for analytics to improve our product. Choose your
      preferences below.
    </p>

    <div class="tw-px-4 tw-py-2 tw-flex tw-flex-col tw-gap-2">
      <v-checkbox v-model="preferences.necessary" disabled hide-details>
        <template v-slot:label>
          <span class="tw-flex-1 tw-text-gray-700 tw-font-medium tw-text-sm">Essential</span>
        </template>
      </v-checkbox>

      <v-checkbox v-model="preferences.analytics" hide-details>
        <template v-slot:label>
          <span class="tw-flex-1 tw-text-gray-700 tw-font-medium tw-text-sm">Analytics</span>
        </template>
      </v-checkbox>

      <v-checkbox v-model="preferences.advertising" hide-details>
        <template v-slot:label>
          <span class="tw-flex-1 tw-text-gray-700 tw-font-medium tw-text-sm">Advertising</span>
        </template>
      </v-checkbox>
    </div>

    <div class="tw-px-4 tw-py-3 tw-flex tw-gap-2 sm:tw-flex-row tw-flex-col sm:tw-w-auto">
      <button @click="acceptSelected" class="tw-flex-1 tw-px-3 tw-py-2 tw-rounded-md tw-text-xs tw-font-medium tw-cursor-pointer tw-bg-blue tw-text-white sm:tw-w-auto tw-w-full">Save</button>
      <button @click="acceptAll" class="tw-flex-1 tw-px-3 tw-py-2 tw-rounded-md tw-text-xs tw-font-medium tw-cursor-pointer tw-bg-green tw-text-white sm:tw-w-auto tw-w-full">Accept All</button>
      <button @click="rejectAll" class="tw-flex-1 tw-px-3 tw-py-2 tw-rounded-md tw-text-xs tw-font-medium tw-cursor-pointer tw-bg-gray tw-text-very-dark-gray sm:tw-w-auto tw-w-full">Reject All</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "CookieConsent",
  data() {
    return {
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