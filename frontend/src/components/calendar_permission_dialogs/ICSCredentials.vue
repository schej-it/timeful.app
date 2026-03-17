<template>
  <div class="tw-flex tw-flex-col tw-gap-6">
    <div class="tw-flex tw-flex-col tw-gap-3">
      <div class="tw-text-md tw-flex tw-flex-row tw-items-center tw-justify-start tw-gap-2 tw-font-medium">
        Connect an ICS calendar feed
      </div>
      <div class="tw-flex tw-flex-col tw-gap-2">
        <div class="tw-text-sm tw-text-very-dark-gray">
          Paste the ICS feed URL from your calendar provider. This is usually found in your calendar's sharing or export settings.
        </div>
      </div>
    </div>
    <div class="tw-flex tw-flex-col tw-gap-3">
      <v-text-field solo placeholder="Feed URL" v-model="feedUrl" hide-details="auto" :error-messages="feedUrlError" />
      <v-text-field solo placeholder="Label" hide-details v-model="label" />
      <div class="tw-flex tw-items-center tw-gap-2">
        <v-btn text class="tw-grow" @click="$emit('back')">Back</v-btn>
        <v-btn :disabled="!enableSubmit" color="primary" class="tw-grow" :loading="loading"
          @click="submit">Submit</v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import { post } from "@/utils"
import { mapActions } from "vuex"
import { urlRegex } from "@/constants";

export default {
  name: "ICSCredentials",

  data() {
    return {
      feedUrl: "",
      label: "",
      loading: false,
    }
  },

  computed: {
    enableSubmit() {
      return this.label && urlRegex.test(this.feedUrl)
    },
    feedUrlError() {
      if (!this.feedUrl || this.feedUrl.length === 0) return ""
      if (!urlRegex.test(this.feedUrl)) return "Please enter a valid URL"
      return ""
    },
  },

  methods: {
    ...mapActions(["showError", "refreshAuthUser"]),
    submit() {
      this.loading = true
      post(`/user/add-ics-calendar-account`, {
        feedUrl: this.feedUrl,
        label: this.label,
      })
        .then(async () => {
          await this.refreshAuthUser()
          this.$emit("addedCalendar")

          this.$posthog.capture("ICS Calendar Added")
        })
        .catch((err) => {
          this.showError(
            "An error occurred while adding your ICS Calendar! Please check your feed URL or try again later."
          )
          console.error(err)
        })
        .finally(() => {
          this.loading = false
        })
    },
  },
}
</script>
