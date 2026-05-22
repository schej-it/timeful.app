// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as UtilsModule from "@/utils"
import {
  buttonStubWithDisabled,
  mergeComponentStubs,
  nullStub,
  passThroughStub,
  vTextFieldStub,
} from "@/test/componentStubs"
import TimefulImportDialog from "./TimefulImportDialog.vue"

const { postMock, pushMock, showInfoMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  pushMock: vi.fn(),
  showInfoMock: vi.fn(),
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    post: postMock,
  }
})

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showInfo: showInfoMock,
  }),
}))

const dialogStubs = mergeComponentStubs({
  "v-btn": buttonStubWithDisabled,
  "v-card": passThroughStub,
  "v-card-actions": passThroughStub,
  "v-card-text": passThroughStub,
  "v-card-title": passThroughStub,
  "v-dialog": passThroughStub,
  "v-icon": nullStub,
  "v-spacer": passThroughStub,
  "v-text-field": vTextFieldStub,
})

const mountDialog = () =>
  mount(TimefulImportDialog, {
    props: {
      modelValue: true,
    },
    global: {
      stubs: dialogStubs,
    },
  })

const findButtonByText = (
  wrapper: ReturnType<typeof mountDialog>,
  text: string
) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing "${text}"`)
  }

  return button
}

describe("TimefulImportDialog", () => {
  beforeEach(() => {
    postMock.mockReset()
    pushMock.mockReset()
    showInfoMock.mockReset()
  })

  it("uses explicit outlined compact field props and preserves loading and validation wiring", async () => {
    let resolveImport!: (value: { shortId: string }) => void
    postMock.mockImplementationOnce(
      () =>
        new Promise<{ shortId: string }>(resolve => {
          resolveImport = resolve
        })
    )

    const wrapper = mountDialog()
    const textField = wrapper.getComponent(vTextFieldStub)

    expect(textField.props("variant")).toBe("outlined")
    expect(textField.props("density")).toBe("compact")
    expect(textField.props("disabled")).toBe(false)
    expect(textField.props("errorMessages")).toBe("")

    await wrapper.get('input[placeholder="https://timeful.app/e/abc123"]').setValue(
      "https://remote.example/e/abc123"
    )
    await findButtonByText(wrapper, "Import").trigger("click")

    expect(textField.props("disabled")).toBe(true)
    expect(findButtonByText(wrapper, "Cancel").attributes("disabled")).toBeDefined()

    resolveImport({ shortId: "new123" })
    await flushPromises()

    await wrapper.get('input[placeholder="https://timeful.app/e/abc123"]').setValue(
      "http://localhost/e/blocked"
    )
    await findButtonByText(wrapper, "Import").trigger("click")

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(textField.props("disabled")).toBe(false)
    expect(textField.props("errorMessages")).toBe("Not allowed to import from this URL.")
  })
})
