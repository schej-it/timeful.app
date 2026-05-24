<template>
  <div
    ref="scrollableSection"
    class="tw-flex tw-flex-col"
    :style="containerStyle"
  >
    <div
      ref="signUpBlocksScrollView"
      :class="
        isPhone
          ? 'tw-overflow-hidden'
          : 'tw-overflow-y-auto tw-overflow-x-hidden'
      "
    >
      <div
        v-if="
          isOwner && signUpBlocks.length === 0 && signUpBlocksToAdd.length === 0
        "
        class="tw-text-sm tw-italic tw-text-dark-gray"
      >
        Click and drag on the grid to create a slot
      </div>
      <div class="tw-flex tw-flex-col tw-gap-3">
        <SignUpBlock
          v-for="signUpBlock in signUpBlocksToAdd"
          :key="(signUpBlock._id as PropertyKey)"
          :sign-up-block="signUpBlock"
          :is-editing="isEditing"
          :is-owner="isOwner"
          unsaved
          @update:sign-up-block="(e: any) => emit('update:signUpBlock', e)"
          @delete:sign-up-block="(e: any) => emit('delete:signUpBlock', e)"
          @sign-up-for-block="(e: any) => emit('signUpForBlock', e)"
        ></SignUpBlock>
        <SignUpBlock
          v-for="signUpBlock in signUpBlocks"
          :key="(signUpBlock._id as PropertyKey)"
          :sign-up-block="signUpBlock"
          :is-editing="isEditing"
          :anonymous="anonymous"
          :is-owner="isOwner"
          :info-only="alreadyResponded"
          @update:sign-up-block="(e: any) => emit('update:signUpBlock', e)"
          @delete:sign-up-block="(e: any) => emit('delete:signUpBlock', e)"
          @sign-up-for-block="(e: any) => emit('signUpForBlock', e)"
        ></SignUpBlock>
      </div>
    </div>

    <div class="tw-relative">
      <OverflowGradient
        v-if="hasMounted && desktopScrollContainer"
        class="tw-h-16"
        :scroll-container="desktopScrollContainer"
        :show-arrow="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDisplayHelpers } from "@/utils/useDisplayHelpers"
import type { ScheduleOverlapSignUpBlock } from "@/composables/schedule_overlap/types"
import SignUpBlock from "./SignUpBlock.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"
import { useSignUpBlocksListViewport } from "./useSignUpBlocksListViewport"

withDefaults(
  defineProps<{
    signUpBlocks: ScheduleOverlapSignUpBlock[]
    signUpBlocksToAdd: ScheduleOverlapSignUpBlock[]
    isEditing: boolean
    isOwner: boolean
    alreadyResponded: boolean
    anonymous?: boolean
  }>(),
  { anonymous: false }
)

const emit = defineEmits<{
  "update:signUpBlock": [payload: ScheduleOverlapSignUpBlock]
  "delete:signUpBlock": [payload: string]
  signUpForBlock: [payload: ScheduleOverlapSignUpBlock]
}>()

const { isPhone } = useDisplayHelpers()
const {
  containerStyle,
  desktopScrollContainer,
  hasMounted,
  scrollableSection,
  signUpBlocksScrollView,
  scrollToSignUpBlock,
} = useSignUpBlocksListViewport(isPhone)

defineExpose({ scrollToSignUpBlock })
</script>
