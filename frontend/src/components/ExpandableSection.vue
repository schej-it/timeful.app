<!--class="tw-flex tw-items-end tw-justify-start tw-p-1"-->
<template>
  <div>
    <v-btn
      class="-tw-ml-2 tw-w-[calc(100%+1rem)] tw-justify-between tw-px-2"
      block
      text
      @click="toggle"
    >
      <span class="-tw-ml-px tw-mr-1" :class="labelClass">
        {{ label }}
      </span>
      <v-spacer />
      <v-icon
        :class="`tw-rotate-${modelValue ? '180' : '0'} ${iconClass}`"
        :size="30"
        >mdi-chevron-down</v-icon
      ></v-btn
    >
    <v-expand-transition>
      <div v-show="modelValue">
        <slot></slot>
      </div>
    </v-expand-transition>
    <div ref="scrollTo"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    labelClass?: string
    iconClass?: string
    autoScroll?: boolean
  }>(),
  {
    label: "",
    labelClass: "tw-text-base",
    iconClass: "",
    autoScroll: false,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const scrollTo = ref<HTMLElement | null>(null)

const toggle = () => {
  emit("update:modelValue", !props.modelValue)
}

const scrollToElement = (element: HTMLElement | null) => {
  if (props.autoScroll && element) {
    setTimeout(() => { element.scrollIntoView({ behavior: "smooth" }); }, 200)
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      scrollToElement(scrollTo.value)
    }
  }
)
</script>
