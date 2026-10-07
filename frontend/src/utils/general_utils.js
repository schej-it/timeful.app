/*
  General utils
*/

import { eventTypes } from "@/constants"
import { dateToDowDate, dateToTimeNum } from "./date_utils"
import Color from "color"

var timeoutId
/** Calls callback() on long press */
export const onLongPress = (element, callback, capture = false) => {
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
export const isBetween = (value, lower, upper, inclusive = true) => {
  if (inclusive) {
    return value >= lower && value <= upper
  } else {
    return value > lower && value < upper
  }
}

/** Clamps the given value between the given ranges */
export const clamp = (value, lower, upper) => {
  if (value < lower) return lower
  if (value > upper) return upper
  return value
}

export const isPhone = (vuetify) => {
  return vuetify.breakpoint.name === "xs"
}

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export const br = (vuetify, breakpoint) => {
  return vuetify.breakpoint.name === breakpoint
}

/** convert base64 to raw binary data held in a string */
export const dataURItoBlob = (dataURI) => {
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(",")[1])

  // separate out the mime component
  var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: mimeString })
}

/** Reformats the given event object to the format we want */
export const processEvent = (event) => {
  let startDate = event.dates[0]
  if (event.type === eventTypes.DOW || event.type === eventTypes.GROUP) {
    startDate = dateToDowDate(event.dates, startDate, 0, true)
  }

  event.startTime = dateToTimeNum(new Date(startDate), true)
  event.endTime = (event.startTime + event.duration) % 24
}

/** Checks whether email is a valid email */
export const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
}

/** Generates a group enabled calendar payload */
export const generateEnabledCalendarsPayload = (calendarAccounts) => {
  const payload = {}

  payload.guest = false
  payload.useCalendarAvailability = true
  payload.enabledCalendars = {}

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
export const isTouchEnabled = () => {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

/** Returns whether the element is in the viewport */
export const isElementInViewport = (
  el,
  { topOffset = 0, leftOffset = 0, rightOffset = 0, bottomOffset = 0 }
) => {
  var rect = el.getBoundingClientRect()

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
export const removeTransparencyFromHex = (hexColor) => {
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
export const lightOrDark = (color) => {
  // Variables for red, green, blue values
  var r, g, b, hsp

  // Check the format of the color, HEX or RGB?
  if (color.match(/^rgb/)) {
    // If RGB --> store the red, green, blue values in separate variables
    color = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
    )

    r = color[1]
    g = color[2]
    b = color[3]
  } else {
    // If hex --> Convert it to RGB: http://gist.github.com/983661
    color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, "$&$&"))

    r = color >> 16
    g = (color >> 8) & 255
    b = color & 255
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b))

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 127.5) {
    return "light"
  } else {
    return "dark"
  }
}

/** Adds an event ID to the 'eventsCreated' list in localStorage */
export const addEventToCreatedList = (eventId) => {
  let eventsCreated = getEventsCreated()
  eventsCreated.push(eventId)
  localStorage.setItem("eventsCreated", JSON.stringify(eventsCreated))
}

/** Returns the 'eventsCreated' list from localStorage */
export const getEventsCreated = () => {
  let eventsCreated = JSON.parse(localStorage.getItem("eventsCreated"))
  if (!Array.isArray(eventsCreated)) {
    eventsCreated = []
  }
  return eventsCreated
}

/** Deletes the 'eventsCreated' list from localStorage */
export const deleteEventsCreated = () => {
  localStorage.removeItem("eventsCreated")
}

export const prefersStartOnMonday = () => {
  let defaultStartOnMonday = false
  try {
    defaultStartOnMonday = weekStartLocale(navigator.language) === "mon"
  } catch {
    defaultStartOnMonday = false
  }
  return localStorage["startCalendarOnMonday"] == undefined
    ? defaultStartOnMonday
    : localStorage["startCalendarOnMonday"] == "true"
}

/** Source: https://stackoverflow.com/questions/53382465/how-can-i-determine-if-week-starts-on-monday-or-sunday-based-on-locale-in-pure-j */
function weekStart(region, language) {
  const regionSat = "AEAFBHDJDZEGIQIRJOKWLYOMQASDSY".match(/../g)
  const regionSun =
    "AGARASAUBDBRBSBTBWBZCACNCODMDOETGTGUHKHNIDILINJMJPKEKHKRLAMHMMMOMTMXMZNINPPAPEPHPKPRPTPYSASGSVTHTTTWUMUSVEVIWSYEZAZW".match(
      /../g
    )
  const languageSat = ["ar", "arq", "arz", "fa"]
  const languageSun =
    "amasbndzengnguhehiidjajvkmknkolomhmlmrmtmyneomorpapssdsmsnsutatethtnurzhzu".match(
      /../g
    )

  return region
    ? regionSun.includes(region)
      ? "sun"
      : regionSat.includes(region)
      ? "sat"
      : "mon"
    : languageSun.includes(language)
    ? "sun"
    : languageSat.includes(language)
    ? "sat"
    : "mon"
}
function weekStartLocale(locale) {
  const parts = locale.match(
    /^([a-z]{2,3})(?:-([a-z]{3})(?=$|-))?(?:-([a-z]{4})(?=$|-))?(?:-([a-z]{2}|\d{3})(?=$|-))?/i
  )
  return weekStart(parts[4], parts[1])
}
