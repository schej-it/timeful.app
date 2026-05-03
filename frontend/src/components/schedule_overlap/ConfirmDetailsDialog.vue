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
            <v-expansion-panel-header class="tw-font-medium">
              Attendees
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <div class="tw-mb-4 tw-text-dark-gray">
                Google Calendar invites will be sent to people at the following
                email addresses.
                <span v-if="!hasContactsAccess">
                  <a class="tw-underline" @click="requestContactsAccess"
                    >Enable contacts access</a
                  >
                  to receive email auto-suggestions.
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
                          item-text="email"
                          item-value="email"
                          hide-no-data
                          return-object
                          append-icon=""
                          class="tw-pt-2"
                          placeholder="Email (optional)"
                          outlined
                          dense
                          :rules="[rules.validEmail]"
                        >
                          <template #item="{ item }">
                            <v-list-item-avatar>
                              <img
                                v-if="item.raw.picture && item.raw.picture.length > 0"
                                :src="item.raw.picture"
                                referrerpolicy="no-referrer"
                              />
                              <v-icon v-else>mdi-account</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                              <v-list-item-title
                                >{{ item.raw.firstName ?? "" }} {{ item.raw.lastName ?? "" }}</v-list-item-title
                              >
                              <v-list-item-subtitle
                                >{{ item.raw.email }}</v-list-item-subtitle
                              >
                            </v-list-item-content>
                          </template>
                        </v-combobox>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header class="tw-font-medium">
              Location & description (optional)
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-text-field
                v-model="location"
                prepend-icon="mdi-map-marker"
                placeholder="Location"
                outlined
                dense
              />
              <v-textarea
                v-model="description"
                prepend-icon="mdi-text"
                placeholder="Description"
                outlined
                dense
                hide-details
              />
            </v-expansion-panel-content>
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
import { validateEmail, get } from "@/utils"

export interface Respondent {
  email: string
  firstName?: string
  lastName?: string
  picture?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    respondents?: Respondent[]
    loading?: boolean
  }>(),
  { respondents: () => [], loading: false }
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
let prevEmails = new Set<string>()
const timeouts = ref<(ReturnType<typeof setTimeout> | null)[]>([])
const emailSuggestions = ref<Respondent[][]>([])

const location = ref("")
const description = ref("")
const hasContactsAccess = ref(true)

const rules = {
  validEmail: (email: string) => {
    if (email.length > 0 && !validateEmail(email)) {
      return "Please enter a valid email."
    }
    return true
  },
}

onMounted(() => {
  emails.value = props.respondents.map((r) => r.email)
  timeouts.value = props.respondents.map(() => null)
  emailSuggestions.value = props.respondents.map(() => [])

  get(`/user/searchContacts?query=`).catch((err: unknown) => {
    if ((err as { error?: { code?: number } }).error?.code === 403) {
      hasContactsAccess.value = false
    }
  })
})

const confirmEnabled = computed(() => {
  for (const email of emails.value) {
    if (rules.validEmail(email) !== true) return false
  }
  return true
})
const formattedEmailSuggestions = computed(() =>
  emailSuggestions.value.map((suggestion, i) =>
    emails.value[i]?.length > 0 ? suggestion : []
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
const setData = ({
  emails: newEmails,
  location: newLocation,
  description: newDescription,
}: {
  emails: string[]
  location: string
  description: string
}) => {
  emails.value = newEmails
  location.value = newLocation
  description.value = newDescription
}

const searchContacts = (emailsIndex: number, query: string) => {
  if (hasContactsAccess.value) {
    const t = timeouts.value[emailsIndex]
    if (t) clearTimeout(t)
    timeouts.value[emailsIndex] = setTimeout(() => {
      void get<Respondent[]>(`/user/searchContacts?query=${query}`).then(
        (results) => {
          emailSuggestions.value[emailsIndex] = results
        }
      )
    }, 300)
  }
}

defineExpose({ setData })

watch(
  emails,
  () => {
    if (props.modelValue && hasContactsAccess.value) {
      const difference = emails.value.filter((x) => x && !prevEmails.has(x))
      if (difference.length === 0) return

      const changedEmail = difference[0]
      const changedEmailIndex = emails.value.indexOf(changedEmail)

      if (changedEmail.length > 0) {
        searchContacts(changedEmailIndex, changedEmail)
      }

      prevEmails = new Set(emails.value)
    }
  },
  { deep: true }
)
</script>
