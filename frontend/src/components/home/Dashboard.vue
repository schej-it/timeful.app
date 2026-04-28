<template>
  <div class="tw-rounded-md tw-px-6 tw-py-4 sm:tw-mx-4 sm:tw-bg-[#f3f3f366]">
    <div class="tw-mb-3 tw-flex tw-items-center tw-justify-between">
      <div class="tw-flex tw-flex-col">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Dashboard
        </div>
        <div
          v-if="!isPremiumUser"
          class="tw-flex tw-items-baseline tw-gap-2 tw-text-sm tw-font-normal tw-text-very-dark-gray"
        >
          <div>
            {{ authUser?.numEventsCreated }} / {{ numFreeEvents }} free events
            created this month
          </div>
          <div
            class="tw-cursor-pointer tw-select-none tw-text-xs tw-font-medium tw-text-green tw-underline"
            @click="openUpgradeDialog"
          >
            Upgrade
          </div>
        </div>
      </div>
      <v-btn
        text
        class="tw-text-very-dark-gray"
        @click="openCreateFolderDialog"
      >
        <v-icon class="tw-text-lg">mdi-folder-plus</v-icon>
        <span class="tw-ml-2">New folder</span>
      </v-btn>
    </div>

    <div>
      <div
        v-for="folder in allFolders"
        :key="folder.id"
        class="tw-group tw-mb-2"
      >
        <div class="tw-flex tw-items-center">
          <v-btn icon small @click="toggleFolder(folder.id)">
            <v-icon>{{
              folderOpenState[folder.id] ? "mdi-menu-down" : "mdi-menu-right"
            }}</v-icon>
          </v-btn>
          <v-chip
            v-if="folder.type === 'regular'"
            :color="folder.color || '#D3D3D3'"
            small
            class="tw-mr-2 tw-cursor-pointer tw-rounded tw-border tw-border-light-gray-stroke tw-px-2 tw-text-sm tw-font-medium"
            @click="openEditFolderDialog(folder)"
          >
            {{ folder.name }}
          </v-chip>
          <span v-else class="tw-mr-2 tw-text-sm tw-font-medium">{{
            folder.name
          }}</span>
          <div
            v-if="folder.type === 'regular'"
            class="tw-invisible tw-flex tw-items-center group-hover:tw-visible"
          >
            <v-menu offset-y>
              <template #activator="{ props }">
                <v-btn icon small v-bind="props" @click.stop.prevent>
                  <v-icon small>mdi-dots-horizontal</v-icon>
                </v-btn>
              </template>
              <v-list dense class="tw-py-1">
                <v-list-item @click.stop.prevent="openEditFolderDialog(folder)">
                  <v-list-item-title>Edit</v-list-item-title>
                </v-list-item>
                <v-list-item @click.stop.prevent="openDeleteDialog(folder)">
                  <v-list-item-title class="tw-text-red"
                    >Delete</v-list-item-title
                  >
                </v-list-item>
              </v-list>
            </v-menu>
            <v-btn
              icon
              small
              @click.stop.prevent="createEventInFolder(folder.id)"
            >
              <v-icon small>mdi-plus</v-icon>
            </v-btn>
          </div>
        </div>
        <div v-show="folderOpenState[folder.id]">
          <draggable
            :list="folderItems(folder.id)"
            item-key="_id"
            group="events"
            :data-folder-id="
              folder.type === 'no-folder'
                ? 'null'
                : folder.type === 'archived'
                ? 'archived'
                : folder.id
            "
            draggable=".item"
            :delay="200"
            :delay-on-touch-only="true"
            :class="[
              'tw-relative tw-grid tw-min-h-[52px] tw-grid-cols-1 tw-gap-4 tw-py-4 sm:tw-grid-cols-2',
              folder.type === 'archived' ? 'tw-opacity-75' : '',
            ]"
            @end="onEnd"
          >
            <template #header>
              <div
                v-if="folderItems(folder.id).length === 0"
                class="tw-absolute tw-left-0 tw-py-4 tw-text-sm tw-text-very-dark-gray"
                :class="folder.type === 'regular' ? 'tw-ml-8' : 'tw-ml-7'"
              >
                {{ folder.emptyMessage }}
              </div>
            </template>
            <template #item="{ element }">
              <EventItem
                :id="element._id"
                :event="element"
                :folder-id="folder.id"
                class="item"
              />
            </template>
          </draggable>
        </div>
      </div>

      <div v-if="allEvents.length === 0">
        <div class="tw-py-4 tw-text-sm tw-text-very-dark-gray">
          No events yet! Create one to get started.
        </div>
      </div>
    </div>
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete "{{ folderToDelete?.name }}"?</v-card-title>
        <v-card-text
          >Are you sure you want to delete this folder? All events you own in
          this folder will be deleted as well.</v-card-text
        >
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="red darken-1" text @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="createFolderDialog" max-width="400">
      <v-card>
        <v-card-title>{{ folderDialogTitle }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderName"
            label="Folder name"
            placeholder="Untitled folder"
            autofocus
            hide-details
            @keydown.enter="confirmFolderDialog"
          ></v-text-field>
          <div class="tw-mt-4">
            <span class="tw-text-gray-500 tw-text-sm">Color</span>
            <div class="tw-mt-2 tw-flex tw-gap-x-3">
              <div
                v-for="color in folderColors"
                :key="color"
                class="tw-h-6 tw-w-6 tw-cursor-pointer tw-rounded-full tw-border tw-border-light-gray-stroke"
                :style="{ backgroundColor: color }"
                :class="{
                  'tw-ring-2 tw-ring-gray tw-ring-offset-2':
                    newFolderColor === color,
                }"
                @click="newFolderColor = color"
              ></div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeFolderDialog">Cancel</v-btn>
          <v-btn color="primary" text @click="confirmFolderDialog">{{
            folderDialogConfirmText
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AppDashboard" })
import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { isPremiumUser as isPremiumUserUtil } from "@/utils/general_utils"
import draggable from "vuedraggable"
import {
  eventTypes,
  folderColors,
  numFreeEvents,
  upgradeDialogTypes,
} from "@/constants"
import EventItem from "@/components/EventItem.vue"
import ObjectID from "bson-objectid"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import type { Event, Folder } from "@/types"

interface DragEvent {
  item: { id: string }
  to: { dataset: { folderId?: string } }
  from: { dataset: { folderId?: string } }
}

const mainStore = useMainStore()
const { authUser, events, folders } = storeToRefs(mainStore)
const isPremiumUser = computed(() => isPremiumUserUtil(authUser.value))

const openUpgradeDialog = () => {
  mainStore.showUpgradeDialog({ type: upgradeDialogTypes.UPGRADE_MANUALLY })
}

const deleteDialog = ref(false)
const folderToDelete = ref<Folder | null>(null)
const createFolderDialog = ref(false)
const newFolderName = ref("")
const newFolderColor = ref<string>(folderColors[3])
const isEditingFolder = ref(false)
const folderToEdit = ref<Folder | null>(null)
const folderOpenState = ref<Record<string, boolean>>({ "no-folder": true })

try {
  const storedState = localStorage.getItem("folderOpenState")
  if (storedState) {
    folderOpenState.value = JSON.parse(storedState) as Record<string, boolean>
  }
} catch (e) {
  console.error("Error reading folderOpenState from localStorage", e)
  localStorage.removeItem("folderOpenState")
}

const allEvents = computed(() => events.value)

const allEventsMap = computed<Record<string, Event>>(() =>
  allEvents.value.reduce<Record<string, Event>>((acc, event) => {
    if (event._id) acc[event._id] = event
    return acc
  }, {})
)

const sortEvents = (a: Event, b: Event) => {
  if (
    a._id &&
    b._id &&
    ObjectID.isValid(a._id) &&
    ObjectID.isValid(b._id)
  ) {
    return (
      ObjectID(b._id).getTimestamp().getTime() -
      ObjectID(a._id).getTimestamp().getTime()
    )
  }
  return 0
}

const eventsByFolder = computed(() => {
  const result: Record<string, { groups: Event[]; events: Event[] }> = {}
  const allEventIds = new Set(
    allEvents.value.map((e) => e._id).filter((id): id is string => !!id)
  )

  result["no-folder"] = { groups: [], events: [] }
  result.archived = { groups: [], events: [] }

  folders.value.forEach((folder) => {
    if (!folder._id) return
    result[folder._id] = { groups: [], events: [] }
    for (const eventId of folder.eventIds ?? []) {
      const event = allEventsMap.value[eventId] as Event | undefined
      if (event) {
        const bucket = event.isArchived ? result.archived : result[folder._id]
        if (event.type === eventTypes.GROUP) bucket.groups.push(event)
        else bucket.events.push(event)
        allEventIds.delete(eventId)
      }
    }
    result[folder._id].groups.sort(sortEvents)
    result[folder._id].events.sort(sortEvents)
  })

  for (const eventId of allEventIds) {
    const event = allEventsMap.value[eventId] as Event | undefined
    if (event) {
      const bucket = event.isArchived ? result.archived : result["no-folder"]
      if (event.type === eventTypes.GROUP) bucket.groups.push(event)
      else bucket.events.push(event)
    }
  }

  result["no-folder"].groups.sort(sortEvents)
  result["no-folder"].events.sort(sortEvents)
  result.archived.groups.sort(sortEvents)
  result.archived.events.sort(sortEvents)
  return result
})

const folderItems = (folderId: string): Event[] => {
  const bucket = eventsByFolder.value[folderId] as { groups: Event[]; events: Event[] } | undefined
  if (!bucket) return []
  return [...bucket.groups, ...bucket.events]
}

const folderDialogTitle = computed(() =>
  isEditingFolder.value ? "Edit folder" : "New folder"
)
const folderDialogConfirmText = computed(() =>
  isEditingFolder.value ? "Save" : "Create"
)

interface FolderRow {
  id: string
  type: "regular" | "no-folder" | "archived"
  name: string
  emptyMessage: string
  color?: string
  _id?: string
}

const allFolders = computed<FolderRow[]>(() => {
  const f: FolderRow[] = folders.value.map((folder) => ({
    ...folder,
    id: folder._id ?? "",
    type: "regular",
    name: folder.name ?? "",
    emptyMessage: "No events in this folder",
  }))

  if (allEvents.value.length > 0) {
    f.push({
      id: "no-folder",
      type: "no-folder",
      name: "No folder",
      emptyMessage: "No events",
    })
  }

  if (allEvents.value.some((event) => event.isArchived)) {
    f.push({
      id: "archived",
      type: "archived",
      name: "Archived",
      emptyMessage: "No archived events",
    })
  }

  return f
})

const onEnd = (evt: DragEvent) => {
  const eventId = evt.item.id
  let newFolderId: string | null = evt.to.dataset.folderId ?? null
  if (
    newFolderId === "no-folder"
  ) {
    newFolderId = null
  }
  if (newFolderId === "archived") return

  let fromFolderId: string | null = evt.from.dataset.folderId ?? null
  if (fromFolderId === "no-folder") fromFolderId = null
  if (fromFolderId === "archived") fromFolderId = null

  if (fromFolderId === newFolderId) return

  const event = allEvents.value.find((e) => e._id === eventId)
  if (event?._id) {
    void mainStore.setEventFolder({ eventId: event._id, folderId: newFolderId })
  }
}

const confirmFolderDialog = () => {
  if (!newFolderName.value.trim()) {
    closeFolderDialog()
    return
  }
  if (isEditingFolder.value && folderToEdit.value?._id) {
    void mainStore.updateFolder({
      folderId: folderToEdit.value._id,
      name: newFolderName.value.trim(),
      color: newFolderColor.value,
    })
  } else {
    posthog.capture("folder_created", {
      folderName: newFolderName.value.trim(),
      folderColor: newFolderColor.value,
    })
    void mainStore.createFolder({
      name: newFolderName.value.trim(),
      color: newFolderColor.value,
    })
  }
  closeFolderDialog()
}

const closeFolderDialog = () => {
  createFolderDialog.value = false
  isEditingFolder.value = false
  folderToEdit.value = null
  newFolderName.value = ""
  newFolderColor.value = folderColors[3]
}
const openCreateFolderDialog = () => {
  isEditingFolder.value = false
  folderToEdit.value = null
  newFolderName.value = ""
  newFolderColor.value = folderColors[3]
  createFolderDialog.value = true
}
const openEditFolderDialog = (folder: FolderRow) => {
  isEditingFolder.value = true
  folderToEdit.value = folder
  newFolderName.value = folder.name
  newFolderColor.value = folder.color ?? folderColors[3]
  createFolderDialog.value = true
}
const toggleFolder = (folderId: string) => {
  folderOpenState.value = {
    ...folderOpenState.value,
    [folderId]: !folderOpenState.value[folderId],
  }
}
const createEventInFolder = (folderId: string) => {
  const actualFolderId = folderId === "no-folder" ? null : folderId
  mainStore.createNew({ eventOnly: false, folderId: actualFolderId })
}
const openDeleteDialog = (folder: FolderRow) => {
  folderToDelete.value = folder
  deleteDialog.value = true
}
const confirmDelete = () => {
  if (folderToDelete.value?._id) {
    void mainStore.deleteFolder(folderToDelete.value._id)
  }
  deleteDialog.value = false
}

watch(
  folderOpenState,
  (newState) => {
    try {
      localStorage.setItem("folderOpenState", JSON.stringify(newState))
    } catch (e) {
      console.error("Error saving folderOpenState to localStorage", e)
    }
  },
  { deep: true }
)
watch(
  folders,
  (newFolders) => {
    newFolders.forEach((folder) => {
      if (folder._id && !(folder._id in folderOpenState.value)) {
        folderOpenState.value = {
          ...folderOpenState.value,
          [folder._id]: true,
        }
      }
    })
  },
  { immediate: true }
)
</script>

<style>
.v-expansion-panel-header {
  padding: 16px 4px !important;
}
</style>
