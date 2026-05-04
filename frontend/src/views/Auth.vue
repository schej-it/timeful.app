<template><span></span></template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { get, post, getEventsCreated, deleteEventsCreated } from "@/utils"
import { authTypes, calendarTypes } from "@/constants"
import { useMainStore } from "@/stores/main"
import { posthog } from "@/plugins/posthog"
import { Temporal } from "temporal-polyfill"
import type { SerializedEventDraft } from "@/composables/event/types"
import { serializeRouteContactsPayload } from "@/router/routeProps"
import type { RawUser } from "@/types/transport"
import { fromRawUser } from "@/types/transport"

defineOptions({ name: 'AppAuth' })

interface AuthState {
  type?: string
  calendarType?: string
  scope?: string
  eventId?: string
  groupId?: string
  payload?: SerializedEventDraft
  openNewGroup?: boolean
  upgradeParams?: string
}

interface UpgradeParams {
  priceId: string
  isSubscription: boolean
  originUrl: string
}

const router = useRouter()
const route = useRoute()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

void (async () => {
  let { error, code, scope, state: rawState } = route.query
  if (error) void router.replace({ name: "home" })

  let state: AuthState | null = null
  if (rawState) state = JSON.parse(decodeURIComponent(rawState as string)) as AuthState

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
      const user = fromRawUser(await post<RawUser>("/auth/sign-in", {
        code,
        scope: scope ?? state?.scope,
        calendarType: state?.calendarType,
        timezoneOffset: Temporal.Now.zonedDateTimeISO().offsetNanoseconds / (1000 * 1000 * 1000) / 60 * -1,
        eventsToLink: getEventsCreated(),
      }))
      deleteEventsCreated()

      mainStore.setAuthUser(user)

      posthog.identify(user._id, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })
    }

    if (state) {
      let authUserRefreshed
      switch (state.type) {
        case authTypes.EVENT_ADD_AVAILABILITY:
          void router.replace({
            name: "event",
            params: { eventId: state.eventId },
            query: { fromSignIn: "true" },
          })
          break
        case authTypes.EVENT_SIGN_IN:
          void router.replace({
            name: "event",
            params: { eventId: state.eventId },
          })
          break
        case authTypes.EVENT_SIGN_IN_LINK_APPLE:
          void router.replace({
            name: "event",
            params: { eventId: state.eventId },
            query: { linkApple: "true" },
          })
          break
        case authTypes.GROUP_CREATE:
          void router.replace({
            name: "home",
            query: {
              openNewGroup: "true",
            },
          })
          break
        case authTypes.GROUP_SIGN_IN:
          void router.replace({
            name: "group",
            params: { groupId: state.groupId },
          })
          break
        case authTypes.GROUP_ADD_AVAILABILITY:
          void router.replace({
            name: "group",
            params: { groupId: state.eventId },
            query: { fromSignIn: "true" },
          })
          authUserRefreshed = fromRawUser(await get<RawUser>("/user/profile"))
          mainStore.setAuthUser(authUserRefreshed)
          break
        case authTypes.ADD_CALENDAR_ACCOUNT:
          void router.replace({
            name: "settings",
          })
          authUserRefreshed = fromRawUser(await get<RawUser>("/user/profile"))
          mainStore.setAuthUser(authUserRefreshed)
          break
        case authTypes.ADD_CALENDAR_ACCOUNT_FROM_EDIT:
          void router.replace({
            name: "event",
            params: { eventId: state.eventId },
            query: { fromSignIn: "true" },
          })
          authUserRefreshed = fromRawUser(await get<RawUser>("/user/profile"))
          mainStore.setAuthUser(authUserRefreshed)
          break
        case authTypes.EVENT_CONTACTS:
          if (state.eventId == "") {
            void router.replace({
              name: "home",
              query: {
                contactsPayload: serializeRouteContactsPayload(state.payload),
                openNewGroup: String(state.openNewGroup ?? false),
              },
            })
          } else {
            void router.replace({
              name: "event",
              params: {
                eventId: state.eventId,
              },
              query: {
                contactsPayload: serializeRouteContactsPayload(state.payload),
              },
            })
          }
          break
        case authTypes.UPGRADE:
          try {
            const params = JSON.parse(state.upgradeParams ?? "") as UpgradeParams
            const res = await post<{ url: string }>(
              "/stripe/create-checkout-session",
              {
                priceId: params.priceId,
                userId: authUser.value?._id ?? "",
                isSubscription: params.isSubscription,
                originUrl: params.originUrl,
              }
            )
            window.location.href = res.url
          } catch (e) {
            console.error(e)
            void router.replace({ name: "home" })
          }
          break
        default:
          void router.replace({ name: "home" })
      }
    } else {
      void router.replace({ name: "home" })
    }
  } catch (err) {
    console.error(err)
  }
})()
</script>
