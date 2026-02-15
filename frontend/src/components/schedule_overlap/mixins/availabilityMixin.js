import {
  get,
  post,
  _delete,
  getDateHoursOffset,
  splitTimeBlocksByDay,
  dateToDowDate,
  dateCompare,
  isDateBetween,
  getDateDayOffset,
  timeNumToTimeString,
  getISODateString,
  getDateWithTimezone,
  generateEnabledCalendarsPayload,
} from "@/utils"
import {
  calendarOptionsDefaults,
  eventTypes,
  availabilityTypes,
} from "@/constants"
import dayjs from "dayjs"

export default {
  data() {
    return {
      fetchedResponses: {}, // Responses fetched from the server for the dates currently shown
      loadingResponses: { loading: false, lastFetched: new Date().getTime() }, // Whether we're currently fetching the responses
      responsesFormatted: new Map(), // Map where date/time is mapped to the people that are available then
      availabilityAnimTimeouts: [], // Timeouts for availability animation
      availabilityAnimEnabled: false, // Whether to animate timeslots changing colors
      maxAnimTime: 1200, // Max amount of time for availability animation
      hasRefreshedAuthUser: false,
    }
  },
  computed: {
    /** Returns the availability as an array */
    availabilityArray() {
      return [...this.availability].map((item) => new Date(item))
    },
    /** Returns the if needed availability as an array */
    ifNeededArray() {
      return [...this.ifNeeded].map((item) => new Date(item))
    },
    /** Parses the responses to the Timeful, makes necessary changes based on the type of event, and returns it */
    parsedResponses() {
      const parsed = {}

      // Return calendar availability if group
      if (this.event.type === eventTypes.GROUP) {
        for (const userId in this.event.responses) {
          const calendarEventsByDay = this.groupCalendarEventsByDay[userId]
          if (calendarEventsByDay) {
            // Get manual availability and convert to DOW dates
            const fetchedManualAvailability = this.getManualAvailabilityDow(
              this.fetchedResponses[userId]?.manualAvailability
            )
            const curManualAvailability =
              userId === this.authUser._id
                ? this.getManualAvailabilityDow(this.manualAvailability)
                : {}

            // Get availability from calendar events and use manual availability on the
            // "touched" days
            const availability = this.getAvailabilityFromCalendarEvents({
              calendarEventsByDay,
              includeTouchedAvailability: true,
              fetchedManualAvailability: fetchedManualAvailability ?? {},
              curManualAvailability: curManualAvailability ?? {},
              calendarOptions:
                userId === this.authUser._id
                  ? {
                      bufferTime: this.bufferTime,
                      workingHours: this.workingHours,
                    }
                  : this.fetchedResponses[userId]?.calendarOptions ?? undefined,
            })

            parsed[userId] = {
              ...this.event.responses[userId],
              availability: availability,
            }
          } else {
            parsed[userId] = {
              ...this.event.responses[userId],
              availability: new Set(),
            }
          }
        }
        return parsed
      }

      // Return only current user availability if using blind availabilities and user is not owner
      if (this.event.blindAvailabilityEnabled && !this.isOwner) {
        const guestName = localStorage[this.guestNameKey]
        const userId = this.authUser?._id ?? guestName
        if (userId in this.event.responses) {
          const user = {
            ...this.event.responses[userId].user,
            _id: userId,
          }
          parsed[userId] = {
            ...this.event.responses[userId],
            availability: new Set(
              this.fetchedResponses[userId]?.availability?.map((a) =>
                new Date(a).getTime()
              )
            ),
            ifNeeded: new Set(
              this.fetchedResponses[userId]?.ifNeeded?.map((a) =>
                new Date(a).getTime()
              )
            ),
            user: user,
          }
        }
        return parsed
      }

      // Otherwise, parse responses so that if _id is null (i.e. guest user), then it is set to the guest user's name
      for (const k of Object.keys(this.event.responses)) {
        const newUser = {
          ...this.event.responses[k].user,
          _id: k,
        }
        parsed[k] = {
          ...this.event.responses[k],
          availability: new Set(
            this.fetchedResponses[k]?.availability?.map((a) =>
              new Date(a).getTime()
            )
          ),
          ifNeeded: new Set(
            this.fetchedResponses[k]?.ifNeeded?.map((a) =>
              new Date(a).getTime()
            )
          ),
          user: newUser,
        }
      }
      return parsed
    },
    /** Returns an array of calendar events for all of the authUser's enabled calendars, separated by the day they occur on */
    calendarEventsByDay() {
      // If this is an example calendar
      if (this.sampleCalendarEventsByDay) return this.sampleCalendarEventsByDay

      // If the user isn't logged in or is adding availability as a guest
      if (!this.authUser || this.addingAvailabilityAsGuest) return []

      let events = []
      let event

      const calendarAccounts = this.isGroup
        ? this.sharedCalendarAccounts
        : this.authUser.calendarAccounts

      // Adds events from calendar accounts that are enabled
      for (const id in calendarAccounts) {
        if (!calendarAccounts[id].enabled) continue

        if (this.calendarEventsMap.hasOwnProperty(id)) {
          for (const index in this.calendarEventsMap[id].calendarEvents) {
            event = this.calendarEventsMap[id].calendarEvents[index]

            // Check if we need to update authUser (to get latest subcalendars)
            const subCalendars = calendarAccounts[id].subCalendars
            if (!subCalendars || !(event.calendarId in subCalendars)) {
              // authUser doesn't contain the subCalendar, so push event to events without checking if subcalendar is enabled
              // and queue the authUser to be refreshed
              events.push(event)
              if (!this.hasRefreshedAuthUser && !this.isGroup) {
                this.refreshAuthUser()
              }
              continue
            }

            // Push event to events if subcalendar is enabled
            if (subCalendars[event.calendarId].enabled) {
              events.push(event)
            }
          }
        }
      }

      const eventsCopy = JSON.parse(JSON.stringify(events))

      const calendarEventsByDay = splitTimeBlocksByDay(
        this.event,
        eventsCopy,
        this.weekOffset,
        this.timezoneOffset
      )

      return calendarEventsByDay
    },
    /** [SPECIFIC TO GROUPS] Returns an object mapping user ids to their calendar events separated by the day they occur on */
    groupCalendarEventsByDay() {
      if (this.event.type !== eventTypes.GROUP) return {}

      const userIdToEventsByDay = {}
      for (const userId in this.event.responses) {
        if (userId === this.authUser._id) {
          userIdToEventsByDay[userId] = this.calendarEventsByDay
        } else if (userId in this.calendarAvailabilities) {
          userIdToEventsByDay[userId] = splitTimeBlocksByDay(
            this.event,
            this.calendarAvailabilities[userId],
            this.weekOffset,
            this.timezoneOffset
          )
        }
      }

      return userIdToEventsByDay
    },
    max() {
      let max = 0
      for (const [dateTime, availability] of this.responsesFormatted) {
        if (availability.size > max) {
          max = availability.size
        }
      }

      return max
    },
    respondents() {
      return Object.values(this.parsedResponses)
        .map((r) => r.user)
        .filter(Boolean)
    },
    /** Returns an array of time blocks representing the current user's availability
     * (used for displaying current user's availability on top of everybody else's availability)
     */
    overlaidAvailability() {
      const overlaidAvailability = []
      this.days.forEach((day, d) => {
        overlaidAvailability.push([])
        let curBlockIndex = 0
        const addOverlaidAvailabilityBlocks = (time, t) => {
          const date = this.getDateFromRowCol(t, d)
          if (!date) return

          const dragAdd =
            this.dragging &&
            this.inDragRange(t, d) &&
            this.dragType === this.DRAG_TYPES.ADD
          const dragRemove =
            this.dragging &&
            this.inDragRange(t, d) &&
            this.dragType === this.DRAG_TYPES.REMOVE

          // Check if timeslot is available or if needed or in the drag region
          if (
            dragAdd ||
            (!dragRemove &&
              (this.availability.has(date.getTime()) ||
                this.ifNeeded.has(date.getTime())))
          ) {
            // Determine whether to render as available or if needed block
            let type = availabilityTypes.AVAILABLE
            if (dragAdd) {
              type = this.availabilityType
            } else {
              type = this.availability.has(date.getTime())
                ? availabilityTypes.AVAILABLE
                : availabilityTypes.IF_NEEDED
            }

            if (curBlockIndex in overlaidAvailability[d]) {
              if (overlaidAvailability[d][curBlockIndex].type === type) {
                // Increase block length if matching type and curBlockIndex exists
                overlaidAvailability[d][curBlockIndex].hoursLength += 0.25
              } else {
                // Add a new block because type is different
                overlaidAvailability[d].push({
                  hoursOffset: time.hoursOffset,
                  hoursLength: 0.25,
                  type,
                })
                curBlockIndex++
              }
            } else {
              // Add a new block because block doesn't exist for current index
              overlaidAvailability[d].push({
                hoursOffset: time.hoursOffset,
                hoursLength: 0.25,
                type,
              })
            }
          } else if (curBlockIndex in overlaidAvailability[d]) {
            // Only increment cur block index if block already exists at the current index
            curBlockIndex++
          }
        }
        for (let t = 0; t < this.splitTimes[0].length; ++t) {
          addOverlaidAvailabilityBlocks(this.splitTimes[0][t], t)
        }
        if (curBlockIndex in overlaidAvailability[d]) {
          curBlockIndex++
        }
        for (let t = 0; t < this.splitTimes[1].length; ++t) {
          addOverlaidAvailabilityBlocks(
            this.splitTimes[1][t],
            t + this.splitTimes[0].length
          )
        }
      })
      return overlaidAvailability
    },
    /** Returns a set containing the times for the event if it has specific times */
    specificTimesSet() {
      return new Set(this.event.times?.map((t) => new Date(t).getTime()) ?? [])
    },
  },
  methods: {
    /** Fetches responses from server */
    fetchResponses() {
      if (this.calendarOnly) {
        this.fetchedResponses = this.event.responses
        return
      }

      let timeMin, timeMax
      if (this.event.type === eventTypes.GROUP) {
        if (this.event.dates.length > 0) {
          // Fetch the date range for the current week
          timeMin = new Date(this.event.dates[0])
          timeMax = new Date(this.event.dates[this.event.dates.length - 1])
          timeMax.setDate(timeMax.getDate() + 1)

          // Convert dow dates to discrete dates
          timeMin = dateToDowDate(
            this.event.dates,
            timeMin,
            this.weekOffset,
            true
          )
          timeMax = dateToDowDate(
            this.event.dates,
            timeMax,
            this.weekOffset,
            true
          )
        }
      } else {
        if (this.allDays.length > 0) {
          // Fetch the entire time range of availabilities
          timeMin = new Date(this.allDays[0].dateObject)
          timeMax = new Date(this.allDays[this.allDays.length - 1].dateObject)
          timeMax.setDate(timeMax.getDate() + 1)
        }
      }

      if (!timeMin || !timeMax) return

      // Fetch responses between timeMin and timeMax
      const url = `/events/${
        this.event._id
      }/responses?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`
      get(url)
        .then((responses) => {
          this.fetchedResponses = responses
          this.getResponsesFormatted()
        })
        .catch((err) => {
          this.showError(
            "There was an error fetching availability! Please refresh the page."
          )
        })
    },
    /** Formats the responses in a map where date/time is mapped to the people that are available then */
    getResponsesFormatted() {
      const lastFetched = new Date().getTime()
      this.loadingResponses.loading = true
      this.loadingResponses.lastFetched = lastFetched

      this.$worker
        .run(
          (days, times, parsedResponses, daysOnly, hideIfNeeded) => {
            // Define functions locally because we can't import functions
            const splitTimeNum = (timeNum) => {
              const hours = Math.floor(timeNum)
              const minutes = Math.floor((timeNum - hours) * 60)
              return { hours, minutes }
            }
            const getDateHoursOffset = (date, hoursOffset) => {
              const { hours, minutes } = splitTimeNum(hoursOffset)
              const newDate = new Date(date)
              newDate.setHours(newDate.getHours() + hours)
              newDate.setMinutes(newDate.getMinutes() + minutes)
              return newDate
            }

            // Create array of all dates in the event
            const dates = []
            if (daysOnly) {
              for (const day of days) {
                dates.push(day.dateObject)
              }
            } else {
              for (const day of days) {
                for (const time of times) {
                  // Iterate through all the times
                  const date = getDateHoursOffset(
                    day.dateObject,
                    time.hoursOffset
                  )
                  dates.push(date)
                }
              }
            }

            // Create a map mapping time to the respondents available during that time
            const formatted = new Map()
            for (const date of dates) {
              formatted.set(date.getTime(), new Set())

              // Check every response and see if they are available for the given time
              for (const response of Object.values(parsedResponses)) {
                // Check availability array
                if (
                  response.availability?.has(date.getTime()) ||
                  (response.ifNeeded?.has(date.getTime()) && !hideIfNeeded)
                ) {
                  formatted.get(date.getTime()).add(response.user._id)
                  continue
                }
              }
            }
            return formatted
          },
          [
            this.allDays,
            this.times,
            this.parsedResponses,
            this.event.daysOnly,
            this.hideIfNeeded,
          ]
        )
        .then((formatted) => {
          // Only set responses formatted for the latest request
          if (lastFetched >= this.loadingResponses.lastFetched) {
            this.responsesFormatted = formatted
          }
        })
        .finally(() => {
          if (this.loadingResponses.lastFetched === lastFetched) {
            this.loadingResponses.loading = false
          }
        })
    },
    /** Returns a set of respondents for the given date/time */
    getRespondentsForHoursOffset(date, hoursOffset) {
      const d = getDateHoursOffset(date, hoursOffset)
      return this.responsesFormatted.get(d.getTime()) ?? new Set()
    },
    async refreshAuthUser() {
      this.hasRefreshedAuthUser = true
      await get("/user/profile").then((authUser) => {
        this.setAuthUser(authUser)
      })
    },
    /** resets cur user availability to the response stored on the server */
    resetCurUserAvailability() {
      if (this.event.type === eventTypes.GROUP) {
        this.initSharedCalendarAccounts()
        this.manualAvailability = {}
      }

      this.availability = new Set()
      this.ifNeeded = new Set()
      if (this.userHasResponded) {
        this.populateUserAvailability(this.authUser._id)
      }
    },
    /** Populates the availability set for the auth user from the responses object stored on the server */
    populateUserAvailability(id) {
      this.availability =
        new Set(this.parsedResponses[id]?.availability) ?? new Set()
      this.ifNeeded = new Set(this.parsedResponses[id]?.ifNeeded) ?? new Set()
      this.$nextTick(() => (this.unsavedChanges = false))
    },
    /** Returns a set containing the available times based on the given calendar events object */
    getAvailabilityFromCalendarEvents({
      calendarEventsByDay = [],
      includeTouchedAvailability = false, // Whether to include manual availability for touched days
      fetchedManualAvailability = {}, // Object mapping unix timestamp to array of manual availability (fetched from server)
      curManualAvailability = {}, // Manual availability with edits (takes precedence over fetchedManualAvailability)
      calendarOptions = calendarOptionsDefaults, // User id of the user we are getting availability for
    }) {
      const availability = new Set()

      for (let i = 0; i < this.allDays.length; ++i) {
        const day = this.allDays[i]
        const date = day.dateObject

        if (includeTouchedAvailability) {
          const endDate = getDateHoursOffset(
            date,
            this.times.length * (this.timeslotDuration / 60)
          )

          // Check if manual availability has been added for the current date
          let manualAvailabilityAdded = false

          for (const time in curManualAvailability) {
            if (date.getTime() <= time && time <= endDate.getTime()) {
              curManualAvailability[time].forEach((a) => {
                availability.add(new Date(a).getTime())
              })
              delete curManualAvailability[time]
              manualAvailabilityAdded = true
              break
            }
          }

          if (manualAvailabilityAdded) continue

          for (const time in fetchedManualAvailability) {
            if (date.getTime() <= time && time <= endDate.getTime()) {
              fetchedManualAvailability[time].forEach((a) => {
                availability.add(new Date(a).getTime())
              })
              delete fetchedManualAvailability[time]
              manualAvailabilityAdded = true
              break
            }
          }

          if (manualAvailabilityAdded) continue
        }

        // Calculate buffer time
        const bufferTimeInMS = calendarOptions.bufferTime.enabled
          ? calendarOptions.bufferTime.time * 1000 * 60
          : 0

        // Calculate working hours
        const startTimeString = timeNumToTimeString(
          calendarOptions.workingHours.startTime
        )
        const isoDateString = getISODateString(getDateWithTimezone(date), true)
        const workingHoursStartDate = dayjs
          .tz(`${isoDateString} ${startTimeString}`, this.curTimezone.value)
          .toDate()
        let duration =
          calendarOptions.workingHours.endTime -
          calendarOptions.workingHours.startTime
        if (duration <= 0) duration += 24
        const workingHoursEndDate = getDateHoursOffset(
          workingHoursStartDate,
          duration
        )

        for (let j = 0; j < this.times.length; ++j) {
          const startDate = this.getDateFromDayTimeIndex(i, j)
          if (!startDate) continue
          const endDate = getDateHoursOffset(
            startDate,
            this.timeslotDuration / 60
          )

          // Working hours
          if (calendarOptions.workingHours.enabled) {
            if (
              endDate.getTime() <= workingHoursStartDate.getTime() ||
              startDate.getTime() >= workingHoursEndDate.getTime()
            ) {
              continue
            }
          }

          // Check if there exists a calendar event that overlaps [startDate, endDate]
          const index = calendarEventsByDay[i]?.findIndex((e) => {
            const startDateBuffered = new Date(
              e.startDate.getTime() - bufferTimeInMS
            )
            const endDateBuffered = new Date(
              e.endDate.getTime() + bufferTimeInMS
            )

            const notIntersect =
              dateCompare(endDate, startDateBuffered) <= 0 ||
              dateCompare(startDate, endDateBuffered) >= 0
            return !notIntersect && !e.free
          })
          if (index === -1) {
            availability.add(startDate.getTime())
          }
        }
      }
      return availability
    },
    /** Constructs the availability array using calendarEvents array */
    setAvailabilityAutomatically() {
      // This is not a computed property because we should be able to change it manually from what it automatically fills in
      this.availability = new Set()
      const tmpAvailability = this.getAvailabilityFromCalendarEvents({
        calendarEventsByDay: this.calendarEventsByDay,
        calendarOptions: {
          bufferTime: this.bufferTime,
          workingHours: this.workingHours,
        },
      })

      const pageStartDate = getDateDayOffset(
        new Date(this.event.dates[0]),
        this.page * this.maxDaysPerPage
      )
      const pageEndDate = getDateDayOffset(pageStartDate, this.maxDaysPerPage)
      this.animateAvailability(tmpAvailability, pageStartDate, pageEndDate)
    },
    /** Animate the filling out of availability using setTimeout, between startDate and endDate */
    animateAvailability(availability, startDate, endDate) {
      this.availabilityAnimEnabled = true
      this.availabilityAnimTimeouts = []

      let msPerGroup = 25
      let blocksPerGroup = 2
      if (
        (availability.size / blocksPerGroup) * msPerGroup >
        this.maxAnimTime
      ) {
        blocksPerGroup = (availability.size * msPerGroup) / this.maxAnimTime
      }
      let availabilityArray = [...availability]
      availabilityArray = availabilityArray.filter((a) =>
        isDateBetween(a, startDate, endDate)
      )

      for (let i = 0; i < availabilityArray.length / blocksPerGroup + 1; ++i) {
        const timeout = setTimeout(() => {
          for (const a of availabilityArray.slice(
            i * blocksPerGroup,
            i * blocksPerGroup + blocksPerGroup
          )) {
            this.availability.add(a)
          }
          this.availability = new Set(this.availability)
          if (i >= availabilityArray.length / blocksPerGroup) {
            // Make sure the entire availability has been added (will not be guaranteed when only animating a portion of availability)
            this.availability = new Set(availability)
            this.availabilityAnimTimeouts.push(
              setTimeout(() => {
                this.availabilityAnimEnabled = false

                if (this.showSnackbar) {
                  this.showInfo("Your availability has been autofilled!")
                }
                this.unsavedChanges = false
              }, 500)
            )
          }
        }, i * msPerGroup)

        this.availabilityAnimTimeouts.push(timeout)
      }
    },
    stopAvailabilityAnim() {
      for (const timeout of this.availabilityAnimTimeouts) {
        clearTimeout(timeout)
      }
      this.availabilityAnimEnabled = false
    },
    async submitAvailability(guestPayload = { name: "", email: "" }) {
      let payload = {}

      let type = ""
      // If this is a group submit enabled calendars, otherwise submit availability
      if (this.isGroup) {
        type = "group availability and calendars"
        payload = generateEnabledCalendarsPayload(this.sharedCalendarAccounts)
        payload.manualAvailability = {}
        for (const day of Object.keys(this.manualAvailability)) {
          payload.manualAvailability[day] = [
            ...this.manualAvailability[day],
          ].map((a) => new Date(a))
        }
        payload.calendarOptions = {
          bufferTime: this.bufferTime,
          workingHours: this.workingHours,
        }
      } else {
        type = "availability"
        payload.availability = this.availabilityArray
        payload.ifNeeded = this.ifNeededArray
        if (this.authUser && !this.addingAvailabilityAsGuest) {
          payload.guest = false
        } else {
          payload.guest = true
          payload.name = guestPayload.name
          payload.email = guestPayload.email
          localStorage[this.guestNameKey] = guestPayload.name
        }
      }

      await post(`/events/${this.event._id}/response`, payload)

      // Update analytics
      const addedIfNeededTimes = this.ifNeededArray.length > 0
      if (this.authUser) {
        if (this.authUser._id in this.parsedResponses) {
          this.$posthog?.capture(`Edited ${type}`, {
            eventId: this.event._id,
            addedIfNeededTimes,
          })
        } else {
          this.$posthog?.capture(`Added ${type}`, {
            eventId: this.event._id,
            addedIfNeededTimes,
            // bufferTime: this.bufferTime,
            bufferTime: this.bufferTime.time,
            bufferTimeActive: this.bufferTime.enabled,
            workingHoursEnabled: this.workingHours.enabled,
            workingHoursStartTime: this.workingHours.startTime,
            workingHoursEndTime: this.workingHours.endTime,
          })
        }
      } else {
        if (guestPayload.name in this.parsedResponses) {
          this.$posthog?.capture(`Edited ${type} as guest`, {
            eventId: this.event._id,
            addedIfNeededTimes,
          })
        } else {
          this.$posthog?.capture(`Added ${type} as guest`, {
            eventId: this.event._id,
            addedIfNeededTimes,
          })
        }
      }

      this.refreshEvent()
      this.unsavedChanges = false
    },
    async deleteAvailability(name = "") {
      const payload = {}
      if (this.authUser && !this.addingAvailabilityAsGuest) {
        payload.guest = false
        payload.userId = this.authUser._id

        this.$posthog?.capture("Deleted availability", {
          eventId: this.event._id,
        })
      } else {
        payload.guest = true
        payload.name = name

        this.$posthog?.capture("Deleted availability as guest", {
          eventId: this.event._id,
          name,
        })
      }
      await _delete(`/events/${this.event._id}/response`, payload)
      this.availability = new Set()
      if (this.isGroup) this.$router.replace({ name: "home" })
      else this.refreshEvent()
    },
    /** Recalculate availability the calendar based on calendar events */
    reanimateAvailability() {
      if (
        this.state === this.states.EDIT_AVAILABILITY &&
        this.authUser &&
        !(this.authUser?._id in this.event.responses) && // User hasn't responded yet
        !this.loadingCalendarEvents &&
        (!this.unsavedChanges || this.availabilityAnimEnabled)
      ) {
        for (const timeout of this.availabilityAnimTimeouts) {
          clearTimeout(timeout)
        }
        this.setAvailabilityAutomatically()
      }
    },
  },
  watch: {
    availability() {
      if (this.state === this.states.EDIT_AVAILABILITY) {
        this.unsavedChanges = true
      }
    },
    calendarEventsByDay(val, oldVal) {
      if (JSON.stringify(val) !== JSON.stringify(oldVal)) {
        this.reanimateAvailability()
      }
    },
    hideIfNeeded() {
      this.getResponsesFormatted()
    },
    parsedResponses() {
      // Theoretically, parsed responses should only be changing for groups
      this.getResponsesFormatted()

      // Repopulate user availability when editing availability (this happens when switching weeks in a group)
      if (
        this.event.type === eventTypes.GROUP &&
        this.state === this.states.EDIT_AVAILABILITY &&
        this.authUser
      ) {
        this.availability = new Set()
        this.populateUserAvailability(this.authUser._id)
      }
    },
    bufferTime(cur, prev) {
      if (cur.enabled !== prev.enabled || cur.enabled) {
        this.reanimateAvailability()
      }
    },
    workingHours(cur, prev) {
      if (cur.enabled !== prev.enabled || cur.enabled) {
        this.reanimateAvailability()
      }
    },
  },
}
