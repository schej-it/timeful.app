import { getTimeBlock, splitTimeBlocksByDay, put } from "@/utils"
import ObjectID from "bson-objectid"

export default {
  data() {
    return {
      /* Sign up form */
      signUpBlocksByDay: [], // The current event's sign up blocks by day
      signUpBlocksToAddByDay: [], // The sign up blocks to be added after hitting 'save'
    }
  },
  computed: {
    /** Returns the name of the new sign up block being dragged */
    newSignUpBlockName() {
      return `Slot #${
        this.signUpBlocksByDay.flat().length +
        this.signUpBlocksToAddByDay.flat().length +
        1
      }`
    },
    /** Whether the current user has already responded to the sign up form */
    alreadyRespondedToSignUpForm() {
      if (!this.authUser || !this.signUpBlocksByDay) return false

      return this.signUpBlocksByDay.some((dayBlocks) =>
        dayBlocks.some((block) =>
          block.responses?.some(
            (response) => response.userId === this.authUser._id
          )
        )
      )
    },
  },
  methods: {
    /** Creates a sign up block for the current day and hour offset */
    createSignUpBlock(dayIndex, hoursOffset, hoursLength) {
      const timeBlock = getTimeBlock(
        this.days[dayIndex].dateObject,
        hoursOffset,
        hoursLength
      )

      return {
        _id: ObjectID().toString(),
        capacity: 1,
        name: this.newSignUpBlockName,
        ...timeBlock,
        hoursOffset,
        hoursLength,
      }
    },

    /** Updates the sign up block with the same id */
    editSignUpBlock(signUpBlock) {
      this.signUpBlocksByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlock._id === block._id) {
            this.signUpBlocksByDay[dayIndex][blockIndex] = signUpBlock
            this.signUpBlocksByDay = [...this.signUpBlocksByDay]
            return
          }
        })
      })

      this.signUpBlocksToAddByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlock._id === block._id) {
            this.signUpBlocksToAddByDay[dayIndex][blockIndex] = signUpBlock
            this.signUpBlocksToAddByDay = [...this.signUpBlocksToAddByDay]
            return
          }
        })
      })
    },

    /** Deletes the sign up block with the id */
    deleteSignUpBlock(signUpBlockId) {
      this.signUpBlocksByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlockId === block._id) {
            this.signUpBlocksByDay[dayIndex].splice(blockIndex, 1)
            return
          }
        })
      })

      this.signUpBlocksToAddByDay.forEach((blocksInDay, dayIndex) => {
        blocksInDay.forEach((block, blockIndex) => {
          if (signUpBlockId === block._id) {
            this.signUpBlocksToAddByDay[dayIndex].splice(blockIndex, 1)
            return
          }
        })
      })
    },

    /** Reloads all the data for the sign up form */
    resetSignUpForm() {
      /** Split sign up blocks by day */
      this.signUpBlocksByDay = splitTimeBlocksByDay(
        this.event,
        this.event.signUpBlocks ?? []
      )

      this.resetSignUpBlocksToAddByDay()

      /** Populate sign up block responses */
      for (const userId in this.event.signUpResponses) {
        const signUpResponse = this.event.signUpResponses[userId]
        for (const signUpBlockId of signUpResponse.signUpBlockIds) {
          const signUpBlock = this.signUpBlocksByDay
            .flat()
            .find((signUpBlock) => signUpBlock._id === signUpBlockId)

          if (!signUpBlock.responses) signUpBlock.responses = []
          signUpBlock.responses.push(signUpResponse)
        }
      }
    },

    /** Initialize sign up blocks to be added array */
    resetSignUpBlocksToAddByDay() {
      this.signUpBlocksToAddByDay = []
      for (const day of this.signUpBlocksByDay) {
        this.signUpBlocksToAddByDay.push([])
      }
    },

    /** Emits sign up for block to parent element */
    handleSignUpBlockClick(block) {
      const blockFull = (block.responses?.length || 0) >= block.capacity
      if (!this.alreadyRespondedToSignUpForm && !blockFull && !this.isOwner)
        this.$emit("signUpForBlock", block)
    },

    async submitNewSignUpBlocks() {
      if (
        this.signUpBlocksToAddByDay.flat().length +
          this.signUpBlocksByDay.flat().length ===
        0
      ) {
        this.showError("Please add at least one sign-up block!")
        return false
      }

      for (let i = 0; i < this.signUpBlocksToAddByDay.length; ++i) {
        this.signUpBlocksByDay[i] = this.signUpBlocksByDay[i].concat(
          this.signUpBlocksToAddByDay[i]
        )
        this.signUpBlocksToAddByDay[i] = []
      }

      const payload = {
        name: this.event.name,
        duration: this.event.duration,
        dates: this.event.dates,
        type: this.event.type,
        signUpBlocks: this.signUpBlocksByDay.flat().map((block) => {
          return {
            _id: block._id,
            name: block.name,
            capacity: block.capacity,
            startDate: block.startDate,
            endDate: block.endDate,
          }
        }),
      }

      put(`/events/${this.event._id}`, payload)
        .then(() => {
          // window.location.reload()
        })
        .catch((err) => {
          console.error(err)
          this.showError(
            "There was a problem editing this event! Please try again later."
          )
        })

      return true
    },
  },
}
