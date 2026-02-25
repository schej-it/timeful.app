<template>
  <div
    ref="scrollableSection"
    class="tw-flex tw-flex-col"
    :style="
      !isPhone ? `max-height: ${signUpBlocksListMaxHeight}px !important;` : ''
    "
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
        v-if="isOwner && signUpBlocks.length === 0 && signUpBlocksToAdd.length === 0"
        class="tw-text-sm tw-italic tw-text-text-muted"
      >
        Click and drag on the grid to create a slot
      </div>
      <div class="tw-flex tw-flex-col tw-gap-3">
        <SignUpBlock
          v-for="signUpBlock in signUpBlocksToAdd"
          :key="signUpBlock._id"
          :signUpBlock="signUpBlock"
          @update:signUpBlock="$emit('update:signUpBlock', $event)"
          @delete:signUpBlock="$emit('delete:signUpBlock', $event)"
          @signUpForBlock="$emit('signUpForBlock', $event)"
          :isEditing="isEditing"
          :isOwner="isOwner"
          unsaved
        ></SignUpBlock>
        <SignUpBlock
          v-for="signUpBlock in signUpBlocks"
          :key="signUpBlock._id"
          :signUpBlock="signUpBlock"
          @update:signUpBlock="$emit('update:signUpBlock', $event)"
          @delete:signUpBlock="$emit('delete:signUpBlock', $event)"
          @signUpForBlock="$emit('signUpForBlock', $event)"
          :isEditing="isEditing"
          :anonymous="anonymous"
          :isOwner="isOwner"
          :infoOnly="alreadyResponded"
        ></SignUpBlock>
      </div>
    </div>

    <div class="tw-relative">
      <OverflowGradient
        v-if="hasMounted && !isPhone"
        class="tw-h-16"
        :scrollContainer="$refs.signUpBlocksScrollView"
        :showArrow="false"
      />
    </div>
  </div>
</template>

<script>
import { isPhone } from "@/utils"
import { mapState } from "vuex"

import SignUpBlock from "./SignUpBlock.vue"
import OverflowGradient from "@/components/OverflowGradient.vue"

export default {
  name: "SignUpBlocksList",

  props: {
    signUpBlocks: { type: Array, required: true },
    signUpBlocksToAdd: { type: Array, required: true },
    isEditing: { type: Boolean, required: true },
    isOwner: { type: Boolean, required: true },
    alreadyResponded: { type: Boolean, required: true },
    anonymous: { type: Boolean, default: false },
  },

  data: () => ({
    desktopMaxHeight: 0,
    signUpBlocksListMinHeight: 400,
    hasMounted: false,
  }),

  mounted() {
    this.setDesktopMaxHeight()

    addEventListener("resize", this.setDesktopMaxHeight)

    this.$nextTick(() => {
      this.hasMounted = true
    })
  },

  computed: {
    ...mapState(["authUser"]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
    signUpBlocksListMaxHeight() {
      return Math.max(this.desktopMaxHeight, this.signUpBlocksListMinHeight)
    },
  },

  methods: {
    setDesktopMaxHeight() {
      const el = this.$refs.scrollableSection
      if (el) {
        const { top } = el.getBoundingClientRect()
        this.desktopMaxHeight = window.innerHeight - top - 32
      } else {
        this.desktopMaxHeight = 0
      }
    },
    scrollToSignUpBlock(id) {
      const scrollView = this.$refs.signUpBlocksScrollView
      if (scrollView) {
        const targetBlock = scrollView.querySelector(`[data-id='${id}']`)
        if (targetBlock) {
          // Calculate the scroll position
          const scrollTop = targetBlock.offsetTop - scrollView.offsetTop

          // Scroll the container
          scrollView.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          })
        }
      }
    },
  },

  components: {
    SignUpBlock,
    OverflowGradient,
  },
}
</script>
