<template>
  <div
    :data-id="signUpBlock._id"
    class="tw-flex tw-flex-col tw-rounded-md tw-border-[1px] tw-p-4"
    :class="unsaved ? 'tw-border-light-green' : 'tw-border-light-gray-stroke'"
  >
    <div class="tw-flex tw-items-start tw-justify-between mb-1">
      <div
        v-if="!isEditingName"
        class="tw-flex tw-items-center tw-gap-2 tw-font-medium"
      >
        <div>
          {{ isEditing ? newName : signUpBlock.name }}
        </div>
        <div>
          (<span :class="!hasCapacity && 'tw-text-green'">{{ numberResponses }}/{{ signUpBlock.capacity }}</span>)
        </div>
        <v-btn v-if="isEditing" icon x-small @click="isEditingName = true">
          <v-icon x-small>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <div
        v-else
        class="-tw-mt-[6px] tw-flex tw-w-full tw-items-center tw-gap-2"
      >
        <v-text-field
          v-model="newName"
          dense
          hide-details
          autofocus
          @keyup.enter="saveName"
        ></v-text-field>
        <v-btn icon small @click="cancelEditName">
          <v-icon small>mdi-undo</v-icon>
        </v-btn>
        <v-btn icon small color="primary" @click="saveName">
          <v-icon small>mdi-check</v-icon>
        </v-btn>
      </div>
    </div>
    <div class="tw-text-xs tw-italic tw-text-dark-gray">
      {{ timeRangeString }}
    </div>
    <div v-if="isOwner" class="tw-mt-4 tw-flex tw-items-center tw-gap-4">
      <div class="tw-text-xs">People per slot</div>
      <div class="tw-flex tw-h-4 tw-items-center">
        <div v-if="isEditing" class="-tw-mt-2 tw-w-20">
          <v-select
            :model-value="signUpBlock.capacity"
            class="tw-text-xs"
            :items="capacityOptions"
            hide-details
            dense
            @update:model-value="
              (v: number) => emit('update:signUpBlock', {
                ...signUpBlock,
                capacity: v,
              })
            "
          ></v-select>
        </div>
        <div v-else class="tw-text-xs">{{ signUpBlock.capacity }}</div>
      </div>
    </div>

    <div v-if="signUpBlock.responses" class="tw-mt-2">
      <div
        v-for="(response, i) in signUpBlock.responses"
        :key="i"
        class="tw-relative tw-flex tw-items-center"
      >
        <div class="tw-ml-1 tw-mr-2">
          <v-avatar v-if="response.user?.picture != '' && (!anonymize || response.user?._id == authUser?._id)" :size="16">
            <img
              v-if="response.user?.picture"
              :src="response.user.picture"
              referrerpolicy="no-referrer"
            />
          </v-avatar>
          <v-avatar v-else :size="16">
            <v-icon small>mdi-account</v-icon>
          </v-avatar>
        </div>
        <div v-if="!anonymize || response.user?._id == authUser?._id" class="tw-transition-all tw-text-sm">
          {{ response.user?.firstName + " " + response.user?.lastName }}
        </div>
        <div v-else class="tw-transition-all tw-text-sm tw-italic">Attendee</div>
      </div>
    </div>

    <div v-if="isEditing" class="tw-mt-2">
      <a
        class="tw-text-xs tw-text-red"
        @click="emit('delete:signUpBlock', signUpBlock._id ?? '')"
        >Delete slot</a
      >
    </div>

    <div v-if="!isOwner && hasCapacity && !infoOnly" class="tw-mt-2">
      <a
        class="tw-text-xs tw-text-green"
        @click="joinSlot"
        >+ Join this slot</a
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { getStartEndDateString } from "@/utils"
import { useMainStore } from "@/stores/main"
import type { SignUpBlock } from "@/types"

type SignUpBlockWithResponses = SignUpBlock & { 
  responses?: {
    user?: {
      _id?: string
      firstName?: string
      lastName?: string
      picture?: string
    }
  }[]
}

const props = withDefaults(
  defineProps<{
    signUpBlock: SignUpBlockWithResponses
    isEditing?: boolean
    isOwner?: boolean
    unsaved?: boolean
    infoOnly?: boolean
    anonymous?: boolean
  }>(),
  {
    isEditing: false,
    isOwner: false,
    unsaved: false,
    infoOnly: false,
    anonymous: false,
  }
)

const emit = defineEmits<{
  "update:signUpBlock": [block: SignUpBlock]
  "delete:signUpBlock": [id: string]
  signUpForBlock: [block: SignUpBlock]
}>()

const { authUser } = storeToRefs(useMainStore())

const capacityOptions = [...Array(100).keys()].map((i) => i + 1)
const isEditingName = ref(false)
const newName = ref("")

const timeRangeString = computed(() => {
  if (!props.signUpBlock.startDate || !props.signUpBlock.endDate) return ""
  return getStartEndDateString(
    props.signUpBlock.startDate,
    props.signUpBlock.endDate
  )
})

const blockWithResponses = computed(
  () => props.signUpBlock
)

const hasCapacity = computed(
  () =>
    !blockWithResponses.value.responses ||
    (props.signUpBlock.capacity ?? 0) > blockWithResponses.value.responses.length
)

const numberResponses = computed(() =>
  blockWithResponses.value.responses
    ? blockWithResponses.value.responses.length
    : 0
)

const anonymize = computed(() => props.anonymous && !props.isOwner)

const saveName = () => {
  emit("update:signUpBlock", {
    ...props.signUpBlock,
    name: newName.value,
  })
  isEditingName.value = false
}

const cancelEditName = () => {
  newName.value = props.signUpBlock.name ?? ""
  isEditingName.value = false
}

const joinSlot = () => {
  if (!props.isOwner) emit("signUpForBlock", props.signUpBlock)
}

watch(
  () => props.signUpBlock,
  (newVal) => {
    newName.value = newVal.name ?? ""
  },
  { immediate: true }
)
</script>
