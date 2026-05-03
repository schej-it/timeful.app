<template>
  <div>
    <div class="tw-mb-1 tw-text-sm tw-text-black">Buffer time</div>
    <div class="tw-mb-2 tw-text-xs tw-text-dark-gray">
      Add time around calendar events
    </div>
    <v-switch
      id="buffer-time-switch"
      :model-value="bufferTime.enabled"
      inset
      class="tw-flex tw-items-center"
      hide-details
      @update:model-value="handleBufferTimeToggle"
    >
      <template #label>
        <div
          class="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-sm tw-text-black"
        >
          <v-select
            dense
            hide-details
            :items="bufferTimes"
            class="-tw-mt-0.5 tw-w-20 tw-text-xs"
            :model-value="bufferTime.time"
            @update:model-value="(val: number) => updateBufferTime('time', val)"
            @click="
              (e: MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
              }
            "
          ></v-select>
        </div>
      </template>
    </v-switch>
  </div>
</template>

<script setup lang="ts">
import { patch } from "@/utils"
import { posthog } from "@/plugins/posthog"
import type { BufferTimeOptions } from "@/types"

const props = withDefaults(
  defineProps<{
    bufferTime: BufferTimeOptions
    syncWithBackend?: boolean
  }>(),
  { syncWithBackend: false }
)

const emit = defineEmits<{
  "update:bufferTime": [value: BufferTimeOptions]
}>()

const bufferTimes = [
  { title: "15 min", value: 15 },
  { title: "30 min", value: 30 },
  { title: "45 min", value: 45 },
  { title: "1 hour", value: 60 },
]

const updateBufferTime = (key: "enabled" | "time", val: boolean | number) => {
  const bufferTime: BufferTimeOptions = {
    ...props.bufferTime,
    [key]: val,
  }
  if (props.syncWithBackend) {
    void patch(`/user/calendar-options`, { bufferTime })
  }
  emit("update:bufferTime", bufferTime)
}

const handleBufferTimeToggle = (isEnabled: boolean | null) => {
  updateBufferTime("enabled", !!isEnabled)
  posthog.capture("buffer_time_switch_toggled", { enabled: !!isEnabled })
}
</script>
