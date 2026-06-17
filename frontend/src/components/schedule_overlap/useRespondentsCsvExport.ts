import { reactive } from "vue"
import { posthog } from "@/plugins/posthog"
import { getEventDateSeeds, getLocale, zdtSetHas } from "@/utils"
import { Temporal } from "temporal-polyfill"
import type {
  ParsedResponses,
  ScheduleOverlapEvent,
} from "@/composables/schedule_overlap/types"

interface UseRespondentsCsvExportOptions {
  eventId: string
  event: ScheduleOverlapEvent
  parsedResponses: ParsedResponses
  respondentCount: number
}

export function useRespondentsCsvExport(
  opts: UseRespondentsCsvExportOptions
) {
  const exportCsvDialog = reactive({
    visible: false,
    loading: false,
    type: "datesToAvailable",
    types: [
      { text: "Dates <> people available", value: "datesToAvailable" },
      { text: "Name <> dates available", value: "nameToDates" },
    ],
  })

  function getDateString(date: Temporal.ZonedDateTime | Temporal.PlainDate) {
    const locale = getLocale()
    if (opts.event.daysOnly) {
      if (date instanceof Temporal.PlainDate) {
        return date.toString()
      }

      return date.toPlainDate().toString()
    }

    return `"${date.toLocaleString(locale)}"`
  }

  function exportCsv() {
    const csv: string[][] = []
    const increment = 15
    const durationHours = opts.event.duration?.total("hours") ?? 0
    const numIterations = opts.event.daysOnly ? 1 : (durationHours * 60) / increment
    const responses = Object.values(opts.parsedResponses).sort((a, b) =>
      (a.user.firstName ?? "").localeCompare(b.user.firstName ?? "")
    )
    const eventDates = getEventDateSeeds(opts.event)

    if (exportCsvDialog.type === "datesToAvailable") {
      const header = ["Date / Time"]
      header.push(
        ...responses.map((response) => {
          const user = response.user
          return `${user.firstName ?? ""} ${user.lastName ?? ""}`
        })
      )
      csv.push(header)

      for (const date of eventDates) {
        let curDate = date
        for (let i = 0; i < numIterations; ++i) {
          const row = [getDateString(curDate)]
          for (const response of responses) {
            if (zdtSetHas(response.availability, curDate)) {
              row.push("Available")
            } else if (response.ifNeeded && zdtSetHas(response.ifNeeded, curDate)) {
              row.push("If needed")
            } else {
              row.push("")
            }
          }
          csv.push(row)
          curDate = curDate.add({ minutes: increment })
        }
      }
    } else {
      csv.push(["Name", "Date / Times available"])

      for (const response of responses) {
        const user = response.user
        const row = [`${user.firstName ?? ""} ${user.lastName ?? ""}`]

        for (const date of eventDates) {
          let curDate = date
          for (let i = 0; i < numIterations; ++i) {
            if (
              zdtSetHas(response.availability, curDate) ||
              (response.ifNeeded && zdtSetHas(response.ifNeeded, curDate))
            ) {
              row.push(getDateString(curDate))
            } else {
              row.push("")
            }
            curDate = curDate.add({ minutes: increment })
          }
        }
        csv.push(row)
      }
    }

    const csvString =
      "data:text/csv;charset=utf-8," + csv.map((entry) => entry.join(",")).join("\n")
    const encodedUri = encodeURI(csvString)
    const downloadLink = document.createElement("a")
    downloadLink.href = encodedUri
    downloadLink.download = `${opts.event.name ?? "export"}.csv`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  function trackExportCsvClick() {
    posthog.capture("export_csv_clicked", {
      eventId: opts.eventId,
      numRespondents: opts.respondentCount,
    })
  }

  return {
    exportCsvDialog,
    exportCsv,
    trackExportCsvClick,
  }
}
