<template>
  <img
    :alt="alt"
    class="tw-block tw-shrink-0 tw-cursor-pointer"
    :src="src"
    :style="{ width: `${width}px` }"
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

const width = computed(() => {
  if (props.type === "timeful") return isPhone.value ? 90 : 110
  return isPhone.value ? 200 : 300
})
</script>
