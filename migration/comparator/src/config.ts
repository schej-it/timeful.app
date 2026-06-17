export const DEFAULT_NEW_APP_URL = "http://127.0.0.1:4173"
export const DEFAULT_OLD_APP_URL = "http://127.0.0.1:4174"
export const VIEWPORT = { width: 1440, height: 1400 } as const

export const PROPERTY_GROUPS = {
  typography: [
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-align",
    "white-space",
    "text-decoration-line",
    "color",
  ],
  spacing: [
    "display",
    "gap",
    "width",
    "min-width",
    "max-width",
    "min-height",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "justify-content",
    "align-items",
  ],
  treatment: [
    "background-color",
    "border-top-width",
    "border-top-style",
    "border-top-color",
    "border-right-width",
    "border-right-style",
    "border-right-color",
    "border-bottom-width",
    "border-bottom-style",
    "border-bottom-color",
    "border-left-width",
    "border-left-style",
    "border-left-color",
    "border-radius",
    "outline-style",
    "outline-width",
    "outline-color",
    "box-shadow",
    "opacity",
  ],
} as const

export type PropertyGroupName = keyof typeof PROPERTY_GROUPS
export type PropertyName = (typeof PROPERTY_GROUPS)[PropertyGroupName][number]

export const FLATTENED_PROPERTIES = Object.values(PROPERTY_GROUPS).flat()
