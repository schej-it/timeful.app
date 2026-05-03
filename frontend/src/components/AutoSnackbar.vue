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
import { ref, watch } from "vue"

const props = withDefaults(
  defineProps<{
    text?: string
    color?: string
  }>(),
  { text: "", color: "" }
)

const show = ref(false)

watch(
  () => props.text,
  (text) => {
    show.value = !!text
  },
  { immediate: true }
)
</script>
