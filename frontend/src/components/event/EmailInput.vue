<template>
  <div>
    <slot name="header"></slot>

    <v-combobox
      v-model="remindees"
      :search-input.sync="query"
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
      <template v-slot:selection="data, parent">
        <UserChip
          :user="
            isContact(data.item) ? data.item : { email: data.item, picture: '' }
          "
          :removable="true"
          :removeEmail="removeEmail"
        ></UserChip>
      </template>
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
          <v-list-item-subtitle v-text="item.email"></v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-combobox>

    <div class="tw-transition-all tw-relative" :class="emailsAreValid ? '-tw-mt-5' : ''" @click="requestContactsAccess">
      <v-expand-transition>
        <div class="tw-text-xs tw-text-dark-gray" v-if="!hasContactsAccess">
          <a class="tw-underline" @click="requestContactsAccess"
            >Enable contacts access</a
          >
          for email auto-suggestions.
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script>
import UserAvatarContent from "@/components/UserAvatarContent.vue"
import UserChip from "@/components/general/UserChip.vue"
import { validateEmail, get, post } from "@/utils"

export default {
  name: "EmailReminders",

  props: {
    addedEmails: {
      type: Array,
      default: () => [],
    },
  },

  data: () => ({
    remindees: [], // Currently displayed emails
    searchedContacts: [], // Contacts that match the search query
    timeout: null, // Timeout for search debouncing
    searchDebounceTime: 250, // Search debounce time in ms

    hasContactsAccess: true,
    query: "",

    emailsAreValid: true, // Whether all emails are valid
  }),

  mounted() {
    // Send a warmup request to update cache and check if contacts permissions are enabled
    get(`/user/searchContacts?query=`).catch((err) => {
      // User has not granted contacts permissions
      if (err.error?.code === 403 || err.error?.code === 401) {
        this.hasContactsAccess = false
      }
    })

    this.remindees = this.addedEmails
  },

  methods: {
    /**
     * Requests access to contacts.
     */
    requestContactsAccess() {
      this.$emit("requestContactsAccess", {
        emails: this.remindees,
      })
    },
    /**
     * Searches contacts based on the query string if the user has access to contacts.
     */
    searchContacts() {
      if (this.hasContactsAccess) {
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
          get(`/user/searchContacts?query=${this.query}`).then((results) => {
            this.searchedContacts = results
            this.searchedContacts.map((contact) => {
              contact["queryString"] = this.contactToQueryString(contact)
            })
          })
        }, this.searchDebounceTime)
      }
    },
    /**
     * Removes the specified email from the remindees list.
     */
    removeEmail(email) {
      // this.remindees.splice(this.remindees.indexOf(email), 1)

      for (let i = 0; i < this.remindees.length; i++) {
        if (this.isContact(this.remindees[i])) {
          if (this.remindees[i].email == email) {
            this.remindees.splice(i, 1)
          }
        } else {
          if (this.remindees[i] == email) {
            this.remindees.splice(i, 1)
          }
        }
      }
    },
    /**
     * Check if the contact is an object and not a user inputted string.
     */
    isContact(contact) {
      return typeof contact === "object"
    },
    /**
     * Takes a contact object and converts it to a query string.
     */
    contactToQueryString(contact) {
      // Need to split first name to get rid of middle name
      return `${contact["firstName"].split(" ")[0]} ${contact["lastName"]} ${
        contact["email"]
      }`
    },
    /**
     * Determines if emails are all valid.
     */
    validEmails(emails) {
      for (const email of emails) {
        if (email?.length > 0 && !validateEmail(email)) {
          this.emailsAreValid = false
          return "Please enter a valid email."
        }
      }
      this.emailsAreValid = true
      return true
    },
    reset() {
      this.remindees = this.addedEmails
    },
  },

  watch: {
    remindees() {
      this.$emit(
        "update:emails",
        this.remindees.map((r) => (this.isContact(r) ? r.email : r))
      )
    },
    query() {
      if (this.query && this.query.length > 0) {
        if ( /[,\s]/.test(this.query)) {
          /** If the query has spaces or commas, add the valid emails to the list */
          let successfullyAdded = false
          const emailsArray = this.query.split(/[,\s]+/).filter(email => email.trim() !== "");

          emailsArray.forEach((email) => {
            if (validateEmail(email) && !this.remindees.includes(email)) {
              successfullyAdded = true
              this.remindees.push(email)
            }
          })

          if (successfullyAdded) {
            this.query = ""
            return
          }
          
        }

        this.searchContacts()
      } else {
        clearTimeout(this.timeout)
        this.searchedContacts = []
      }
    },
  },

  computed: {},

  components: { UserAvatarContent, UserChip },
}
</script>
