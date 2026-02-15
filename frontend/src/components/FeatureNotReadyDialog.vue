<template>
  <v-dialog v-model="dialog" max-width="400px" content-class="tw-m-0">
    <v-card>
      <v-card-title>
        <span class="tw-text-xl tw-font-medium">Oops! Feature Not Ready</span>
        <v-spacer />
        <v-btn
          absolute
          @click="dialog = false"
          icon
          class="tw-right-0 tw-mr-2 tw-self-center"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="tw-text-text-secondary">
        You've caught us a bit early! We're considering adding folders to
        Timeful, and will do so once we get enough demand from users.
        <v-textarea
          v-model="folderUsageFeedback"
          label="What would you like to use folders for?"
          rows="3"
          class="tw-mt-4"
          outlined
          dense
        ></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="dialog = false">Close</v-btn>
        <v-btn color="primary" @click="submitFeedback">Submit</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from "vuex"

export default {
  name: "FeatureNotReadyDialog",
  props: {
    value: Boolean,
  },
  data() {
    return {
      folderUsageFeedback: "",
    }
  },
  computed: {
    dialog: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit("input", val)
      },
    },
  },
  methods: {
    ...mapActions(["showInfo"]),
    submitFeedback() {
      if (this.folderUsageFeedback.trim() !== "") {
        this.$posthog?.capture("folder_usage_feedback_submitted", {
          feedback: this.folderUsageFeedback,
        })
        // Optionally, you can clear the textarea and close the dialog
        this.folderUsageFeedback = ""
        this.dialog = false
        this.showInfo("Thanks for your input!")
      } else {
        // Optionally, handle empty feedback (e.g., show a message)
        console.log("Feedback is empty")
      }
    },
  },
}
</script>

<style scoped></style>
