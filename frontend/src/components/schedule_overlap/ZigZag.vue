<!-- Used to indicate that a schedule overlap component has more to scroll -->
<template>
  <div ref="container" class="tw-overflow-hidden">
    <div :class="left ? 'line1-left' : 'line1-right'" :style="lineStyle"></div>
    <div :class="left ? 'line2-left' : 'line2-right'" :style="lineStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

const props = withDefaults(
  defineProps<{
    left?: boolean
    right?: boolean
  }>(),
  { left: false, right: false }
)

const container = ref<HTMLElement | null>(null)
const backgroundSize = ref(0)

onMounted(() => {
  if (container.value) {
    backgroundSize.value = container.value.offsetWidth * 2
  }
})

const lineStyle = computed(() => ({
  position: "absolute" as const,
  width: "200%",
  height: "100%",
  backgroundSize: `${String(backgroundSize.value)}px ${String(backgroundSize.value)}px`,
  transform: props.left ? `translate(${String(-backgroundSize.value / 2)}px, 0)` : "",
}))
</script>

<style scoped>
.line1-left {
  background: linear-gradient(
    45deg,
    white,
    white 49%,
    black 49%,
    transparent 51%
  );
}
.line2-left {
  background: linear-gradient(
    -45deg,
    transparent,
    transparent 49%,
    black 49%,
    white 51%
  );
}

.line1-right {
  background: linear-gradient(
    45deg,
    transparent,
    transparent 49%,
    black 51%,
    white 51%
  );
}
.line2-right {
  background: linear-gradient(
    -45deg,
    white,
    white 49%,
    black 51%,
    transparent 51%
  );
}
</style>
