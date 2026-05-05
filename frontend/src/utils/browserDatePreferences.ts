import { timeTypes } from "@/constants"

type StorageWithTimeType = Storage & { timeType?: unknown }

const getNavigator = (): Navigator | undefined => {
  return typeof globalThis.navigator === "undefined" ? undefined : globalThis.navigator
}

const getStorage = (): Storage | undefined => {
  return typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage
}

const getStoredTimeType = (storage: Storage | undefined): string | undefined => {
  if (!storage) {
    return undefined
  }

  const timeType = (storage as StorageWithTimeType).timeType
  if (typeof timeType === "string") {
    return timeType
  }

  const storedValue = storage.getItem("timeType")
  return storedValue ?? undefined
}

export const getLocale = (): string => {
  const navigator = getNavigator()
  return (
    (navigator ? navigator.languages[0] : undefined) ??
    navigator?.language ??
    Intl.DateTimeFormat().resolvedOptions().locale
  )
}

export const userPrefers12h = (): boolean => {
  return (
    Intl.DateTimeFormat(getLocale(), { hour: "numeric" }).resolvedOptions()
      .hour12 ?? true
  )
}

export const getTimeOptions = (): {
  text: string
  time: number
  value: number
}[] => {
  const storedTimeType = getStoredTimeType(getStorage())
  const prefers12h =
    storedTimeType == undefined
      ? userPrefers12h()
      : storedTimeType === timeTypes.HOUR12

  const times: { text: string; time: number; value: number }[] = []
  if (prefers12h) {
    times.push({ text: "12 am", time: 0, value: 0 })
    for (let h = 1; h < 12; ++h) {
      times.push({ text: `${String(h)} am`, time: h, value: h })
    }
    for (let h = 0; h < 12; ++h) {
      times.push({
        text: `${String(h === 0 ? 12 : h)} pm`,
        time: h + 12,
        value: h + 12,
      })
    }
    times.push({ text: "12 am", time: 0, value: 24 })
    return times
  }

  for (let h = 0; h < 24; ++h) {
    times.push({ text: `${String(h)}:00`, time: h, value: h })
  }
  times.push({ text: "0:00", time: 0, value: 24 })
  return times
}
