<template>
  <div>
    <div class="tw-mb-1 tw-text-sm tw-text-black">Working hours</div>
    <div class="tw-mb-2 tw-text-xs tw-text-dark-gray">
      Only autofill availability between working hours
    </div>
    <v-switch
      id="working-hours-toggle"
      inset
      :model-value="workingHours.enabled"
      hide-details
      @update:model-value="(val: boolean | null) => updateWorkingHours('enabled', !!val)"
    >
      <template #label>
        <div class="tw-text-sm tw-text-black">
          <div class="tw-flex tw-items-center tw-gap-2">
            <v-select
              dense
              hide-details
              return-object
              class="-tw-mt-0.5 tw-w-20 tw-text-xs"
              :items="times"
              :model-value="workingHours.startTime as unknown as TimeOption"
              @update:model-value="(val: TimeOption) => updateWorkingHours('startTime', val.time)"
              @click="
                (e: MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                }
              "
            />
            <div>to</div>
            <v-select
              dense
              hide-details
              return-object
              class="-tw-mt-0.5 tw-w-20 tw-text-xs"
              :items="times"
              :model-value="workingHours.endTime as unknown as TimeOption"
              @update:model-value="(val: TimeOption) => updateWorkingHours('endTime', val.time)"
              @click="
                (e: MouseEvent) => {
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

<script setup lang="ts">
import { computed } from "vue"
import { getTimeOptions, patch } from "@/utils"
import type { WorkingHoursOptions } from "@/types"

interface TimeOption {
  time: number
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    workingHours: WorkingHoursOptions
    syncWithBackend?: boolean
  }>(),
  { syncWithBackend: false }
)

const emit = defineEmits<{
  "update:workingHours": [value: WorkingHoursOptions]
}>()

const times = computed(() => getTimeOptions() as TimeOption[])

const updateWorkingHours = (
  key: "enabled" | "startTime" | "endTime",
  val: boolean | number
) => {
  const workingHours: WorkingHoursOptions = {
    ...props.workingHours,
    [key]: val,
  }
  if (props.syncWithBackend) {
    void patch(`/user/calendar-options`, { workingHours })
  }
  emit("update:workingHours", workingHours)
}
</script>
