<template>
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title>Unsaved changes</v-card-title>
      <v-card-text>
        <div>Are you sure you want to leave this page?</div>
        <div>Changes you made will not be saved.</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text class="tw-text-green" @click="emit('update:modelValue', false)"
          >Cancel</v-btn
        >
        <v-btn text @click="emit('leave')">Leave page</v-btn>
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
  leave: []
}>()
</script>
