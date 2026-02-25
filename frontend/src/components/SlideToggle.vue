<template>
  <div
    class="tw-relative tw-flex tw-w-fit tw-items-center tw-rounded-md tw-border tw-border-border-default"
  >
    <div
      class="tw-absolute tw-h-full tw-rounded-md tw-border tw-transition-all"
      :class="options[index].borderClass ?? defaultBorderClass"
      :style="{
        ...(options[index].borderStyle ?? defaultBorderStyle),
        transform: `translateX(${index * 100}%)`,
        width: `${100 / options.length}%`,
      }"
    ></div>
    <template v-for="(tab, i) in options">
      <div
        class="tw-line-clamp-1 tw-flex-1 tw-cursor-pointer tw-overflow-hidden tw-px-4 tw-py-2.5 tw-text-center tw-text-sm tw-font-medium tw-transition-all"
        :class="
          i === index ? tab.activeClass ?? defaultActiveClass : inactiveClass
        "
        @click="$emit('input', tab.value)"
      >
        {{ tab.text }}
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: "AvailabilityTypeToggle",

  props: {
    value: { required: true },

    // Array of objects of the following structure:
    // {
    //   text: String,
    //   activeClass?: String,
    //   borderClass?: String,
    //   borderStyle?: Object,
    //   value: String,
    // }
    options: { type: Array, required: true },
  },

  data() {
    return {
      index: 0,

      defaultActiveClass: "tw-text-green tw-bg-green/5",
      defaultBorderClass: "tw-border-green",
      defaultBorderStyle: { boxShadow: "0px 2px 8px 0px #00994C40" },
      inactiveClass: "tw-text-text-muted tw-bg-surface-variant",
    }
  },

  watch: {
    value: {
      immediate: true,
      handler() {
        this.index = this.options.findIndex((tab) => tab.value === this.value)
        if (this.index === -1) this.index = 0
      },
    },
  },
}
</script>
