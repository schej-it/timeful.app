import { PROPERTY_GROUPS } from "./config.js"
import type { PropertyGroupName, PropertyName } from "./config.js"

import type {
  Box,
  BoxDiff,
  Diff,
  MatchOrDiffResult,
  MissingDiff,
  PropertyDiffEntry,
  ScenarioDefinition,
  Snapshot,
} from "./types.js"

const MONTH_NAMES =
  "January|February|March|April|May|June|July|August|September|October|November|December"
const COMBINED_CALENDAR_TEXT_ELEMENTS = new Set(["calendarPicker", "calendarControls"])

function normalizeCalendarText(elementName: string, text: string) {
  if (!COMBINED_CALENDAR_TEXT_ELEMENTS.has(elementName)) {
    return text
  }

  return text
    .replace(/\s+/g, " ")
    .replace(new RegExp(`\\b(${MONTH_NAMES})(\\d{4})`, "g"), "$1 $2")
    .trim()
}

export function buildDiff(
  scenario: ScenarioDefinition,
  oldSnapshot: Snapshot,
  newSnapshot: Snapshot,
): Diff {
  return Object.fromEntries(
    scenario.elements.map(({ name }) => {
      const oldElement = oldSnapshot[name]
      const newElement = newSnapshot[name]

      if (!oldElement || !newElement) {
        return [
          name,
          {
            status: "missing",
            oldFound: Boolean(oldElement),
            newFound: Boolean(newElement),
          } satisfies MissingDiff,
        ]
      }

      const propertyDiffs: MatchOrDiffResult["propertyDiffs"] = {}
      const oldText = normalizeCalendarText(name, oldElement.text)
      const newText = normalizeCalendarText(name, newElement.text)

      for (const [groupName, properties] of Object.entries(PROPERTY_GROUPS) as [
        PropertyGroupName,
        readonly PropertyName[],
      ][]) {
        const diffs = properties
          .map((property) => {
            const oldValue = oldElement.properties[property]
            const newValue = newElement.properties[property]

            if (oldValue === newValue) {
              return null
            }

            return { property, oldValue, newValue }
          })
          .filter((entry): entry is PropertyDiffEntry => entry !== null)

        if (diffs.length > 0) {
          propertyDiffs[groupName] = diffs
        }
      }

      const boxDiff = Object.fromEntries(
        Object.keys(oldElement.box).map((key) => [
          key,
          {
            old: oldElement.box[key as keyof Box],
            new: newElement.box[key as keyof Box],
            delta: Number(
              (newElement.box[key as keyof Box] - oldElement.box[key as keyof Box]).toFixed(2),
            ),
          },
        ]),
      ) as BoxDiff

      return [
        name,
        {
          status: Object.keys(propertyDiffs).length === 0 ? "match" : "diff",
          old: {
            tagName: oldElement.tagName,
            className: oldElement.className,
            text: oldText,
            box: oldElement.box,
          },
          new: {
            tagName: newElement.tagName,
            className: newElement.className,
            text: newText,
            box: newElement.box,
          },
          boxDiff,
          propertyDiffs,
        } satisfies MatchOrDiffResult,
      ]
    }),
  )
}
