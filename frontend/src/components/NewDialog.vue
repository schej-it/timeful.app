<template>
  <v-dialog
    :model-value="modelValue"
    no-click-animation
    persistent
    content-class="tw-max-w-[28rem]"
    :fullscreen="isPhone"
    scrollable
    :transition="isPhone ? `dialog-bottom-transition` : `dialog-transition`"
    @click:outside="handleDialogInput"
  >
    <UnsavedChangesDialog v-model="unsavedChangesDialog" @leave="exitDialog">
    </UnsavedChangesDialog>
    <v-card class="tw-pt-4">
      <div v-if="!_noTabs" class="tw-flex tw-rounded sm:-tw-mt-4 sm:tw-px-8">
        <div class="tw-pt-4">
          <v-btn
            v-for="t in tabs"
            :key="t.type"
            :tab-value="t.type"
            text
            small
            :class="`tw-text-xs tw-text-dark-gray tw-transition-all ${
              t.type == tab ? 'tw-bg-ligher-green tw-text-green' : ''
            }`"
            @click="() => (tab = t.type)"
          >
            {{ t.title }}
          </v-btn>
        </div>
        <v-spacer />
        <v-btn
          absolute
          icon
          class="tw-right-0 tw-mr-2 tw-self-center"
          @click="emit('update:modelValue', false)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <NewEvent
        v-if="tab === 'event'"
        ref="eventRef"
        :key="`event-${modelValue}`"
        :event="event"
        :edit="edit"
        :is-dialog-open="modelValue"
        :contacts-payload="type == 'event' ? contactsPayload : {}"
        :show-help="!_noTabs"
        :folder-id="folderId"
        @update:model-value="handleDialogInput"
        @sign-in="emit('signIn')"
      />
      <NewGroup
        v-else-if="tab === 'group'"
        ref="groupRef"
        :key="`group-${modelValue}`"
        :event="event"
        :edit="edit"
        :show-help="!_noTabs"
        :folder-id="folderId"
        :contacts-payload="type == 'group' ? contactsPayload : {}"
        @update:model-value="handleDialogInput"
      />
      <NewSignUp
        v-if="tab === 'signup'"
        ref="signupRef"
        :key="`signup-${modelValue}`"
        :event="event"
        :edit="edit"
        :show-help="!_noTabs"
        :folder-id="folderId"
        :contacts-payload="type == 'signup' ? contactsPayload : {}"
        @update:model-value="handleDialogInput"
      />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import NewEvent from "@/components/NewEvent.vue"
import NewGroup from "@/components/NewGroup.vue"
import NewSignUp from "@/components/NewSignUp.vue"
import UnsavedChangesDialog from "@/components/general/UnsavedChangesDialog.vue"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import type { SerializedEventDraft } from "@/composables/event/types"
import type { Event } from "@/types"

type TabType = "event" | "group" | "signup"

interface EditableForm {
  hasEventBeenEdited: () => boolean
  resetToEventData: () => void
  reset: () => void
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    type?: TabType
    event?: Event
    edit?: boolean
    contactsPayload?: SerializedEventDraft
    noTabs?: boolean
    folderId?: string | null
  }>(),
  {
    type: "event",
    event: undefined,
    edit: false,
    contactsPayload: () => ({}),
    noTabs: false,
    folderId: null,
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  signIn: []
}>()

const mainStore = useMainStore()
const { groupsEnabled, signUpFormEnabled } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const tab = ref<TabType>(props.type)
const tabs = ref<{ title: string; type: TabType }[]>([
  { title: "Event", type: "event" },
  { title: "Sign up form", type: "signup" },
  { title: "Availability group", type: "group" },
])

const unsavedChangesDialog = ref(false)

const eventRef = ref<EditableForm | null>(null)
const groupRef = ref<EditableForm | null>(null)
const signupRef = ref<EditableForm | null>(null)

const refsByTab = computed<Record<TabType, EditableForm | null>>(() => ({
  event: eventRef.value,
  group: groupRef.value,
  signup: signupRef.value,
}))

const _noTabs = computed(() => {
  if (!groupsEnabled.value) return true
  return props.noTabs
})

const handleDialogInput = () => {
  const current = refsByTab.value[tab.value]
  if (!props.edit || !current?.hasEventBeenEdited()) {
    exitDialog()
  } else {
    unsavedChangesDialog.value = true
  }
}
const exitDialog = () => {
  emit("update:modelValue", false)
  const current = refsByTab.value[tab.value]
  if (props.edit) current?.resetToEventData()
  else current?.reset()
}

watch(
  groupsEnabled,
  () => {
    const next: { title: string; type: TabType }[] = [
      { title: "Event", type: "event" },
      { title: "Sign up form", type: "signup" },
    ]
    if (groupsEnabled.value) {
      next.push({ title: "Availability group", type: "group" })
    }
    tabs.value = next
  },
  { immediate: true }
)
watch(
  signUpFormEnabled,
  () => {
    const next: { title: string; type: TabType }[] = [
      { title: "Event", type: "event" },
    ]
    if (signUpFormEnabled.value) {
      next.push({ title: "Sign up form", type: "signup" })
    }
    next.push({ title: "Availability group", type: "group" })
    tabs.value = next
  },
  { immediate: true }
)
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      tab.value = props.type
    }
  },
  { immediate: true }
)
watch(
  () => props.type,
  (t) => {
    tab.value = t
  },
  { immediate: true }
)
</script>
