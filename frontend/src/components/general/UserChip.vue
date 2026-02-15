<template>
  <v-chip
    :key="user.email"
    size="x-small"
    class="tw-flex tw-w-fit tw-items-center tw-bg-surface-muted tw-text-text-secondary"
  >
    <v-avatar class="bg-accent text-uppercase tw-mr-2" start
      ><img
        v-if="user.picture"
        :src="user.picture"
        referrerpolicy="no-referrer"
        width="10px"
      />
      <v-icon v-else>mdi-account</v-icon></v-avatar
    >
    {{ user.email }}

    <v-icon
      v-if="removable"
      small
      @click="() => removeEmail(user.email)"
      class="tw-ml-1"
      >mdi-close</v-icon
    >
  </v-chip>
</template>

<script>
export default {
  name: "UserChip",

  props: {
    user: { type: Object, required: true },
    removable: { type: Boolean, default: false },
    removeEmail: { type: Function, default: () => {} },
  },

  components: {},

  data: () => ({}),

  created() {},

  computed: {},

  methods: {},
}
</script>
