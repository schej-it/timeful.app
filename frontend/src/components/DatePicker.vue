<template>
  <div
    ref="datePickerEl"
    class="tw-w-full"
    @pointerdown.capture="onPointerDown"
    @pointerover.capture="onPointerOver"
    @pointerup.capture="endDrag"
    @pointercancel.capture="endDrag"
    @mouseup="endDrag"
    @touchmove="touchmove"
    @touchend.capture="endDrag"
  >
    <v-date-picker
      v-model="dateValue"
      readonly
      hide-header
      multiple
      color="primary"
      :show-current="false"
      class="tw-w-full tw-min-w-full tw-rounded-md tw-border-0 tw-drop-shadow sm:tw-min-w-0"
      :min="minCalendarDate"
      :scrollable="false"
      :first-day-of-week="startCalendarOnMonday ? 1 : 0"
      @update:month="onMonthChange"
      @update:year="onYearChange"
    ></v-date-picker>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
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

const datePickerEl = ref<HTMLElement | null>(null)

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

function toVuetifyDateBoundary(plainDate: Temporal.PlainDate): Date {
  return new Date(plainDate.year, plainDate.month - 1, plainDate.day)
}

function fromVuetifyDateBoundary(nativeDate: Date): string {
  const plainDate = Temporal.PlainDate.from({
    year: nativeDate.getFullYear(),
    month: nativeDate.getMonth() + 1,
    day: nativeDate.getDate(),
  })
  return toIsoDate(plainDate)
}

const dateValue = computed<Date[]>({
  get: () =>
    props.modelValue.map((s) => {
      const plainDate = Temporal.PlainDate.from(s)
      // Explicit native-Date adapter for Vuetify's v-date-picker boundary.
      return toVuetifyDateBoundary(plainDate)
    }),
  set: (val) => {
    const arr = Array.isArray(val) ? val : [val]
    emit(
      "update:modelValue",
      arr.map((d) => fromVuetifyDateBoundary(d))
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

function startDrag(date: string) {
  dragging.value = true
  setDragState(date)
  addRemoveDate(date)
}

function continueDrag(date: string) {
  if (!dragging.value) return
  addRemoveDate(date)
}

function getDateCell(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null

  return node.closest("[data-v-date]")
}

function getDateFromNode(node: EventTarget | null): string | null {
  return getDateCell(node)?.dataset.vDate ?? null
}

function onPointerDown(e: PointerEvent) {
  const date = getDateFromNode(e.target)
  if (!date) return

  e.preventDefault()
  startDrag(date)
}

function onPointerOver(e: PointerEvent) {
  const date = getDateFromNode(e.target)
  if (!date) return

  continueDrag(date)
}

function touchmove(e: TouchEvent) {
  if (!dragging.value) return

  e.preventDefault()

  const touch = e.changedTouches[0]
  const target = document.elementFromPoint(touch.clientX, touch.clientY)
  const date = getDateFromNode(target)

  if (date && datePickerEl.value?.contains(getDateCell(target))) {
    continueDrag(date)
  }
}

function endDrag(e: Event) {
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

</script>
