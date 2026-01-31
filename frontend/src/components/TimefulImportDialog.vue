<template>
  <v-dialog v-model="dialog" max-width="500px" content-class="tw-m-0">
    <v-card>
      <v-card-title>
        <span class="tw-text-xl tw-font-medium">Import Timeful Event</span>
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
      <v-card-text class="tw-text-very-dark-gray">
        <p class="tw-mb-4">
          Paste a Timeful event URL from another instance to import it along
          with all existing responses.
        </p>
        <v-text-field
          v-model="url"
          label="Event URL"
          placeholder="https://timeful.app/e/abc123"
          outlined
          dense
          :disabled="loading"
          :error-messages="error"
          @keydown.enter="importEvent"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false" :disabled="loading">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!url.trim() || loading"
          @click="importEvent"
        >
          Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { post } from "@/utils"

export default {
  name: "TimefulImportDialog",
  props: {
    value: Boolean,
  },
  data: () => ({
    url: "",
    loading: false,
    error: "",
  }),
  computed: {
    dialog: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit("input", val)
        if (!val) {
          this.url = ""
          this.error = ""
        }
      },
    },
  },
  methods: {
    async importEvent() {
      if (!this.url.trim() || this.loading) return

      this.error = ""
      this.loading = true

      try {
        const result = await post("/events/import", { url: this.url.trim() })
        this.dialog = false
        this.$store.dispatch("showInfo", "Event imported successfully!")
        this.$router.push(`/e/${result.shortId}`)
      } catch (e) {
        const msg = e?.parsed?.error || "Failed to import event"
        const errorMessages = {
          "invalid-url": "Invalid URL. Please enter a valid Timeful event URL.",
          "remote-fetch-failed": "Could not reach the remote server.",
          "remote-event-not-found": "Event not found on the remote server.",
        }
        this.error = errorMessages[msg] || msg
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
