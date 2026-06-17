<template>
  <v-container
    v-ripple
    class="tw-flex tw-justify-between tw-rounded-md tw-bg-light-gray tw-py-2 tw-align-middle tw-text-black"
    @click="$emit('click')"
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
        <div class="tw-font-medium">{{ friend.name }}</div>
        <div class="tw-text-sm">
          Currently
          <span
            v-if="friend.status == 'free'"
            class="tw-font-bold tw-text-green"
            >free</span
          ><span v-else>
            in
            <span class="tw-font-bold tw-text-light-blue">
              {{ friend.status }}
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

<script setup lang="ts">
interface Friend {
  name: string
  status: string
  picture?: string
}

withDefaults(
  defineProps<{
    friend: Friend
    chevron?: boolean
  }>(),
  { chevron: false }
)

defineEmits<{ click: [] }>()
</script>
