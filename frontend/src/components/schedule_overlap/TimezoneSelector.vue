<!-- Allows user to change timezone -->
<template>
  <div
    class="tw-flex tw-items-center tw-justify-center"
    id="timezone-select-container"
  >
    <div :class="`tw-mr-2 tw-mt-px ${labelColor}`">{{ label }}</div>
    <v-select
      id="timezone-select"
      :value="value"
      @input="onChange"
      :items="timezones"
      :menu-props="{ auto: true }"
      class="tw-z-20 -tw-mt-px tw-w-52 tw-text-sm"
      dense
      color="#219653"
      item-color="green"
      hide-details
      item-text="label"
      return-object
    >
      <template v-slot:item="{ item, on, attrs }">
        <v-list-item v-bind="attrs" v-on="on">
          <v-list-item-content>
            <v-list-item-title>
              {{ item.gmtString }} {{ item.label }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <template v-slot:selection="{ item }">
        <div class="v-select__selection v-select__selection--comma">
          {{ item.gmtString }} {{ item.label }}
        </div>
      </template>
    </v-select>
    <v-btn v-if="timezoneModified" @click="resetTimezone" icon color="primary"
      ><v-icon>mdi-refresh</v-icon></v-btn
    >
  </div>
</template>

<script>
import { allTimezones } from "@/constants"
import spacetime from "spacetime"
import dayjs from "dayjs"
import utcPlugin from "dayjs/plugin/utc"
import timezonePlugin from "dayjs/plugin/timezone"
dayjs.extend(utcPlugin)
dayjs.extend(timezonePlugin)

export default {
  name: "TimezoneSelector",

  props: {
    value: { type: Object, required: true },
    label: { type: String, default: "Shown in" },
    labelColor: { type: String, default: "" },
  },

  created() {
    if (localStorage["timezone"]) {
      this.timezoneModified = true
    }

    if (this.value.value) return // Timezone has already been set

    // Set timezone to localstorage timezone if localstorage is set
    if (localStorage["timezone"]) {
      this.$emit("input", JSON.parse(localStorage["timezone"]))
      return
    }

    // Otherwise, set timezone to local timezone
    this.$emit("input", this.getLocalTimezone())
  },

  data() {
    return {
      timezoneModified: false, // Whether the timezone has been modified from the local timezone
    }
  },

  computed: {
    /** Returns an array of all supported timezones */
    timezones() {
      // ===============================================================================
      // Source: https://github.com/ndom91/react-timezone-select/blob/main/src/index.tsx
      // ===============================================================================

      const t = Object.entries(allTimezones)
        .map((zone) => {
          try {
            const now = spacetime.now(zone[0])
            const tz = now.timezone()

            const min = tz.current.offset * 60
            const hr = `${(min / 60) ^ 0}:${
              min % 60 === 0 ? "00" : Math.abs(min % 60)
            }`
            const gmtString = `(GMT${hr.includes("-") ? hr : `+${hr}`})`
            const label = `${zone[1]}`

            return {
              value: tz.name,
              label: label,
              gmtString: gmtString,
              offset: tz.current.offset * 60,
            }
          } catch (e) {
            console.error(e)
            return null
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.offset - b.offset)
      return t
    },
  },

  methods: {
    /** Updates local storage and emits the new timezone */
    onChange(val) {
      localStorage["timezone"] = JSON.stringify(val)
      this.$emit("input", val)
      this.timezoneModified = true
    },
    /** Returns a timezone object for the local timezone */
    getLocalTimezone() {
      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Step 1: Exact match on spacetime-canonical name
      let timezoneObject = this.timezones.find((t) => t.value === localTimezone)

      if (!timezoneObject) {
        // Step 2: Match by offsets at two reference dates (Jan + Jul)
        // Distinguishes DST-observing zones from non-DST zones that share
        // the same current offset (e.g. Europe/Belgrade vs Africa/Casablanca)
        const janOffset = dayjs.tz("2024-01-15 12:00", localTimezone).utcOffset()
        const julOffset = dayjs.tz("2024-07-15 12:00", localTimezone).utcOffset()

        timezoneObject = this.timezones.find((t) => {
          const tJan = dayjs.tz("2024-01-15 12:00", t.value).utcOffset()
          const tJul = dayjs.tz("2024-07-15 12:00", t.value).utcOffset()
          return tJan === janOffset && tJul === julOffset
        })
      }

      if (!timezoneObject) {
        // Step 3: Final fallback — current offset only
        const offset =
          spacetime.now(localTimezone).timezone().current.offset * 60
        timezoneObject = this.timezones.find((t) => t.offset === offset)
      }

      return timezoneObject
    },
    /** Resets timezone to the local timezone and clears localstorage as well */
    resetTimezone() {
      this.$emit("input", this.getLocalTimezone())
      localStorage.removeItem("timezone")
      this.timezoneModified = false
    },
  },
}
</script>
