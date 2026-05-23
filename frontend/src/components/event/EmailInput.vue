<template>
  <div>
    <slot name="header"></slot>

    <v-combobox
      v-model="selectionModel"
      v-model:search-input="query"
      :items="searchedContacts"
      item-title="queryString"
      item-value="queryString"
      class="timeful-solo-field tw-mt-2 tw-text-sm"
      placeholder="Type an email address and press enter..."
      multiple
      append-icon=""
      variant="solo"
      :rules="[validEmails]"
    >
      <template #selection="{ item }">
        <UserChip
          :user="item.raw"
          :removable="true"
          :remove-email="removeEmail"
        ></UserChip>
      </template>
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="itemProps">
          <template #prepend>
            <img
              v-if="item.raw.picture.length > 0"
              :src="item.raw.picture"
              referrerpolicy="no-referrer"
            />
            <v-icon v-else>mdi-account</v-icon>
          </template>
          <v-list-item-title
            >{{ item.raw.firstName }} {{ item.raw.lastName }}</v-list-item-title
          >
          <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
        </v-list-item>
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
import { computed, onMounted, ref, watch } from "vue"
import UserChip from "@/components/general/UserChip.vue"
import { validateEmail } from "@/utils"
import { useContactsAccess } from "@/composables/useContactsAccess"
import { useDebouncedContactLookup } from "@/composables/useDebouncedContactLookup"
import { type ContactSearchSuggestion } from "./contactSuggestions"

interface EmailEntry {
  email: string
  firstName: string
  lastName: string
  picture: string
  queryString: string
}

function createManualEmailEntry(email: string): EmailEntry {
  return {
    email,
    firstName: "",
    lastName: "",
    picture: "",
    queryString: email,
  }
}

function createContactEmailEntry(contact: ContactSearchSuggestion): EmailEntry {
  return {
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    picture: contact.picture,
    queryString: contact.queryString,
  }
}

function isContactSearchSuggestion(value: unknown): value is ContactSearchSuggestion {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    "queryString" in value &&
    typeof value.queryString === "string"
  )
}

function normalizeEmailEntry(value: unknown): EmailEntry | null {
  if (typeof value === "string") {
    return createManualEmailEntry(value)
  }

  if (isContactSearchSuggestion(value)) {
    return createContactEmailEntry(value)
  }

  return null
}

const props = withDefaults(
  defineProps<{
    addedEmails?: string[]
  }>(),
  {
    addedEmails: () => [],
  }
)

const emit = defineEmits<{
  requestContactsAccess: [payload: { emails: string[] }]
  "update:emails": [emails: string[]]
}>()

const emailEntries = ref<EmailEntry[]>([])
const query = ref("")
const { hasContactsAccess, probeContactsAccess } = useContactsAccess()
const { suggestionsByKey, scheduleLookup, clearSuggestions } =
  useDebouncedContactLookup()
const searchedContacts = computed(() => {
  if (Object.hasOwn(suggestionsByKey.value, "default")) {
    return suggestionsByKey.value.default ?? []
  }

  return []
})
const selectionModel = computed({
  get: () => emailEntries.value,
  set: (values: unknown[]) => {
    emailEntries.value = values
      .map(normalizeEmailEntry)
      .filter((entry): entry is EmailEntry => entry != null)
  },
})

const emailsAreValid = ref(true)

onMounted(() => {
  void probeContactsAccess()
})

function requestContactsAccess() {
  emit("requestContactsAccess", {
    emails: emailEntries.value.map((entry) => entry.email),
  })
}

function removeEmail(email: string) {
  emailEntries.value = emailEntries.value.filter((entry) => entry.email !== email)
}

function validEmails(entries: EmailEntry[]): true | string {
  const invalidEntry = entries.find(
    (entry) => entry.email.length > 0 && !validateEmail(entry.email)
  )
  if (invalidEntry != null) {
    emailsAreValid.value = false
    return "Please enter a valid email."
  }

  emailsAreValid.value = true
  return true
}

function appendParsedEmails(rawQuery: string): boolean {
  let successfullyAdded = false
  const parsedEmails = rawQuery
    .split(/[,\s]+/)
    .filter((email) => email.trim() !== "")

  for (const email of parsedEmails) {
    if (
      validateEmail(email) &&
      !emailEntries.value.some((entry) => entry.email === email)
    ) {
      successfullyAdded = true
      emailEntries.value = [...emailEntries.value, createManualEmailEntry(email)]
    }
  }

  return successfullyAdded
}

watch(
  () => props.addedEmails,
  (emails) => {
    emailEntries.value = emails.map(createManualEmailEntry)
  },
  { immediate: true }
)

watch(emailEntries, () => {
  emit(
    "update:emails",
    emailEntries.value.map((entry) => entry.email)
  )
})

watch(query, () => {
  if (query.value && query.value.length > 0) {
    if (/[,\s]/.test(query.value)) {
      if (appendParsedEmails(query.value)) {
        query.value = ""
        return
      }
    }

    if (hasContactsAccess.value) {
      scheduleLookup("default", query.value)
    }
  } else {
    clearSuggestions("default")
  }
})
</script>
