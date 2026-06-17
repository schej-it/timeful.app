import { defineAsyncComponent } from "vue"

export const AsyncPubliftAd = defineAsyncComponent(
  () => import("./PubliftAd.vue")
)
