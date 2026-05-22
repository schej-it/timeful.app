// @vitest-environment happy-dom

/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from "@vue/test-utils"
import { defineComponent, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventTypes } from "@/constants"
import type * as UtilsModule from "@/utils"
import { passThroughStub, vTextFieldStub } from "@/test/componentStubs"
import EventItem from "./EventItem.vue"
import eventItemSource from "./EventItem.vue?raw"

const {
  archiveEventMock,
  captureMock,
  clipboardWriteTextMock,
  deleteMock,
  getEventsMock,
  postMock,
  refreshAuthUserMock,
  setEventFolderMock,
  showErrorMock,
  showInfoMock,
} = vi.hoisted(() => ({
  archiveEventMock: vi.fn(),
  captureMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
  deleteMock: vi.fn(),
  getEventsMock: vi.fn(),
  postMock: vi.fn(),
  refreshAuthUserMock: vi.fn(),
  setEventFolderMock: vi.fn(),
  showErrorMock: vi.fn(),
  showInfoMock: vi.fn(),
}))

const authUser = ref({ _id: "owner-1" })
const folders = ref([
  { _id: "folder-1", name: "Trips" },
  { _id: "folder-2", name: "Ideas" },
])

vi.mock("pinia", () => ({
  storeToRefs: (store: { authUser: unknown; folders: unknown }) => ({
    authUser: store.authUser,
    folders: store.folders,
  }),
}))

vi.mock("@/stores/main", () => ({
  useMainStore: () => ({
    archiveEvent: archiveEventMock,
    authUser,
    folders,
    getEvents: getEventsMock,
    refreshAuthUser: refreshAuthUserMock,
    setEventFolder: setEventFolderMock,
    showError: showErrorMock,
    showInfo: showInfoMock,
  }),
}))

vi.mock("@/plugins/posthog", () => ({
  posthog: {
    capture: captureMock,
  },
}))

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof UtilsModule>("@/utils")

  return {
    ...actual,
    _delete: deleteMock,
    getDateRangeStringForEvent: () => "Jan 1",
    post: postMock,
  }
})

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
      <slot />
    </div>
  `,
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
  inheritAttrs: false,
  props: {
    id: {
      type: String,
      default: undefined,
    },
  },
  emits: ["click"],
  template: `
    <button :id="id" @click="$emit('click')">
      <slot />
      <slot name="append" />
    </button>
  `,
})

const VBtnStub = defineComponent({
  name: "VBtn",
  emits: ["click"],
  template: "<button @click=\"$emit('click', $event)\"><slot /></button>",
})

const VIconStub = defineComponent({
  name: "VIcon",
  template: "<i><slot /></i>",
})

const VCheckboxStub = defineComponent({
  name: "VCheckbox",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  template: `
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
  `,
})

const mountEventItem = () =>
  mount(EventItem, {
    props: {
      event: {
        _id: "evt-1",
        shortId: "abc123",
        ownerId: "owner-1",
        name: "Planning",
        numResponses: 3,
        isArchived: false,
        notificationsEnabled: true,
        type: eventTypes.SPECIFIC_DATES,
      },
      folderId: "folder-1",
    },
    global: {
      directives: {
        ripple: {},
      },
      stubs: {
        "router-link": passThroughStub,
        "v-btn": VBtnStub,
        "v-card": passThroughStub,
        "v-card-actions": passThroughStub,
        "v-card-text": passThroughStub,
        "v-card-title": passThroughStub,
        "v-checkbox": VCheckboxStub,
        "v-chip": passThroughStub,
        "v-container": passThroughStub,
        "v-dialog": VDialogStub,
        "v-divider": passThroughStub,
        "v-icon": VIconStub,
        "v-list": VListStub,
        "v-list-item": VListItemStub,
        "v-list-item-title": passThroughStub,
        "v-menu": VMenuStub,
        "v-spacer": passThroughStub,
        "v-text-field": vTextFieldStub,
      },
    },
  })

const findButtonByText = (
  wrapper: ReturnType<typeof mountEventItem>,
  text: string
) => {
  const button = wrapper.findAll("button").find(candidate => candidate.text().includes(text))

  if (button == null) {
    throw new Error(`Expected button containing "${text}"`)
  }

  return button
}

describe("EventItem", () => {
  beforeEach(() => {
    archiveEventMock.mockReset()
    captureMock.mockReset()
    clipboardWriteTextMock.mockReset()
    deleteMock.mockReset()
    getEventsMock.mockReset()
    postMock.mockReset()
    refreshAuthUserMock.mockReset()
    setEventFolderMock.mockReset()
    showErrorMock.mockReset()
    showInfoMock.mockReset()
    clipboardWriteTextMock.mockResolvedValue(undefined)
    deleteMock.mockResolvedValue(undefined)
    postMock.mockResolvedValue({ eventId: "evt-copy", shortId: "copy123" })
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: clipboardWriteTextMock,
      },
    })
  })

  it("uses explicit compact list density and Vuetify 3 list append slots", () => {
    expect(eventItemSource).toContain('<v-list class="tw-py-1" density="compact">')
    expect(eventItemSource).toContain('<v-list density="compact" class="tw-py-1">')
    expect(eventItemSource).toContain('<template #append>')
    expect(eventItemSource).toContain('<template v-if="folderId === null" #append>')
    expect(eventItemSource).toContain('<template v-if="folder._id === folderId" #append>')
    expect(eventItemSource).not.toContain("v-list-item-content")
    expect(eventItemSource).not.toContain("v-list-item-icon")
    expect(eventItemSource).not.toContain("v-list-item-action")
    expect(eventItemSource).not.toContain("solo\n")
  })

  it("keeps owner menus compact and preserves duplicate, copy, archive, and move actions", async () => {
    const wrapper = mountEventItem()

    const lists = wrapper.findAllComponents(VListStub)
    expect(lists).toHaveLength(2)
    expect(lists.every(list => list.props("density") === "compact")).toBe(true)
    expect(wrapper.getComponent(vTextFieldStub).props("variant")).toBe("solo")

    const currentFolderButton = findButtonByText(wrapper, "Trips")
    expect(currentFolderButton.text()).toContain("mdi-check")

    await findButtonByText(wrapper, "Copy link").trigger("click")
    expect(clipboardWriteTextMock).toHaveBeenCalledWith("http://localhost:3000/e/abc123")
    expect(showInfoMock).toHaveBeenCalledWith("Link copied to clipboard!")

    await findButtonByText(wrapper, "Archive").trigger("click")
    expect(archiveEventMock).toHaveBeenCalledWith({
      archive: true,
      eventId: "evt-1",
    })

    await findButtonByText(wrapper, "Ideas").trigger("click")
    expect(setEventFolderMock).toHaveBeenCalledWith({
      eventId: "evt-1",
      folderId: "folder-2",
    })

    await wrapper.get("input[placeholder='Name your event...']").setValue("Copy of Planning")
    await wrapper.get("#duplicate-event-btn").trigger("click")
    await findButtonByText(wrapper, "Confirm").trigger("click")
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith("/events/evt-1/duplicate", {
      copyAvailability: false,
      eventName: "Copy of Planning",
    })
    expect(getEventsMock).toHaveBeenCalled()
  })
})
