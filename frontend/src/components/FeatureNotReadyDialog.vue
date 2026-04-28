<template>
  <v-dialog v-model="dialog" max-width="400px" content-class="tw-m-0">
    <v-card>
      <v-card-title>
        <span class="tw-text-xl tw-font-medium">Oops! Feature Not Ready</span>
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

<script setup lang="ts">
import { computed, ref } from "vue"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const mainStore = useMainStore()
const folderUsageFeedback = ref("")

const dialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => { emit("update:modelValue", val); },
})

const submitFeedback = () => {
  if (folderUsageFeedback.value.trim() !== "") {
    posthog.capture("folder_usage_feedback_submitted", {
      feedback: folderUsageFeedback.value,
    })
    folderUsageFeedback.value = ""
    dialog.value = false
    mainStore.showInfo("Thanks for your input!")
  } else {
    console.log("Feedback is empty")
  }
}
</script>

<style scoped></style>
