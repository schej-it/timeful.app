<template>
  <SlideToggle
    :model-value="modelValue"
    :options="options"
    @update:model-value="(v: string) => emit('update:modelValue', v)"
  />
</template>

<script setup lang="ts">
import { availabilityTypes } from "@/constants"
import SlideToggle, {
  type SlideToggleOption,
} from "@/components/SlideToggle.vue"

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const options: SlideToggleOption[] = [
  {
    text: "Available",
    activeClass: "tw-text-green tw-bg-green/5",
    borderClass: "tw-border-green",
    borderStyle: { boxShadow: "0px 2px 8px 0px #00994C40" },
    value: availabilityTypes.AVAILABLE,
  },
  {
    text: "If needed",
    activeClass: "tw-text-dark-yellow tw-bg-yellow/5",
    borderClass: "tw-border-orange",
    borderStyle: { boxShadow: "0px 2px 8px 0px #FEDB9340" },
    value: availabilityTypes.IF_NEEDED,
  },
]
</script>
