<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="500px"
    content-class="tw-m-0"
    @update:model-value="handleDialogVisibilityChange"
  >
    <v-card>
      <v-card-title>
        <span class="tw-text-xl tw-font-medium">Import Timeful Event</span>
        <v-spacer />
        <v-btn
          absolute
          icon
          class="tw-right-0 tw-mr-2 tw-self-center"
          @click="closeDialog"
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
          variant="outlined"
          density="compact"
          :disabled="loading"
          :error-messages="error"
          @keydown.enter="importEvent"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Cancel</v-btn>
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
import { ref, watch } from "vue"
import { useRouter } from "vue-router"
import { post } from "@/utils"
import { useMainStore } from "@/stores/main"
import { isBlockedTimefulImportUrl } from "@/utils/timefulImport"

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const router = useRouter()
const mainStore = useMainStore()

const url = ref("")
const loading = ref(false)
const error = ref("")

const resetForm = () => {
  url.value = ""
  error.value = ""
}

const closeDialog = () => {
  resetForm()
  emit("update:modelValue", false)
}

const handleDialogVisibilityChange = (isVisible: boolean) => {
  if (isVisible) {
    emit("update:modelValue", true)
    return
  }

  closeDialog()
}

watch(
  () => props.modelValue,
  (isVisible, wasVisible) => {
    if (wasVisible && !isVisible) {
      resetForm()
    }
  }
)

const importEvent = async () => {
  if (!url.value.trim() || loading.value) return

  if (isBlockedTimefulImportUrl(url.value.trim(), window.location.hostname)) {
    error.value = "Not allowed to import from this URL."
    return
  }

  error.value = ""
  loading.value = true

  try {
    const result = await post<{ shortId: string }>("/events/import", {
      url: url.value.trim(),
    })
    closeDialog()
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
