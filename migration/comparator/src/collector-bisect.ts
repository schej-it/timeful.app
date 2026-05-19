import process from "node:process"

import { firefox } from "@playwright/test"

import { FLATTENED_PROPERTIES } from "./config.js"
import { resolveSnapshotEntries } from "./dom-resolvers.js"
import {
  createComparatorContext,
  installStableBrowserLocale,
  preparePage,
  runWithPhaseTimeout,
} from "./page.js"
import { SCENARIOS } from "./scenarios/index.js"
import { dismissConsentIfPresent, resolveComparatorEventPath } from "./scenarios/helpers.js"

import type { CompareTarget } from "./scenarios/index.js"
import type { AppLabel } from "./types.js"

type StageName =
  | "plain-route"
  | "plain-route-consent"
  | "scenario-prepare"
  | "prepare-page"
  | "prepare-page-ready"
  | "collect-styles"

type StageResult = {
  stage: StageName
  ok: boolean
  finalUrl: string | null
  timedOut: boolean
  error: null | {
    name: string
    message: string
  }
}

function parseTarget(argv: string[]): CompareTarget {
  let target: CompareTarget = "event-description-real"

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg !== "--target") {
      throw new Error(`Unknown argument ${JSON.stringify(arg)}. Supported flags: --target`)
    }

    const value = argv[index + 1]
    if (!value) {
      throw new Error("Missing value for --target")
    }

    if (!(value in SCENARIOS)) {
      throw new Error(`Unknown target ${JSON.stringify(value)}`)
    }

    target = value as CompareTarget
    index += 1
  }

  return target
}

async function addCommonSetup(page: import("@playwright/test").Page) {
  await installStableBrowserLocale(page)
}

async function runStage(
  stage: StageName,
  fn: (page: import("@playwright/test").Page, label: AppLabel) => Promise<void>,
  label: AppLabel,
): Promise<StageResult> {
  const browser = await firefox.launch()

  try {
    const context = await createComparatorContext(browser, {
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    await addCommonSetup(page)

    try {
      console.error(`[bisect] ${stage}:start`)
      await runWithPhaseTimeout(`collector-bisect ${stage}`, fn(page, label), 45_000)
      console.error(`[bisect] ${stage}:done`)
      return {
        stage,
        ok: true,
        finalUrl: page.url() || null,
        timedOut: false,
        error: null,
      }
    } catch (error) {
      console.error(
        `[bisect] ${stage}:error ${error instanceof Error ? error.message : String(error)}`,
      )
      return {
        stage,
        ok: false,
        finalUrl: page.url() || null,
        timedOut:
          error instanceof Error &&
          error.message.includes(`Timed out during comparator phase: collector-bisect ${stage}`),
        error: {
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error),
        },
      }
    } finally {
      await context.close().catch(() => {})
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const target = parseTarget(process.argv.slice(2))
  const scenario = SCENARIOS[target]
  const label: AppLabel = {
    name: "new",
    url: process.env.NEW_APP_URL || "http://127.0.0.1:4173",
  }

  const results: StageResult[] = []

  results.push(
    await runStage(
      "plain-route",
      async (page) => {
        await page.goto(new URL(resolveComparatorEventPath(), label.url).toString(), {
          waitUntil: "domcontentloaded",
        })
      },
      label,
    ),
  )

  results.push(
    await runStage(
      "plain-route-consent",
      async (page) => {
        await page.goto(new URL(resolveComparatorEventPath(), label.url).toString(), {
          waitUntil: "domcontentloaded",
        })
        await dismissConsentIfPresent(page)
      },
      label,
    ),
  )

  results.push(
    await runStage(
      "scenario-prepare",
      async (page) => {
        await scenario.prepare(page, label)
      },
      label,
    ),
  )

  results.push(
    await runStage(
      "prepare-page",
      async (page) => {
        await preparePage(page, label, {
          ...scenario,
          readySelector: "body",
          readyTimeoutMs: 1,
        })
      },
      label,
    ),
  )

  results.push(
    await runStage(
      "prepare-page-ready",
      async (page) => {
        await preparePage(page, label, scenario)
      },
      label,
    ),
  )

  results.push(
    await runStage(
      "collect-styles",
      async (page) => {
        await preparePage(page, label, scenario)
        await runWithPhaseTimeout(
          `page.evaluate ${label.name}`,
          page.evaluate(
            `((args) => {
              const __name = (target) => target
              return (${resolveSnapshotEntries.toString()})(args)
            })(${JSON.stringify({
              elements: scenario.elements,
              flattenedProperties: FLATTENED_PROPERTIES,
            })})`,
          ),
        )
      },
      label,
    ),
  )

  console.log(JSON.stringify({ target, results }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
