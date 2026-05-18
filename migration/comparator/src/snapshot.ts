import type { Page } from "@playwright/test"

import { FLATTENED_PROPERTIES } from "./config.js"
import { resolveSnapshotEntries } from "./dom-resolvers.js"
import { preparePage, runWithPhaseTimeout } from "./page.js"

import type { AppLabel, ScenarioDefinition, Snapshot, SnapshotEntry } from "./types.js"

export async function collectStyles(
  page: Page,
  label: AppLabel,
  scenario: ScenarioDefinition,
): Promise<Snapshot> {
  console.error(`[comparator] collect:start ${label.name}`)
  await preparePage(page, label, scenario)

  console.error(`[comparator] evaluate:start ${label.name}`)
  const entries = (await runWithPhaseTimeout(
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
  )) as SnapshotEntry[]
  console.error(`[comparator] evaluate:done ${label.name}`)

  console.error(`[comparator] collect:done ${label.name}`)
  return Object.fromEntries(entries)
}
