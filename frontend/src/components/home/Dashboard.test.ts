// @vitest-environment happy-dom

/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils"
import { defineComponent, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createLocalStorageMock } from "@/test/localStorage"
import { passThroughStub } from "@/test/componentStubs"
import Dashboard from "./Dashboard.vue"

const { createNewMock, deleteFolderMock, showUpgradeDialogMock } = vi.hoisted(() => ({
  createNewMock: vi.fn(),
  deleteFolderMock: vi.fn(),
  showUpgradeDialogMock: vi.fn(),
}))

const authUser = ref({ numEventsCreated: 0 })
const events = ref([])
const folders = ref([
  {
    _id: "folder-1",
    name: "Team",
    color: "#D3D3D3",
    eventIds: [],
  },
])
const viewerHasPremiumAccess = ref(true)

vi.mock("pinia", () => ({
  storeToRefs: (store: {
    authUser: unknown
    events: unknown
    folders: unknown
    viewerHasPremiumAccess: unknown
  }) => ({
    authUser: store.authUser,
    events: store.events,
    folders: store.folders,
    viewerHasPremiumAccess: store.viewerHasPremiumAccess,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    authUser,
    createNew: createNewMock,
    deleteFolder: deleteFolderMock,
    events,
    folders,
    showUpgradeDialog: showUpgradeDialogMock,
    viewerHasPremiumAccess,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}))

const VMenuStub = defineComponent({
  name: "VMenu",
  template: `
    <div>
      <slot name="activator" :props="{}" />
      <slot />
    </div>
  `,
})

const VDialogStub = defineComponent({
  name: "VDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div>
      <slot name="activator" :props="{}" />
      <slot v-if="modelValue" />
    </div>
  `,
})

const VBtnStub = defineComponent({
  name: "VBtn",
  emits: ["click"],
  template: "<button @click=\"$emit('click')\"><slot /></button>",
})

const VChipStub = defineComponent({
  name: "VChip",
  emits: ["click"],
  template: "<button @click=\"$emit('click')\"><slot /></button>",
})

const VListStub = defineComponent({
  name: "VList",
  props: {
    density: {
      type: String,
      default: undefined,
    },
  },
  template: "<div><slot /></div>",
})

const VListItemStub = defineComponent({
  name: "VListItem",
  emits: ["click"],
  template: "<button @click=\"$emit('click', $event)\"><slot /></button>",
})

const DraggableStub = defineComponent({
  name: "SortableDraggableStub",
  props: {
    list: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div>
      <slot name="header" />
      <slot
        v-for="element in list"
        name="item"
        :element="element"
      />
    </div>
  `,
})

const mountDashboard = () =>
  mount(Dashboard, {
    global: {
      stubs: {
        EventItem: true,
        draggable: DraggableStub,
        "v-btn": VBtnStub,
        "v-card": passThroughStub,
        "v-card-actions": passThroughStub,
        "v-card-text": passThroughStub,
        "v-card-title": passThroughStub,
        "v-chip": VChipStub,
        "v-dialog": VDialogStub,
        "v-icon": true,
        "v-list": VListStub,
        "v-list-item": VListItemStub,
        "v-list-item-title": passThroughStub,
        "v-menu": VMenuStub,
        "v-spacer": passThroughStub,
        "v-text-field": true,
      },
    },
  })

const findButtonByText = (
  wrapper: ReturnType<typeof mountDashboard>,
  text: string
) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing "${text}"`)
  }

  return button
}

describe("Dashboard", () => {
  beforeEach(() => {
    createNewMock.mockReset()
    deleteFolderMock.mockReset()
    showUpgradeDialogMock.mockReset()
    vi.stubGlobal("localStorage", createLocalStorageMock())
  })

  it("uses compact density for the folder action menu list", () => {
    const wrapper = mountDashboard()
    expect(wrapper.getComponent(VListStub).props("density")).toBe("compact")
  })

  it("keeps edit and delete folder actions wired to the same dialogs", async () => {
    const wrapper = mountDashboard()

    await findButtonByText(wrapper, "Edit").trigger("click")
    expect(wrapper.text()).toContain("Edit folder")

    await findButtonByText(wrapper, "Delete").trigger("click")
    expect(wrapper.text()).toContain('Delete "Team"?')
  })
})
