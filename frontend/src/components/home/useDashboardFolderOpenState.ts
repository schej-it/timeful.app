import { ref, watch, type Ref } from "vue"
import type { Folder } from "@/types"

type FolderOpenState = Record<string, boolean>
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

const DEFAULT_FOLDER_OPEN_STATE: FolderOpenState = { "no-folder": true }

export const DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY = "folderOpenState"

const getStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") {
    return undefined
  }

  return window.localStorage
}

const isFolderOpenState = (value: unknown): value is FolderOpenState => {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(entry => typeof entry === "boolean")
}

const readFolderOpenState = (storage: StorageLike | undefined): FolderOpenState => {
  if (storage == null) {
    return { ...DEFAULT_FOLDER_OPEN_STATE }
  }

  try {
    const storedState = storage.getItem(DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY)

    if (storedState == null) {
      return { ...DEFAULT_FOLDER_OPEN_STATE }
    }

    const parsedState: unknown = JSON.parse(storedState)

    if (isFolderOpenState(parsedState)) {
      return parsedState
    }
  } catch (error) {
    console.error("Error reading folderOpenState from localStorage", error)
    storage.removeItem(DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY)
  }

  return { ...DEFAULT_FOLDER_OPEN_STATE }
}

export const useDashboardFolderOpenState = (
  folders: Ref<Folder[]>,
  storage: StorageLike | undefined = getStorage()
) => {
  const folderOpenState = ref<FolderOpenState>(readFolderOpenState(storage))

  const toggleFolder = (folderId: string) => {
    folderOpenState.value = {
      ...folderOpenState.value,
      [folderId]: !folderOpenState.value[folderId],
    }
  }

  watch(
    folderOpenState,
    newState => {
      if (storage == null) {
        return
      }

      try {
        storage.setItem(
          DASHBOARD_FOLDER_OPEN_STATE_STORAGE_KEY,
          JSON.stringify(newState)
        )
      } catch (error) {
        console.error("Error saving folderOpenState to localStorage", error)
      }
    },
    { deep: true }
  )

  watch(
    folders,
    newFolders => {
      newFolders.forEach(folder => {
        if (folder._id && !(folder._id in folderOpenState.value)) {
          folderOpenState.value = {
            ...folderOpenState.value,
            [folder._id]: true,
          }
        }
      })
    },
    { immediate: true }
  )

  return {
    folderOpenState,
    toggleFolder,
  }
}
