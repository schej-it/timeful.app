import posthogJs from "posthog-js"

posthogJs.init(import.meta.env.VITE_POSTHOG_API_KEY, {
  api_host: "https://e.timeful.app",
  capture_pageview: false,
  autocapture: false,
})

export const posthog = posthogJs
export const usePosthog = () => posthog
