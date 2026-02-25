<template>
  <div>
    <div class="tw-mb-1 tw-text-sm tw-text-text-primary">Working hours</div>
    <div class="tw-mb-2 tw-text-xs tw-text-text-muted">
      Only autofill availability between working hours
    </div>
    <v-switch
      id="working-hours-toggle"
      inset
      :input-value="workingHours.enabled"
      @change="(val) => updateWorkingHours('enabled', val)"
      hide-details
    >
      <template v-slot:label>
        <div class="tw-text-sm tw-text-text-primary">
          <div class="tw-flex tw-items-center tw-gap-2">
            <v-select
              menu-props="auto"
              dense
              hide-details
              return-object
              class="-tw-mt-0.5 tw-w-20 tw-text-xs"
              :items="times"
              :value="workingHours.startTime"
              @input="(val) => updateWorkingHours('startTime', val.time)"
              @click="
                (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }
              "
            />
            <div>to</div>
            <v-select
              menu-props="auto"
              dense
              hide-details
              return-object
              class="-tw-mt-0.5 tw-w-20 tw-text-xs"
              :items="times"
              :value="workingHours.endTime"
              @input="(val) => updateWorkingHours('endTime', val.time)"
              @click="
                (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }
              "
            />
          </div>
        </div>
      </template>
    </v-switch>
  </div>
</template>

<script>
import { getTimeOptions } from "@/utils"
import { patch } from "@/utils"

export default {
  name: "WorkingHoursToggle",

  props: {
    workingHours: { type: Object, required: true },
    syncWithBackend: { type: Boolean, default: false },
  },

  computed: {
    times() {
      return getTimeOptions()
    },
  },

  methods: {
    updateWorkingHours(key, val) {
      const workingHours = {
        ...this.workingHours,
        [key]: val,
      }
      if (this.syncWithBackend) {
        patch(`/user/calendar-options`, {
          workingHours,
        })
      }
      this.$emit("update:workingHours", workingHours)
    },
  },
}
</script>
