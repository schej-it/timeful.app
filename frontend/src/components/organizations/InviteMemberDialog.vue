<template>
  <v-dialog :value="value" max-width="440" @input="$emit('input', $event)">
    <v-card>
      <v-card-title class="tw-text-lg">Invite member</v-card-title>
      <v-card-text>
        <p class="tw-mb-4 tw-text-sm tw-text-very-dark-gray">
          Invite someone by email. Adding a member consumes a seat and adjusts
          your subscription accordingly.
        </p>
        <v-text-field
          v-model="email"
          label="Email address"
          type="email"
          outlined
          dense
          autofocus
          hide-details
          class="tw-mb-4"
          @keyup.enter="submit"
        />
        <v-select
          v-if="canInviteAdmin"
          v-model="role"
          :items="roleItems"
          label="Role"
          outlined
          dense
          hide-details
        />
      </v-card-text>
      <v-card-actions class="tw-px-4 tw-pb-4">
        <v-spacer />
        <v-btn text @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!email.trim()"
          @click="submit"
        >
          Send invite
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from "vuex"
import { inviteMember } from "@/utils/services/OrganizationService"

export default {
  name: "InviteMemberDialog",
  props: {
    value: { type: Boolean, default: false },
    orgId: { type: String, required: true },
    canInviteAdmin: { type: Boolean, default: false },
  },
  data() {
    return {
      email: "",
      role: "member",
      loading: false,
      roleItems: [
        { text: "Member", value: "member" },
        { text: "Admin", value: "admin" },
      ],
    }
  },
  methods: {
    ...mapActions(["showError", "showInfo"]),
    close() {
      this.$emit("input", false)
      this.email = ""
      this.role = "member"
    },
    async submit() {
      if (!this.email.trim()) return
      this.loading = true
      try {
        await inviteMember(this.orgId, this.email.trim(), this.role)
        this.showInfo("Invitation sent!")
        this.$emit("invited")
        this.close()
      } catch (err) {
        const code = err?.parsed?.error
        const msg =
          code === "already-org-member"
            ? "That person is already a member."
            : code === "already-invited"
            ? "That person has already been invited."
            : "There was a problem sending the invitation!"
        this.showError(msg)
        console.error(err)
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
