<template>
  <div
    class="tw-flex tw-items-start tw-gap-1 tw-rounded tw-bg-light-gray tw-p-2 tw-text-dark-gray"
  >
    <v-icon class="-tw-mt-px tw-text-base">mdi-alert-circle</v-icon>
    <span>
      <slot></slot>
    </span>
  </div>
</template>

<script setup lang="ts"></script>
