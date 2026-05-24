// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { defineComponent } from "vue"
import { describe, expect, it } from "vitest"
import { passThroughStub } from "@/test/componentStubs"
import HowItWorksDialog from "./HowItWorksDialog.vue"

const VDialogStub = defineComponent({
  name: "VDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <div>
      <button class="close-dialog" @click="$emit('update:modelValue', false)" />
      <slot />
    </div>
  `,
})

describe("HowItWorksDialog", () => {
  it("forwards dialog visibility through modelValue without a local mirror", async () => {
    const wrapper = mount(HowItWorksDialog, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          "v-dialog": VDialogStub,
          "v-card": passThroughStub,
          "v-card-actions": passThroughStub,
          "v-card-text": passThroughStub,
          "v-card-title": passThroughStub,
          "v-spacer": passThroughStub,
        },
      },
    })

    expect(wrapper.getComponent(VDialogStub).props("modelValue")).toBe(true)

    await wrapper.get("button.close-dialog").trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
  })
})
