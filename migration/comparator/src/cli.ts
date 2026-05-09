import type { CompareTarget } from "./scenarios/index.js"

export function parseArgs(argv: string[], supportedTargets: CompareTarget[]): CompareTarget {
  let target: CompareTarget = "landing"

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--target") {
      const value = argv[index + 1]

      if (!value) {
        throw new Error(
          `Missing value for --target. Supported targets: ${supportedTargets.join(", ")}`,
        )
      }

      if (!supportedTargets.includes(value as CompareTarget)) {
        throw new Error(
          `Unknown target ${JSON.stringify(value)}. Supported targets: ${supportedTargets.join(", ")}`,
        )
      }

      target = value as CompareTarget
      index += 1
      continue
    }

    throw new Error(`Unknown argument ${JSON.stringify(arg)}. Supported flags: --target`)
  }

  return target
}
