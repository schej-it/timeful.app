<!-- Used to indicate that a schedule overlap component has more to scroll -->
<template>
  <div ref="container" class="tw-overflow-hidden">
    <div :class="left ? 'line1-left' : 'line1-right'" :style="lineStyle"></div>
    <div :class="left ? 'line2-left' : 'line2-right'" :style="lineStyle"></div>
  </div>
</template>

<style scoped>
.line1-left {
  background: linear-gradient(
    45deg,
    var(--color-zigzag-fill),
    var(--color-zigzag-fill) 49%,
    var(--color-zigzag-line) 49%,
    transparent 51%
  );
}
.line2-left {
  background: linear-gradient(
    -45deg,
    transparent,
    transparent 49%,
    var(--color-zigzag-line) 49%,
    var(--color-zigzag-fill) 51%
  );
}

.line1-right {
  background: linear-gradient(
    45deg,
    transparent,
    transparent 49%,
    var(--color-zigzag-line) 51%,
    var(--color-zigzag-fill) 51%
  );
}
.line2-right {
  background: linear-gradient(
    -45deg,
    var(--color-zigzag-fill),
    var(--color-zigzag-fill) 49%,
    var(--color-zigzag-line) 51%,
    transparent 51%
  );
}
</style>

<script>
export default {
  name: "ZigZag",

  props: {
    left: { type: Boolean, default: false },
    right: { type: Boolean, default: false },
  },

  mounted() {
    // Background size is 2 * width of the element
    this.backgroundSize = this.$refs.container.offsetWidth * 2
  },

  data() {
    return {
      backgroundSize: 0,
    }
  },

  computed: {
    lineStyle() {
      return {
        position: "absolute",
        width: "200%",
        height: "100%",
        backgroundSize: `${this.backgroundSize}px ${this.backgroundSize}px`,
        transform: this.left
          ? `translate(${-this.backgroundSize / 2}px, 0)`
          : "",
      }
    },
  },
}
</script>
