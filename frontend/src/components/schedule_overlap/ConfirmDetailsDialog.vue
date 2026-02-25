<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    content-class="tw-max-w-xl"
  >
    <v-card>
      <v-card-title class="tw-flex">
        <div>Confirm details</div>
        <v-spacer />
        <v-btn icon @click="$emit('input', false)">
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
              <div class="tw-mb-4 tw-text-text-muted">
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
                <table class="tw-w-full tw-text-left tw-text-text-primary">
                  <thead>
                    <tr class="tw-bg-surface tw-font-medium">
                      <th
                        class="tw-sticky tw-top-0 tw-z-10 tw-bg-surface tw-pb-4"
                      >
                        Name
                      </th>
                      <th
                        class="tw-sticky tw-top-0 tw-z-10 tw-bg-surface tw-pb-4"
                      >
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(respondent, r) in respondents">
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
                        <div class="tw-pb-4" v-if="respondent.email.length > 0">
                          {{ respondent.email }}
                        </div>
                        <v-combobox
                          v-else
                          :search-input.sync="emails[r]"
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
                          <template v-slot:item="{ item }">
                            <v-list-item-avatar>
                              <img
                                v-if="item.picture.length > 0"
                                :src="item.picture"
                                referrerpolicy="no-referrer"
                              />
                              <v-icon v-else>mdi-account</v-icon>
                            </v-list-item-avatar>
                            <v-list-item-content>
                              <v-list-item-title
                                v-text="`${item.firstName} ${item.lastName}`"
                              ></v-list-item-title>
                              <v-list-item-subtitle
                                v-text="item.email"
                              ></v-list-item-subtitle>
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
          @click="confirm"
          :disabled="!confirmEnabled"
          :loading="loading"
        >
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import { validateEmail, get } from "@/utils"

export default {
  name: "ConfirmDetailsDialog",

  props: {
    value: { type: Boolean, required: true },
    respondents: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },

  data: () => ({
    emails: [], // Currently displayed emails
    prevEmails: new Set(), // Set that tracks previous emails to track the emails that have been changed
    timeouts: [], // Timeouts for search debouncing
    emailSuggestions: [], // Auto-suggestions for each email input

    location: "",
    description: "",
    hasContactsAccess: true,
    rules: {
      validEmail: (email) => {
        if (email?.length > 0 && !validateEmail(email)) {
          return "Please enter a valid email."
        }
        return true
      },
    },
  }),

  mounted() {
    this.emails = this.respondents.map((r) => r.email)
    this.timeouts = this.respondents.map(() => null)
    this.emailSuggestions = this.respondents.map(() => [])

    // Send a warmup request to update cache and check if contacts permissions are enabled
    get(`/user/searchContacts?query=`).catch((err) => {
      // User has not granted contacts permissions
      if (err.error?.code === 403) {
        this.hasContactsAccess = false
      }
    })
  },

  computed: {
    confirmEnabled() {
      // Only enable confirm button if all emails are valid
      for (const email of this.emails) {
        if (this.rules.validEmail(email) !== true) {
          return false
        }
      }

      return true
    },
    formattedEmailSuggestions() {
      // Only return suggestions if email is not empty
      return this.emailSuggestions.map((suggestion, i) =>
        this.emails[i]?.length > 0 ? suggestion : []
      )
    },
  },

  methods: {
    confirm() {
      this.$emit("confirm", {
        emails: this.emails,
        location: this.location,
        description: this.description,
      })
    },
    requestContactsAccess() {
      this.$emit("requestContactsAccess", {
        emails: this.emails,
        location: this.location,
        description: this.description,
      })
    },
    setData({ emails, location, description }) {
      this.emails = emails
      this.location = location
      this.description = description
    },
    searchContacts(emailsIndex, query) {
      // Searches the user's contacts using the google contacts API
      if (this.hasContactsAccess) {
        clearTimeout(this.timeouts[emailsIndex])
        this.timeouts[emailsIndex] = setTimeout(() => {
          get(`/user/searchContacts?query=${query}`).then((results) => {
            this.$set(this.emailSuggestions, emailsIndex, results)
          })
        }, 300)
      }
    },
    emailFilter(item, queryText) {
      // Custom email filter (unused)
      const searchText = `${item.firstName} ${item.lastName} ${item.email}`
      return searchText.toLowerCase().includes(queryText.toLowerCase())
    },
  },

  watch: {
    emails() {
      // If an email has been changed, search user's contacts for that query

      if (this.value && this.hasContactsAccess) {
        // Only search contacts if dialog is shown and has contacts access
        const difference = this.emails.filter(
          (x) => x && !this.prevEmails.has(x)
        )
        if (difference.length === 0) {
          return
        }

        const changedEmail = difference[0]
        const changedEmailIndex = this.emails.indexOf(changedEmail)

        if (changedEmail.length > 0) {
          this.searchContacts(changedEmailIndex, changedEmail)
        }

        this.prevEmails = new Set(this.emails)
      }
    },
  },

  components: { UserAvatarContent },
}
</script>
