<template>
  <div
    v-if="show && !isPhone"
    class="tw-relative tw-bg-[#1A1A1E] tw-px-8 tw-py-3 tw-text-center tw-text-sm tw-text-white"
  >
    <div
      class="tw-m-auto tw-flex tw-max-w-6xl tw-flex-col tw-items-center tw-justify-center sm:tw-flex-row"
    >
      <span>
        Join our Discord community for updates, feedback, and support!
      </span>
      <v-btn
        :href="discordUrl"
        target="_blank"
        outlined
        color="white"
        class="tw-mt-3 tw-flex-shrink-0 sm:tw-ml-4 sm:tw-mt-0"
        small
        @click="trackDiscordClick"
      >
        Join Discord
      </v-btn>
    </div>
    <v-btn
      icon
      small
      class="tw-absolute tw-right-2 tw-top-1/2 -tw-translate-y-1/2"
      @click="dismiss"
    >
      <v-icon color="white">mdi-close</v-icon>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { posthog } from "@/plugins/posthog"

const { isPhone } = useDisplayHelpers()
const route = useRoute()

const discordUrl = "https://discord.gg/v6raNqYxx3"
const show = ref(false)

const localStorageKey = computed(() => `discordBannerDismissed_v1`)

const dismiss = () => {
  show.value = false
  localStorage.setItem(localStorageKey.value, "true")
  posthog.capture("discord_banner_dismissed")
}

const trackDiscordClick = () => {
  posthog.capture("discord_banner_clicked", { discordUrl })
}

watch(
  () => route.name,
  () => {
    const showOnRoute = route.name === "landing"
    const userHasDismissed =
      localStorage.getItem(localStorageKey.value) === "true"
    show.value = !userHasDismissed && showOnRoute
  },
  { immediate: true }
)
</script>
