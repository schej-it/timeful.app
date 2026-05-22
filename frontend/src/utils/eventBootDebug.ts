import { Temporal } from "temporal-polyfill"

interface DebugEntry {
  at: string
  scope: string
  message: string
  data?: unknown
}

declare global {
  interface Window {
    __timefulEventBootDebug?: DebugEntry[]
  }
}

const DEBUG_QUERY_KEY = "debugEventBoot"
const DEBUG_STORAGE_KEY = "debugEventBoot"

export function isEventBootDebugEnabled(): boolean {
  if (typeof window === "undefined") return false

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get(DEBUG_QUERY_KEY) === "1") return true
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function logEventBoot(scope: string, message: string, data?: unknown) {
  if (!isEventBootDebugEnabled()) return

  const entry: DebugEntry = {
    at: Temporal.Now.instant().toString(),
    scope,
    message,
    data,
  }

  if (typeof window !== "undefined") {
    window.__timefulEventBootDebug ??= []
    window.__timefulEventBootDebug.push(entry)
  }

  if (data === undefined) {
    console.debug(`[event-boot] ${scope}: ${message}`)
    return
  }

  console.debug(`[event-boot] ${scope}: ${message}`, data)
}
