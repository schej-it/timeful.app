import type { Page } from "@playwright/test"

import { FLATTENED_PROPERTIES } from "./config.js"
import { resolveSnapshotEntries } from "./dom-resolvers.js"
import { preparePage } from "./page.js"

import type { AppLabel, ScenarioDefinition, Snapshot, SnapshotEntry } from "./types.js"

export async function collectStyles(
  page: Page,
  label: AppLabel,
  scenario: ScenarioDefinition,
): Promise<Snapshot> {
  await preparePage(page, label, scenario)

  const entries = (await page.evaluate(
    `((args) => {
      const __name = (target) => target
      return (${resolveSnapshotEntries.toString()})(args)
    })(${JSON.stringify({
      elements: scenario.elements,
      flattenedProperties: FLATTENED_PROPERTIES,
    })})`,
  )) as SnapshotEntry[]

  return Object.fromEntries(entries)
}
