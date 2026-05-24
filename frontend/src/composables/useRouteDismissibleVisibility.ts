import { computed, ref } from "vue"
import { useRoute, type RouteRecordName } from "vue-router"

type StorageLike = Pick<Storage, "getItem" | "setItem">

const DISMISSED_STORAGE_VALUE = "true"

const getStorage = (): StorageLike | undefined => {
  if (typeof globalThis.localStorage === "undefined") {
    return undefined
  }

  return globalThis.localStorage
}

const readDismissedState = (
  storage: StorageLike | undefined,
  storageKey: string
): boolean => {
  return storage?.getItem(storageKey) === DISMISSED_STORAGE_VALUE
}

interface RouteDismissibleVisibilityOptions {
  storage?: StorageLike
  onDismiss?: () => void
}

export const useRouteDismissibleVisibility = (
  routeName: RouteRecordName,
  storageKey: string,
  options: RouteDismissibleVisibilityOptions = {}
) => {
  const route = useRoute()
  const storage = options.storage ?? getStorage()
  const dismissed = ref(readDismissedState(storage, storageKey))

  const show = computed({
    get: () => route.name === routeName && !dismissed.value,
    set: (value: boolean) => {
      if (value || dismissed.value) {
        return
      }

      dismissed.value = true
      storage?.setItem(storageKey, DISMISSED_STORAGE_VALUE)
      options.onDismiss?.()
    },
  })

  const dismiss = () => {
    show.value = false
  }

  return {
    show,
    dismiss,
  }
}
