<template>
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-card>
      <v-card-title class="tw-flex">
        <div>Join slot <span v-if="!authUser">as</span></div>
        <v-spacer />
        <v-btn icon @click="emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="mb-2">
          <SignUpBlock :sign-up-block="signUpBlock" info-only></SignUpBlock>
        </div>

        <v-form
          ref="formRef"
          v-model="formValid"
          lazy-validation
          class="tw-flex tw-flex-col tw-gap-y-4"
          onsubmit="return false;"
        >
          <div v-if="!authUser" class="tw-flex tw-flex-col tw-gap-y-4">
            <v-text-field
              v-model="name"
              :rules="nameRules"
              placeholder="Enter your name..."
              autofocus
              hide-details="auto"
              autocomplete="off"
              solo
              @keyup.enter="submit"
            ></v-text-field>
            <v-text-field
              v-if="event.collectEmails"
              v-model="email"
              :rules="emailRules"
              placeholder="Enter your email..."
              hint="The event creator has requested your email. It will only be visible to them."
              persistent-hint
              solo
              @keyup.enter="submit"
            ></v-text-field>
          </div>

          <div>
            NOTE: After joining a slot,
            <span class="tw-font-bold"
              >you will need to contact the sign up creator in order to edit
              your slot.</span
            >
          </div>

          <div v-if="event.blindAvailabilityEnabled">
            The sign up creator has hidden attendees from each other.
            <span class="tw-font-bold"
              >Your name will only be visible to you.</span
            >
          </div>

          <div class="tw-flex">
            <v-spacer />
            <v-btn
              class="tw-bg-green"
              :dark="formValid"
              :disabled="!formValid"
              @click="submit"
            >
              Join slot
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { validateEmail } from "@/utils"
import { useMainStore } from "@/stores/main"
import SignUpBlock from "./SignUpBlock.vue"
import type { Event } from "@/types"

type Rule = (val: string) => true | string
interface FormRef {
  validate: () => Promise<{ valid: boolean }> | boolean
  resetValidation: () => void
}

export interface SignUpBlockProp {
  _id?: string
  name?: string
  capacity?: number
  startDate?: number
  endDate?: number
  responses?: {
    user?: {
      _id?: string
      firstName?: string
      lastName?: string
      picture?: string
    }
  }[]
}

const props = defineProps<{
  modelValue: boolean
  event: Event
  signUpBlock: SignUpBlockProp
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  submit: [payload: { name: string; email: string }]
}>()

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)

const formRef = ref<FormRef | null>(null)
const formValid = ref(false)
const name = ref("")
const email = ref("")
const nameRules = ref<Rule[]>([])
const emailRules = ref<Rule[]>([])

const submit = async () => {
  console.log(props.signUpBlock)
  nameRules.value = [(n) => !!n || "Name is required"]
  emailRules.value = [
    (e) => !!e || "Email is required",
    (e) => !!validateEmail(e) || "Invalid email",
  ]

  await nextTick()
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return
  emit("submit", { name: name.value, email: email.value })
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      name.value = ""
      email.value = ""
      nameRules.value = []
      emailRules.value = []
      formRef.value?.resetValidation()
    }
  }
)
watch(name, () => {
  nameRules.value = []
})
watch(email, () => {
  emailRules.value = []
})
</script>
