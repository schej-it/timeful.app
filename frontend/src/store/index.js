import Vue from "vue"
import Vuex from "vuex"
import { numFreeEvents, upgradeDialogTypes } from "@/constants"
import { get, isPremiumUser } from "@/utils"
import {
  createFolder,
  deleteFolder,
  setEventFolder,
  updateFolder,
} from "../utils/services/FolderService"
import { archiveEvent } from "../utils/services/EventService"

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    error: "",
    info: "",

    authUser: null,

    events: [],
    folders: [],

    featureFlagsLoaded: false,

    // Feature flags
    groupsEnabled: true,
    signUpFormEnabled: false,
    daysOnlyEnabled: true,
    overlayAvailabilitiesEnabled: true,
    enablePaywall: false,

    // Experiments
    pricingPageConversion: "control",

    // Upgrade dialog
    upgradeDialogVisible: false,
    upgradeDialogType: null,
    upgradeDialogData: null,

    // New dialog
    newDialogOptions: {
      show: false,
      contactsPayload: {},
      openNewGroup: false,
      eventOnly: false,
      folderId: null,
    },
  },
  getters: {
    isPremiumUser(state) {
      return isPremiumUser(state.authUser)
    },
  },
  mutations: {
    setError(state, error) {
      state.error = error
    },
    setInfo(state, info) {
      state.info = info
    },

    setAuthUser(state, authUser) {
      state.authUser = authUser
    },

    setEvents(state, events) {
      state.events = events
    },
    setFolders(state, folders) {
      state.folders = folders
    },

    setFeatureFlagsLoaded(state, loaded) {
      state.featureFlagsLoaded = loaded
    },
    setGroupsEnabled(state, enabled) {
      state.groupsEnabled = enabled
    },
    setSignUpFormEnabled(state, enabled) {
      state.signUpFormEnabled = enabled
    },
    setDaysOnlyEnabled(state, enabled) {
      state.daysOnlyEnabled = enabled
    },
    setOverlayAvailabilitiesEnabled(state, enabled) {
      state.overlayAvailabilitiesEnabled = enabled
    },
    setPricingPageConversion(state, conversion) {
      state.pricingPageConversion = conversion
    },
    setEnablePaywall(state, enabled) {
      state.enablePaywall = enabled
    },
    setUpgradeDialogVisible(state, visible) {
      state.upgradeDialogVisible = visible
    },
    setUpgradeDialogType(state, type) {
      state.upgradeDialogType = type
    },
    setUpgradeDialogData(state, data) {
      state.upgradeDialogData = data
    },

    addFolder(state, folder) {
      state.folders.push(folder)
    },
    updateFolder(state, { folderId, name, color }) {
      const folder = state.folders.find((f) => f._id === folderId)
      if (folder) {
        folder.name = name
        folder.color = color
      }
    },
    removeFolder(state, folderId) {
      state.folders = state.folders.filter((f) => f._id !== folderId)
    },
    removeEventFromFolder(state, eventId) {
      state.folders.forEach((folder) => {
        folder.eventIds = folder.eventIds.filter((id) => id !== eventId)
      })
    },
    addEventToFolder(state, { eventId, folderId }) {
      const folder = state.folders.find((f) => f._id === folderId)
      if (folder) {
        folder.eventIds.push(eventId)
      }
    },

    setNewDialogOptions(
      state,
      {
        show = false,
        contactsPayload = {},
        openNewGroup = false,
        eventOnly = true,
        folderId = null,
      }
    ) {
      state.newDialogOptions = {
        show,
        contactsPayload,
        openNewGroup,
        eventOnly,
        folderId,
      }
    },
  },
  actions: {
    // Error & info
    showError({ commit }, error) {
      commit("setError", "")
      setTimeout(() => commit("setError", error), 0)
    },
    showInfo({ commit }, info) {
      commit("setInfo", "")
      setTimeout(() => commit("setInfo", info), 0)
    },

    async refreshAuthUser({ commit }) {
      const authUser = await get("/user/profile")
      commit("setAuthUser", authUser)
    },

    createNew(
      { state, getters, commit, dispatch },
      { eventOnly = false, folderId = null }
    ) {
      if (
        state.enablePaywall &&
        !getters.isPremiumUser &&
        state.authUser?.numEventsCreated >= numFreeEvents
      ) {
        dispatch("showUpgradeDialog", {
          type: upgradeDialogTypes.CREATE_EVENT,
        })
        return
      }

      commit("setNewDialogOptions", {
        show: true,
        contactsPayload: {},
        openNewGroup: false,
        eventOnly: eventOnly,
        folderId: folderId,
      })
    },

    // Events
    getEvents({ commit, dispatch, state }) {
      if (state.authUser) {
        return Promise.allSettled([get("/user/folders"), get("/user/events")])
          .then(([folders, events]) => {
            if (
              folders.status === "fulfilled" &&
              events.status === "fulfilled"
            ) {
              commit("setFolders", folders.value)
              commit("setEvents", events.value)
            } else {
              dispatch("showError", "There was a problem fetching events!")
              console.error(folders.reason, events.reason)
            }
          })
          .catch((err) => {
            dispatch("showError", "There was a problem fetching events!")
            console.error(err)
          })
      } else {
        return null
      }
    },
    async archiveEvent({ dispatch, state }, { eventId, archive }) {
      try {
        await archiveEvent(eventId, archive)
        const event = state.events.find((e) => e._id === eventId)
        if (event) {
          event.isArchived = archive
        }
      } catch (err) {
        dispatch("showError", "There was a problem archiving the event!")
        console.error(err)
      }
    },
    async createFolder({ commit, dispatch }, { name, color }) {
      try {
        const folder = await createFolder(name, color)
        commit("addFolder", {
          _id: folder.id,
          name,
          color,
          eventIds: [],
        })
      } catch (err) {
        dispatch("showError", "There was a problem creating the folder!")
        console.error(err)
      }
    },
    async updateFolder({ commit, dispatch }, { folderId, name, color }) {
      try {
        await updateFolder(folderId, name, color)
        commit("updateFolder", { folderId, name, color })
      } catch (err) {
        dispatch("showError", "There was a problem updating the folder!")
        console.error(err)
      }
    },
    async deleteFolder({ commit, dispatch }, folderId) {
      try {
        await deleteFolder(folderId)
        commit("removeFolder", folderId)
      } catch (err) {
        dispatch("showError", "There was a problem deleting the folder!")
        console.error(err)
      }
    },
    async setEventFolder({ commit, dispatch }, { eventId, folderId }) {
      try {
        commit("removeEventFromFolder", eventId)
        commit("addEventToFolder", { eventId, folderId })
        await setEventFolder(eventId, folderId)
      } catch (err) {
        dispatch("showError", "There was a problem moving the event!")
        console.error(err)
      }
    },
    async refreshAuthUser({ commit }) {
      const authUser = await get("/user/profile")
      commit("setAuthUser", authUser)
    },
    showUpgradeDialog({ commit }, { type, data = null }) {
      commit("setUpgradeDialogVisible", true)
      commit("setUpgradeDialogType", type)
      commit("setUpgradeDialogData", data)
    },
    hideUpgradeDialog({ commit }) {
      commit("setUpgradeDialogVisible", false)
      commit("setUpgradeDialogType", null)
      commit("setUpgradeDialogData", null)
    },
  },
  modules: {},
})
