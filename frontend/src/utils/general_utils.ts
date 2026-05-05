/*
  General utils
*/

import { eventTypes, UTC } from "@/constants"
import type { Event, User } from "@/types"
import {
  dateToDowDate,
  getRenderedWeekStart,
} from "./scheduleDateRules"
import type { ZonedDateTime } from "./temporalPrimitives"
import { toZDT } from "./timezoneDateRules"
import Color from "color"
import type { useDisplay } from "vuetify"

type Display = ReturnType<typeof useDisplay>

let timeoutId: ReturnType<typeof setTimeout> | null = null
/** Calls callback() on long press */
export const onLongPress = (
  element: HTMLElement,
  callback: (target: EventTarget | null) => void,
  capture = false
): void => {
  element.addEventListener(
    "touchstart",
    function (e) {
      timeoutId = setTimeout(function () {
        timeoutId = null
        e.stopPropagation()
        callback(e.target)
      }, 500)
    },
    capture
  )

  element.addEventListener(
    "contextmenu",
    function (e) {
      e.preventDefault()
    },
    capture
  )

  element.addEventListener(
    "touchend",
    function () {
      if (timeoutId) clearTimeout(timeoutId)
    },
    capture
  )

  element.addEventListener(
    "touchmove",
    function () {
      if (timeoutId) clearTimeout(timeoutId)
    },
    capture
  )
}

/** Returns whether the given value is between lower and upper */
export const isBetween = <T>(
  value: T,
  lower: T,
  upper: T,
  inclusive = true
): boolean => {
  if (inclusive) {
    return value >= lower && value <= upper
  } else {
    return value > lower && value < upper
  }
}

/** Clamps the given value between the given ranges */
export const clamp = (value: number, lower: number, upper: number): number => {
  if (value < lower) return lower
  if (value > upper) return upper
  return value
}

// Phase 3 split: Vuetify 3's `useDisplay()` only works inside `setup()`. These
// helpers now accept the unwrapped result of `useDisplay()`; components consume
// them through `useDisplayHelpers.ts`.
export const isPhone = (display: Display): boolean => {
  return display.name.value === "xs"
}

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export const br = (display: Display, breakpoint: string): boolean => {
  return display.name.value === breakpoint
}

/** convert base64 to raw binary data held in a string */
export const dataURItoBlob = (dataURI: string): Blob => {
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const byteString = atob(dataURI.split(",")[1])

  // separate out the mime component
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0]

  // write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: mimeString })
}

/** Reformats the given event object to the format we want */
export const processEvent = (
  event: Event,
  renderedWeekStart?: ZonedDateTime
): void => {
  if (!event.dates?.length || event.duration == null) return
  let startDate: ZonedDateTime = event.dates[0]
  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    startDate = dateToDowDate(
      event.dates,
      startDate,
      0,
      true,
      event.startOnMonday,
      renderedWeekStart ?? getRenderedWeekStart(0, event.startOnMonday)
    )
  }

  // Convert to PlainTime for startTime using toZDT helper
  const startZDT = toZDT(startDate, UTC)
  event.startTime = startZDT.toPlainTime()

  // Calculate endTime by adding duration to startTime
  const endZDT = startZDT.add(event.duration)
  event.endTime = endZDT.toPlainTime()
}

/** Checks whether email is a valid email */
export const validateEmail = (email: string): RegExpMatchArray | null => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.exec(
    email.toLowerCase()
  )
}

export type CalendarSubMap = Record<string, { enabled: boolean }>
export type CalendarAccountsMap = Record<
  string,
  { enabled: boolean; subCalendars: CalendarSubMap }
>

/** Generates a group enabled calendar payload */
export const generateEnabledCalendarsPayload = (
  calendarAccounts: CalendarAccountsMap
): {
  guest: boolean
  useCalendarAvailability: boolean
  enabledCalendars: Record<string, string[]>
} => {
  const payload = {
    guest: false,
    useCalendarAvailability: true,
    enabledCalendars: {} as Record<string, string[]>,
  }

  /** Determine which sub calendars are enabled */
  for (const email in calendarAccounts) {
    if (calendarAccounts[email].enabled) {
      payload.enabledCalendars[email] = []
      for (const subCalendarId in calendarAccounts[email].subCalendars) {
        if (calendarAccounts[email].subCalendars[subCalendarId].enabled) {
          payload.enabledCalendars[email].push(subCalendarId)
        }
      }
    }
  }

  return payload
}

/** Returns whether touch is enabled on the device */
export const isTouchEnabled = (): boolean => {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    ((navigator as Navigator & { msMaxTouchPoints?: number })
      .msMaxTouchPoints ?? 0) > 0
  )
}

/** Returns whether the element is in the viewport */
export const isElementInViewport = (
  el: Element,
  {
    topOffset = 0,
    leftOffset = 0,
    rightOffset = 0,
    bottomOffset = 0,
  }: {
    topOffset?: number
    leftOffset?: number
    rightOffset?: number
    bottomOffset?: number
  }
): boolean => {
  const rect = el.getBoundingClientRect()

  return (
    rect.top >= topOffset &&
    rect.left >= leftOffset &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) +
        bottomOffset &&
    rect.right <=
      (window.innerWidth || document.documentElement.clientWidth) + rightOffset
  )
}

/** Converts hex with transparency to equivalent hex without transparency (on white background) */
export const removeTransparencyFromHex = (hexColor: string): string => {
  const color = Color(hexColor)

  // Y=255 - P*(255-X) : https://graphicdesign.stackexchange.com/questions/113007/how-to-determine-the-equivalent-opaque-rgb-color-for-a-given-partially-transpare
  const red = 255 - color.alpha() * (255 - color.red())
  const green = 255 - color.alpha() * (255 - color.green())
  const blue = 255 - color.alpha() * (255 - color.blue())

  const newColor = Color.rgb(red, green, blue)
  return newColor.hex()
}

/**
 * Returns whether a color is light or dark
 * Source: https://awik.io/determine-color-bright-dark-using-javascript/
 */
export const lightOrDark = (color: string): "light" | "dark" => {
  // Variables for red, green, blue values
  let r: number
  let g: number
  let b: number

  // Check the format of the color, HEX or RGB?
  if (/^rgb/.exec(color)) {
    // If RGB --> store the red, green, blue values in separate variables
    const match =
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/.exec(color)
    if (!match) {
      return "light"
    }

    r = Number(match[1])
    g = Number(match[2])
    b = Number(match[3])
  } else {
    // If hex --> Convert it to RGB: http://gist.github.com/983661
    const numeric = +(
      "0x" + color.slice(1).replace(color.length < 5 ? /./g : "", "$&$&")
    )

    r = numeric >> 16
    g = (numeric >> 8) & 255
    b = numeric & 255
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b))

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 127.5) {
    return "light"
  } else {
    return "dark"
  }
}

/** Returns whether the given user is a premium user */
export const isPremiumUser = (authUser: User | null | undefined): boolean => {
  if (!authUser) return false

  if (authUser.stripeCustomerId) {
    if (authUser.isPremium !== null && authUser.isPremium !== undefined) {
      return authUser.isPremium
    }
    return true
  }
  return false
}

/** Adds an event ID to the 'eventsCreated' list in localStorage */
export const addEventToCreatedList = (eventId: string): void => {
  const eventsCreated = getEventsCreated()
  eventsCreated.push(eventId)
  localStorage.setItem("eventsCreated", JSON.stringify(eventsCreated))
}

/** Returns the 'eventsCreated' list from localStorage */
export const getEventsCreated = (): string[] => {
  let eventsCreated: unknown
  try {
    eventsCreated = JSON.parse(localStorage.getItem("eventsCreated") ?? "null")
  } catch {
    eventsCreated = null
  }
  if (!Array.isArray(eventsCreated)) {
    return []
  }
  return eventsCreated as string[]
}

/** Deletes the 'eventsCreated' list from localStorage */
export const deleteEventsCreated = (): void => {
  localStorage.removeItem("eventsCreated")
}

export const prefersStartOnMonday = (): boolean => {
  let defaultStartOnMonday: boolean
  try {
    defaultStartOnMonday = weekStartLocale(navigator.language) === "mon"
  } catch {
    defaultStartOnMonday = false
  }
  return localStorage.startCalendarOnMonday == undefined
    ? defaultStartOnMonday
    : localStorage.startCalendarOnMonday == "true"
}

/** Source: https://stackoverflow.com/questions/53382465/how-can-i-determine-if-week-starts-on-monday-or-sunday-based-on-locale-in-pure-j */
function weekStart(
  region: string | undefined,
  language: string | undefined
): "sun" | "sat" | "mon" {
  const regionSat = "AEAFBHDJDZEGIQIRJOKWLYOMQASDSY".match(/../g) as string[]
  const regionSun =
    "AGARASAUBDBRBSBTBWBZCACNCODMDOETGTGUHKHNIDILINJMJPKEKHKRLAMHMMMOMTMXMZNINPPAPEPHPKPRPTPYSASGSVTHTTTWUMUSVEVIWSYEZAZW".match(
      /../g
    ) as string[]
  const languageSat = ["ar", "arq", "arz", "fa"]
  const languageSun =
    "amasbndzengnguhehiidjajvkmknkolomhmlmrmtmyneomorpapssdsmsnsutatethtnurzhzu".match(
      /../g
    ) as string[]

  return region
    ? regionSun.includes(region)
      ? "sun"
      : regionSat.includes(region)
      ? "sat"
      : "mon"
    : language && languageSun.includes(language)
    ? "sun"
    : language && languageSat.includes(language)
    ? "sat"
    : "mon"
}
function weekStartLocale(locale: string): "sun" | "sat" | "mon" {
  const parts =
    /^([a-z]{2,3})(?:-([a-z]{3})(?=$|-))?(?:-([a-z]{4})(?=$|-))?(?:-([a-z]{2}|\d{3})(?=$|-))?/i.exec(
      locale
    )
  if (!parts) return "mon"
  return weekStart(parts[4], parts[1])
}
