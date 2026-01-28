# Plugin API Documentation

This document describes the plugin API for interacting with Timeful events. Plugins can retrieve and update user availability through `get-slots` and `set-slots` methods.

## Overview

Plugins communicate with the Timeful frontend via `window.postMessage`. The frontend validates incoming messages and routes them to the appropriate handler method. Responses are sent back using the same mechanism.

## Message Handler

The `handleMessage` method validates incoming messages and routes them to the appropriate handler:

- Messages with `payload.type === "get-slots"` are routed to `getSlots()`
- Messages with `payload.type === "set-slots"` are routed to `setSlots()`

## Request Format

All plugin API requests must follow this format:

```javascript
window.postMessage({
  type: "FILL_CALENDAR_EVENT",
  requestId: "unique-request-id",  // Used to match requests with responses
  payload: {
    type: "get-slots" | "set-slots",
    // ... additional payload fields (see below)
  }
}, "*")
```

## get-slots

### Description

Retrieves availability slots for all respondents to an event. Returns slots in the user's local timezone by default, with the ability to optionally specify timezone.

### Request Format

```javascript
{
  type: "FILL_CALENDAR_EVENT",
  requestId: "get-slots-123",
  payload: {
    type: "get-slots",
    timezone: "GMT" // Optional: IANA timezone name
  }
}
```

**Optional payload fields:**
- `timezone`: IANA timezone name (e.g., `"America/Los_Angeles"`, `"Asia/Kolkata"`). If not provided, uses `localStorage["timezone"].value` or browser's local timezone.

### Response Format

**Success response:**
```javascript
{
  type: "FILL_CALENDAR_EVENT_RESPONSE",
  command: "get-slots",
  requestId: "get-slots-123",
  ok: true,
  payload: {
    slots: {
      "userId1": {
        name: "John Doe",
        email: "john@example.com",
        availability: ["2026-01-07T09:00:00", "2026-01-07T09:15:00", ...],
        ifNeeded: ["2026-01-07T14:00:00", ...]
      },
      "guestName": {
        name: "guestName",  // Guest name as stored in localStorage
        email: "",  // May be empty for guests
        availability: [...],
        ifNeeded: [...]
      }
    },
    timeIncrement: 15  // Time increment in minutes (15, 30, or 60)
  }
}
```

**Error response:**
```javascript
{
  type: "FILL_CALENDAR_EVENT_RESPONSE",
  command: "get-slots",
  requestId: "get-slots-123",
  ok: false,
  error: {
    message: "Error message here"
  }
}
```

### Example Request

```javascript
window.postMessage({
  type: "FILL_CALENDAR_EVENT",
  requestId: "test-get-slots-" + Date.now(),
  payload: {
    type: "get-slots"
  }
}, "*")
```

### Timezone Conversion

- Slots are stored in UTC in the backend
- `get-slots` converts UTC timestamps to the user's local timezone before returning
- Timezone is determined by (in priority order):
  1. `localStorage["timezone"].value` (if set)
  2. Browser's local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Returned timestamps are in ISO format without timezone (e.g., `"2026-01-07T09:00:00"`)

## set-slots

### Description

Sets availability slots for the current user (logged-in user or guest). Converts timestamps from the user's timezone to UTC before storing in the backend. **Completely overwrites** existing availability (does not merge with previous slots).

### Request Format

```javascript
{
  type: "FILL_CALENDAR_EVENT",
  requestId: "set-slots-123",
  payload: {
    type: "set-slots",
    timezone: "America/Los_Angeles",  // Optional: IANA timezone name
    guestName: "John Doe",  // Required for guests if not in localStorage
    guestEmail: "john@example.com",  // Required if event.collectEmails is true
    slots: [
      {
        start: "2026-01-07T09:00:00",  // ISO format without timezone
        end: "2026-01-07T12:00:00",
        status: "available" | "if-needed"
      },
      {
        start: "2026-01-07T14:00:00",
        end: "2026-01-07T16:00:00",
        status: "if-needed"
      }
    ]
  }
}
```

**Required payload fields:**
- `slots`: Array of slot objects, each with:
  - `start`: Start time (ISO string without timezone)
  - `end`: End time (ISO string without timezone)
  - `status`: Either `"available"` or `"if-needed"`

**Conditionally required payload fields:**
- `guestName`: 
  - If provided, **forces guest mode** regardless of whether the user is logged in or not. This allows logged-in users to set availability for guests.
  - Required for guests who aren't logged in and haven't set their name through the UI.
  - When provided, it will be stored in `localStorage[eventId + ".guestName"]` for future calls.
  - Can be used to edit an existing guest's availability (if that guest name already exists) or add a new guest (if it doesn't exist).
- `guestEmail`: Required if `event.collectEmails` is `true` and `guestName` is provided in the payload. Must be a valid email format.

**Optional payload fields:**
- `timezone`: IANA timezone name (e.g., `"America/Los_Angeles"`, `"Asia/Kolkata"`). If not provided, uses `localStorage["timezone"].value` or browser's local timezone.

### Response Format

**Success response:**
```javascript
{
  type: "FILL_CALENDAR_EVENT_RESPONSE",
  command: "set-slots",
  requestId: "set-slots-123",
  ok: true
}
```

**Error response:**
```javascript
{
  type: "FILL_CALENDAR_EVENT_RESPONSE",
  command: "set-slots",
  requestId: "set-slots-123",
  ok: false,
  error: {
    message: "Error message here"
  }
}
```

### Example Request

**Basic request (logged-in user or guest with name in localStorage):**
```javascript
window.postMessage({
  type: "FILL_CALENDAR_EVENT",
  requestId: "test-set-slots-" + Date.now(),
  payload: {
    type: "set-slots",
    timezone: "Asia/Kolkata",  // IST
    slots: [
      {
        start: "2026-01-07T09:00:00",
        end: "2026-01-07T12:00:00",
        status: "available"
      },
      {
        start: "2026-01-07T12:00:00",
        end: "2026-01-07T16:00:00",
        status: "if-needed"
      }
    ]
  }
}, "*")
```

**Request with guestName (forces guest mode, works even if logged in):**
```javascript
window.postMessage({
  type: "FILL_CALENDAR_EVENT",
  requestId: "test-set-slots-" + Date.now(),
  payload: {
    type: "set-slots",
    timezone: "Asia/Kolkata",
    guestName: "John Doe",  // Forces guest mode, can edit existing guest or add new one
    guestEmail: "john@example.com",  // Required if event.collectEmails is true
    slots: [
      {
        start: "2026-01-07T09:00:00",
        end: "2026-01-07T12:00:00",
        status: "available"
      }
    ]
  }
}, "*")
```

### Timezone Conversion

- Input timestamps are assumed to be in the specified timezone (or user's local timezone if not specified)
- `set-slots` converts these timestamps to UTC before sending to the backend
- **Timezone precedence order:**
  1. `payload.timezone` (if provided in the request) - **highest priority**
  2. `localStorage["timezone"].value` (if set)
  3. Browser's local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) - **fallback**

### Interval Splitting

- Each `start`-`end` interval in the `slots` array is automatically split into smaller segments based on the event's `timeIncrement` (15, 30, or 60 minutes)
- For example, if `timeIncrement` is 15 minutes and you provide `{ start: "2026-01-07T09:00:00", end: "2026-01-07T10:00:00", status: "available" }`, this will generate timestamps at: 09:00, 09:15, 09:30, 09:45 (the end time is exclusive)
- The generated timestamps are what get sent to the backend

### Overlapping Intervals

- If you provide overlapping intervals in the `slots` array with the **same status**, all timestamps from all intervals will be included
- For example, if you provide:
  - `{ start: "09:00", end: "10:00", status: "available" }`
  - `{ start: "09:30", end: "10:30", status: "available" }`
- Both intervals will add their timestamps, resulting in: 09:00, 09:15, 09:30, 09:45, 10:00, 10:15 (assuming 15-minute increments)
- **Important:** If overlapping intervals have **different statuses**, an error will be thrown. For example:
  - `{ start: "09:00", end: "10:00", status: "available" }`
  - `{ start: "09:30", end: "10:30", status: "if-needed" }`
- This will result in an error: `"Conflicting status for timestamp [timestamp]: already marked as 'available' but also marked as 'if-needed'. Overlapping intervals must have the same status."`
- 

### DOW (Days of Week) Events

For events with type `"dow"` (days of week), you **must** use specific hardcoded dates for the date part of your timestamps:

```javascript
export const dayIndexToDayString = Object.freeze([
  "2018-06-17", // Sunday
  "2018-06-18", // Monday
  "2018-06-19", // Tuesday
  "2018-06-20", // Wednesday
  "2018-06-21", // Thursday
  "2018-06-22", // Friday
  "2018-06-23", // Saturday
  "2018-06-24", // Sunday
])
```

**Example:** If you want to set availability for Monday from 9:00 AM to 12:00 PM, you must use:
```javascript
{
  start: "2018-06-18T09:00:00",  // Monday
  end: "2018-06-18T12:00:00",
  status: "available"
}
```

The date part (`2018-06-18`) represents Monday, regardless of what the actual current date is. The time part is what matters for scheduling.

### Non-Consecutive Event Dates

- If an event has non-consecutive dates (e.g., Jan 5th and Jan 7th, but not Jan 6th), and you provide a slot that spans across them (e.g., 8pm Jan 5th to 8pm Jan 7th):
  - The slot will **not** include timestamps for the invalid dates (Jan 6th)
  - Timestamps will be generated up to the end of the first valid date (Jan 5th)
  - Timestamps will resume at the start of the next valid date (Jan 7th)
  - Only timestamps that fall within valid event dates and time ranges are included
  - **No error will be thrown** - the system automatically filters out invalid dates

### Validation

- Validates that all slots fall within the event's date/time range
- Validates that `start` < `end` for each slot
- Validates that `status` is either `"available"` or `"if-needed"`
- **Overlapping intervals with different statuses**: If overlapping intervals have conflicting statuses (one "available", one "if-needed"), an error will be thrown: `"Conflicting status for timestamp [timestamp]: already marked as '[status1]' but also marked as '[status2]'. Overlapping intervals must have the same status."`
- For **DOW (days of week) events**: Validates that the date part of `start` and `end` timestamps match one of the hardcoded day dates listed above
- For **guests**: 
  - If `guestName` is provided in payload, it forces guest mode and stores the name in localStorage
  - If `guestName` is not provided, validates that guest name exists in localStorage or requires it from payload
- For **guests with email collection**: Validates that `guestEmail` is provided (when `guestName` is in payload) and is a valid email format
- Returns appropriate error messages if validation fails

### Limitations

- **Group events are not supported** - returns an error if the event type is GROUP
- **Guest mode via payload** - If you provide `guestName` in the payload, the request will be processed as a guest regardless of whether you're logged in. This allows logged-in users to set availability for any guest (existing or new).
- **Guest name required** - For guests who haven't logged in and haven't provided `guestName` in the payload, the guest name must either:
  - Already exist in `localStorage[eventId + ".guestName"]` (set through the UI), OR
  - Be provided in the `guestName` field of the payload
- **Complete overwrite** - The slots you send in **completely clear out** any old slots and write these new ones in. This is not a merge operation.


## Testing

Use the browser console to test (don't forget to add listeners to intercept error/success messages):

**Get slots:**
```javascript
// Add listener first
window.addEventListener("message", (e) => {
  if (e.data?.type === "FILL_CALENDAR_EVENT_RESPONSE" && e.data?.command === "get-slots") {
    if (e.data.ok) {
      console.log("Success:", e.data.payload)
    } else {
      console.error("Error:", e.data.error)
    }
  }
})

// Then send request
window.postMessage({
  type: "FILL_CALENDAR_EVENT",
  requestId: "test-" + Date.now(),
  payload: { type: "get-slots" }
}, "*")
```

**Set slots:**
```javascript
// Add listener first
window.addEventListener("message", (e) => {
  if (e.data?.type === "FILL_CALENDAR_EVENT_RESPONSE" && e.data?.command === "set-slots") {
    if (e.data.ok) {
      console.log("Success: Slots updated")
    } else {
      console.error("Error:", e.data.error)
    }
  }
})

// Then send request
window.postMessage({
  type: "FILL_CALENDAR_EVENT",
  requestId: "test-" + Date.now(),
  payload: {
    type: "set-slots",
    timezone: "Asia/Kolkata",
    guestName: "Test User",  // Optional: forces guest mode if provided (works even if logged in)
    slots: [
      { start: "2026-01-07T09:00:00", end: "2026-01-07T12:00:00", status: "available" }
    ]
  }
}, "*")
```

