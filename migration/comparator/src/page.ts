import { setTimeout as delay } from "node:timers/promises"

import type { Page } from "@playwright/test"

import type { AppLabel, ScenarioDefinition } from "./types.js"

const DEFAULT_PHASE_TIMEOUT_MS = 15_000
const THIRD_PARTY_BLOCKLIST = [
  "https://buttons.github.io/",
  "https://player.vimeo.com/",
  "https://i.vimeocdn.com/",
  "https://f.vimeocdn.com/",
  "https://btloader.com/",
  "https://securepubads.g.doubleclick.net/",
  "https://pagead2.googlesyndication.com/",
  "https://www.googletagmanager.com/",
  "https://www.google-analytics.com/",
  "https://html-load.com/",
  "https://cmp.quantcast.com/",
  "https://quantcast.mgr.consensu.org/",
] as const

export async function runWithPhaseTimeout<T>(
  phaseLabel: string,
  task: Promise<T>,
  timeoutMs = DEFAULT_PHASE_TIMEOUT_MS,
): Promise<T> {
  return await Promise.race([
    task,
    delay(timeoutMs).then(() => {
      throw new Error(`Timed out during comparator phase: ${phaseLabel} (${String(timeoutMs)}ms)`)
    }),
  ])
}

export async function waitForUrl(url: string, timeoutMs = 120_000) {
  const startedAt = Date.now()
  const candidateUrls = (() => {
    try {
      const parsedUrl = new URL(url)
      if (
        (parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost") &&
        (parsedUrl.pathname === "/" || parsedUrl.pathname === "")
      ) {
        return [new URL("/api/health", parsedUrl).toString(), url]
      }
    } catch {
      // Fall through to using the original URL only.
    }
    return [url]
  })()

  while (Date.now() - startedAt < timeoutMs) {
    for (const candidateUrl of candidateUrls) {
      try {
        const response = await fetch(candidateUrl)
        if (response.ok) {
          return
        }
      } catch {
        // Try the next candidate URL before sleeping.
      }
    }
    await delay(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function installStableBrowserLocale(page: Page) {
  await page.addInitScript(() => {
    const fallbackLocale = "en-US"
    const normalizeLocale = (candidate: unknown): string | null => {
      if (typeof candidate !== "string") return null
      const trimmedCandidate = candidate.trim()
      if (!trimmedCandidate) return null
      try {
        return Intl.getCanonicalLocales(trimmedCandidate)[0] ?? null
      } catch {
        return null
      }
    }

    const currentLanguages = (() => {
      try {
        return Array.isArray(window.navigator.languages)
          ? window.navigator.languages
          : []
      } catch {
        return []
      }
    })()
    const currentLanguage = (() => {
      try {
        return window.navigator.language
      } catch {
        return undefined
      }
    })()

    const normalizedLocale =
      currentLanguages
        .map(normalizeLocale)
        .find((locale): locale is string => locale != null) ??
      normalizeLocale(currentLanguage) ??
      normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale) ??
      fallbackLocale

    try {
      Object.defineProperty(window.navigator, "languages", {
        configurable: true,
        get: () => [normalizedLocale],
      })
    } catch {
      // Ignore environments that do not allow overriding navigator.languages.
    }

    try {
      Object.defineProperty(window.navigator, "language", {
        configurable: true,
        get: () => normalizedLocale,
      })
    } catch {
      // Ignore environments that do not allow overriding navigator.language.
    }
  })
}

export async function gotoComparatorUrl(page: Page, url: string) {
  console.error(`[comparator] goto:start ${url}`)
  await runWithPhaseTimeout(
    `goto ${url}`,
    page.goto(url, { waitUntil: "commit" }),
  )
  console.error(`[comparator] goto:done ${url}`)
}

export async function preparePage(page: Page, label: AppLabel, scenario: ScenarioDefinition) {
  for (const domainPrefix of THIRD_PARTY_BLOCKLIST) {
    await page.route(`${domainPrefix}**`, (route) => route.abort())
  }
  await installStableBrowserLocale(page)
  await gotoComparatorUrl(page, label.url)
  console.error(`[comparator] ready:start ${label.name} selector=${scenario.readySelector}`)
  await runWithPhaseTimeout(
    `waitForSelector ${label.name} ${scenario.readySelector}`,
    page.waitForSelector(scenario.readySelector, {
      timeout: scenario.readyTimeoutMs ?? DEFAULT_PHASE_TIMEOUT_MS,
    }),
    (scenario.readyTimeoutMs ?? DEFAULT_PHASE_TIMEOUT_MS) + 1_000,
  )
  console.error(`[comparator] ready:done ${label.name} selector=${scenario.readySelector}`)
  console.error(`[comparator] scenario-prepare:start ${label.name}`)
  await runWithPhaseTimeout(
    `scenario.prepare ${label.name}`,
    scenario.prepare(page, label),
    DEFAULT_PHASE_TIMEOUT_MS,
  )
  console.error(`[comparator] scenario-prepare:done ${label.name}`)
}
