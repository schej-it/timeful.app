import { describe, expect, it } from "vitest"
import newDialogSource from "./NewDialog.vue?raw"

describe("NewDialog", () => {
  it("only renders the wrapper header when tabs are visible and otherwise delegates close actions to child dialogs", () => {
    expect(newDialogSource).toContain(
      '<div v-if="!_noTabs" class="tw-flex tw-rounded sm:-tw-mt-4 sm:tw-px-8">'
    )
    expect(newDialogSource).toContain(':hide-dialog-actions="!_noTabs"')
  })
})
