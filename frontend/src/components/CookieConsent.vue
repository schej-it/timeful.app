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
        class="tw-text-gray-400 hover:tw-bg-gray-100 hover:tw-text-gray-700 tw-flex tw-h-6 tw-w-6 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-border-0 tw-bg-transparent tw-p-0 tw-text-xl tw-transition-all tw-duration-200"
        @click="showBanner = false"
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
        v-if="showCustomizeSection"
        class="tw-flex tw-flex-col tw-gap-2 tw-px-4 tw-py-2"
      >
        <v-checkbox v-model="preferences.necessary" disabled hide-details>
          <template #label>
            <span class="tw-text-gray-700 tw-flex-1 tw-text-sm tw-font-medium"
              >Essential</span
            >
          </template>
        </v-checkbox>

        <v-checkbox v-model="preferences.analytics" hide-details>
          <template #label>
            <span class="tw-text-gray-700 tw-flex-1 tw-text-sm tw-font-medium"
              >Analytics</span
            >
          </template>
        </v-checkbox>
      </div>
    </v-expand-transition>

    <div class="tw-px-4 tw-py-3">
      <div
        v-if="!showCustomizeSection"
        class="tw-flex tw-flex-col tw-gap-2 sm:tw-w-auto sm:tw-flex-row"
      >
        <button
          class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-border tw-border-solid tw-border-gray tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-very-dark-gray sm:tw-w-auto"
          @click="showCustomizeSection = !showCustomizeSection"
        >
          Customize
        </button>
        <button
          class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-bg-green tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-white sm:tw-w-auto"
          @click="acceptAll"
        >
          Accept all
        </button>
      </div>
      <button
        v-else
        class="tw-w-full tw-flex-1 tw-cursor-pointer tw-rounded-md tw-bg-blue tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-white"
        @click="acceptSelected"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

interface Preferences {
  necessary: boolean
  analytics: boolean
  advertising: boolean
}

const showCustomizeSection = ref(false)
const showBanner = ref(false)
const preferences = ref<Preferences>({
  necessary: true,
  analytics: true,
  advertising: true,
})

const checkConsentStatus = () => {
  const consent = localStorage.getItem("cookieConsent")
  if (!consent) {
    showBanner.value = true
  } else {
    try {
      const consentData = JSON.parse(consent) as { preferences: Preferences }
      preferences.value = { ...consentData.preferences }
    } catch (_e) {
      showBanner.value = true
    }
  }
}

const saveConsent = () => {
  const consentData = {
    timestamp: new Date().toISOString(),
    preferences: preferences.value,
  }
  localStorage.setItem("cookieConsent", JSON.stringify(consentData))
  showBanner.value = false
  window.location.reload()
}

const acceptAll = () => {
  preferences.value = {
    necessary: true,
    analytics: true,
    advertising: true,
  }
  saveConsent()
}

const acceptSelected = () => {
  saveConsent()
}

checkConsentStatus()
</script>
