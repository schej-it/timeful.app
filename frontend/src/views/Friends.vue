<template>
  <div>
    <v-container class="pa-5">
      <div class="tw-mb-3 tw-flex tw-justify-between">
        <div class="headline font-weight-bold">My friends</div>
        <div class="headline tw-text-gray">
          Requests
          <v-chip color="green" text-color="white">3</v-chip>
        </div>
      </div>

      <v-text-field label="Search" outlined dense></v-text-field>

      <FriendItem
        v-for="(f, i) in exampleFriends"
        :key="i"
        class="tw-mb-2"
        :friend="f"
        chevron
        @click="router.push({ name: 'friend-schedule' })"
      />
    </v-container>

    <v-scale-transition appear origin="center">
      <v-btn
        fab
        absolute
        dark
        class="tw-left-0 tw-right-0 tw-bottom-4 tw-mx-auto tw-bg-blue"
      >
        <v-icon>mdi-account-plus</v-icon>
      </v-btn>
    </v-scale-transition>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router"
import FriendItem from "@/components/FriendItem.vue"

defineOptions({ name: 'AppFriends' })

const router = useRouter()
const exampleFriends = [
  {
    name: "Tony Xin",
    status: "free",
    picture:
      "https://media-exp1.licdn.com/dms/image/C5603AQHPyWrhwOLQ_g/profile-displayphoto-shrink_200_200/0/1632279309883?e=1658361600&v=beta&t=SF_4_hjgwSN4dlQt_EXTKVkNuuqaty5_HQRF_E7jVNo",
  },
  {
    name: "Arjun Patrawala",
    status: "EECS 16B lecture",
    picture:
      "https://media-exp1.licdn.com/dms/image/C5603AQFN3On7QKEdiA/profile-displayphoto-shrink_200_200/0/1642207771141?e=1658361600&v=beta&t=X19xF4_OS_SEHePR5HHDzGDnEVqbv3su6e9Y7QIjd0I",
  },
  {
    name: "Jacob Smith",
    status: "Intellecture meeting",
  },
]
</script>
