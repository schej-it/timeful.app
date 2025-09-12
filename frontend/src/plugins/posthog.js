import posthog from "posthog-js"
import { getCookieConsent } from "@/utils/cookie_utils"

export default {
  install(Vue, options) {
    // Initialize PostHog with capturing disabled by default
    Vue.prototype.$posthog = posthog.init(process.env.VUE_APP_POSTHOG_API_KEY, {
      api_host: "https://e.timeful.app",
      capture_pageview: false,
      autocapture: false,
      opt_out_capturing_by_default: true,
    })

    // If the user has previously given analytics consent in localStorage, opt-in
    const consent = getCookieConsent()
    if (consent && consent.preferences && consent.preferences.analytics) {
      Vue.prototype.$posthog.opt_in_capturing()
    }
  },
}
