<template>
  <div class="tw-rounded-md tw-px-6 tw-py-4 sm:tw-mx-4 sm:tw-bg-[var(--color-surface-highlight)]">
    <div class="tw-mb-3 tw-flex tw-items-center tw-justify-between">
      <div class="tw-flex tw-flex-col">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green tw-dark:tw-text-light-green sm:tw-text-2xl"
        >
          Dashboard
        </div>
        <div
          v-if="!isPremiumUser"
          class="tw-flex tw-items-baseline tw-gap-2 tw-text-sm tw-font-normal tw-text-text-secondary"
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
        @click="openCreateFolderDialog"
        class="tw-text-text-secondary"
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
            class="tw-mr-2 tw-cursor-pointer tw-rounded tw-border tw-border-border-default tw-px-2 tw-text-sm tw-font-medium"
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
              <template v-slot:activator="{ on, attrs }">
                <v-btn icon small v-bind="attrs" v-on="on" @click.stop.prevent>
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
            :list="[
              ...eventsByFolder[folder.id].groups,
              ...eventsByFolder[folder.id].events,
            ]"
            group="events"
            @end="onEnd"
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
          >
            <template v-slot:header>
              <div
                v-if="
                  eventsByFolder[folder.id].groups.length === 0 &&
                  eventsByFolder[folder.id].events.length === 0
                "
                class="tw-absolute tw-left-0 tw-py-4 tw-text-sm tw-text-text-secondary"
                :class="folder.type === 'regular' ? 'tw-ml-8' : 'tw-ml-7'"
              >
                {{ folder.emptyMessage }}
              </div>
            </template>
            <template v-if="eventsByFolder[folder.id].groups.length > 0">
              <EventItem
                v-for="event in eventsByFolder[folder.id].groups"
                :key="event._id"
                :id="event._id"
                :event="event"
                :folder-id="folder.id"
                class="item"
              />
              <div class="tw-col-span-full"></div>
            </template>
            <EventItem
              v-for="event in eventsByFolder[folder.id].events"
              :key="event._id"
              :id="event._id"
              :event="event"
              :folder-id="folder.id"
              class="item"
            />
          </draggable>
        </div>
      </div>

      <div v-if="allEvents.length === 0">
        <div class="tw-py-4 tw-text-sm tw-text-text-secondary">
          No events yet! Create one to get started.
        </div>
      </div>
    </div>
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete "{{ folderToDelete.name }}"?</v-card-title>
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
            @keydown.enter="confirmFolderDialog"
            hide-details
          ></v-text-field>
          <div class="tw-mt-4">
            <span class="tw-text-gray-500 tw-text-sm">Color</span>
            <div class="tw-mt-2 tw-flex tw-gap-x-3">
              <div
                v-for="color in folderColors"
                :key="color"
                class="tw-h-6 tw-w-6 tw-cursor-pointer tw-rounded-full tw-border tw-border-border-default"
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

<script>
import { mapState, mapActions, mapGetters } from "vuex"
import draggable from "vuedraggable"
import {
  eventTypes,
  folderColors,
  numFreeEvents,
  upgradeDialogTypes,
} from "@/constants"
import EventItem from "@/components/EventItem.vue"
import ObjectID from "bson-objectid"

export default {
  name: "Dashboard",
  components: {
    EventItem,
    draggable,
  },
  data() {
    return {
      deleteDialog: false,
      folderToDelete: {},
      createFolderDialog: false,
      newFolderName: "",
      newFolderColor: folderColors[3],
      isEditingFolder: false,
      folderToEdit: null,
      folderOpenState: {
        "no-folder": true,
      },
    }
  },
  computed: {
    ...mapGetters(["isPremiumUser"]),
    ...mapState(["authUser", "events", "groupsEnabled", "folders"]),
    orderedFolders() {
      return this.folders.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })
    },
    numFreeEvents() {
      return numFreeEvents
    },
    folderColors() {
      return folderColors
    },
    allEvents() {
      return this.events
    },
    allEventsMap() {
      return this.allEvents.reduce((acc, event) => {
        acc[event._id] = event
        return acc
      }, {})
    },
    eventsByFolder() {
      const eventsByFolder = {}
      const allEventIds = new Set(this.allEvents.map((e) => e._id))

      eventsByFolder["no-folder"] = { groups: [], events: [] }
      eventsByFolder["archived"] = { groups: [], events: [] }

      this.folders.forEach((folder) => {
        eventsByFolder[folder._id] = { groups: [], events: [] }
        for (const eventId of folder.eventIds) {
          const event = this.allEventsMap[eventId]
          if (event) {
            if (event.isArchived) {
              if (event.type === eventTypes.GROUP) {
                eventsByFolder["archived"].groups.push(event)
              } else {
                eventsByFolder["archived"].events.push(event)
              }
            } else {
              if (event.type === eventTypes.GROUP) {
                eventsByFolder[folder._id].groups.push(event)
              } else {
                eventsByFolder[folder._id].events.push(event)
              }
            }
            allEventIds.delete(eventId)
          }
        }
        eventsByFolder[folder._id].groups.sort(this.sortEvents)
        eventsByFolder[folder._id].events.sort(this.sortEvents)
      })

      for (const eventId of allEventIds) {
        const event = this.allEventsMap[eventId]
        if (event) {
          if (event.isArchived) {
            if (event.type === eventTypes.GROUP) {
              eventsByFolder["archived"].groups.push(event)
            } else {
              eventsByFolder["archived"].events.push(event)
            }
          } else {
            if (event.type === eventTypes.GROUP) {
              eventsByFolder["no-folder"].groups.push(event)
            } else {
              eventsByFolder["no-folder"].events.push(event)
            }
          }
        }
      }

      eventsByFolder["no-folder"].groups.sort(this.sortEvents)
      eventsByFolder["no-folder"].events.sort(this.sortEvents)
      eventsByFolder["archived"].groups.sort(this.sortEvents)
      eventsByFolder["archived"].events.sort(this.sortEvents)
      return eventsByFolder
    },
    folderDialogTitle() {
      return this.isEditingFolder ? "Edit folder" : "New folder"
    },
    folderDialogConfirmText() {
      return this.isEditingFolder ? "Save" : "Create"
    },
    allFolders() {
      const folders = this.folders.map((folder) => ({
        ...folder,
        id: folder._id,
        type: "regular",
        name: folder.name,
        emptyMessage: "No events in this folder",
      }))

      // Only show "no-folder" section if there are events
      if (this.allEvents.length > 0) {
        folders.push({
          id: "no-folder",
          type: "no-folder",
          name: "No folder",
          emptyMessage: "No events",
        })
      }

      // Only show "archived" section if there are archived events
      if (this.allEvents.some((event) => event.isArchived)) {
        folders.push({
          id: "archived",
          type: "archived",
          name: "Archived",
          emptyMessage: "No archived events",
        })
      }

      return folders
    },
  },

  methods: {
    ...mapActions([
      "createFolder",
      "showUpgradeDialog",
      "deleteFolder",
      "setEventFolder",
      "updateFolder",
      "createNew",
    ]),
    sortEvents(a, b) {
      if (ObjectID.isValid(a._id) && ObjectID.isValid(b._id)) {
        return ObjectID(b._id).getTimestamp() - ObjectID(a._id).getTimestamp()
      }
      return 0
    },
    onEnd(evt) {
      const eventId = evt.item.id
      let newFolderId = evt.to.dataset.folderId
      if (
        newFolderId === "null" ||
        newFolderId === undefined ||
        newFolderId === "no-folder"
      ) {
        newFolderId = null
      }

      // Don't allow dropping into archived section
      if (newFolderId === "archived") {
        return
      }

      let fromFolderId = evt.from.dataset.folderId
      if (fromFolderId === "no-folder") {
        fromFolderId = null
      }
      if (fromFolderId === "archived") {
        fromFolderId = null
      }

      // if moving within the same folder, do nothing.
      if (fromFolderId === newFolderId) {
        // Here you might want to handle re-ordering within the same folder
        // For now, we do nothing.
        return
      }

      const event = this.allEvents.find((e) => e._id === eventId)

      if (event) {
        this.setEventFolder({
          eventId: event._id,
          folderId: newFolderId,
        })
      }
    },
    confirmFolderDialog() {
      if (!this.newFolderName.trim()) {
        this.closeFolderDialog()
        return
      }
      if (this.isEditingFolder) {
        this.updateFolder({
          folderId: this.folderToEdit._id,
          name: this.newFolderName.trim(),
          color: this.newFolderColor,
        })
      } else {
        this.$posthog.capture("folder_created", {
          folderName: this.newFolderName.trim(),
          folderColor: this.newFolderColor,
        })
        this.createFolder({
          name: this.newFolderName.trim(),
          color: this.newFolderColor,
        })
      }
      this.closeFolderDialog()
    },
    closeFolderDialog() {
      this.createFolderDialog = false
      this.isEditingFolder = false
      this.folderToEdit = null
      this.newFolderName = ""
      this.newFolderColor = folderColors[3]
    },
    openCreateFolderDialog() {
      this.isEditingFolder = false
      this.folderToEdit = null
      this.newFolderName = ""
      this.newFolderColor = folderColors[3]
      this.createFolderDialog = true
    },
    openEditFolderDialog(folder) {
      this.isEditingFolder = true
      this.folderToEdit = folder
      this.newFolderName = folder.name
      this.newFolderColor = folder.color || folderColors[3]
      this.createFolderDialog = true
    },
    toggleFolder(folderId) {
      this.$set(this.folderOpenState, folderId, !this.folderOpenState[folderId])
    },
    createEventInFolder(folderId) {
      const actualFolderId = folderId === "no-folder" ? null : folderId
      this.createNew({
        eventOnly: false,
        folderId: actualFolderId,
      })
    },
    openDeleteDialog(folder) {
      this.folderToDelete = folder
      this.deleteDialog = true
    },
    confirmDelete() {
      this.$store.dispatch("deleteFolder", this.folderToDelete._id)
      this.deleteDialog = false
    },
    openUpgradeDialog() {
      this.showUpgradeDialog({
        type: upgradeDialogTypes.UPGRADE_MANUALLY,
      })
    },
  },
  created() {
    try {
      const storedState = localStorage.getItem("folderOpenState")
      if (storedState) {
        this.folderOpenState = JSON.parse(storedState)
      }
    } catch (e) {
      console.error("Error reading folderOpenState from localStorage", e)
      // If corrupted, remove it
      localStorage.removeItem("folderOpenState")
    }
  },
  watch: {
    folderOpenState: {
      handler(newState) {
        try {
          localStorage.setItem("folderOpenState", JSON.stringify(newState))
        } catch (e) {
          console.error("Error saving folderOpenState to localStorage", e)
        }
      },
      deep: true,
    },
    folders: {
      handler(newFolders) {
        if (newFolders) {
          newFolders.forEach((folder) => {
            if (this.folderOpenState[folder._id] === undefined) {
              this.$set(this.folderOpenState, folder._id, true) // default to open
            }
          })
        }
      },
      immediate: true,
    },
  },
}
</script>

<style>
.v-expansion-panel-header {
  padding: 16px 4px !important;
}
</style>
