import posthog from "posthog-js"

// Analytics are off unless VUE_APP_POSTHOG_API_KEY is set. Without a key,
// $posthog is a stand-in whose methods do nothing, so calls like
// this.$posthog.capture(...) are safe everywhere.
const noop = new Proxy({}, { get: () => () => undefined })

export default {
  install(Vue, options) {
    const apiKey = process.env.VUE_APP_POSTHOG_API_KEY
    Vue.prototype.$posthog = apiKey
      ? posthog.init(apiKey, {
          api_host:
            process.env.VUE_APP_POSTHOG_HOST || "https://us.i.posthog.com",
          capture_pageview: false,
          autocapture: false,
        })
      : noop
  },
}
