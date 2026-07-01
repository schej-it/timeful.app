<template>
  <div>
    <v-menu offset-y bottom left>
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          text
          small
          class="tw-normal-case"
          v-bind="attrs"
          v-on="on"
        >
          <v-icon small class="tw-mr-1">
            {{ activeOrg ? "mdi-account-group" : "mdi-account" }}
          </v-icon>
          <span class="tw-max-w-[10rem] tw-truncate">{{ contextLabel }}</span>
          <v-icon small class="tw-ml-1">mdi-chevron-down</v-icon>
        </v-btn>
      </template>

      <v-list dense min-width="220">
        <v-subheader>Workspaces</v-subheader>

        <v-list-item :input-value="!activeOrgId" @click="select(null)">
          <v-list-item-icon class="tw-mr-3">
            <v-icon small>mdi-account</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Personal</v-list-item-title>
          </v-list-item-content>
          <v-icon v-if="!activeOrgId" small color="primary">mdi-check</v-icon>
        </v-list-item>

        <v-list-item
          v-for="org in orgs"
          :key="org._id"
          :input-value="activeOrgId === org._id"
          @click="select(org._id)"
        >
          <v-list-item-icon class="tw-mr-3">
            <v-icon small>mdi-account-group</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ org.name }}</v-list-item-title>
          </v-list-item-content>
          <v-icon v-if="activeOrgId === org._id" small color="primary">
            mdi-check
          </v-icon>
        </v-list-item>

        <v-divider class="tw-my-1" />

        <v-list-item v-if="activeOrgId" @click="manageOrg">
          <v-list-item-icon class="tw-mr-3">
            <v-icon small>mdi-cog</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Organization settings</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click="showCreateDialog = true">
          <v-list-item-icon class="tw-mr-3">
            <v-icon small>mdi-plus</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Create organization</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>

    <CreateOrgDialog v-model="showCreateDialog" @created="onOrgCreated" />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex"
import CreateOrgDialog from "@/components/organizations/CreateOrgDialog.vue"

export default {
  name: "WorkspaceSwitcher",
  components: { CreateOrgDialog },
  data() {
    return {
      showCreateDialog: false,
    }
  },
  computed: {
    ...mapState(["orgs", "activeOrgId"]),
    ...mapGetters(["activeOrg"]),
    contextLabel() {
      return this.activeOrg ? this.activeOrg.name : "Personal"
    },
  },
  methods: {
    ...mapActions(["switchContext"]),
    async select(orgId) {
      if (orgId === this.activeOrgId) return
      await this.switchContext(orgId)
      if (this.$route.name !== "home") {
        this.$router.push({ name: "home" })
      }
    },
    manageOrg() {
      this.$router.push({
        name: "organizationSettings",
        params: { orgId: this.activeOrgId },
      })
    },
    async onOrgCreated(org) {
      await this.switchContext(org._id)
      this.$router.push({
        name: "organizationSettings",
        params: { orgId: org._id },
      })
    },
  },
}
</script>
