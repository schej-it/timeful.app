<template>
  <v-dialog
    :model-value="modelValue"
    content-class="tw-max-w-xl"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-card>
      <v-card-title class="tw-flex">
        <div>Confirm details</div>
        <v-spacer />
        <v-btn icon @click="emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="tw-px-0">
        <v-expansion-panels accordion mandatory flat>
          <v-expansion-panel>
            <v-expansion-panel-title class="tw-font-medium">
              Attendees
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="tw-mb-4 tw-text-dark-gray">
                Google Calendar invites will be sent to people at the following
                email addresses.
                <template v-if="signInEnabled">
                  <span v-if="!hasContactsAccess">
                    <a class="tw-underline" @click="requestContactsAccess"
                      >Enable contacts access</a
                    >
                    to receive email auto-suggestions.
                  </span>
                </template>
                <span v-else>
                  Requires sign-in, which is disabled in this build
                </span>
              </div>
              <div class="tw-max-h-96 tw-table-auto tw-overflow-y-auto">
                <table class="tw-w-full tw-text-left tw-text-black">
                  <thead>
                    <tr class="tw-bg-white tw-font-medium">
                      <th
                        class="tw-sticky tw-top-0 tw-z-10 tw-bg-white tw-pb-4"
                      >
                        Name
                      </th>
                      <th
                        class="tw-sticky tw-top-0 tw-z-10 tw-bg-white tw-pb-4"
                      >
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(respondent, r) in respondents" :key="r">
                      <td class="tw-pb-4 tw-pr-4">
                        <div class="tw-flex tw-items-center">
                          <UserAvatarContent
                            v-if="respondent.email.length > 0"
                            :user="respondent"
                            class="-tw-ml-3 -tw-mr-1 tw-h-4 tw-w-4"
                          ></UserAvatarContent>
                          <v-icon v-else class="tw-ml-1 tw-mr-3" small>
                            mdi-account
                          </v-icon>

                          {{ respondent.firstName }} {{ respondent.lastName }}
                        </div>
                      </td>
                      <td class="tw-pr-4">
                        <div v-if="respondent.email.length > 0" class="tw-pb-4">
                          {{ respondent.email }}
                        </div>
                        <v-combobox
                          v-else
                          v-model:search-input="emails[r]"
                          :items="formattedEmailSuggestions[r]"
                          no-filter
                          item-title="email"
                          item-value="email"
                          hide-no-data
                          return-object
                          append-icon=""
                          class="tw-pt-2"
                          placeholder="Email (optional)"
                          variant="outlined"
                          density="compact"
                          :rules="[rules.validEmail]"
                        >
                          <template #item="{ item, props: itemProps }">
                            <v-list-item v-bind="itemProps">
                              <template #prepend>
                              <img
                                v-if="item.raw.picture && item.raw.picture.length > 0"
                                :src="item.raw.picture"
                                referrerpolicy="no-referrer"
                              />
                              <v-icon v-else>mdi-account</v-icon>
                              </template>
                              <v-list-item-title
                                >{{ item.raw.firstName ?? "" }} {{ item.raw.lastName ?? "" }}</v-list-item-title
                              >
                              <v-list-item-subtitle
                                >{{ item.raw.email }}</v-list-item-subtitle
                              >
                            </v-list-item>
                          </template>
                        </v-combobox>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-title class="tw-font-medium">
              Location & description (optional)
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-text-field
                v-model="location"
                prepend-icon="mdi-map-marker"
                placeholder="Location"
                variant="outlined"
                density="compact"
              />
              <v-textarea
                v-model="description"
                prepend-icon="mdi-text"
                placeholder="Description"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          :disabled="!confirmEnabled"
          :loading="loading"
          @click="confirm"
        >
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import { validateEmail } from "@/utils"
import { signInEnabled } from "@/utils/signInAvailability"
import { useContactsAccess } from "@/composables/useContactsAccess"
import { useDebouncedContactLookup } from "@/composables/useDebouncedContactLookup"

export interface Respondent {
  email: string
  firstName?: string
  lastName?: string
  picture?: string
}

export interface ConfirmDetailsDraft {
  emails: string[]
  location: string
  description: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    respondents?: Respondent[]
    loading?: boolean
    draft?: ConfirmDetailsDraft
  }>(),
  {
    respondents: () => [],
    loading: false,
    draft: () => ({ emails: [], location: "", description: "" }),
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  confirm: [
    payload: { emails: string[]; location: string; description: string },
  ]
  requestContactsAccess: [
    payload: { emails: string[]; location: string; description: string },
  ]
}>()

const emails = ref<string[]>([])
const location = ref("")
const description = ref("")
const { hasContactsAccess, probeContactsAccess } = useContactsAccess()
const { suggestionsByKey, scheduleLookup, clearSuggestions } =
  useDebouncedContactLookup()

const rules = {
  validEmail: (email: string) => {
    if (email.length > 0 && !validateEmail(email)) {
      return "Please enter a valid email."
    }
    return true
  },
}

onMounted(() => {
  void probeContactsAccess()
})

const confirmEnabled = computed(() => {
  for (const email of emails.value) {
    if (rules.validEmail(email) !== true) return false
  }
  return true
})
const formattedEmailSuggestions = computed(() =>
  emails.value.map((email, i) =>
    email.length > 0 ? suggestionsByKey.value[String(i)] ?? [] : []
  )
)

const confirm = () => {
  emit("confirm", {
    emails: emails.value,
    location: location.value,
    description: description.value,
  })
}
const requestContactsAccess = () => {
  emit("requestContactsAccess", {
    emails: emails.value,
    location: location.value,
    description: description.value,
  })
}
const applyDraft = (draft: ConfirmDetailsDraft) => {
  emails.value =
    draft.emails.length > 0
      ? [...draft.emails]
      : props.respondents.map((respondent) => respondent.email)
  location.value = draft.location
  description.value = draft.description
}

const searchContacts = (emailsIndex: number, query: string) => {
  if (!hasContactsAccess.value) return
  scheduleLookup(String(emailsIndex), query, 300)
}

watch(
  () => props.draft,
  (draft) => {
    applyDraft(draft)
  },
  { deep: true, immediate: true }
)

watch(
  emails,
  (nextEmails, previousEmails) => {
    if (!props.modelValue || !hasContactsAccess.value) return

    for (let index = 0; index < nextEmails.length; index += 1) {
      const email = nextEmails[index] ?? ""

      if (email.length === 0) {
        clearSuggestions(String(index))
        continue
      }

      if (email !== (previousEmails[index] || "")) {
        searchContacts(index, email)
      }
    }
  },
  { deep: true }
)
</script>
