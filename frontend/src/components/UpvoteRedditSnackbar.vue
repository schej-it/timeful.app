<template>
  <v-snackbar
    v-if="!isPhone"
    min-width="unset"
    v-model="show"
    bottom
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
    <template v-slot:action="{ attrs }">
      <v-btn v-bind="attrs" icon @click="dismiss" class="-tw-ml-2 tw-mr-2">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script>
import { isPhone } from "@/utils"

export default {
  name: "UpvoteRedditSnackbar",

  data() {
    return {
      redditUrl:
        "https://www.reddit.com/r/opensource/comments/1klu471/i_made_a_doodle_alternative/",
      show: false,
    }
  },

  computed: {
    isPhone() {
      return isPhone(this.$vuetify)
    },
    localStorageKey() {
      return `upvoteRedditSnackbarDismissed_${this.redditUrl}`
    },
  },

  methods: {
    dismiss() {
      this.show = false
      localStorage.setItem(this.localStorageKey, "true")
      this.$posthog.capture("reddit_upvote_snackbar_dismissed")
    },
    trackRedditClick() {
      this.$posthog.capture("reddit_upvote_snackbar_clicked", {
        redditUrl: this.redditUrl,
      })
    },
  },

  watch: {
    $route: {
      immediate: true,
      handler() {
        const showOnRoute = this.$route.name === "home" // || this.$route.name === "event"
        const userHasDismissed =
          localStorage.getItem(this.localStorageKey) === "true"

        this.show = !userHasDismissed && showOnRoute
      },
    },
  },
}
</script>
