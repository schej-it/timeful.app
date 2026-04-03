<template>
  <v-dialog
    :value="value"
    @input="(e) => $emit('input', e)"
    width="400"
    content-class="tw-m-0"
  >
    <v-card>
      <v-card-title class="tw-flex">
        <div>Continue as guest</div>
        <v-spacer />
        <v-btn icon @click="$emit('input', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-form
          ref="form"
          v-model="formValid"
          lazy-validation
          class="tw-flex tw-flex-col tw-gap-y-4"
          onsubmit="return false;"
        >
          <v-text-field
            v-model="name"
            @keyup.enter="submit"
            :rules="nameRules"
            placeholder="Enter your name..."
            autofocus
            hide-details="auto"
            autocomplete="off"
            solo
          ></v-text-field>
          <v-text-field
            v-if="event.collectEmails"
            v-model="email"
            @keyup.enter="submit"
            :rules="emailRules"
            placeholder="Enter your email..."
            hint="The event creator has requested your email. It will only be visible to them."
            persistent-hint
            solo
          ></v-text-field>
          <div class="tw-flex">
            <v-spacer />
            <v-btn
              @click="submit"
              class="tw-bg-green"
              :dark="formValid"
              :disabled="!formValid"
            >
              Continue
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { isPhone, validateEmail } from "@/utils"

export default {
  name: "GuestDialog",

  emits: ["input", "submit"],

  props: {
    value: { type: Boolean, required: true },
    event: { type: Object, required: true },
    respondents: { type: Array, required: true },
  },

  data() {
    return {
      formValid: false,
      name: "",
      email: "",
      nameRules: [],
      emailRules: [],
    }
  },

  computed: {
    isPhone() {
      return isPhone(this.$vuetify)
    },
  },

  methods: {
    submit() {
      // Set rules only on submit
      this.nameRules = [
        (name) => !!name || "Name is required",
        (name) => !this.respondents.includes(name) || "Name already taken",
      ]
      this.emailRules = [
        (email) => !!email || "Email is required",
        (email) => !!validateEmail(email) || "Invalid email",
      ]

      this.$nextTick(() => {
        if (!this.$refs.form.validate()) return

        this.$emit("submit", { name: this.name, email: this.email })
      })
    },
  },

  watch: {
    value() {
      if (this.value) {
        this.name = ""
        this.email = ""
        this.nameRules = []
        this.emailRules = []

        this.$refs.form?.resetValidation()
      }
    },
    name() {
      // Default rules before submitting
      this.nameRules = [
        (name) => !this.respondents.includes(name) || "Name already taken",
      ]
    },
    email() {
      // Default rules before submitting
      this.emailRules = []
    },
  },
}
</script>
