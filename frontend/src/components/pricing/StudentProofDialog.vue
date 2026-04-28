<template>
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-card class="tw-rounded-lg tw-p-6 tw-pb-4 sm:tw-p-8 sm:tw-pb-4">
      <div class="tw-mb-4">
        <h2 class="tw-text-lg tw-font-medium">Student Verification</h2>
      </div>
      <p class="tw-mb-6 tw-text-sm tw-text-dark-gray">
        Please email
        <span class="tw-font-medium tw-text-dark-green tw-underline"
          >contact@timeful.app</span
        >
        with proof that you are a student to get the discounted price. The
        subject of your email should be "Student Discount".
      </p>
      <v-btn text block @click="emit('update:modelValue', false)">OK</v-btn>
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
