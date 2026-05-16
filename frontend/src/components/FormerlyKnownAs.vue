<template>
  <div class="formerly-known-as-shell tw-relative tw-mt-2 tw-flex tw-items-center tw-justify-center">
    <div class="formerly-known-as-row tw-absolute tw-flex tw-items-center">
      <div class="formerly-known-as-icon-wrap -tw-mt-3.5 tw-text-dark-gray">
        <v-icon>mdi-arrow-up-left</v-icon>
      </div>
      <a
        href="/blog/schej-is-now-timeful/"
        class="formerly-known-as-link tw-cursor-pointer tw-select-none tw-text-sm tw-text-dark-gray"
      >
        Formerly known as "Schej"
      </a>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.formerly-known-as-shell {
  min-height: 2px;
}

.formerly-known-as-row {
  top: 2px;
  left: 48px;
}

.formerly-known-as-icon-wrap {
  width: 24px;
  min-width: 24px;
}

.formerly-known-as-link,
.formerly-known-as-link:hover,
.formerly-known-as-link:focus,
.formerly-known-as-link:focus-visible,
.formerly-known-as-link:visited {
  outline: none;
  text-decoration: none;
}

@media (min-width: 640px) {
  .formerly-known-as-row {
    left: 48px;
  }
}
</style>
