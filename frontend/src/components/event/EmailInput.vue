<template>
  <div>
    <slot name="header"></slot>

    <v-combobox
      v-model="remindees"
      v-model:search-input="query"
      :items="searchedContacts"
      item-text="queryString"
      item-value="queryString"
      class="tw-mt-2 tw-text-sm"
      placeholder="Type an email address and press enter..."
      multiple
      append-icon=""
      solo
      :rules="[validEmails]"
    >
      <template #selection="{ item }">
        <UserChip
          :user="
            isContact(item.raw) ? item.raw : { email: item.raw, picture: '' }
          "
          :removable="true"
          :remove-email="removeEmail"
        ></UserChip>
      </template>
      <template #item="{ item }">
        <v-list-item-avatar>
          <img
            v-if="item.raw.picture.length > 0"
            :src="item.raw.picture"
            referrerpolicy="no-referrer"
          />
          <v-icon v-else>mdi-account</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title
            >{{ item.raw.firstName }} {{ item.raw.lastName }}</v-list-item-title
          >
          <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-combobox>

    <div
      class="tw-transition-all tw-relative"
      :class="emailsAreValid ? '-tw-mt-5' : ''"
      @click="requestContactsAccess"
    >
      <v-expand-transition>
        <div v-if="!hasContactsAccess" class="tw-text-xs tw-text-dark-gray">
          <a class="tw-underline" @click="requestContactsAccess"
            >Enable contacts access</a
          >
          for email auto-suggestions.
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import UserChip from "@/components/general/UserChip.vue"
import { validateEmail, get } from "@/utils"

interface Contact {
  firstName: string
  lastName: string
  email: string
  picture: string
  queryString?: string
}

type Remindee = Contact | string

const props = withDefaults(
  defineProps<{
    addedEmails?: string[]
  }>(),
  {
    addedEmails: () => [],
  }
)

const emit = defineEmits<{
  requestContactsAccess: [payload: { emails: Remindee[] }]
  "update:emails": [emails: string[]]
}>()

const remindees = ref<Remindee[]>([])
const searchedContacts = ref<Contact[]>([])
let timeout: ReturnType<typeof setTimeout> | null = null
const searchDebounceTime = 250

const hasContactsAccess = ref(true)
const query = ref("")

const emailsAreValid = ref(true)

onMounted(() => {
  get(`/user/searchContacts?query=`).catch((err: unknown) => {
    const errCode = (err as { error?: { code?: number } }).error?.code
    if (errCode === 403 || errCode === 401) {
      hasContactsAccess.value = false
    }
  })

  remindees.value = [...props.addedEmails]
})

function requestContactsAccess() {
  emit("requestContactsAccess", { emails: remindees.value })
}

function searchContacts() {
  if (!hasContactsAccess.value) return
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => {
    void get(`/user/searchContacts?query=${query.value}`).then((results) => {
      searchedContacts.value = results as Contact[]
      searchedContacts.value.forEach((contact) => {
        contact.queryString = contactToQueryString(contact)
      })
    })
  }, searchDebounceTime)
}

function removeEmail(email: string) {
  for (let i = 0; i < remindees.value.length; i++) {
    const r = remindees.value[i]
    if (isContact(r)) {
      if (r.email == email) {
        remindees.value.splice(i, 1)
      }
    } else {
      if (r == email) {
        remindees.value.splice(i, 1)
      }
    }
  }
}

function isContact(contact: Remindee): contact is Contact {
  return typeof contact === "object"
}

function contactToQueryString(contact: Contact): string {
  return `${contact.firstName.split(" ")[0]} ${contact.lastName} ${contact.email}`
}

function validEmails(emails: Remindee[]): true | string {
  for (const email of emails) {
    if (typeof email === "string" && email.length > 0 && !validateEmail(email)) {
      emailsAreValid.value = false
      return "Please enter a valid email."
    }
  }
  emailsAreValid.value = true
  return true
}

function reset() {
  remindees.value = [...props.addedEmails]
}

watch(remindees, () => {
  emit(
    "update:emails",
    remindees.value.map((r) => (isContact(r) ? r.email : r))
  )
})

watch(query, () => {
  if (query.value && query.value.length > 0) {
    if (/[,\s]/.test(query.value)) {
      let successfullyAdded = false
      const emailsArray = query.value
        .split(/[,\s]+/)
        .filter((email) => email.trim() !== "")

      emailsArray.forEach((email) => {
        if (validateEmail(email) && !remindees.value.includes(email)) {
          successfullyAdded = true
          remindees.value.push(email)
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (successfullyAdded) {
        query.value = ""
        return
      }
    }

    searchContacts()
  } else {
    if (timeout) clearTimeout(timeout)
    searchedContacts.value = []
  }
})

defineExpose({ reset })
</script>
