<template>
  <div
    class="tw-relative tw-flex tw-w-fit tw-items-center tw-rounded-md tw-border tw-border-light-gray-stroke"
  >
    <div
      class="tw-absolute tw-h-full tw-rounded-md tw-border tw-transition-all"
      :class="options[index]?.borderClass ?? defaultBorderClass"
      :style="{
        ...(options[index]?.borderStyle ?? defaultBorderStyle),
        transform: `translateX(${index * 100}%)`,
        width: `${100 / options.length}%`,
      }"
    ></div>
    <template v-for="(tab, i) in options" :key="tab.value">
      <div
        class="tw-flex tw-flex-1 tw-cursor-pointer tw-items-center tw-justify-center tw-gap-1.5 tw-overflow-hidden tw-px-4 tw-py-2.5 tw-text-center tw-text-sm tw-font-medium tw-transition-all"
        :class="
          i === index ? tab.activeClass ?? defaultActiveClass : inactiveClass
        "
        :style="tab.style || {}"
        @click="emit('update:modelValue', tab.value)"
      >
        <slot :name="'option-' + tab.value" :option="tab" :active="i === index">
          <span class="tw-line-clamp-1">{{ tab.text }}</span>
        </slot>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, watch } from "vue"

export interface SlideToggleOption<T = string> {
  text: string
  value: T
  activeClass?: string
  borderClass?: string
  borderStyle?: Record<string, string>
  style?: Record<string, string>
}

const props = defineProps<{
  modelValue: T
  options: SlideToggleOption<T>[]
}>()

const emit = defineEmits<{
  "update:modelValue": [value: T]
}>()

const index = ref(0)

const defaultActiveClass = "tw-text-green tw-bg-green/5"
const defaultBorderClass = "tw-border-green"
const defaultBorderStyle = { boxShadow: "0px 2px 8px 0px #00994C40" }
const inactiveClass = "tw-text-dark-gray tw-bg-off-white"

watch(
  () => props.modelValue,
  () => {
    const i = props.options.findIndex((tab) => tab.value === props.modelValue)
    index.value = i === -1 ? 0 : i
  },
  { immediate: true }
)
</script>
