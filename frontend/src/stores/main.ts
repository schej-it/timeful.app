import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { numFreeEvents, upgradeDialogTypes } from "@/constants"
import type { UpgradeDialogType } from "@/constants"
import { get, isPremiumUser as isPremiumUserUtil } from "@/utils"
import {
  createFolder as createFolderService,
  deleteFolder as deleteFolderService,
  setEventFolder as setEventFolderService,
  updateFolder as updateFolderService,
} from "@/utils/services/FolderService"
import { archiveEvent as archiveEventService } from "@/utils/services/EventService"
import type { Event, Folder, NewDialogOptions, User, RawEvent } from "@/types"
import { fromRawEvent } from "@/types"

export const useMainStore = defineStore("main", () => {
  const error = ref("")
  const info = ref("")

  const authUser = ref<User | null>(null)

  const events = ref<Event[]>([])
  const folders = ref<Folder[]>([])

  const featureFlagsLoaded = ref(false)

  // Feature flags
  const groupsEnabled = ref(true)
  const signUpFormEnabled = ref(false)
  const daysOnlyEnabled = ref(true)
  const overlayAvailabilitiesEnabled = ref(true)
  const enablePaywall = ref(true)

  // Experiments
  const pricingPageConversion = ref("control")

  // Upgrade dialog
  const upgradeDialogVisible = ref(false)
  const upgradeDialogType = ref<UpgradeDialogType | null>(null)
  const upgradeDialogData = ref<unknown>(null)

  const isPremiumUser = computed(() => isPremiumUserUtil(authUser.value))

  // New dialog
  const newDialogOptions = ref<NewDialogOptions>({
    show: false,
    contactsPayload: {},
    openNewGroup: false,
    eventOnly: false,
    folderId: null,
  })

  const setError = (value: string) => {
    error.value = value
  }
  const setInfo = (value: string) => {
    info.value = value
  }

  const setAuthUser = (user: User | null) => {
    authUser.value = user
  }

  const setEvents = (value: Event[]) => {
    events.value = value
  }
  const setFolders = (value: Folder[]) => {
    folders.value = value
  }

  const setFeatureFlagsLoaded = (loaded: boolean) => {
    featureFlagsLoaded.value = loaded
  }
  const setGroupsEnabled = (enabled: boolean) => {
    groupsEnabled.value = enabled
  }
  const setSignUpFormEnabled = (enabled: boolean) => {
    signUpFormEnabled.value = enabled
  }
  const setDaysOnlyEnabled = (enabled: boolean) => {
    daysOnlyEnabled.value = enabled
  }
  const setOverlayAvailabilitiesEnabled = (enabled: boolean) => {
    overlayAvailabilitiesEnabled.value = enabled
  }
  const setPricingPageConversion = (conversion: string) => {
    pricingPageConversion.value = conversion
  }
  const setEnablePaywall = (enabled: boolean) => {
    enablePaywall.value = enabled
  }
  const setUpgradeDialogVisible = (visible: boolean) => {
    upgradeDialogVisible.value = visible
  }
  const setUpgradeDialogType = (type: UpgradeDialogType | null) => {
    upgradeDialogType.value = type
  }
  const setUpgradeDialogData = (data: unknown) => {
    upgradeDialogData.value = data
  }

  const addFolder = (folder: Folder) => {
    folders.value.push(folder)
  }
  const removeFolder = (folderId: string) => {
    folders.value = folders.value.filter((f) => f._id !== folderId)
  }
  const removeEventFromFolder = (eventId: string) => {
    folders.value.forEach((folder) => {
      folder.eventIds = (folder.eventIds ?? []).filter((id) => id !== eventId)
    })
  }
  const addEventToFolder = ({
    eventId,
    folderId,
  }: {
    eventId: string
    folderId: string | null
  }) => {
    const folder = folders.value.find((f) => f._id === folderId)
    if (folder) {
      folder.eventIds ??= []
      folder.eventIds.push(eventId)
    }
  }

  const setNewDialogOptions = ({
    show = false,
    contactsPayload = {},
    openNewGroup = false,
    eventOnly = true,
    folderId = null,
  }: Partial<NewDialogOptions> = {}) => {
    newDialogOptions.value = {
      show,
      contactsPayload,
      openNewGroup,
      eventOnly,
      folderId,
    }
  }

  // Error & info
  const showError = (value: string) => {
    setError("")
    setTimeout(() => { setError(value); }, 0)
  }
  const showInfo = (value: string) => {
    setInfo("")
    setTimeout(() => { setInfo(value); }, 0)
  }

  const refreshAuthUser = async () => {
    const user = await get<User>("/user/profile")
    setAuthUser(user)
  }

  const showUpgradeDialog = ({
    type,
    data = null,
  }: {
    type: UpgradeDialogType
    data?: unknown
  }) => {
    setUpgradeDialogVisible(true)
    setUpgradeDialogType(type)
    setUpgradeDialogData(data)
  }
  const hideUpgradeDialog = () => {
    setUpgradeDialogVisible(false)
    setUpgradeDialogType(null)
    setUpgradeDialogData(null)
  }

  const createNew = ({
    eventOnly = false,
    folderId = null,
  }: {
    eventOnly?: boolean
    folderId?: string | null
  }) => {
    if (
      enablePaywall.value &&
      !isPremiumUser.value &&
      (authUser.value?.numEventsCreated ?? 0) >= numFreeEvents
    ) {
      showUpgradeDialog({ type: upgradeDialogTypes.CREATE_EVENT })
      return
    }

    setNewDialogOptions({
      show: true,
      contactsPayload: {},
      openNewGroup: false,
      eventOnly,
      folderId,
    })
  }

  // Events
  const getEvents = () => {
    if (authUser.value) {
      return Promise.allSettled([
        get<Folder[]>("/user/folders"),
        get<RawEvent[]>("/user/events"),
      ])
        .then(([foldersResult, eventsResult]) => {
          if (
            foldersResult.status === "fulfilled" &&
            eventsResult.status === "fulfilled"
          ) {
            setFolders(foldersResult.value)
            // Convert raw events to Temporal-based events
            const convertedEvents = eventsResult.value.map(fromRawEvent)
            setEvents(convertedEvents)
          } else {
            showError("There was a problem fetching events!")
            console.error(
              foldersResult.status === "rejected" ? foldersResult.reason : null,
              eventsResult.status === "rejected" ? eventsResult.reason : null
            )
          }
        })
        .catch((err: unknown) => {
          showError("There was a problem fetching events!")
          console.error(err)
        })
    } else {
      return null
    }
  }

  const archiveEvent = async ({
    eventId,
    archive,
  }: {
    eventId: string
    archive: boolean
  }) => {
    try {
      await archiveEventService(eventId, archive)
      const event = events.value.find((e) => e._id === eventId)
      if (event) {
        event.isArchived = archive
      }
    } catch (err) {
      showError("There was a problem archiving the event!")
      console.error(err)
    }
  }

  const createFolder = async ({
    name,
    color,
  }: {
    name: string
    color: string
  }) => {
    try {
      const folder = (await createFolderService(name, color)) as {
        id?: string
      }
      addFolder({
        _id: folder.id,
        name,
        color,
        eventIds: [],
      })
    } catch (err) {
      showError("There was a problem creating the folder!")
      console.error(err)
    }
  }

  const updateFolder = async ({
    folderId,
    name,
    color,
  }: {
    folderId: string
    name: string
    color: string
  }) => {
    try {
      await updateFolderService(folderId, name, color)
      const folder = folders.value.find((f) => f._id === folderId)
      if (folder) {
        folder.name = name
        folder.color = color
      }
    } catch (err) {
      showError("There was a problem updating the folder!")
      console.error(err)
    }
  }

  const deleteFolder = async (folderId: string) => {
    try {
      await deleteFolderService(folderId)
      removeFolder(folderId)
    } catch (err) {
      showError("There was a problem deleting the folder!")
      console.error(err)
    }
  }

  const setEventFolder = async ({
    eventId,
    folderId,
  }: {
    eventId: string
    folderId: string | null
  }) => {
    try {
      removeEventFromFolder(eventId)
      addEventToFolder({ eventId, folderId })
      await setEventFolderService(eventId, folderId)
    } catch (err) {
      showError("There was a problem moving the event!")
      console.error(err)
    }
  }

  return {
    // state
    error,
    info,
    authUser,
    events,
    folders,
    featureFlagsLoaded,
    groupsEnabled,
    signUpFormEnabled,
    daysOnlyEnabled,
    overlayAvailabilitiesEnabled,
    enablePaywall,
    pricingPageConversion,
    upgradeDialogVisible,
    upgradeDialogType,
    upgradeDialogData,
    newDialogOptions,
    // getters
    isPremiumUser,
    // mutations (kept as discrete fns for 1:1 parity with Vuex commit sites)
    setError,
    setInfo,
    setAuthUser,
    setEvents,
    setFolders,
    setFeatureFlagsLoaded,
    setGroupsEnabled,
    setSignUpFormEnabled,
    setDaysOnlyEnabled,
    setOverlayAvailabilitiesEnabled,
    setPricingPageConversion,
    setEnablePaywall,
    setUpgradeDialogVisible,
    setUpgradeDialogType,
    setUpgradeDialogData,
    addFolder,
    removeFolder,
    removeEventFromFolder,
    addEventToFolder,
    setNewDialogOptions,
    // actions
    showError,
    showInfo,
    refreshAuthUser,
    showUpgradeDialog,
    hideUpgradeDialog,
    createNew,
    getEvents,
    archiveEvent,
    createFolder,
    updateFolder,
    deleteFolder,
    setEventFolder,
  }
})
