<!-- Displays auth user's avatar, which displays a menu when clicked -->
<template>
  <span>
    <v-menu v-if="authUser" offset-y left>
      <template v-slot:activator="{ on }">
        <v-btn id="user-menu-btn" icon :width="size" :height="size" v-on="on">
          <UserAvatarContent :user="authUser" :size="size" />
        </v-btn>
      </template>
      <v-list class="py-0" :dense="isPhone">
        <v-list-item>
          <v-list-item-title>
            <strong>{{ `${authUser.firstName} ${authUser.lastName}` }}</strong>
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
  </span>
</template>

<script>
import UserAvatarContent from "@/components/UserAvatarContent"
import { mapState, mapMutations } from "vuex"
import { post, isPhone } from "@/utils"

export default {
  name: "AuthUserMenu",

  components: {
    UserAvatarContent,
  },

  computed: {
    ...mapState(["authUser"]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
    size() {
      return this.isPhone ? 32 : 42
    },
  },

  methods: {
    ...mapMutations(["setAuthUser"]),
    async signOut() {
      await post("/auth/sign-out")
      this.setAuthUser(null)
      this.$posthog?.reset()
      location.reload()
    },
    goToSettings() {
      this.$router.replace({ name: "settings" })
    },
  },
}
</script>
