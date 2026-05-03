<!-- Displays auth user's avatar, which displays a menu when clicked -->
<template>
  <span>
    <v-menu v-if="authUser" offset-y left>
      <template #activator="{ props }">
        <v-btn
          id="user-menu-btn"
          icon
          :width="size"
          :height="size"
          v-bind="props"
        >
          <v-avatar :size="size">
            <UserAvatarContent :user="authUser" :size="size" />
          </v-avatar>
        </v-btn>
      </template>
      <v-list class="py-0" :dense="isPhone">
        <v-list-item>
          <v-list-item-title>
            <strong>{{ `${authUser.firstName} ${authUser.lastName}` }}</strong>
          </v-list-item-title>
        </v-list-item>
        <!-- <v-list-item id="add-team-member-btn" @click="addTeamMember">
          <v-list-item-title class="tw-flex tw-items-center tw-gap-1">
            <v-icon class="tw-mr-1" small color="black"
              >mdi-account-plus</v-icon
            >
            Add team member
          </v-list-item-title>
        </v-list-item> -->
        <v-list-item
          v-if="showFeedbackBtn"
          id="feedback-btn"
          href="https://forms.gle/A96i4TTWeKgH3P1W6"
          target="_blank"
        >
          <v-list-item-title class="tw-flex tw-items-center tw-gap-1">
            <v-icon class="tw-mr-1" small color="black">mdi-message</v-icon>
            Give feedback
          </v-list-item-title>
        </v-list-item>
        <v-list-item id="settings-btn" @click="goToSettings">
          <v-list-item-title class="tw-flex tw-items-center tw-gap-1">
            <v-icon class="tw-mr-1" small color="black">mdi-cog</v-icon>
            Settings
          </v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item id="sign-out-btn" @click="signOut">
          <v-list-item-title class="red--text tw-flex tw-items-center tw-gap-1">
            <v-icon class="tw-mr-1" small color="red">mdi-logout</v-icon>
            Sign Out
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
    <TeamsNotReadyDialog v-model="showTeamsNotReadyDialog" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter, useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import TeamsNotReadyDialog from "@/components/TeamsNotReadyDialog.vue"
import { useMainStore } from "@/stores/main"
import { post } from "@/utils"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import { posthog } from "@/plugins/posthog"

const router = useRouter()
const route = useRoute()
const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const showTeamsNotReadyDialog = ref(false)

const size = computed(() => (isPhone.value ? 32 : 42))
const showFeedbackBtn = computed(
  () => !(!isPhone.value || route.name === "home")
)

const signOut = async () => {
  await post("/auth/sign-out")
  mainStore.setAuthUser(null)
  posthog.reset()
  location.reload()
}
const goToSettings = () => {
  void router.replace({ name: "settings" })
}
</script>
