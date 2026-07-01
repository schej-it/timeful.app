<template>
  <v-dialog :value="value" max-width="420" @input="$emit('input', $event)">
    <v-card>
      <v-card-title class="tw-text-lg">Create organization</v-card-title>
      <v-card-text>
        <p class="tw-mb-4 tw-text-sm tw-text-very-dark-gray">
          Create a shared workspace where your team can collaboratively manage
          events. You'll pay per seat for members you add.
        </p>
        <v-text-field
          v-model="name"
          label="Organization name"
          outlined
          dense
          autofocus
          hide-details
          @keyup.enter="submit"
        />
      </v-card-text>
      <v-card-actions class="tw-px-4 tw-pb-4">
        <v-spacer />
        <v-btn text @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!name.trim()"
          @click="submit"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from "vuex"
import { createOrg } from "@/utils/services/OrganizationService"

export default {
  name: "CreateOrgDialog",
  props: {
    value: { type: Boolean, default: false },
  },
  data() {
    return {
      name: "",
      loading: false,
    }
  },
  methods: {
    ...mapActions(["getOrgs", "showError"]),
    close() {
      this.$emit("input", false)
      this.name = ""
    },
    async submit() {
      if (!this.name.trim()) return
      this.loading = true
      try {
        const org = await createOrg(this.name.trim())
        await this.getOrgs()
        this.$emit("created", org)
        this.close()
      } catch (err) {
        this.showError("There was a problem creating the organization!")
        console.error(err)
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
