<template>
  <v-dialog
    :model-value="modelValue"
    width="400"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <v-card>
      <v-card-title class="tw-flex">
        <div>Continue as guest</div>
        <v-spacer />
        <v-btn icon @click="emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-form
          ref="formRef"
          v-model="formValid"
          lazy-validation
          class="tw-flex tw-flex-col tw-gap-y-4"
          onsubmit="return false;"
        >
          <v-text-field
            v-model="name"
            :rules="nameRules"
            class="timeful-solo-field"
            variant="solo"
            placeholder="Enter your name..."
            autofocus
            hide-details="auto"
            autocomplete="off"
            @keyup.enter="submit"
          ></v-text-field>
          <v-text-field
            v-if="event.collectEmails"
            v-model="email"
            :rules="emailRules"
            class="timeful-solo-field"
            variant="solo"
            placeholder="Enter your email..."
            hint="The event creator has requested your email. It will only be visible to them."
            persistent-hint
            @keyup.enter="submit"
          ></v-text-field>
          <div class="tw-flex">
            <v-spacer />
            <v-btn
              class="timeful-elevated-button tw-bg-green tw-text-white"
              :disabled="!canSubmit"
              @click="submit"
            >
              Continue
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { validateEmail } from "@/utils"
import type { Event } from "@/types"

type Rule = (val: string) => true | string

interface FormRef {
  validate: () => Promise<{ valid: boolean }> | boolean
  resetValidation: () => void
}

const props = defineProps<{
  modelValue: boolean
  event: Event
  respondents: string[]
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  submit: [payload: { name: string; email: string }]
}>()

const formValid = ref(false)
const name = ref("")
const email = ref("")
const nameRules = ref<Rule[]>([])
const emailRules = ref<Rule[]>([])
const formRef = ref<FormRef | null>(null)
const trimmedName = computed(() => name.value.trim())
const trimmedEmail = computed(() => email.value.trim())
const isNameAvailable = (candidate: string) =>
  !props.respondents.includes(candidate.trim())
const canSubmit = computed(() =>
  trimmedName.value.length > 0 &&
  (!props.event.collectEmails || trimmedEmail.value.length > 0)
)

const submit = async () => {
  nameRules.value = [
    (n) => !!n || "Name is required",
    (n) => isNameAvailable(n) || "Name already taken",
  ]
  emailRules.value = [
    (e) => !!e || "Email is required",
    (e) => !!validateEmail(e) || "Invalid email",
  ]

  await nextTick()
  const result = await formRef.value?.validate()
  const valid = typeof result === "boolean" ? result : result?.valid
  if (!valid) return
  emit("submit", { name: trimmedName.value, email: trimmedEmail.value })
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
  nameRules.value = [
    (n) => isNameAvailable(n) || "Name already taken",
  ]
})
watch(email, () => {
  emailRules.value = []
})
</script>
