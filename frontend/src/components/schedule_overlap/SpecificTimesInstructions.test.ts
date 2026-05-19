// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import SpecificTimesInstructions from "./SpecificTimesInstructions.vue"

describe("SpecificTimesInstructions", () => {
  it("emits saveTempTimes when Next is clicked", async () => {
    const wrapper = mount(SpecificTimesInstructions, {
      props: {
        numTempTimes: 1,
      },
      global: {
        stubs: {
          "v-btn": {
            props: ["disabled"],
            template:
              '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.get("button").trigger("click")

    expect(wrapper.emitted("saveTempTimes")?.length).toBeGreaterThan(0)
  })

  it("disables Next when there are no temporary times selected", () => {
    const wrapper = mount(SpecificTimesInstructions, {
      props: {
        numTempTimes: 0,
      },
      global: {
        stubs: {
          "v-btn": {
            props: ["disabled"],
            template: '<button :disabled="disabled"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.get("button").attributes("disabled")).toBeDefined()
  })
})
