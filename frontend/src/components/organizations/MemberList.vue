<template>
  <div>
    <!-- Members -->
    <v-list class="tw-rounded-lg tw-border tw-border-light-gray" dense>
      <template v-for="(member, i) in members">
        <v-divider v-if="i > 0" :key="`d-${member._id}`" />
        <v-list-item :key="member._id">
          <v-list-item-avatar v-if="member.user && member.user.picture" size="32">
            <img :src="member.user.picture" />
          </v-list-item-avatar>
          <v-list-item-icon v-else class="tw-mr-3">
            <v-icon>mdi-account-circle</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ memberName(member) }}</v-list-item-title>
            <v-list-item-subtitle>{{
              member.user && member.user.email
            }}</v-list-item-subtitle>
          </v-list-item-content>

          <v-chip x-small label class="tw-mr-2 tw-capitalize">{{
            member.role
          }}</v-chip>

          <v-menu v-if="canManage(member)" offset-y bottom left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon small v-bind="attrs" v-on="on">
                <v-icon small>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item
                v-if="member.role === 'member'"
                @click="setRole(member, 'admin')"
              >
                <v-list-item-title>Make admin</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="member.role === 'admin'"
                @click="setRole(member, 'member')"
              >
                <v-list-item-title>Make member</v-list-item-title>
              </v-list-item>
              <v-list-item @click="remove(member)">
                <v-list-item-title class="tw-text-red">
                  Remove
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-list-item>
      </template>
    </v-list>

    <!-- Pending invitations -->
    <div v-if="invitations.length > 0" class="tw-mt-4">
      <div class="tw-mb-1 tw-text-sm tw-font-medium">Pending invitations</div>
      <v-list class="tw-rounded-lg tw-border tw-border-light-gray" dense>
        <template v-for="(inv, i) in invitations">
          <v-divider v-if="i > 0" :key="`di-${inv._id}`" />
          <v-list-item :key="inv._id">
            <v-list-item-icon class="tw-mr-3">
              <v-icon>mdi-email-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ inv.email }}</v-list-item-title>
              <v-list-item-subtitle class="tw-capitalize">
                {{ inv.role }} · invited
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-btn
              v-if="isAdmin"
              icon
              small
              :title="'Revoke invitation'"
              @click="revoke(inv)"
            >
              <v-icon small>mdi-close</v-icon>
            </v-btn>
          </v-list-item>
        </template>
      </v-list>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex"
import {
  changeMemberRole,
  removeMember,
  revokeInvitation,
} from "@/utils/services/OrganizationService"

export default {
  name: "MemberList",
  props: {
    orgId: { type: String, required: true },
    members: { type: Array, default: () => [] },
    invitations: { type: Array, default: () => [] },
    myRole: { type: String, default: "member" },
    myUserId: { type: String, default: "" },
  },
  computed: {
    isOwner() {
      return this.myRole === "owner"
    },
    isAdmin() {
      return this.myRole === "owner" || this.myRole === "admin"
    },
  },
  methods: {
    ...mapActions(["showError", "showInfo"]),
    memberName(member) {
      if (!member.user) return "Unknown user"
      return `${member.user.firstName || ""} ${
        member.user.lastName || ""
      }`.trim()
    },
    canManage(member) {
      if (!this.isAdmin) return false
      // Can't act on yourself or the owner
      if (member.userId === this.myUserId) return false
      if (member.role === "owner") return false
      // Only the owner can manage other admins
      if (member.role === "admin" && !this.isOwner) return false
      return true
    },
    async setRole(member, role) {
      try {
        await changeMemberRole(this.orgId, member.userId, role)
        this.$emit("changed")
      } catch (err) {
        this.showError("There was a problem changing the role!")
        console.error(err)
      }
    },
    async remove(member) {
      try {
        await removeMember(this.orgId, member.userId)
        this.showInfo("Member removed.")
        this.$emit("changed")
      } catch (err) {
        this.showError("There was a problem removing the member!")
        console.error(err)
      }
    },
    async revoke(inv) {
      try {
        await revokeInvitation(this.orgId, inv._id)
        this.$emit("changed")
      } catch (err) {
        this.showError("There was a problem revoking the invitation!")
        console.error(err)
      }
    },
  },
}
</script>
