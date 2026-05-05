import { computed, ref, type ComputedRef, type Ref } from "vue"
import ObjectID from "bson-objectid"
import { getTimeBlock, put, splitTimeBlocksByDay } from "@/utils"
import { useMainStore } from "@/stores/main"
import type { Temporal } from "temporal-polyfill"
import { toEventDateStrings } from "@/types/transport"
import {
  type DayItem,
  type RowCol,
  type ScheduleOverlapEvent,
  type SignUpBlockLite,
} from "./types"

export interface UseSignUpFormOptions {
  event: Ref<ScheduleOverlapEvent>
  isSignUp: ComputedRef<boolean>
  days: ComputedRef<DayItem[]>
  isOwner: ComputedRef<boolean>
  dragStart: Ref<RowCol | null>
}

export function useSignUpForm(opts: UseSignUpFormOptions) {
  const mainStore = useMainStore()

  const signUpBlocksByDay = ref<SignUpBlockLite[][]>([])
  const signUpBlocksToAddByDay = ref<SignUpBlockLite[][]>([])

  const newSignUpBlockName = computed(
    () =>
      `Slot #${String(
        signUpBlocksByDay.value.flat().length +
        signUpBlocksToAddByDay.value.flat().length +
        1
      )}`
  )

  const maxSignUpBlockRowSize = computed<number | null>(() => {
    if (!opts.dragStart.value || !opts.isSignUp.value) return null
    const ds = opts.dragStart.value
    const selectedDay = signUpBlocksByDay.value[ds.col] ?? []
    const selectedDayToAdd = signUpBlocksToAddByDay.value[ds.col] ?? []
    if (selectedDay.length === 0 && selectedDayToAdd.length === 0) return null

    let maxSize = Infinity
    for (const block of [...selectedDay, ...selectedDayToAdd]) {
      // Convert Duration to hours using .total() method
      const blockOffsetHours = block.hoursOffset.total("hours")
      const blockOffsetRows = blockOffsetHours * 4
      if (blockOffsetRows > ds.row) {
        maxSize = Math.min(maxSize, blockOffsetRows - ds.row)
      }
    }
    return Number.isFinite(maxSize) ? maxSize : null
  })

  const alreadyRespondedToSignUpForm = computed(() => {
    const authUser = mainStore.authUser
    if (!authUser?._id) return false
    return signUpBlocksByDay.value.some((dayBlocks) =>
      dayBlocks.some((block) => block.responses?.some((r) => r.userId === authUser._id))
    )
  })

  const createSignUpBlock = (
    dayIndex: number,
    hoursOffset: Temporal.Duration,
    hoursLength: Temporal.Duration
  ): SignUpBlockLite => {
    const dayItem = opts.days.value[dayIndex]
    const timeBlock = getTimeBlock(
      dayItem.dateObject,
      hoursOffset,
      hoursLength
    )
    return {
      _id: ObjectID().toHexString(),
      capacity: 1,
      name: newSignUpBlockName.value,
      startDate: timeBlock.startDate,
      endDate: timeBlock.endDate,
      hoursOffset: hoursOffset,
      hoursLength: hoursLength,
    }
  }

  const editSignUpBlock = (signUpBlock: SignUpBlockLite) => {
    signUpBlocksByDay.value.forEach((blocksInDay, dayIndex) => {
      blocksInDay.forEach((block, blockIndex) => {
        if (signUpBlock._id === block._id) {
          signUpBlocksByDay.value[dayIndex][blockIndex] = signUpBlock
          signUpBlocksByDay.value = [...signUpBlocksByDay.value]
        }
      })
    })

    signUpBlocksToAddByDay.value.forEach((blocksInDay, dayIndex) => {
      blocksInDay.forEach((block, blockIndex) => {
        if (signUpBlock._id === block._id) {
          signUpBlocksToAddByDay.value[dayIndex][blockIndex] = signUpBlock
          signUpBlocksToAddByDay.value = [...signUpBlocksToAddByDay.value]
        }
      })
    })
  }

  const deleteSignUpBlock = (signUpBlockId: string) => {
    signUpBlocksByDay.value.forEach((blocksInDay, dayIndex) => {
      blocksInDay.forEach((block, blockIndex) => {
        if (signUpBlockId === block._id) {
          signUpBlocksByDay.value[dayIndex].splice(blockIndex, 1)
        }
      })
    })

    signUpBlocksToAddByDay.value.forEach((blocksInDay, dayIndex) => {
      blocksInDay.forEach((block, blockIndex) => {
        if (signUpBlockId === block._id) {
          signUpBlocksToAddByDay.value[dayIndex].splice(blockIndex, 1)
        }
      })
    })
  }

  const resetSignUpBlocksToAddByDay = () => {
    signUpBlocksToAddByDay.value = []
    for (const _day of signUpBlocksByDay.value) {
      signUpBlocksToAddByDay.value.push([])
    }
  }

  const resetSignUpForm = () => {
    signUpBlocksByDay.value = splitTimeBlocksByDay<SignUpBlockLite>(
      opts.event.value,
      opts.event.value.signUpBlocks ?? []
    )

    resetSignUpBlocksToAddByDay()

    if (opts.event.value.signUpResponses) {
      for (const userId in opts.event.value.signUpResponses) {
        const signUpResponse = opts.event.value.signUpResponses[userId]
        for (const signUpBlockId of signUpResponse.signUpBlockIds ?? []) {
          const signUpBlock = signUpBlocksByDay.value
            .flat()
            .find((b) => b._id === signUpBlockId)
          if (!signUpBlock) continue
          signUpBlock.responses ??= []
          signUpBlock.responses.push(signUpResponse)
        }
      }
    }
  }

  const submitNewSignUpBlocks = async (): Promise<boolean> => {
    if (
      signUpBlocksToAddByDay.value.flat().length +
        signUpBlocksByDay.value.flat().length ===
      0
    ) {
      mainStore.showError("Please add at least one sign-up block!")
      return false
    }

    for (let i = 0; i < signUpBlocksToAddByDay.value.length; ++i) {
      signUpBlocksByDay.value[i] = signUpBlocksByDay.value[i].concat(
        signUpBlocksToAddByDay.value[i]
      )
      signUpBlocksToAddByDay.value[i] = []
    }

    const payload = {
      name: opts.event.value.name,
      duration: opts.event.value.duration,
      dates: toEventDateStrings(opts.event.value),
      type: opts.event.value.type,
      signUpBlocks: signUpBlocksByDay.value.flat().map((block) => ({
        _id: block._id,
        name: block.name,
        capacity: block.capacity,
        startDate: block.startDate,
        endDate: block.endDate,
      })),
    }

    try {
      await put(`/events/${opts.event.value._id ?? ""}`, payload)
    } catch (err) {
      console.error(err)
      mainStore.showError(
        "There was a problem editing this event! Please try again later."
      )
    }

    return true
  }

  const handleSignUpBlockClick = (
    block: SignUpBlockLite,
    onSignUpForBlock: (block: SignUpBlockLite) => void
  ) => {
    const blockFull = (block.responses?.length ?? 0) >= block.capacity
    if (!alreadyRespondedToSignUpForm.value && !blockFull && !opts.isOwner.value) {
      onSignUpForBlock(block)
    }
  }

  return {
    signUpBlocksByDay,
    signUpBlocksToAddByDay,
    newSignUpBlockName,
    maxSignUpBlockRowSize,
    alreadyRespondedToSignUpForm,
    createSignUpBlock,
    editSignUpBlock,
    deleteSignUpBlock,
    resetSignUpForm,
    resetSignUpBlocksToAddByDay,
    submitNewSignUpBlocks,
    handleSignUpBlockClick,
  }
}

export type UseSignUpFormReturn = ReturnType<typeof useSignUpForm>
