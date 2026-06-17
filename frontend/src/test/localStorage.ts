type StorageSeed = Record<string, string>

type LocalStorageMock = Storage & Record<string, unknown>

export const createLocalStorageMock = (seed: StorageSeed = {}): LocalStorageMock => {
  const builtInKeys = new Set([
    "getItem",
    "setItem",
    "removeItem",
    "clear",
    "key",
    "length",
  ])
  const getStoredKeys = (storage: LocalStorageMock) =>
    Object.keys(storage).filter((key) => !builtInKeys.has(key))
  const store = new Map<string, string>(Object.entries(seed))

  const target: LocalStorageMock = {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
      this[key] = value
    },
    removeItem(key: string) {
      store.delete(key)
      Reflect.deleteProperty(this, key)
    },
    clear() {
      store.clear()
      for (const key of getStoredKeys(this)) {
        Reflect.deleteProperty(this, key)
      }
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    get length() {
      return store.size
    },
  }

  for (const [key, value] of Object.entries(seed)) {
    target[key] = value
  }

  return target
}
