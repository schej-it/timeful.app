<template>
  <v-container
    @click="$emit('click')"
    v-ripple
    class="tw-flex tw-justify-between tw-rounded-md tw-bg-surface-muted tw-py-2 tw-align-middle tw-text-text-primary"
  >
    <div class="tw-flex">
      <div class="tw-mr-3">
        <v-avatar>
          <img
            v-if="!friend.picture"
            src="https://cdn.vuetifyjs.com/images/john.jpg"
          />
          <img v-else :src="friend.picture" />
        </v-avatar>
      </div>
      <div>
        <div class="tw-font-medium">{{ this.friend.name }}</div>
        <div class="tw-text-sm">
          Currently
          <span
            v-if="this.friend.status == 'free'"
            class="tw-font-bold tw-text-green"
            >free</span
          ><span v-else>
            in
            <span class="tw-font-bold tw-text-light-blue">
              {{ this.friend.status }}
            </span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="chevron">
      <v-icon class="mt-2">mdi-chevron-right</v-icon>
    </div>
  </v-container>
</template>

<script>
export default {
  name: "FriendItem",

  props: {
    friend: { type: Object, required: true },
    chevron: { type: Boolean, default: false }, // Whether to show the chevron icon
  },

  data: () => ({}),

  computed: {},

  methods: {},
}
</script>
