// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils"
import { defineComponent, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { upgradeDialogTypes } from "@/constants"
import type * as UtilsModule from "@/utils"
import {
  buttonStubWithDisabled,
  mergeComponentStubs,
  nullStub,
  passThroughStub,
} from "@/test/componentStubs"
import UpgradeDialog from "./UpgradeDialog.vue"
import upgradeDialogSource from "./UpgradeDialog.vue?raw"

const { getMock, postMock, pushMock, captureMock, getDistinctIdMock } = vi.hoisted(
  () => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    pushMock: vi.fn(),
    captureMock: vi.fn(),
    getDistinctIdMock: vi.fn(() => "distinct-id"),
  })
)

const featureFlagsLoaded = ref(false)
const pricingPageConversion = ref("control")
const authUser = ref<null | { _id: string }>(null)
const upgradeDialogType = ref(upgradeDialogTypes.CREATE_EVENT)
const upgradeDialogData = ref(null)

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    get: getMock,
    post: postMock,
  }
})

vi.mock("pinia", () => ({
  storeToRefs: () => ({
    authUser,
    featureFlagsLoaded,
    pricingPageConversion,
    upgradeDialogData,
    upgradeDialogType,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    showError: vi.fn(),
  }),
}))

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
    get_distinct_id: getDistinctIdMock,
  },
}))

const VCheckboxStub = defineComponent({
  name: "VCheckbox",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    density: {
      type: String,
      default: undefined,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <div>
      <button class="student-toggle" @click="$emit('update:modelValue', !modelValue)" />
    </div>
  `,
})

const upgradeDialogStubs = mergeComponentStubs({
  AlreadyDonatedDialog: passThroughStub,
  SlideToggle: passThroughStub,
  StudentProofDialog: passThroughStub,
  "v-btn": buttonStubWithDisabled,
  "v-card": passThroughStub,
  "v-checkbox": VCheckboxStub,
  "v-dialog": passThroughStub,
  "v-fade-transition": passThroughStub,
  "v-icon": nullStub,
})

const priceResponse = {
  lifetime: { id: "price_lifetime", unit_amount: 9999, recurring: null },
  monthly: { id: "price_monthly", unit_amount: 999, recurring: { interval: "month" } },
  yearly: { id: "price_yearly", unit_amount: 7999, recurring: { interval: "year" } },
  lifetimeStudent: { id: "price_lifetime_student", unit_amount: 4999, recurring: null },
  monthlyStudent: { id: "price_monthly_student", unit_amount: 499, recurring: { interval: "month" } },
  yearlyStudent: { id: "price_yearly_student", unit_amount: 3999, recurring: { interval: "year" } },
}

const mountUpgradeDialog = (version: "v1" | "v2") =>
  mount(UpgradeDialog, {
    props: {
      modelValue: true,
      version,
    },
    global: {
      stubs: upgradeDialogStubs,
    },
  })

const findUpgradeButton = (wrapper: ReturnType<typeof mountUpgradeDialog>) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes("Upgrade"))

  if (button == null) {
    throw new Error("Expected Upgrade button")
  }

  return button
}

describe("UpgradeDialog", () => {
  beforeEach(() => {
    featureFlagsLoaded.value = false
    pricingPageConversion.value = "control"
    authUser.value = null
    upgradeDialogType.value = upgradeDialogTypes.CREATE_EVENT
    upgradeDialogData.value = null
    getMock.mockReset()
    postMock.mockReset()
    pushMock.mockReset()
    captureMock.mockReset()
    getDistinctIdMock.mockClear()
    getMock.mockResolvedValue(priceResponse)
    postMock.mockResolvedValue({ ok: true })
  })

  it("uses compact student checkboxes in both paywall variants", async () => {
    const v1Wrapper = mountUpgradeDialog("v1")
    const v2Wrapper = mountUpgradeDialog("v2")
    await flushPromises()

    const checkboxes = [
      v1Wrapper.getComponent(VCheckboxStub),
      v2Wrapper.getComponent(VCheckboxStub),
    ]

    expect(upgradeDialogSource).toContain('density="compact"')
    expect(upgradeDialogSource).not.toContain("\n          dense\n")
    for (const checkbox of checkboxes) {
      expect(checkbox.props("density")).toBe("compact")
    }
  })

  it("keeps the same student toggle behavior in v1 and v2", async () => {
    const v1Wrapper = mountUpgradeDialog("v1")
    const v2Wrapper = mountUpgradeDialog("v2")
    await flushPromises()

    await v1Wrapper.get(".student-toggle").trigger("click")
    await v2Wrapper.get(".student-toggle").trigger("click")

    expect(v1Wrapper.text()).toContain("Pinky promise that you're actually a student?")
    expect(v2Wrapper.text()).toContain("Pinky promise that you're actually a student?")
  })

  it("keeps unauthenticated upgrade routing wired through the existing handler", async () => {
    const v1Wrapper = mountUpgradeDialog("v1")
    const v2Wrapper = mountUpgradeDialog("v2")
    await flushPromises()

    await findUpgradeButton(v1Wrapper).trigger("click")
    await findUpgradeButton(v2Wrapper).trigger("click")

    expect(pushMock).toHaveBeenCalledTimes(2)
    for (const call of pushMock.mock.calls) {
      const route = call[0] as {
        name: string
        query: {
          redirect: string
          upgradeParams: string
        }
      }

      expect(route).toMatchObject({
        name: "sign-up",
        query: {
          redirect: "upgrade",
        },
      })
      expect(typeof route.query.upgradeParams).toBe("string")
    }
    expect(v1Wrapper.emitted("update:modelValue")).toContainEqual([false])
    expect(v2Wrapper.emitted("update:modelValue")).toContainEqual([false])
  })
})
