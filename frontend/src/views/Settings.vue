<template>
  <div class="tw-mx-auto tw-mb-12 tw-mt-5 tw-max-w-6xl">
    <div class="tw-flex tw-flex-col tw-gap-16 tw-p-4">
      <!-- Name change section -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Profile
        </div>
        <div>
          <div class="tw-mb-1 tw-font-medium">Name</div>
          <div class="tw-flex tw-max-w-lg tw-items-center tw-gap-2">
            <v-text-field
              v-model="firstName"
              hide-details
              outlined
              placeholder="First name"
              :dense="isPhone"
            />
            <v-text-field
              v-model="lastName"
              hide-details
              outlined
              placeholder="Last name"
              :dense="isPhone"
            />
          </div>
          <v-expand-transition>
            <div v-if="profileUnsavedChanges">
              <div class="tw-mt-4">
                <v-btn
                  color="primary"
                  outlined
                  class="tw-mr-2"
                  @click="resetProfileChanges"
                  >Cancel</v-btn
                >
                <v-btn color="primary" @click="saveName">Save changes</v-btn>
              </div>
            </div>
          </v-expand-transition>
        </div>
      </div>

      <!-- Billing Section -->
      <div
        v-if="authUser && authUser.stripeCustomerId"
        class="tw-flex tw-flex-col tw-gap-5"
      >
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Billing
        </div>
        <div class="tw-flex tw-flex-col tw-gap-5 sm:tw-flex-row sm:tw-gap-28">
          <div class="tw-text-black">
            <v-btn @click="openBillingPortal">Manage billing</v-btn>
          </div>
        </div>
      </div>

      <!-- Calendar Access Section -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Calendar access
        </div>
        <div class="tw-flex tw-flex-col tw-gap-5 sm:tw-flex-row sm:tw-gap-28">
          <div class="tw-text-black">
            We do not store your calendar data anywhere on our servers, and we
            only fetch your calendar events for the time frame you specify in
            order to display your calendar events while you fill out your
            availability.
          </div>
          <v-btn
            outlined
            class="tw-text-red"
            href="https://myaccount.google.com/connections?filters=3,4&hl=en"
            target="_blank"
            >Revoke calendar access</v-btn
          >
        </div>
        <CalendarAccounts></CalendarAccounts>
      </div>

      <!-- Permissions Section -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Permissions
        </div>
        <div
          class="tw-flex tw-flex-col tw-rounded-md tw-border-[1px] tw-border-light-gray-stroke"
        >
          <div
            class="tw-flex tw-w-full tw-flex-row tw-border-b-[1px] tw-border-light-gray-stroke"
          >
            <div
              v-for="(h, i) in heading"
              :key="i"
              :class="`tw-border-r-[${i == heading.length - 1 ? '0' : '1'}px]`"
              class="tw-w-1/3 tw-border-light-gray-stroke tw-p-4 tw-font-bold"
            >
              {{ h }}
            </div>
          </div>

          <div
            v-for="(c, j) in content"
            :key="j"
            :class="`tw-border-b-[${j == content.length - 1 ? '0' : '1'}px]`"
            class="tw-flex tw-w-full tw-flex-row tw-border-light-gray-stroke"
          >
            <div
              v-for="(text, k) in c"
              :key="k"
              :class="`tw-border-r-[${k == c.length - 1 ? '0' : '1'}px]`"
              class="tw-w-1/3 tw-border-light-gray-stroke tw-p-4"
            >
              {{ text }}
            </div>
          </div>
        </div>
      </div>

      <!-- Question Section -->
      <div class="tw-flex tw-flex-col tw-gap-5">
        <div
          class="tw-text-xl tw-font-medium tw-text-dark-green sm:tw-text-2xl"
        >
          Have a question?
        </div>
        <div class="tw-flex tw-flex-col tw-gap-5 sm:tw-flex-row sm:tw-gap-28">
          <div class="tw-text-black">
            Email us at
            <a
              href="mailto:contact@timeful.app"
              class="tw-text-black tw-underline"
              >contact@timeful.app</a
            >
            with any questions!
          </div>
        </div>
      </div>

      <!-- Delete Account Section -->
      <div class="tw-mt-28 tw-flex tw-flex-row tw-justify-center">
        <div class="tw-w-64">
          <v-dialog v-model="deleteDialog" width="400" persistent>
            <template #activator="{ props: activatorProps }">
              <v-btn outlined class="tw-text-red" block v-bind="activatorProps"
                >Delete account</v-btn
              >
            </template>
            <v-card>
              <v-card-title>Are you sure?</v-card-title>
              <v-card-text class="tw-text-sm tw-text-dark-gray"
                >Are you sure you want to delete your account? All your account
                data will be lost.</v-card-text
              >
              <div class="tw-mx-6">
                <div class="tw-text-sm tw-text-dark-gray">
                  Type your email in the box below to confirm:
                </div>
                <v-text-field
                  v-model="deleteValidateEmail"
                  autofocus
                  class="tw-flex-initial tw-text-white"
                  :placeholder="authUser?.email ?? ''"
                />
              </div>
              <v-card-actions>
                <v-spacer />
                <v-btn text @click="deleteDialog = false">Cancel</v-btn>
                <v-btn
                  text
                  color="error"
                  :disabled="authUser?.email != deleteValidateEmail"
                  @click="deleteAccount()"
                  >Delete</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { storeToRefs } from "pinia"
import { useHead } from "@unhead/vue"
import { _delete, patch, get } from "@/utils"
import { useMainStore } from "@/stores/main"
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import CalendarAccounts from "@/components/settings/CalendarAccounts.vue"

useHead({ title: "Settings - Timeful" })

defineOptions({ name: 'AppSettings' })

const mainStore = useMainStore()
const { authUser } = storeToRefs(mainStore)
const { isPhone } = useDisplayHelpers()

const deleteDialog = ref(false)
const deleteValidateEmail = ref("")
const heading = ["Permission", "Purpose", "Requested When"]
const content = [
  [
    "View all calendar events",
    "Allows us to display the names/times of your calendar events",
    "User tries to input availability automatically with Google Calendar",
  ],
  [
    "View all calendars subscribed to",
    "Allows us to display calendar events on all your calendars instead of just your primary calendar",
    "User tries to input availability automatically with Google Calendar",
  ],
]

const firstName = ref(authUser.value?.firstName ?? "")
const lastName = ref(authUser.value?.lastName ?? "")

const nameUnsavedChanges = computed(
  () =>
    firstName.value !== authUser.value?.firstName ||
    lastName.value !== authUser.value.lastName
)
const profileUnsavedChanges = computed(() => nameUnsavedChanges.value)

function openBillingPortal() {
  const customerId = authUser.value?.stripeCustomerId ?? ""
  get<{ url: string }>(
    `/stripe/billing-portal?customerId=${encodeURIComponent(customerId)}&returnUrl=${encodeURIComponent(window.location.href)}`
  )
    .then((res) => {
      window.location.href = res.url
    })
    .catch(() => {
      mainStore.showError(
        "There was a problem opening the billing portal! Please try again later."
      )
    })
}

function deleteAccount() {
  _delete(`/user`)
    .then(() => {
      window.location.reload()
    })
    .catch(() => {
      mainStore.showError(
        "There was a problem deleting your account! Please try again later."
      )
    })
}

function resetProfileChanges() {
  firstName.value = authUser.value?.firstName ?? ""
  lastName.value = authUser.value?.lastName ?? ""
}

function saveName() {
  patch(`/user/name`, {
    firstName: firstName.value,
    lastName: lastName.value,
  })
    .then(() => {
      window.location.reload()
    })
    .catch(() => {
      mainStore.showError(
        "There was a problem updating your name! Please try again later."
      )
    })
}
</script>
