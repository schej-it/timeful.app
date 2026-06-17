<template>
  <v-card-title
    :class="showHelpCopy ? 'tw-items-start' : 'tw-items-center'"
    class="tw-mb-2 tw-flex tw-gap-2 tw-px-4 sm:tw-px-8"
  >
    <div>
      <div class="tw-mb-1">{{ title }}</div>
      <div
        v-if="showHelpCopy"
        class="tw-text-xs tw-font-normal tw-italic tw-text-dark-gray"
      >
        {{ subtitle }}
      </div>
    </div>
    <v-spacer />
    <template v-if="dialog && !hideDialogActions">
      <v-btn
        v-if="showHelp"
        icon
        variant="text"
        class="tw-text-dark-gray"
        @click="helpDialog = true"
      >
        <v-icon color="#4F4F4F">mdi-information-outline</v-icon>
      </v-btn>
      <v-btn
        v-else
        icon
        variant="text"
        class="tw-text-dark-gray"
        @click="emit('close')"
      >
        <v-icon color="#4F4F4F">mdi-close</v-icon>
      </v-btn>
      <HelpDialog v-model="helpDialog">
        <template #header>{{ helpHeader }}</template>
        <slot name="help-content" />
      </HelpDialog>
    </template>
  </v-card-title>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import HelpDialog from "./HelpDialog.vue"

const props = defineProps<{
  title: string
  subtitle: string
  helpHeader: string
  dialog: boolean
  showHelp: boolean
  hideDialogActions: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const helpDialog = ref(false)
const showHelpCopy = computed(() => props.dialog && props.showHelp)
</script>
