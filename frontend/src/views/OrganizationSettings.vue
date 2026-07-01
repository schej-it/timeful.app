<template>
  <div class="tw-mx-auto tw-mb-12 tw-mt-5 tw-max-w-3xl">
    <div v-if="loading" class="tw-flex tw-justify-center tw-p-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!org" class="tw-p-8 tw-text-center tw-text-very-dark-gray">
      Organization not found.
    </div>

    <div v-else class="tw-flex tw-flex-col tw-gap-16 tw-p-4">
      <!-- General -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          General
        </div>
        <div>
          <div class="tw-mb-1 tw-font-medium">Organization name</div>
          <div class="tw-flex tw-max-w-lg tw-items-center tw-gap-2">
            <v-text-field
              v-model="name"
              hide-details
              outlined
              dense
              :disabled="!isAdmin"
              placeholder="Organization name"
            />
            <v-btn
              v-if="isAdmin && name.trim() && name !== org.name"
              color="primary"
              @click="saveName"
            >
              Save
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Members -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div class="tw-flex tw-items-center tw-justify-between">
          <div
            class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
          >
            Members
          </div>
          <v-btn
            v-if="isAdmin"
            color="primary"
            small
            @click="showInviteDialog = true"
          >
            <v-icon small class="tw-mr-1">mdi-plus</v-icon> Invite
          </v-btn>
        </div>
        <MemberList
          :org-id="org._id"
          :members="org.members || []"
          :invitations="invitations"
          :my-role="org.myRole"
          :my-user-id="authUser._id"
          @changed="reload"
        />
      </div>

      <!-- Billing -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Billing
        </div>
        <OrgBilling :org="org" />
      </div>

      <!-- Danger zone -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div class="tw-text-xl tw-font-medium tw-text-red sm:tw-text-2xl">
          Danger zone
        </div>
        <div>
          <v-btn
            v-if="isOwner"
            color="red"
            outlined
            @click="confirmDelete = true"
          >
            Delete organization
          </v-btn>
          <v-btn v-else color="red" outlined @click="leave">
            Leave organization
          </v-btn>
        </div>
      </div>
    </div>

    <InviteMemberDialog
      v-if="org"
      v-model="showInviteDialog"
      :org-id="org._id"
      :can-invite-admin="isOwner"
      @invited="reload"
    />

    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card>
        <v-card-title class="tw-text-lg">Delete organization?</v-card-title>
        <v-card-text>
          This permanently removes the organization, its members, and all of its
          events, and cancels the subscription. This cannot be undone.
        </v-card-text>
        <v-card-actions class="tw-px-4 tw-pb-4">
          <v-spacer />
          <v-btn text @click="confirmDelete = false">Cancel</v-btn>
          <v-btn color="red" :loading="deleting" @click="doDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapState, mapActions } from "vuex"
import MemberList from "@/components/organizations/MemberList.vue"
import InviteMemberDialog from "@/components/organizations/InviteMemberDialog.vue"
import OrgBilling from "@/components/organizations/OrgBilling.vue"
import {
  getOrg,
  updateOrg,
  deleteOrg,
  leaveOrg,
  listInvitations,
} from "@/utils/services/OrganizationService"

export default {
  name: "OrganizationSettings",
  components: { MemberList, InviteMemberDialog, OrgBilling },
  data() {
    return {
      org: null,
      invitations: [],
      name: "",
      loading: true,
      showInviteDialog: false,
      confirmDelete: false,
      deleting: false,
    }
  },
  computed: {
    ...mapState(["authUser"]),
    orgId() {
      return this.$route.params.orgId
    },
    isOwner() {
      return this.org && this.org.myRole === "owner"
    },
    isAdmin() {
      return (
        this.org &&
        (this.org.myRole === "owner" || this.org.myRole === "admin")
      )
    },
  },
  watch: {
    orgId() {
      this.reload()
    },
  },
  created() {
    this.reload()
  },
  methods: {
    ...mapActions(["showError", "showInfo", "getOrgs", "switchContext"]),
    async reload() {
      this.loading = true
      try {
        this.org = await getOrg(this.orgId)
        this.name = this.org.name
        if (this.isAdmin) {
          this.invitations = await listInvitations(this.orgId)
        } else {
          this.invitations = []
        }
      } catch (err) {
        this.org = null
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    async saveName() {
      try {
        await updateOrg(this.orgId, this.name.trim())
        this.org.name = this.name.trim()
        await this.getOrgs()
        this.showInfo("Saved!")
      } catch (err) {
        this.showError("There was a problem updating the organization!")
        console.error(err)
      }
    },
    async doDelete() {
      this.deleting = true
      try {
        await deleteOrg(this.orgId)
        await this.getOrgs()
        await this.switchContext(null)
        this.$router.push({ name: "home" })
      } catch (err) {
        this.showError("There was a problem deleting the organization!")
        console.error(err)
        this.deleting = false
      }
    },
    async leave() {
      try {
        await leaveOrg(this.orgId)
        await this.getOrgs()
        await this.switchContext(null)
        this.$router.push({ name: "home" })
      } catch (err) {
        this.showError("There was a problem leaving the organization!")
        console.error(err)
      }
    },
  },
}
</script>
