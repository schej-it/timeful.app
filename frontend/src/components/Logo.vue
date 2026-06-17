<template>
  <img
    :alt="alt"
    :class="widthClass"
    class="tw-flex tw-max-w-full tw-shrink-0 tw-cursor-pointer"
    :src="src"
  />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import timefulLogo from "@/assets/timeful_logo_with_text.png"
import aprilFoolsLogo from "@/assets/april_fools_logo.png"

defineOptions({ name: "AppLogo" })

type LogoType = "timeful" | "betterwhen2meet" | "aprilfools"

const props = withDefaults(
  defineProps<{
    type?: LogoType
  }>(),
  { type: "timeful" }
)

const { isPhone } = useDisplayHelpers()

const alt = computed(() =>
  props.type === "betterwhen2meet" ? "Betterwhen2meet Logo" : "Timeful Logo"
)

const src = computed(() => {
  if (props.type === "timeful") return timefulLogo
  return aprilFoolsLogo
})

const widthClass = computed(() => {
  if (props.type === "timeful") {
    return isPhone.value ? "tw-w-[90px]" : "tw-w-[110px]"
  }

  return isPhone.value ? "tw-w-[200px]" : "tw-w-[300px]"
})
</script>
