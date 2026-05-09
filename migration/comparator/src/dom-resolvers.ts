import type { ElementDescriptor, SnapshotEntry, SnapshotElement } from "./types.js"

type EvaluateSnapshotArgs = {
  elements: ElementDescriptor[]
  flattenedProperties: string[]
}

export function resolveSnapshotEntries({
  elements,
  flattenedProperties,
}: EvaluateSnapshotArgs): SnapshotEntry[] {
  function isVisible(element: Element) {
    const computed = window.getComputedStyle(element)
    const box = element.getBoundingClientRect()
    return (
      computed.display !== "none" &&
      computed.visibility !== "hidden" &&
      computed.opacity !== "0" &&
      box.width > 0 &&
      box.height > 0
    )
  }

  function findVisibleCandidate(candidates: Element[]) {
    return candidates.find((candidate) => isVisible(candidate)) ?? candidates[0] ?? null
  }

  function findHeroCopy() {
    const heading =
      Array.from(document.querySelectorAll("h1")).find(
        (node) => node.textContent?.trim() === "Find a time to meet",
      ) ?? null
    return heading?.parentElement?.parentElement ?? null
  }

  function findLegacyNote() {
    return (
      Array.from(document.querySelectorAll("a"))
        .filter((node) => node.textContent?.includes('Formerly known as "Schej"'))
        .sort(
          (left, right) =>
            (left.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER) -
            (right.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER),
        )[0] ?? null
    )
  }

  function findVisibleTimezoneRow() {
    const timezoneRows = Array.from(document.querySelectorAll("#timezone-select-container"))
    return findVisibleCandidate(timezoneRows)
  }

  function findDaysOnlyToggleRoot() {
    const label = findByText("div, span, button", "Dates and times")
    return (
      label?.closest(
        ".tw-relative.tw-flex.tw-w-fit.tw-items-center.tw-rounded-md.tw-border.tw-border-light-gray-stroke",
      ) ?? null
    )
  }

  function findTimeIncrementLabel() {
    const labels = Array.from(document.querySelectorAll("div, span, label"))
    return (
      labels.find(
        (node) => node.textContent?.trim() === "Time increment:" && isVisible(node),
      ) ??
      labels.find((node) => node.textContent?.trim() === "Time increment:") ??
      null
    )
  }

  function findCalendarPickerRoot() {
    return findVisibleCandidate(Array.from(document.querySelectorAll(".v-picker, .v-date-picker")))
  }

  function findCalendarSelectedDay() {
    const picker = findCalendarPickerRoot()
    if (!picker) return null

    return (
      findVisibleCandidate(
        Array.from(
          picker.querySelectorAll(
            ".v-date-picker-month__day--selected[data-v-date] .v-btn, .v-date-picker-table .v-btn--active, .v-date-picker-table .primary, .v-date-picker-table .accent",
          ),
        ),
      ) ?? null
    )
  }

  function findByText(selector: string, text: string) {
    const candidates = Array.from(document.querySelectorAll(selector))
    return (
      candidates.find((node) => node.textContent?.trim() === text && isVisible(node)) ??
      candidates.find((node) => node.textContent?.trim() === text) ??
      null
    )
  }

  function findByContainsText(selector: string, text: string) {
    return (
      Array.from(document.querySelectorAll(selector))
        .filter((node) => node.textContent?.includes(text))
        .sort((left, right) => {
          const leftVisible = isVisible(left)
          const rightVisible = isVisible(right)

          if (leftVisible !== rightVisible) {
            return leftVisible ? -1 : 1
          }

          return (
            (left.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER) -
            (right.textContent?.trim().length ?? Number.MAX_SAFE_INTEGER)
          )
        })[0] ?? null
    )
  }

  function resolveElement(descriptor: ElementDescriptor) {
    switch (descriptor.kind) {
      case "heroCopy":
        return findHeroCopy()
      case "legacyNoteRow":
        return findLegacyNote()?.parentElement ?? null
      case "legacyNoteIcon":
        return findLegacyNote()?.parentElement?.querySelector("div") ?? null
      case "newEventDialog":
        return (
          document.querySelector('input[placeholder="Name your event..."]')?.closest(".v-card") ??
          null
        )
      case "daysOnlyToggle":
        return findDaysOnlyToggleRoot()
      case "daysOnlyToggleFrame":
        return findDaysOnlyToggleRoot()?.querySelector(
          ".tw-absolute.tw-h-full.tw-rounded-md.tw-border.tw-transition-all",
        ) ?? null
      case "daysOnlyToggleActiveLabel":
        return (
          Array.from(findDaysOnlyToggleRoot()?.children ?? []).find((node) =>
            node.textContent?.includes("Dates and times"),
          ) ?? null
        )
      case "advancedOptionsContent":
        return findVisibleTimezoneRow()?.parentElement ?? null
      case "timeIncrementSelect":
        return (
          findTimeIncrementLabel()?.parentElement?.querySelector(
            ".v-input, .v-field, .v-select, [role='combobox']",
          ) ?? null
        )
      case "timezoneLabel":
        return findVisibleTimezoneRow()?.firstElementChild ?? null
      case "calendarMonthLabel":
        return (
          findCalendarPickerRoot()?.querySelector(
            ".v-date-picker-controls__only-month-btn, .v-date-picker-header__value button",
          ) ?? null
        )
      case "calendarYearLabel":
        return (
          findCalendarPickerRoot()?.querySelector(
            ".v-date-picker-controls__only-year-btn, .v-date-picker-header__value button",
          ) ?? null
        )
      case "calendarSelectedDay":
        return findCalendarSelectedDay()
      case "selector":
        return findVisibleCandidate(Array.from(document.querySelectorAll(descriptor.selector)))
      case "text":
        return findByText(descriptor.selector, descriptor.text)
      case "containsText":
        return findByContainsText(descriptor.selector, descriptor.text)
    }
  }

  function buildSnapshotElement(element: Element): SnapshotElement {
    const computed = window.getComputedStyle(element)
    const box = element.getBoundingClientRect()

    return {
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      text: element.textContent?.trim() ?? "",
      box: {
        width: Number(box.width.toFixed(2)),
        height: Number(box.height.toFixed(2)),
        x: Number(box.x.toFixed(2)),
        y: Number(box.y.toFixed(2)),
      },
      properties: Object.fromEntries(
        flattenedProperties.map((property) => [property, computed.getPropertyValue(property)]),
      ) as SnapshotElement["properties"],
    }
  }

  return elements.map((descriptor) => {
    const element = resolveElement(descriptor)
    return [descriptor.name, element ? buildSnapshotElement(element) : null]
  })
}
