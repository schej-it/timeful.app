<template>
  <v-snackbar
    v-if="!isPhone"
    v-model="show"
    min-width="unset"
    location="bottom"
    :timeout="-1"
    class="tw-bottom-0 tw-z-50"
    rounded="lg"
    color="#333"
    content-class="tw-flex tw-items-center tw-gap-x-2"
  >
    Enjoying Timeful? Help us reach more people by upvoting our Reddit post and
    leaving a comment with your thoughts :)
    <v-btn
      :href="redditUrl"
      target="_blank"
      small
      color="#FF4501"
      @click="trackRedditClick"
    >
      Upvote
      <v-icon small class="-tw-mr-px -tw-mt-px">mdi-arrow-up-bold</v-icon>
    </v-btn>
    <template #actions>
      <v-btn icon class="-tw-ml-2 tw-mr-2" @click="dismiss">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { posthog } from "@/plugins/posthog"

const { isPhone } = useDisplayHelpers()
const route = useRoute()

const redditUrl =
  "https://www.reddit.com/r/opensource/comments/1klu471/i_made_a_doodle_alternative/"
const show = ref(false)

const localStorageKey = computed(
  () => `upvoteRedditSnackbarDismissed_${redditUrl}`
)

const dismiss = () => {
  show.value = false
  localStorage.setItem(localStorageKey.value, "true")
  posthog.capture("reddit_upvote_snackbar_dismissed")
}

const trackRedditClick = () => {
  posthog.capture("reddit_upvote_snackbar_clicked", { redditUrl })
}

watch(
  () => route.name,
  () => {
    const showOnRoute = route.name === "home"
    const userHasDismissed =
      localStorage.getItem(localStorageKey.value) === "true"
    show.value = !userHasDismissed && showOnRoute
  },
  { immediate: true }
)
</script>
