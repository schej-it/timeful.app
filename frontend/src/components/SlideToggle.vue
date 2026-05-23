<template>
  <div
    class="slide-toggle tw-relative tw-flex tw-w-fit tw-items-center tw-rounded-md tw-border tw-border-solid tw-border-light-gray-stroke"
  >
    <div
      class="slide-toggle__indicator tw-absolute tw-h-full tw-rounded-md tw-border tw-border-solid tw-transition-all"
      :class="activeIndicatorClass"
      :style="activeIndicatorStyle"
    ></div>
    <template v-for="(tab, i) in options" :key="String(tab.value)">
      <div
        class="tw-flex tw-flex-1 tw-cursor-pointer tw-items-center tw-justify-center tw-gap-1.5 tw-overflow-hidden tw-px-4 tw-py-2.5 tw-text-center tw-text-sm tw-font-medium tw-transition-all"
        :class="getOptionClass(tab, i)"
        :style="tab.style"
        @click="emit('update:modelValue', tab.value)"
      >
        <slot
          :name="'option-' + tab.value"
          :option="tab"
          :active="i === selectedIndex"
        >
          <span class="tw-line-clamp-1">{{ tab.text }}</span>
        </slot>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | boolean">
import { computed, type CSSProperties } from "vue"

export interface SlideToggleOption<T extends string | number | boolean = string> {
  text: string
  value: T
  activeClass?: string
  borderClass?: string
  borderColor?: string
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

const defaultActiveClass = "tw-text-green tw-bg-green/5"
const defaultBorderClass = "tw-border-green"
const defaultBorderColor = "#00994C"
const defaultBorderStyle = { boxShadow: "0px 2px 8px 0px #00994C40" }
const inactiveClass = "tw-text-dark-gray tw-bg-off-white"

const selectedIndex = computed(() => {
  const matchIndex = props.options.findIndex((tab) => tab.value === props.modelValue)
  return matchIndex === -1 ? 0 : matchIndex
})

const selectedOption = computed(
  (): SlideToggleOption<T> =>
    props.options.at(selectedIndex.value) ?? props.options.at(0) ?? emptyOption.value
)

const emptyOption = computed<SlideToggleOption<T>>(
  () =>
    ({
      text: "",
      value: props.modelValue,
    })
)

const activeIndicatorClass = computed(() => selectedOption.value.borderClass ?? defaultBorderClass)

const activeIndicatorStyle = computed<CSSProperties>(() => {
  const optionCount = Math.max(props.options.length, 1)
  const borderStyle = selectedOption.value.borderStyle ?? defaultBorderStyle

  return {
    borderColor: selectedOption.value.borderColor ?? defaultBorderColor,
    transform: `translateX(${String(selectedIndex.value * 100)}%)`,
    width: `${String(100 / optionCount)}%`,
    ...borderStyle,
  }
})

const getOptionClass = (
  tab: SlideToggleOption<T>,
  optionIndex: number
) => (optionIndex === selectedIndex.value ? tab.activeClass ?? defaultActiveClass : inactiveClass)
</script>

<style scoped>
.slide-toggle__indicator {
  left: 0;
  top: 0;
}
</style>
