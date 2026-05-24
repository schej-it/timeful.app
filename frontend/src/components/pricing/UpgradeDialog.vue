<template>
  <v-dialog
    :model-value="modelValue"
    :width="version === 'v2' ? 680 : 600"
    content-class="tw-m-0"
    @update:model-value="(e) => emit('update:modelValue', e)"
  >
    <!-- ==================== V1 PAYWALL ==================== -->
    <v-card
      v-if="version === 'v1'"
      class="tw-relative tw-rounded-lg tw-p-4 tw-pb-2 sm:tw-p-8 sm:tw-pb-4"
    >
      <v-btn
        absolute
        icon
        class="tw-right-0 tw-top-0 tw-mr-2 tw-mt-2"
        @click="emit('update:modelValue', false)"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <div class="tw-mb-4 tw-flex tw-flex-col tw-items-start tw-gap-4">
        <h2 class="tw-text-xl tw-font-medium">
          Upgrade to
          <span
            class="tw-bg-gradient-to-r tw-from-darkest-green tw-to-light-green tw-bg-clip-text tw-text-transparent"
            >Timeful Premium</span
          >
        </h2>
        <div class="tw-text-sm tw-font-medium tw-text-dark-gray">
          <template
            v-if="upgradeDialogType === upgradeDialogTypes.CREATE_EVENT"
          >
            You've run out of free events. Upgrade to create unlimited events.
            <br class="tw-hidden sm:tw-block" />
            Your payment helps us keep the site running.
          </template>
          <template
            v-else-if="upgradeDialogType === upgradeDialogTypes.SCHEDULE_EVENT"
          >
            Upgrade to schedule events with Timeful. Your payment helps us keep
            the site running.
          </template>
          <template
            v-else-if="
              upgradeDialogType === upgradeDialogTypes.UPGRADE_MANUALLY
            "
          >
            Create unlimited events with Timeful Premium. Your payment helps us
            keep the site running.
          </template>
        </div>
      </div>
      <div
        class="tw-mb-8 tw-flex tw-flex-col tw-gap-1 sm:tw-flex-row sm:tw-gap-4"
      >
        <div
          v-if="showMonthly"
          class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-light-green/20 tw-p-4"
        >
          <div
            class="tw-inline-block tw-w-fit tw-rounded tw-px-2 tw-py-1 tw-text-sm tw-font-medium"
          >
            Monthly
          </div>
          <div class="tw-relative">
            <div class="tw-font-medium">
              <span class="tw-mr-1 tw-text-4xl">{{
                isStudent
                  ? formattedPrice(monthlyStudentPrice)
                  : formattedPrice(monthlyPrice)
              }}</span>
              <span class="tw-text-dark-gray">USD</span>
            </div>
            <v-fade-transition>
              <div
                v-if="monthlyPrice === null"
                class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-full tw-bg-white"
              ></div>
            </v-fade-transition>
          </div>
          <div class="tw-mb-4 tw-text-center tw-text-sm tw-text-very-dark-gray">
            Per month.<br />Billed monthly.
          </div>
          <v-btn
            class="tw-mb-0.5 tw-text-white"
            color="primary"
            variant="outlined"
            block
            :disabled="
              isStudent
                ? loadingCheckoutUrl[monthlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[monthlyPrice?.id ?? '']
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[monthlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[monthlyPrice?.id ?? '']
            "
            @click="
              isStudent && monthlyStudentPrice
                ? handleUpgrade(monthlyStudentPrice)
                : monthlyPrice
                  ? handleUpgrade(monthlyPrice)
                  : undefined
            "
          >
            Upgrade
          </v-btn>
        </div>
        <div
          v-if="showYearly"
          class="tw-relative tw-flex tw-flex-1 tw-flex-col tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-light-green tw-bg-white tw-p-4 tw-shadow-lg"
        >
          <div
            class="tw-absolute -tw-top-3 tw-rounded-full tw-bg-light-green tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
          >
            Save {{ yearlyDiscount }}%
          </div>
          <div
            class="tw-inline-block tw-w-fit tw-rounded tw-bg-light-green/10 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-light-green"
          >
            Yearly
          </div>
          <div class="tw-relative">
            <div class="tw-font-medium">
              <span class="tw-mr-1 tw-text-4xl">{{
                isStudent
                  ? formattedPrice(yearlyStudentPrice)
                  : formattedPrice(yearlyPrice)
              }}</span>
              <span class="tw-text-dark-gray">USD</span>
            </div>
            <v-fade-transition>
              <div
                v-if="yearlyPrice === null"
                class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-full tw-bg-white"
              ></div>
            </v-fade-transition>
          </div>
          <div class="tw-mb-4 tw-text-center tw-text-sm tw-text-very-dark-gray">
            Per month.<br />Billed annually.
          </div>
          <v-btn
            class="tw-mb-0.5 tw-text-white"
            color="primary"
            block
            :disabled="
              isStudent
                ? loadingCheckoutUrl[yearlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[yearlyPrice?.id ?? '']
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[yearlyStudentPrice?.id ?? '']
                : loadingCheckoutUrl[yearlyPrice?.id ?? '']
            "
            @click="
              isStudent && yearlyStudentPrice
                ? handleUpgrade(yearlyStudentPrice)
                : yearlyPrice
                  ? handleUpgrade(yearlyPrice)
                  : undefined
            "
          >
            Upgrade
          </v-btn>
        </div>
        <div
          v-if="showLifetime"
          class="tw-relative tw-flex tw-flex-1 tw-flex-col tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-light-green tw-bg-white tw-p-4 tw-shadow-lg"
        >
          <div
            class="tw-absolute -tw-top-3 tw-rounded-full tw-bg-light-green tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
          >
            Limited time offer
          </div>
          <div
            class="tw-inline-block tw-w-fit tw-rounded tw-bg-light-green/10 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-light-green"
          >
            Lifetime access
          </div>
          <div class="tw-relative">
            <div class="tw-font-medium">
              <span class="tw-mr-1 tw-text-dark-gray tw-line-through"
                >$100</span
              >
              <span class="tw-mr-1 tw-text-4xl">{{
                isStudent
                  ? formattedPrice(lifetimeStudentPrice)
                  : formattedPrice(lifetimePrice)
              }}</span>
              <span class="tw-text-dark-gray">USD</span>
            </div>
            <v-fade-transition>
              <div
                v-if="lifetimePrice === null"
                class="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-full tw-bg-white"
              ></div>
            </v-fade-transition>
          </div>
          <div class="tw-mb-4 tw-text-center tw-text-sm tw-text-very-dark-gray">
            One-time payment.<br />No subscription.
          </div>
          <v-btn
            class="tw-mb-0.5 tw-text-white"
            color="primary"
            block
            :disabled="
              isStudent
                ? loadingCheckoutUrl[lifetimeStudentPrice?.id ?? '']
                : loadingCheckoutUrl[lifetimePrice?.id ?? '']
            "
            :loading="
              isStudent
                ? loadingCheckoutUrl[lifetimeStudentPrice?.id ?? '']
                : loadingCheckoutUrl[lifetimePrice?.id ?? '']
            "
            @click="
              isStudent && lifetimeStudentPrice
                ? handleUpgrade(lifetimeStudentPrice)
                : lifetimePrice
                  ? handleUpgrade(lifetimePrice)
                  : undefined
            "
          >
            Upgrade
          </v-btn>
        </div>
      </div>
      <div
        class="tw-flex tw-h-8 tw-w-full tw-items-center tw-justify-start tw-pb-4"
      >
        <v-checkbox
          id="student-checkbox"
          :model-value="isStudent"
          density="compact"
          hide-details
          @update:model-value="handleStudentToggle"
        >
        </v-checkbox>
        <label
          for="student-checkbox"
          class="tw-flex tw-cursor-pointer tw-select-none tw-flex-col tw-text-sm tw-text-very-dark-gray"
        >
          <span class="tw-text-sm">I'm a student</span>
          <span v-if="isStudent" class="tw-text-xs tw-text-dark-gray">
            Pinky promise that you're actually a student?
          </span>
        </label>
      </div>
    </v-card>

    <!-- ==================== V2 PAYWALL ==================== -->
    <v-card
      v-else
      class="tw-relative tw-rounded-lg tw-p-4 tw-pb-4 sm:tw-p-8 sm:tw-pb-6"
    >
      <v-btn
        absolute
        icon
        class="tw-right-0 tw-top-0 tw-mr-2 tw-mt-2"
        @click="emit('update:modelValue', false)"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <!-- Header -->
      <div class="tw-mb-6 tw-flex tw-flex-col tw-items-start tw-gap-2">
        <h2 class="tw-text-xl tw-font-medium">
          Upgrade to
          <span
            class="tw-bg-gradient-to-r tw-from-darkest-green tw-to-light-green tw-bg-clip-text tw-text-transparent"
            >Timeful Premium</span
          >
        </h2>
        <div class="tw-text-sm tw-font-medium tw-text-dark-gray">
          <template
            v-if="upgradeDialogType === upgradeDialogTypes.CREATE_EVENT"
          >
            You've run out of free events. Upgrade to create unlimited events.
            <br class="tw-hidden sm:tw-block" />
            Your payment helps us keep the site running.
          </template>
          <template
            v-else-if="upgradeDialogType === upgradeDialogTypes.SCHEDULE_EVENT"
          >
            Upgrade to schedule events with Timeful. Your payment helps us keep
            the site running.
          </template>
          <template
            v-else-if="upgradeDialogType === upgradeDialogTypes.REMOVE_ADS"
          >
            Upgrade to remove ads. Your payment helps us keep the site running.
          </template>
          <template v-else>
            Create unlimited events with Timeful Premium. Your payment helps us
            keep the site running.
          </template>
        </div>
      </div>

      <!-- Monthly / Yearly toggle -->
      <div class="tw-mb-4 tw-flex tw-items-center tw-justify-center">
        <SlideToggle
          v-model="v2BillingCycle"
          class="tw-w-full"
          :options="v2BillingOptions"
        >
          <template #option-yearly>
            <span class="tw-line-clamp-1">Yearly</span>
            <span
              v-if="yearlyDiscount > 0"
              class="tw-whitespace-nowrap tw-rounded-full tw-bg-light-green tw-px-1.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
              >{{ yearlyDiscount }}% OFF</span
            >
          </template>
        </SlideToggle>
      </div>

      <!-- Plan comparison cards -->
      <div
        class="tw-mb-5 tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-gap-4"
      >
        <!-- Free plan -->
        <div
          class="tw-flex tw-flex-1 tw-flex-col tw-rounded-lg tw-border tw-border-light-gray-stroke tw-p-5"
        >
          <div class="tw-mb-1 tw-text-xl tw-font-medium">Free</div>
          <div class="tw-mb-4 tw-text-xs tw-font-medium tw-text-dark-gray">
            Limited use
          </div>
          <div class="tw-mb-1 tw-text-4xl tw-font-medium">$0</div>
          <div class="tw-mb-5 tw-text-xs tw-text-dark-gray">Free, forever</div>
          <ul class="tw-m-0 tw-mb-5 tw-list-none tw-space-y-2.5 tw-p-0">
            <li
              v-for="item in freeFeatures"
              :key="item"
              class="tw-flex tw-items-start tw-text-sm tw-text-very-dark-gray"
            >
              <v-icon small class="tw-mr-2 tw-mt-0.5 tw-text-gray"
                >mdi-check</v-icon
              >
              {{ item }}
            </li>
          </ul>
          <v-btn variant="flat" disabled class="tw-mt-auto">
            <span class="tw-text-very-dark-gray">Your current plan</span>
          </v-btn>
        </div>

        <!-- Premium plan -->
        <div
          class="tw-relative tw-flex tw-flex-1 tw-flex-col tw-rounded-lg tw-border-2 tw-border-light-green tw-p-5"
          style="box-shadow: 0 10px 30px -5px rgba(76, 175, 80, 0.3)"
          :style="{
            background: `linear-gradient( 135deg, rgba(76, 175, 80, 0.1) 0%, #fff 50%, rgba(76, 175, 80, 0.1) 100%)`,
          }"
        >
          <!-- <div
            class="tw-absolute -tw-top-3 tw-left-1/2 -tw-translate-x-1/2 tw-whitespace-nowrap tw-rounded-full tw-bg-light-green tw-px-3 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white"
          >
            Recommended
          </div> -->
          <div class="tw-mb-1 tw-text-xl tw-font-semibold">
            <span
              class="tw-bg-gradient-to-r tw-from-darkest-green tw-to-light-green tw-bg-clip-text tw-text-transparent"
              >Premium</span
            >
          </div>
          <div class="tw-mb-4 tw-text-xs tw-font-medium tw-text-dark-gray">
            Unlock everything
          </div>
          <div class="tw-relative tw-mb-1 tw-flex tw-items-baseline tw-gap-1.5">
            <span
              v-if="v2BillingCycle === 'yearly' && v2MonthlyPrice"
              class="tw-text-lg tw-text-dark-gray tw-line-through"
              >{{ formattedPrice(v2MonthlyPrice) }}</span
            >
            <span class="tw-text-4xl tw-font-medium">{{
              v2ActivePrice ? formattedPrice(v2ActivePrice) : "..."
            }}</span>
            <span class="tw-text-sm tw-text-dark-gray">/mo</span>
          </div>
          <div class="tw-mb-5 tw-text-xs tw-text-dark-gray">
            {{
              v2BillingCycle === "yearly" ? "Billed annually" : "Billed monthly"
            }}
          </div>

          <ul class="tw-m-0 tw-mb-5 tw-list-none tw-space-y-2.5 tw-p-0">
            <li
              v-for="item in premiumFeatures"
              :key="item.text"
              class="tw-flex tw-items-start tw-text-sm tw-text-very-dark-gray"
            >
              <v-icon small class="tw-mr-2 tw-mt-0.5 tw-text-light-green"
                >mdi-check</v-icon
              >
              <span>
                <template v-for="(part, partIndex) in item.parts" :key="partIndex">
                  <span v-if="part.highlight" class="rdt-h">{{ part.text }}</span>
                  <template v-else>{{ part.text }}</template>
                </template>
              </span>
            </li>
          </ul>

          <v-btn
            class="tw-text-white"
            color="primary"
            block
            :disabled="!v2ActivePrice || loadingCheckoutUrl[v2ActivePrice.id ?? '']"
            :loading="loadingCheckoutUrl[v2ActivePrice?.id ?? '']"
            @click="v2ActivePrice && handleUpgrade(v2ActivePrice)"
          >
            Upgrade
          </v-btn>
        </div>
      </div>

      <!-- Student checkbox -->
      <div class="tw-flex tw-h-8 tw-w-full tw-items-center tw-justify-start">
        <v-checkbox
          id="student-checkbox-v2"
          :model-value="isStudent"
          density="compact"
          hide-details
          @update:model-value="handleStudentToggle"
        >
        </v-checkbox>
        <label
          for="student-checkbox-v2"
          class="tw-flex tw-cursor-pointer tw-select-none tw-flex-col tw-text-sm tw-text-very-dark-gray"
        >
          <span class="tw-text-sm">I'm a student</span>
          <span v-if="isStudent" class="tw-text-xs tw-text-dark-gray">
            Pinky promise that you're actually a student?
          </span>
        </label>
      </div>
    </v-card>

    <AlreadyDonatedDialog v-model="showDonatedDialog" />
    <StudentProofDialog v-model="showStudentProofDialog" />
  </v-dialog>
</template>

<script setup lang="ts">
import { toRef } from "vue"
import { upgradeDialogTypes } from "@/constants"
import {
  formatStripePrice,
  type StripePrice,
} from "@/composables/pricing/upgradeDialogModels"
import { useUpgradeDialogState } from "@/composables/pricing/useUpgradeDialogState"
import AlreadyDonatedDialog from "./AlreadyDonatedDialog.vue"
import StudentProofDialog from "./StudentProofDialog.vue"
import SlideToggle from "@/components/SlideToggle.vue"

const props = defineProps<{
  modelValue: boolean
  version?: "v1" | "v2"
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const formattedPrice = (price: StripePrice | null) => formatStripePrice(price)

const {
  freeFeatures,
  handleStudentToggle,
  handleUpgrade,
  isStudent,
  lifetimePrice,
  lifetimeStudentPrice,
  loadingCheckoutUrl,
  monthlyPrice,
  monthlyStudentPrice,
  premiumFeatures,
  showDonatedDialog,
  showLifetime,
  showMonthly,
  showStudentProofDialog,
  showYearly,
  upgradeDialogType,
  v2ActivePrice,
  v2BillingCycle,
  v2BillingOptions,
  v2MonthlyPrice,
  yearlyDiscount,
  yearlyPrice,
  yearlyStudentPrice,
} = useUpgradeDialogState({
  modelValue: toRef(props, "modelValue"),
  closeDialog: () => {
    emit("update:modelValue", false)
  },
})
</script>
