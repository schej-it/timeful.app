<template>
  <div>
    <div
      class="tw-flex tw-min-h-[5rem] tw-flex-1 tw-items-center tw-justify-center tw-text-sm sm:tw-mt-0 sm:tw-justify-between"
    >
      <div
        :class="
          state === states.EDIT_AVAILABILITY
            ? 'tw-justify-center'
            : 'tw-justify-between'
        "
        class="tw-flex tw-flex-1 tw-flex-wrap tw-gap-x-4 tw-gap-y-2 tw-py-4 sm:tw-justify-start sm:tw-gap-x-4"
      >
        <!-- Select timezone -->
        <div v-if="!event.daysOnly" class="tw-flex tw-items-center tw-gap-2">
          <TimezoneSelector
            class="tw-w-full sm:tw-w-[unset]"
            :value="curTimezone"
            @input="(val) => $emit('update:curTimezone', val)"
          />
          <v-select
            :value="timeType"
            @input="$emit('update:timeType', $event)"
            :items="timeTypeOptions"
            :menu-props="{ auto: true }"
            item-text="label"
            item-value="value"
            class="tw-z-20 -tw-mt-px tw-w-16 tw-text-sm"
            dense
            hide-details
          />
        </div>
        <div
          v-if="isPhone && !event.daysOnly"
          class="tw-flex tw-basis-full tw-items-center tw-gap-x-2 tw-py-4"
        >
          Show
          <v-select
            :value="mobileNumDays"
            @input="$emit('update:mobileNumDays', $event)"
            :items="mobileNumDaysOptions"
            :menu-props="{ auto: true }"
            item-text="label"
            item-value="value"
            class="-tw-mt-px tw-flex-none tw-shrink tw-basis-24 tw-text-sm"
            dense
            hide-details
          />
          at a time
        </div>

        <template v-if="state !== states.EDIT_AVAILABILITY && isPhone">
          <EventOptions
            class="tw-mt-2 tw-w-full"
            :event="event"
            :showBestTimes="showBestTimes"
            @update:showBestTimes="(val) => $emit('update:showBestTimes', val)"
            :hideIfNeeded="hideIfNeeded"
            @update:hideIfNeeded="(val) => $emit('update:hideIfNeeded', val)"
            :showEventOptions="showEventOptions"
            @toggleShowEventOptions="$emit('toggleShowEventOptions')"
            :startCalendarOnMonday="startCalendarOnMonday"
            @update:startCalendarOnMonday="
              (val) => $emit('update:startCalendarOnMonday', val)
            "
            :numResponses="numResponses"
          />
        </template>
        <template
          v-if="state === states.EDIT_AVAILABILITY && isWeekly && !isPhone"
        >
          <v-spacer />
          <div class="tw-min-w-fit">
            <GCalWeekSelector
              v-if="calendarPermissionGranted"
              :week-offset="weekOffset"
              :event="event"
              @update:weekOffset="(val) => $emit('update:weekOffset', val)"
              :start-on-monday="event.startOnMonday"
            />
          </div>
        </template>
      </div>

      <div
        v-if="showScheduleEventButton"
        style="width: 181.5px"
        class="tw-hidden sm:tw-flex"
      >
        <template v-if="state !== states.SCHEDULE_EVENT">
          <v-btn
            outlined
            class="tw-w-full tw-text-blue"
            @click="(e) => $emit('scheduleEvent', e)"
          >
            <v-icon small>mdi-calendar-check</v-icon>
            <span class="tw-ml-2">Schedule event</span>
          </v-btn>
        </template>
        <template v-else>
          <v-btn
            outlined
            class="tw-mr-1 tw-text-red"
            @click="(e) => $emit('cancelScheduleEvent', e)"
          >
            Cancel
          </v-btn>
          <v-menu offset-y class="tw-z-20">
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                :disabled="!allowScheduleEvent"
                class="tw-bg-blue tw-text-white"
                v-bind="attrs"
                v-on="on"
              >
                Schedule
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item @click="(e) => $emit('confirmScheduleEvent', true)">
                <v-img
                  src="@/assets/gcal_logo.png"
                  class="tw-mr-2 tw-flex-none"
                  height="20"
                  width="20"
                />
                <v-list-item-content>
                  <v-list-item-title>Google Calendar</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-list-item @click="(e) => $emit('confirmScheduleEvent', false)">
                <v-img
                  src="@/assets/outlook_logo.svg"
                  class="tw-mr-2 tw-flex-none"
                  height="20"
                  width="20"
                />
                <v-list-item-content>
                  <v-list-item-title>Outlook</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </div>
    </div>

    <!-- <Advertisement
      class="tw-mt-5 sm:tw-mt-10"
      :ownerId="event.ownerId"
    ></Advertisement> -->

    <div v-if="!isPremiumUser">
      <ins
        class="adsbygoogle"
        style="display: block"
        data-ad-client="ca-pub-4082178684015354"
        data-ad-slot="7343574524"
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-adtest="on"
      ></ins>
    </div>
  </div>
</template>

<script>
import TimezoneSelector from "./TimezoneSelector.vue"
import GCalWeekSelector from "./GCalWeekSelector.vue"
import { isPhone } from "@/utils"
import Advertisement from "../event/Advertisement.vue"
import ExpandableSection from "../ExpandableSection.vue"
import EventOptions from "./EventOptions.vue"
import { timeTypes, guestUserId } from "@/constants"
import { mapState, mapGetters } from "vuex"

export default {
  name: "ToolRow",

  props: {
    event: { type: Object, required: true },
    state: { type: String, required: true },
    states: { type: Object, required: true },
    curTimezone: { type: Object, required: true },
    startCalendarOnMonday: { type: Boolean, default: false },
    showBestTimes: { type: Boolean, required: true },
    hideIfNeeded: { type: Boolean, required: true },
    isWeekly: { type: Boolean, required: true },
    calendarPermissionGranted: { type: Boolean, required: true },
    weekOffset: { type: Number, required: true },
    numResponses: { type: Number, required: true },
    mobileNumDays: { type: Number, default: 3 }, // The number of days to show at a time on mobile
    allowScheduleEvent: { type: Boolean, required: true },
    showEventOptions: { type: Boolean, required: true },
    timeType: { type: String, required: true },
  },

  components: {
    TimezoneSelector,
    GCalWeekSelector,
    Advertisement,
    ExpandableSection,
    EventOptions,
  },

  data: () => ({
    mobileNumDaysOptions: [
      { label: "3 days", value: 3 },
      { label: "7 days", value: 7 },
    ],
    timeTypeOptions: [
      { label: "12h", value: timeTypes.HOUR12 },
      { label: "24h", value: timeTypes.HOUR24 },
    ],
  }),

  mounted() {
    // Initialize Google Ads only for non-premium users
    if (!this.isPremiumUser) {
      this.$nextTick(() => {
        this.initializeAd()
      })
    }
  },

  methods: {
    initializeAd() {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (e) {
        console.error('AdSense error:', e)
      }
    }
  },

  computed: {
    ...mapState(["authUser"]),
    ...mapGetters(["isPremiumUser"]),
    isPhone() {
      return isPhone(this.$vuetify)
    },
    guestEvent() {
      return this.event.ownerId == guestUserId
    },
    isOwner() {
      return this.event.ownerId == this.authUser?._id
    },
    showScheduleEventButton() {
      return (
        !this.event.daysOnly &&
        this.numResponses > 0 &&
        this.state !== this.states.EDIT_AVAILABILITY &&
        (this.guestEvent || this.isOwner)
      )
    },
  },
}
</script>
