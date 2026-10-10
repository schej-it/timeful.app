<template>
  <!-- Placeholder mark: an availability grid that arrives already filled in.
       Keep in sync with public/favicon.svg. -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="7" fill="#00994C" />
    <rect
      v-for="(cell, i) in cells"
      :key="i"
      :x="cell.x"
      :y="cell.y"
      width="6"
      height="6"
      rx="1.5"
      fill="#FFFFFF"
      :fill-opacity="cell.opacity"
    />
  </svg>
</template>

<script>
// Fill level per cell, row by row: a diagonal sweep like a heatmap
const LEVELS = [1, 1, 0.6, 1, 0.6, 0.3, 0.6, 0.3, 0.3]

export default {
  name: "BrandMark",

  props: {
    size: { type: Number, default: 26 },
  },

  computed: {
    cells() {
      return LEVELS.map((opacity, i) => ({
        x: 5 + (i % 3) * 8,
        y: 5 + Math.floor(i / 3) * 8,
        opacity,
      }))
    },
  },
}
</script>
