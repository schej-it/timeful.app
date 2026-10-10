<template>
  <footer class="tw-bg-green tw-p-8 tw-text-white">
    <div class="tw-mx-auto tw-max-w-7xl">
      <div class="tw-flex tw-flex-col tw-gap-8 md:tw-flex-row md:tw-justify-between">
        <!-- Logo and Info -->
        <div class="tw-max-w-sm">
          <div class="tw-mb-3 tw-text-2xl tw-font-bold tw-tracking-tight">
            2bz2fill
          </div>
          <div class="tw-leading-snug tw-text-white/80">
            For people too busy to fill out a long availability grid.
          </div>
        </div>
        <!-- Links -->
        <div class="tw-flex tw-flex-col tw-gap-2">
          <div class="tw-mb-1 tw-font-bold">Links</div>
          <div>
            <a
              href="https://github.com/HowieYHY/2bz2fill"
              target="_blank"
              class="tw-text-sm"
              >Source code</a
            >
          </div>
          <div>
            <router-link :to="{ name: 'privacy-policy' }" class="tw-text-sm">
              Privacy Policy
            </router-link>
          </div>
        </div>
      </div>
      <div
        class="tw-mt-8 tw-border-t tw-border-white/20 tw-pt-4 tw-text-sm tw-text-white/80"
      >
        Based on
        <a href="https://github.com/schej-it/timeful.app" target="_blank"
          >Timeful</a
        >. Free software under the
        <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank"
          >GNU AGPL v3</a
        >.
      </div>
    </div>
  </footer>
</template>

<style scoped>
div:has(a) {
  @apply tw-leading-none;
}
a {
  @apply tw-text-white/80 tw-underline tw-underline-offset-2 !important;
}
a:hover {
  @apply tw-text-white !important;
}
</style>

<script>
export default {
  name: "Footer",
}
</script>
