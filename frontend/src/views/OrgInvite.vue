<template>
  <div class="tw-mx-auto tw-mt-16 tw-max-w-md tw-px-4">
    <v-card class="tw-p-6">
      <div v-if="loading" class="tw-flex tw-justify-center tw-p-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <template v-else-if="!authUser">
        <div class="tw-mb-4 tw-text-lg tw-font-medium">
          You've been invited to a team
        </div>
        <p class="tw-mb-6 tw-text-sm tw-text-very-dark-gray">
          Sign in to view and accept your organization invitation.
        </p>
        <v-btn color="primary" block :to="{ name: 'sign-in' }">Sign in</v-btn>
      </template>

      <template v-else-if="invitations.length === 0">
        <div class="tw-mb-2 tw-text-lg tw-font-medium">No pending invitations</div>
        <p class="tw-mb-6 tw-text-sm tw-text-very-dark-gray">
          You don't have any pending organization invitations for
          <strong>{{ authUser.email }}</strong>. If you were invited at a
          different email, sign in with that account.
        </p>
        <v-btn outlined block :to="{ name: 'home' }">Go home</v-btn>
      </template>

      <template v-else>
        <div class="tw-mb-4 tw-text-lg tw-font-medium">
          Your invitations
        </div>
        <div
          v-for="inv in invitations"
          :key="inv._id"
          class="tw-mb-3 tw-flex tw-items-center tw-justify-between tw-rounded-lg tw-border tw-border-light-gray tw-p-3"
        >
          <div>
            <div class="tw-font-medium">
              {{ inv.organization ? inv.organization.name : "Organization" }}
            </div>
            <div class="tw-text-xs tw-capitalize tw-text-very-dark-gray">
              {{ inv.role }}
            </div>
          </div>
          <div class="tw-flex tw-gap-1">
            <v-btn
              small
              text
              :loading="busyId === inv._id"
              @click="decline(inv)"
            >
              Decline
            </v-btn>
            <v-btn
              small
              color="primary"
              :loading="busyId === inv._id"
              @click="accept(inv)"
            >
              Accept
            </v-btn>
          </div>
        </div>
      </template>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapActions } from "vuex"
import {
  listMyInvitations,
  acceptInvitation,
  declineInvitation,
} from "@/utils/services/OrganizationService"

export default {
  name: "OrgInvite",
  data() {
    return {
      invitations: [],
      loading: true,
      busyId: null,
    }
  },
  computed: {
    ...mapState(["authUser"]),
  },
  watch: {
    // authUser loads asynchronously in App.vue; refetch once it's available
    authUser() {
      this.load()
    },
  },
  created() {
    this.load()
  },
  methods: {
    ...mapActions(["showError", "getOrgs", "switchContext"]),
    async load() {
      this.loading = true
      try {
        if (this.authUser) {
          this.invitations = await listMyInvitations()
        }
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    async accept(inv) {
      this.busyId = inv._id
      try {
        const org = await acceptInvitation(inv._id)
        await this.getOrgs()
        await this.switchContext(org._id)
        this.$router.push({ name: "home" })
      } catch (err) {
        this.showError("There was a problem accepting the invitation!")
        console.error(err)
      } finally {
        this.busyId = null
      }
    },
    async decline(inv) {
      this.busyId = inv._id
      try {
        await declineInvitation(inv._id)
        this.invitations = this.invitations.filter((i) => i._id !== inv._id)
      } catch (err) {
        this.showError("There was a problem declining the invitation!")
        console.error(err)
      } finally {
        this.busyId = null
      }
    },
  },
}
</script>
