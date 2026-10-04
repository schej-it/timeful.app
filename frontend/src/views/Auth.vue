<template></template>

<script>
import { get, post, getEventsCreated, deleteEventsCreated } from "@/utils"
import { mapMutations } from "vuex"
import { authTypes, calendarTypes } from "@/constants"

export default {
  name: "Auth",

  methods: {
    ...mapMutations(["setAuthUser"]),
  },

  async created() {
    let { error, code, scope, state } = this.$route.query
    if (error) this.$router.replace({ name: "home" })

    if (state) state = JSON.parse(decodeURIComponent(state))

    // Sign in and set auth user
    try {
      if (
        state?.type === authTypes.ADD_CALENDAR_ACCOUNT ||
        state?.type === authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT
      ) {
        if (state.calendarType === calendarTypes.GOOGLE) {
          await post("/user/add-google-calendar-account", { code, scope })
        } else if (state.calendarType === calendarTypes.OUTLOOK) {
          await post("/user/add-outlook-calendar-account", {
            code,
            scope: state.scope,
          })
        } else {
          throw new Error("Invalid calendar type")
        }
      } else {
        const user = await post("/auth/sign-in", {
          code,
          scope: scope ?? state.scope,
          calendarType: state.calendarType,
          timezoneOffset: new Date().getTimezoneOffset(),
          eventsToLink: getEventsCreated(),
        })
        deleteEventsCreated()

        this.setAuthUser(user)

        this.$posthog?.identify(user._id, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        })
      }

      // Redirect to the correct place based on "state", otherwise, just redirect to home
      if (state) {
        let authUser
        switch (state.type) {
          case authTypes.EVENT_ADD_AVAILABILITY:
            this.$router.replace({
              name: "event",
              params: { eventId: state.eventId, fromSignIn: true },
            })
            break
          case authTypes.EVENT_SIGN_IN:
            this.$router.replace({
              name: "event",
              params: { eventId: state.eventId },
            })
            break
          case authTypes.EVENT_SIGN_IN_LINK_APPLE:
            this.$router.replace({
              name: "event",
              params: { eventId: state.eventId, linkApple: true },
            })
            break
          case authTypes.GROUP_CREATE:
            this.$router.replace({
              name: "home",
              params: {
                openNewGroup: true,
              },
            })
            break
          case authTypes.GROUP_SIGN_IN:
            this.$router.replace({
              name: "group",
              params: { groupId: state.groupId },
            })
            break
          case authTypes.GROUP_ADD_AVAILABILITY:
            this.$router.replace({
              name: "group",
              params: { groupId: state.eventId, fromSignIn: true },
            })
            authUser = await get("/user/profile")
            this.setAuthUser(authUser)
            break
          case authTypes.ADD_CALENDAR_ACCOUNT:
            this.$router.replace({
              name: "settings",
            })
            authUser = await get("/user/profile")
            this.setAuthUser(authUser)
            break
          case authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT:
            this.$router.replace({
              name: "event",
              params: { eventId: state.eventId, fromSignIn: true },
            })
            authUser = await get("/user/profile")
            this.setAuthUser(authUser)
            break
          case authTypes.EVENT_CONTACTS:
            if (state.eventId == "") {
              this.$router.replace({
                name: "home",
                params: {
                  contactsPayload: state.payload,
                  openNewGroup: state.openNewGroup,
                },
              })
            } else {
              this.$router.replace({
                name: "event",
                params: {
                  eventId: state.eventId,
                  contactsPayload: state.payload,
                },
              })
            }
            break
          default:
            this.$router.replace({ name: "home" })
        }
      } else {
        this.$router.replace({ name: "home" })
      }
    } catch (err) {
      console.error(err)
    }
  },
}
</script>
