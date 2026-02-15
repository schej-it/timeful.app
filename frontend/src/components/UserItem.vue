<template>
  <v-container
    @click="$emit('click')"
    class="tw-flex tw-justify-between tw-rounded-md tw-bg-surface-muted tw-py-2 tw-align-middle tw-text-text-primary"
  >
    <div class="tw-mt-2 tw-flex">
      <div class="tw-mr-3">
        <v-avatar>
          <img
            v-if="!user.picture"
            src="https://cdn.vuetifyjs.com/images/john.jpg"
          />
          <img v-else :src="user.picture" />
        </v-avatar>
      </div>
      <div>
        <div class="tw-font-medium">{{ this.user.name }}</div>
        <div class="tw-text-sm">
          Currently
          <span
            v-if="this.user.status == 'free'"
            class="tw-font-bold tw-text-green"
            >free</span
          ><span v-else>
            in
            <span class="tw-font-bold tw-text-light-blue">
              {{ this.user.status }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <div>
      <v-switch v-model="showEventNames" inset></v-switch>
    </div>
  </v-container>
</template>

<script>
export default {
  name: "UserItem",

  props: {
    user: { type: Object, required: true },
  },

  mounted() {
    if (localStorage.showEventNames) {
      this.showEventNames = localStorage.showEventNames
    }
  },

  data: () => ({
    showEventNames: true,
  }),

  computed: {},

  watch: {
    showEventNames(val) {
      localStorage.showEventNames = val
      this.$emit("showEventNames", val)
    },
  },

  methods: {},
}
</script>
