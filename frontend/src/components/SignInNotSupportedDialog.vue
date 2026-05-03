<template>
  <!-- Google sign in not supported dialog -->
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title>Google sign in not supported</v-card-title>
      <v-card-text>
        <p>
          This usually happens when you open a Timeful link from Instagram or
          Messenger.
        </p>
        <p>
          To get around this issue, click the three dots in the top right and
          then "Open in system browser" or "Open in Chrome"
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text class="tw-text-green" @click="emit('update:modelValue', false)">
          Ok
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()
</script>
