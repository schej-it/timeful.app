<template>
  <div>
    <v-date-picker
      ref="datePicker"
      v-model="dateValue"
      readonly
      no-title
      multiple
      color="primary"
      :show-current="false"
      class="tw-min-w-full tw-rounded-md tw-border-0 tw-drop-shadow sm:tw-min-w-0"
      :min="minCalendarDate"
      full-width
      :scrollable="false"
      :first-day-of-week="startCalendarOnMonday ? 1 : 0"
      @update:month="onMonthChange"
      @update:year="onYearChange"
      @touchstart:date="touchstart"
      @mousedown:date="mousedown"
      @mouseover:date="mouseover"
    ></v-date-picker>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { Temporal } from "temporal-polyfill"

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    minCalendarDate?: string
    startCalendarOnMonday?: boolean
  }>(),
  {
    minCalendarDate: "",
    startCalendarOnMonday: false,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: string[]]
}>()

const datePicker = ref<{ $el: HTMLElement } | null>(null)
let datePickerEl: HTMLElement | null = null

const dragStates = { ADD: "add", REMOVE: "remove" } as const
type DragState = (typeof dragStates)[keyof typeof dragStates]

const dragging = ref(false)
const dragState = ref<DragState>(dragStates.ADD)

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function toIsoDate(plainDate: Temporal.PlainDate): string {
  return plainDate.toString()
}

const dateValue = computed<Date[]>({
  get: () => props.modelValue.map((s) => {
    const plainDate = Temporal.PlainDate.from(s)
    // BOUNDARY CONVERSION: Vuetify's v-date-picker requires native Date objects
    // We convert from Temporal.PlainDate (our internal representation) to Date (library requirement)
    return new Date(plainDate.year, plainDate.month - 1, plainDate.day)
  }),
  set: (val) => {
    const arr = Array.isArray(val) ? val : [val]
    emit(
      "update:modelValue",
      arr.map((d) => {
        // BOUNDARY CONVERSION: Convert native Date from Vuetify back to ISO string using Temporal
        const plainDate = Temporal.PlainDate.from({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
        })
        return toIsoDate(plainDate)
      })
    )
  },
})

const today = Temporal.Now.plainDateISO()
const pickerDate = ref(`${String(today.year)}-${pad2(today.month)}`)

function onMonthChange(month: number) {
  const [year] = pickerDate.value.split("-")
  pickerDate.value = `${year}-${pad2(month + 1)}`
}

function onYearChange(year: number) {
  const parts = pickerDate.value.split("-")
  const month = parts[1] ?? pad2(today.month)
  pickerDate.value = `${String(year)}-${month}`
}

function mousedown(date: string) {
  dragging.value = true
  setDragState(date)
  addRemoveDate(date)
}

function touchstart(date: string) {
  dragging.value = true
  setDragState(date)
  addRemoveDate(date)
}

function mouseover(date: string) {
  if (!dragging.value) return
  addRemoveDate(date)
}

function touchmove(e: TouchEvent) {
  if (!dragging.value) return

  e.preventDefault()

  const touch = e.changedTouches[0]
  const target = document.elementFromPoint(touch.clientX, touch.clientY)

  if (
    target &&
    datePickerEl &&
    datePickerEl.contains(target) &&
    target.classList.contains("v-btn__content")
  ) {
    const dateNum = parseInt(target.innerHTML)
    if (!isNaN(dateNum)) {
      const date = `${pickerDate.value}-${pad2(dateNum)}`
      addRemoveDate(date)
    }
  }
}

function mouseup(e: Event) {
  if (!dragging.value) return

  e.preventDefault()
  e.stopPropagation()

  dragging.value = false
}

function setDragState(date: string) {
  const set = new Set(props.modelValue)
  dragState.value = set.has(date) ? dragStates.REMOVE : dragStates.ADD
}

function addRemoveDate(date: string) {
  if (dragState.value === dragStates.ADD) {
    addDate(date)
  } else {
    removeDate(date)
  }
}

function addDate(date: string) {
  const set = new Set(props.modelValue)
  set.add(date)
  emit("update:modelValue", [...set])
}

function removeDate(date: string) {
  const set = new Set(props.modelValue)
  set.delete(date)
  emit("update:modelValue", [...set])
}

onMounted(() => {
  if (!datePicker.value) return
  datePickerEl = datePicker.value.$el
  datePickerEl.addEventListener("mouseup", mouseup)
  datePickerEl.addEventListener("touchmove", touchmove)
  datePickerEl.addEventListener("touchend", mouseup, { capture: true })
})

onBeforeUnmount(() => {
  if (!datePickerEl) return
  datePickerEl.removeEventListener("mouseup", mouseup)
  datePickerEl.removeEventListener("touchmove", touchmove)
  datePickerEl.removeEventListener("touchend", mouseup)
})
</script>
