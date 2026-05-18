type PosthogModule = typeof import("posthog-js")
type PosthogClient = PosthogModule["default"]

type PendingCall = (client: PosthogClient) => void

const POSTHOG_DISTINCT_ID_KEY = "timeful.posthogDistinctId"

let posthogClient: PosthogClient | null = null
let posthogLoadPromise: Promise<PosthogClient | null> | null = null
const pendingCalls: PendingCall[] = []

function readFallbackDistinctId(): string {
  if (typeof localStorage === "undefined") {
    return "timeful-anonymous"
  }

  const existingId = localStorage.getItem(POSTHOG_DISTINCT_ID_KEY)
  if (existingId) {
    return existingId
  }

  const generatedId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `timeful-${Math.random().toString(36).slice(2)}`

  localStorage.setItem(POSTHOG_DISTINCT_ID_KEY, generatedId)
  return generatedId
}

function flushPendingCalls(client: PosthogClient) {
  while (pendingCalls.length > 0) {
    pendingCalls.shift()?.(client)
  }
}

function loadPosthog(): Promise<PosthogClient | null> {
  if (posthogClient) {
    return Promise.resolve(posthogClient)
  }

  if (posthogLoadPromise) {
    return posthogLoadPromise
  }

  if (typeof window === "undefined") {
    return Promise.resolve(null)
  }

  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY?.trim()
  if (!apiKey) {
    return Promise.resolve(null)
  }

  posthogLoadPromise = import("posthog-js")
    .then(({ default: client }) => {
      client.init(apiKey, {
        api_host: "https://e.timeful.app",
        capture_pageview: false,
        autocapture: false,
      })
      posthogClient = client
      flushPendingCalls(client)
      return client
    })
    .catch((error: unknown) => {
      console.warn("[posthog] failed to load", error)
      return null
    })

  return posthogLoadPromise
}

function enqueueOrRun(call: PendingCall) {
  if (posthogClient) {
    call(posthogClient)
    return
  }

  pendingCalls.push(call)
  void loadPosthog()
}

export const posthog = {
  capture(...args: Parameters<PosthogClient["capture"]>) {
    enqueueOrRun((client) => {
      void client.capture(...args)
    })
  },

  identify(...args: Parameters<PosthogClient["identify"]>) {
    enqueueOrRun((client) => {
      client.identify(...args)
    })
  },

  reset() {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(POSTHOG_DISTINCT_ID_KEY)
    }

    enqueueOrRun((client) => {
      client.reset()
    })
  },

  get_distinct_id(): string {
    void loadPosthog()
    return posthogClient?.get_distinct_id() ?? readFallbackDistinctId()
  },
}

export const usePosthog = () => posthog
