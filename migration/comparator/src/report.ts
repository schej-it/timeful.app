import type { CompareTarget } from "./scenarios/index.js"
import type { Diff } from "./types.js"

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
