<template>
  <v-avatar
    v-if="user"
    :size="size"
    :class="{ 'supporter-glow': user.hasPaid }"
    :style="user.hasPaid ? { '--glow-size': `${glowSize}px` } : {}"
  >
    <img v-if="user.picture" :src="user.picture" referrerpolicy="no-referrer" />
    <v-icon
      class="-tw-mt-1"
      :size="size"
      v-else-if="user.calendarType === calendarTypes.APPLE"
    >
      mdi-apple
    </v-icon>
    <v-icon
      :size="size"
      v-else-if="user.calendarType === calendarTypes.OUTLOOK"
    >
      mdi-microsoft-outlook
    </v-icon>
    <div
      v-else
      :class="`tw-flex tw-size-full tw-items-center tw-justify-center tw-bg-[linear-gradient(-25deg,#2b6cb0,#63b3ed,#2b6cb0)] tw-text-${textSize} tw-text-white`"
    >
      {{ user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? "" }}
    </div>
  </v-avatar>
</template>

<script>
import { calendarTypes } from "@/constants"

export default {
  name: "UserAvatarContent",
  props: {
    user: Object,
    size: { type: Number, default: 48 },
  },

  computed: {
    calendarTypes() {
      return calendarTypes
    },
    textSize() {
      return this.size <= 24 ? "xs" : "lg"
    },
    glowSize() {
      return Math.max(2, Math.round(this.size / 8))
    },
  },
}
</script>

<style scoped>
/* Glowing ring for users who paid for Timeful back when it had a paid tier */
.supporter-glow {
  box-shadow: 0 0 0 calc(var(--glow-size) / 2) #29bc68,
    0 0 var(--glow-size) var(--glow-size) rgba(41, 188, 104, 0.5);
  animation: supporter-glow-pulse 2.5s ease-in-out infinite;
}

@keyframes supporter-glow-pulse {
  50% {
    box-shadow: 0 0 0 calc(var(--glow-size) / 2) #29bc68,
      0 0 calc(var(--glow-size) * 1.75) calc(var(--glow-size) * 1.25)
        rgba(41, 188, 104, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .supporter-glow {
    animation: none;
  }
}
</style>
