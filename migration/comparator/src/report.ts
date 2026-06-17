import type { CompareTarget } from "./scenarios/index.js"
import type { Diff, Snapshot, SnapshotElement } from "./types.js"

export function printDiff(target: CompareTarget, diff: Diff) {
  console.log(`target=${target}`)

  for (const [elementName, result] of Object.entries(diff)) {
    console.log(`\n[${elementName}] ${result.status}`)

    if (result.status === "missing") {
      console.log(JSON.stringify({ oldFound: result.oldFound, newFound: result.newFound }, null, 2))
      continue
    }

    console.log(`box old=${JSON.stringify(result.old.box)} new=${JSON.stringify(result.new.box)}`)

    if (result.old.text !== result.new.text) {
      console.log(`  text old=${JSON.stringify(result.old.text)} new=${JSON.stringify(result.new.text)}`)
    }

    for (const [groupName, diffs] of Object.entries(result.propertyDiffs)) {
      console.log(`  ${groupName}`)

      for (const diffEntry of diffs ?? []) {
        console.log(
          `    ${diffEntry.property}: old=${JSON.stringify(diffEntry.oldValue)} new=${JSON.stringify(diffEntry.newValue)}`,
        )
      }
    }
  }
}

function printSnapshotElement(elementName: string, element: SnapshotElement | null) {
  if (element == null) {
    console.log(`\n[${elementName}] missing`)
    return
  }

  console.log(`\n[${elementName}] found`)
  console.log(
    JSON.stringify(
      {
        tagName: element.tagName,
        className: element.className,
        text: element.text,
        box: element.box,
        properties: element.properties,
      },
      null,
      2,
    ),
  )
}

export function printSnapshot(target: CompareTarget, app: string, snapshot: Snapshot) {
  console.log(`target=${target}`)
  console.log(`app=${app}`)

  for (const [elementName, element] of Object.entries(snapshot)) {
    printSnapshotElement(elementName, element)
  }
}
