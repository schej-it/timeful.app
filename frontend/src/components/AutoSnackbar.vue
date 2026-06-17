<template>
  <v-snackbar v-model="show" location="top" :color="color">
    <span class="tw-mr-2 tw-text-sm">{{ text }}</span>

    <template #actions>
      <v-btn icon @click="show = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

const props = withDefaults(
  defineProps<{
    text?: string
    color?: string
  }>(),
  { text: "", color: "" }
)

const dismissedText = ref("")

const show = computed({
  get: () => Boolean(props.text) && dismissedText.value !== props.text,
  set: (value: boolean) => {
    if (!value) {
      dismissedText.value = props.text
    }
  },
})
</script>
