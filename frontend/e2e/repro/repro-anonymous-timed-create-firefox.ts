import {
  collectEventPageEvidence,
  createUiSpecificTimesEvent,
  fetchEventByShortId,
  openEditDialog,
  openEventPage,
  runFirefoxScenario,
  summarizeEventPageEvidence,
} from "../helpers/firefox-timed-event-harness.ts"
import { Temporal } from "temporal-polyfill"

const createDates = ["2026-05-30", "2026-05-31"]

void runFirefoxScenario("anonymous-timed-event-create-reload", async ({ page }) => {
  const created = await createUiSpecificTimesEvent(page, {
    name: `anonymous-create-${String(Temporal.Now.instant().epochMilliseconds)}`,
    dates: createDates,
    initialDrag: { startRow: 0, endRow: 3, col: 0 },
  })

  const afterCreate = await fetchEventByShortId(page, created.shortId)
  const eventPageAfterCreate = summarizeEventPageEvidence(
    await collectEventPageEvidence(page)
  )

  await openEventPage(page, created.shortId)
  const reloaded = await fetchEventByShortId(page, created.shortId)
  await openEditDialog(page)

  return {
    setup: {
      shortId: created.shortId,
      createDates,
    },
    networkLog: created.networkLog,
    canonicalAfterCreate: afterCreate.canonical,
    canonicalAfterReload: reloaded.canonical,
    eventPageAfterCreate,
    checks: {
      enabledEqualsActiveOnCreate:
        JSON.stringify(afterCreate.canonical.enabledSlots) ===
        JSON.stringify(afterCreate.canonical.activeSlots),
      enabledEqualsActiveAfterReload:
        JSON.stringify(reloaded.canonical.enabledSlots) ===
        JSON.stringify(reloaded.canonical.activeSlots),
      routeReloadKeepsSameCanonicalSlots:
        JSON.stringify(afterCreate.canonical.enabledSlots) ===
          JSON.stringify(reloaded.canonical.enabledSlots) &&
        JSON.stringify(afterCreate.canonical.activeSlots) ===
          JSON.stringify(reloaded.canonical.activeSlots),
      eventPageShowsCreatedDates:
        eventPageAfterCreate.numericDates.includes("5/30") &&
        eventPageAfterCreate.numericDates.includes("5/31"),
    },
  }
})
