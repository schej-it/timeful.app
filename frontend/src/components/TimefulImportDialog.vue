<template>
  <v-dialog v-model="dialog" max-width="500px" content-class="tw-m-0">
    <v-card>
      <v-card-title>
        <span class="tw-text-xl tw-font-medium">Import Timeful Event</span>
        <v-spacer />
        <v-btn
          absolute
          icon
          class="tw-right-0 tw-mr-2 tw-self-center"
          @click="dialog = false"
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
        <v-btn text :disabled="loading" @click="dialog = false">Cancel</v-btn>
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

<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { post } from "@/utils"
import { useMainStore } from "@/stores/main"

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const router = useRouter()
const mainStore = useMainStore()

const url = ref("")
const loading = ref(false)
const error = ref("")

const dialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => {
    emit("update:modelValue", val)
    if (!val) {
      url.value = ""
      error.value = ""
    }
  },
})

const isBlockedUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr)
    const hostname = parsed.hostname
    if (hostname === window.location.hostname) return true
    if (
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|0\.0\.0\.0|localhost$|\[?::1\]?)/.test(
        hostname
      )
    )
      return true
    return false
  } catch {
    return false
  }
}

const importEvent = async () => {
  if (!url.value.trim() || loading.value) return

  if (isBlockedUrl(url.value.trim())) {
    error.value = "Not allowed to import from this URL."
    return
  }

  error.value = ""
  loading.value = true

  try {
    const result = await post<{ shortId: string }>("/events/import", {
      url: url.value.trim(),
    })
    dialog.value = false
    mainStore.showInfo("Event imported successfully!")
    void router.push(`/e/${result.shortId}`)
  } catch (e: unknown) {
    const msg =
      (e as { parsed?: { error?: string } }).parsed?.error ??
      "Failed to import event"
    const errorMessages: Record<string, string> = {
      "invalid-url": "Invalid URL. Please enter a valid Timeful event URL.",
      "remote-fetch-failed": "Could not reach the remote server.",
      "remote-event-not-found": "Event not found on the remote server.",
      "private-address": "Not allowed to import from this URL.",
      "remote-responses-failed":
        "Event found but could not fetch responses from the remote server.",
    }
    error.value = errorMessages[msg] || msg
  } finally {
    loading.value = false
  }
}
</script>
