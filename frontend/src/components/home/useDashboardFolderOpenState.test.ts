// @vitest-environment happy-dom

import { nextTick, ref } from "vue"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Folder } from "@/types"
import { createLocalStorageMock } from "@/test/localStorage"
import {
  DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY,
  useDashboardFolderOpenState,
} from "./useDashboardFolderOpenState"

const makeFolder = (id: string): Folder => ({
  _id: id,
  color: "#D3D3D3",
  eventIds: [],
  name: `Folder ${id}`,
})

describe("useDashboardFolderOpenState", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock())
  })

  it("restores stored state and persists toggles through the storage boundary", async () => {
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        [DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY]: JSON.stringify({
          "folder-1": false,
        }),
      })
    )

    const folders = ref<Folder[]>([makeFolder("folder-1")])
    const { folderOpenState, toggleFolder } = useDashboardFolderOpenState(folders)

    expect(folderOpenState.value).toEqual({ "folder-1": false })

    toggleFolder("folder-1")
    await nextTick()

    expect(folderOpenState.value).toEqual({ "folder-1": true })
    expect(localStorage.getItem(DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY)).toBe(
      JSON.stringify({ "folder-1": true })
    )
  })

  it("opens newly discovered folders by default", async () => {
    const folders = ref<Folder[]>([])
    const { folderOpenState } = useDashboardFolderOpenState(folders)

    expect(folderOpenState.value).toEqual({ "no-folder": true })

    folders.value = [makeFolder("folder-2")]
    await nextTick()

    expect(folderOpenState.value).toEqual({
      "no-folder": true,
      "folder-2": true,
    })
    expect(localStorage.getItem(DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY)).toBe(
      JSON.stringify({
        "no-folder": true,
        "folder-2": true,
      })
    )
  })
})
