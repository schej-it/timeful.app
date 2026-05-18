import type { Page } from "@playwright/test"

import type { PropertyGroupName, PropertyName } from "./config.js"

export type AppLabel = {
  name: "old" | "new"
  url: string
}

export type SelectorElementDescriptor = {
  name: string
  kind: "selector"
  selector: string
}

export type TextElementDescriptor = {
  name: string
  kind: "text" | "containsText"
  selector: string
  text: string
}

export type SpecialElementDescriptor = {
  name: string
  kind:
    | "heroCopy"
    | "legacyNoteRow"
    | "legacyNoteIcon"
    | "newEventDialog"
    | "daysOnlyToggle"
    | "daysOnlyToggleFrame"
    | "daysOnlyToggleActiveLabel"
    | "advancedOptionsContent"
    | "advancedOptionsDisabledLabel"
    | "advancedOptionsSignInPrompt"
    | "advancedOptionsSignInLink"
    | "eventOptionsSection"
    | "eventOptionsSwitch"
    | "eventOptionsSwitchTrack"
    | "eventOptionsSwitchThumb"
    | "timeIncrementSelect"
    | "timezoneLabel"
    | "calendarMonthLabel"
    | "calendarYearLabel"
    | "calendarSelectedDay"
    | "respondentSelectionControl"
}

export type ElementDescriptor =
  | SelectorElementDescriptor
  | TextElementDescriptor
  | SpecialElementDescriptor

export type ScenarioDefinition = {
  readySelector: string
  elements: ElementDescriptor[]
  readyTimeoutMs?: number
  prepare: (page: Page, label: AppLabel) => Promise<void>
  runInteraction?: (oldPage: Page, newPage: Page) => Promise<void>
}

export type Box = {
  width: number
  height: number
  x: number
  y: number
}

export type ElementProperties = Record<PropertyName, string>

export type SnapshotElement = {
  tagName: string
  className: string
  text: string
  box: Box
  properties: ElementProperties
}

export type SnapshotEntry = [name: string, element: SnapshotElement | null]
export type Snapshot = Record<string, SnapshotElement | null>

export type MissingDiff = {
  status: "missing"
  oldFound: boolean
  newFound: boolean
}

export type PropertyDiffEntry = {
  property: PropertyName
  oldValue: string
  newValue: string
}

export type BoxDiff = {
  [K in keyof Box]: {
    old: number
    new: number
    delta: number
  }
}

export type MatchOrDiffResult = {
  status: "match" | "diff"
  old: Omit<SnapshotElement, "properties">
  new: Omit<SnapshotElement, "properties">
  boxDiff: BoxDiff
  propertyDiffs: Partial<Record<PropertyGroupName, PropertyDiffEntry[]>>
}

export type DiffResult = MissingDiff | MatchOrDiffResult
export type Diff = Record<string, DiffResult>
