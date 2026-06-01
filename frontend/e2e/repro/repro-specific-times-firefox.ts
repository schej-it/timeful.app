import {
  assertTimezoneIsUtc,
  collectEventPageEvidence,
  collectSpecificTimesPageEvidence,
  createSeedEvent,
  enterSpecificTimesGrid,
  fetchEventByShortId,
  openEditDialog,
  openEventPage,
  runFirefoxScenario,
  saveSpecificTimesGrid,
  summarizeEventPageEvidence,
  summarizeSpecificTimesEvidence,
  withEventMutationLog,
} from "../helpers/firefox-timed-event-harness.ts"
import { Temporal } from "temporal-polyfill"

const membershipDates = ["2026-05-28", "2026-05-29"]
const normalizeIso = (value: string) => value.replace(".000Z", "Z")
const enabledSlots = membershipDates.flatMap((date) =>
  ["00:00", "00:15", "00:30", "00:45"].map((time) => `${date}T${time}:00.000Z`)
)
const activeSubset = ["00:00", "00:15", "00:30", "00:45"].map(
  (time) => `2026-05-29T${time}:00.000Z`
)

void runFirefoxScenario("subset-preservation-on-save", async ({ page }) => {
  const seed = await createSeedEvent({
    name: `subset-preservation-${String(Temporal.Now.instant().epochMilliseconds)}`,
    dates: membershipDates,
    enabledSlots,
    activeSlots: activeSubset,
    times: activeSubset,
    timeIncrement: 15,
    duration: 1,
  })

  await openEventPage(page, seed.shortId)
  const editorCard = await openEditDialog(page)
  await assertTimezoneIsUtc(editorCard)

  const collected: {
    specificTimesPageEvidence?: { headerColumns: string[]; visibleDateStrings: string[] }
  } = {}
  const networkLog = await withEventMutationLog(page, async () => {
    await enterSpecificTimesGrid(page)
    collected.specificTimesPageEvidence = await collectSpecificTimesPageEvidence(page)
    await saveSpecificTimesGrid(page)
  })

  const collectedSpecificTimesPageEvidence = collected.specificTimesPageEvidence
  if (!collectedSpecificTimesPageEvidence) {
    throw new Error("Specific-times evidence was not collected before save")
  }

  const specificTimesPage = summarizeSpecificTimesEvidence(collectedSpecificTimesPageEvidence)
  const eventPageAfterSave = summarizeEventPageEvidence(
    await collectEventPageEvidence(page)
  )
  const apiSummary = await fetchEventByShortId(page, seed.shortId)

  return {
    setup: {
      shortId: seed.shortId,
      membershipDates,
      expectedEnabledSlots: enabledSlots,
      expectedActiveSlots: activeSubset,
    },
    networkLog,
    specificTimesPage,
    eventPageAfterSave,
    canonicalBeforeSave: {
      enabledSlots,
      activeSlots: activeSubset,
    },
    canonicalAfterSave: apiSummary.canonical,
    checks: {
      headerShowsMembershipDates:
        specificTimesPage.extractedMonthDays.includes("May 28") &&
        specificTimesPage.extractedMonthDays.includes("May 29") &&
        specificTimesPage.extractedMonthDays.length === 2,
      eventPageShowsMembershipDates:
        eventPageAfterSave.numericDates.includes("5/28") &&
        eventPageAfterSave.numericDates.includes("5/29") &&
        eventPageAfterSave.numericDates.length === 2,
      activeSubsetPreserved:
        JSON.stringify(apiSummary.canonical.activeSlots) ===
        JSON.stringify(activeSubset.map(normalizeIso)),
      enabledDomainPreserved:
        JSON.stringify(apiSummary.canonical.enabledSlots) ===
        JSON.stringify(enabledSlots.map(normalizeIso)),
    },
  }
})
