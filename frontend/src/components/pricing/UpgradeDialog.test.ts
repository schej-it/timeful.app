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

const getPostCalls = (path: string) =>
  postMock.mock.calls.filter(([requestPath]) => requestPath === path)

const devPrices = {
  monthly: "$9.99",
  yearly: "$6.66",
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
    postMock.mockImplementation((path: string) => {
      if (path === "/stripe/create-checkout-session") {
        return { url: "https://checkout.example/session" }
      }

      return { ok: true }
    })
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

  it("loads and renders fetched pricing state for both paywall variants", async () => {
    const v1Wrapper = mountUpgradeDialog("v1")
    const v2Wrapper = mountUpgradeDialog("v2")
    await flushPromises()

    expect(getMock).not.toHaveBeenCalled()
    expect(v1Wrapper.text()).toContain(devPrices.monthly)
    expect(v1Wrapper.text()).toContain(devPrices.yearly)
    expect(v2Wrapper.text()).toContain(devPrices.yearly)
    expect(v2Wrapper.text()).toContain("Billed annually")
  })

  it("keeps unauthenticated upgrade routing wired through the existing handler", async () => {
    const v1Wrapper = mountUpgradeDialog("v1")
    const v2Wrapper = mountUpgradeDialog("v2")
    await flushPromises()
    postMock.mockClear()

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

  it("creates a checkout session for authenticated upgrades and redirects to the returned url", async () => {
    authUser.value = { _id: "user-123" }
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined)
    const wrapper = mountUpgradeDialog("v2")
    await flushPromises()
    postMock.mockClear()

    await findUpgradeButton(wrapper).trigger("click")
    await flushPromises()

    expect(getPostCalls("/stripe/create-checkout-session")).toHaveLength(1)
    expect(getPostCalls("/stripe/create-checkout-session")[0]?.[1]).toMatchObject({
      priceId: "price_dev_yearly",
      userId: "user-123",
      isSubscription: true,
      originUrl: "http://localhost:3000/",
    })
    expect(assignSpy).toHaveBeenCalledWith("https://checkout.example/session")
    expect(captureMock).toHaveBeenCalledWith("upgrade_clicked", { price: devPrices.yearly })

    assignSpy.mockRestore()
  })

  it("tracks a single dialog view per open cycle and resets after closing", async () => {
    const wrapper = mountUpgradeDialog("v2")
    await flushPromises()

    expect(getPostCalls("/analytics/upgrade-dialog-viewed")).toHaveLength(1)
    expect(captureMock).toHaveBeenCalledWith("upgrade_dialog_viewed", {
      price: "MONTHLY: /mo, YEARLY: /mo",
      type: upgradeDialogTypes.CREATE_EVENT,
    })

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    expect(getPostCalls("/analytics/upgrade-dialog-viewed")).toHaveLength(2)
    expect(captureMock).toHaveBeenCalledWith("upgrade_dialog_viewed", {
      price: `MONTHLY: ${devPrices.monthly}/mo, YEARLY: ${devPrices.yearly}/mo`,
      type: upgradeDialogTypes.CREATE_EVENT,
    })
  })
})
