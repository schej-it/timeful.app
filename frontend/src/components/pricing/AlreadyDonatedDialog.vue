<template>
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-card class="tw-rounded-lg tw-p-6 tw-pb-4 sm:tw-p-8 sm:tw-pb-4">
      <h2 class="tw-mb-4 tw-text-lg tw-font-medium">Already Donated?</h2>
      <p class="tw-mb-6 tw-text-sm tw-text-dark-gray">
        Thank you so much for your previous donation! To get free lifetime
        access to Timeful Premium, please send an email to
        <span class="tw-font-medium tw-text-dark-green tw-underline"
          >contact@timeful.app</span
        >
        from the email address associated with your donation. We'll upgrade your
        account manually.
      </p>
      <v-btn text block @click="emit('update:modelValue', false)"> Close </v-btn>
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
