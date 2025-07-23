// Urls
export const serverURL =
  process.env.NODE_ENV === "development" ? "http://localhost:3002/api" : "/api"

// Errors enum
export const errors = Object.freeze({
  JsonError: "json-error",
  NotSignedIn: "not-signed-in",
  UserDoesNotExist: "user-does-not-exist",
  EventNotFound: "event-not-found",
  InvalidCredentials: "invalid-credentials",
})

// Auth types
export const authTypes = Object.freeze({
  EVENT_ADD_AVAILABILITY: "event-add-availability", // Autofill with google calendar
  EVENT_SIGN_IN_LINK_APPLE: "event-sign-in-link-apple", // Sign in to link apple calendar
  EVENT_SIGN_IN: "event-sign-in", // Top right sign in button on event page
  EVENT_CONTACTS: "event-contacts", // Enable contacts
  GROUP_ADD_AVAILABILITY: "group-add-availability",
  GROUP_SIGN_IN: "group-sign-in",
  GROUP_CREATE: "group-create",
  ADD_CALENDAR_ACCOUNT: "add-calendar-account",
  ADD_CALENDAR_ACCOUNT_FROM_EDIT: "add-calendar-account-from-edit",
})

export const eventTypes = Object.freeze({
  SPECIFIC_DATES: "specific_dates",
  DOW: "dow",
  GROUP: "group",
})

export const availabilityTypes = Object.freeze({
  AVAILABLE: "available",
  IF_NEEDED: "if_needed",
})

export const timeTypes = Object.freeze({
  HOUR12: "12-hour",
  HOUR24: "24-hour",
})

export const calendarTypes = Object.freeze({
  GOOGLE: "google",
  APPLE: "apple",
  OUTLOOK: "outlook",
})

export const upgradeDialogTypes = Object.freeze({
  CREATE_EVENT: "create-event",
  SCHEDULE_EVENT: "schedule-event",
  UPGRADE_MANUALLY: "upgrade-manually",
})

export const timeslotDurations = Object.freeze({
  FIFTEEN_MINUTES: 15,
  THIRTY_MINUTES: 30,
  ONE_HOUR: 60,
})

export const calendarOptionsDefaults = Object.freeze({
  bufferTime: {
    enabled: false,
    time: 15,
  },
  workingHours: {
    enabled: false,
    startTime: 9,
    endTime: 17,
  },
})

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

export const folderColors = Object.freeze([
  "#FFB3B3", // Pastel Red
  "#FFCCB3", // Pastel Orange
  "#FFFFB3", // Pastel Yellow
  "#CDEBDC", // Pastel Green
  "#B3B3FF", // Pastel Blue
  "#D1B3FF", // Pastel Purple
  "#D3D3D3", // Pastel Gray
])

export const allTimezones = Object.freeze({
  "Pacific/Midway": "Midway Island, Samoa",
  "Pacific/Honolulu": "Hawaii",
  "America/Juneau": "Alaska",
  "America/Boise": "Mountain Time",
  "America/Dawson": "Dawson, Yukon",
  "America/Chihuahua": "Chihuahua, La Paz, Mazatlan",
  "America/Phoenix": "Arizona",
  "America/Chicago": "Central Time",
  "America/Regina": "Saskatchewan",
  "America/Mexico_City": "Guadalajara, Mexico City, Monterrey",
  "America/Belize": "Central America",
  "America/New_York": "Eastern Time",
  "America/Bogota": "Bogota, Lima, Quito",
  "America/Caracas": "Caracas, La Paz",
  "America/Santiago": "Santiago",
  "America/St_Johns": "Newfoundland and Labrador",
  "America/Sao_Paulo": "Brasilia",
  "America/Tijuana": "Tijuana",
  "America/Montevideo": "Montevideo",
  "America/Argentina/Buenos_Aires": "Buenos Aires, Georgetown",
  "America/Godthab": "Greenland",
  "America/Los_Angeles": "Pacific Time",
  "Atlantic/Azores": "Azores",
  "Atlantic/Cape_Verde": "Cape Verde Islands",
  GMT: "UTC",
  "Europe/London": "Edinburgh, London",
  "Europe/Dublin": "Dublin",
  "Europe/Lisbon": "Lisbon",
  "Africa/Casablanca": "Casablanca, Monrovia",
  "Atlantic/Canary": "Canary Islands",
  "Europe/Belgrade": "Belgrade, Bratislava, Budapest, Ljubljana, Prague",
  "Europe/Sarajevo": "Sarajevo, Skopje, Warsaw, Zagreb",
  "Europe/Brussels": "Brussels, Copenhagen, Madrid, Paris",
  "Europe/Amsterdam": "Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna",
  "Africa/Algiers": "West Central Africa",
  "Europe/Bucharest": "Bucharest",
  "Africa/Cairo": "Cairo",
  "Europe/Helsinki": "Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius",
  "Europe/Athens": "Athens",
  "Asia/Jerusalem": "Jerusalem",
  "Africa/Harare": "Harare, Pretoria",
  "Europe/Moscow": "Istanbul, Minsk, Moscow, St. Petersburg, Volgograd",
  "Asia/Kuwait": "Kuwait, Riyadh",
  "Africa/Nairobi": "Nairobi",
  "Asia/Baghdad": "Baghdad",
  "Asia/Tehran": "Tehran",
  "Asia/Dubai": "Abu Dhabi, Muscat",
  "Asia/Baku": "Baku, Tbilisi, Yerevan",
  "Asia/Kabul": "Kabul",
  "Asia/Yekaterinburg": "Ekaterinburg",
  "Asia/Karachi": "Islamabad, Karachi, Tashkent",
  "Asia/Kolkata": "Chennai, Kolkata, Mumbai, New Delhi",
  "Asia/Kathmandu": "Kathmandu",
  "Asia/Dhaka": "Astana, Dhaka",
  "Asia/Colombo": "Sri Jayawardenepura",
  "Asia/Almaty": "Almaty, Novosibirsk",
  "Asia/Rangoon": "Yangon Rangoon",
  "Asia/Bangkok": "Bangkok, Hanoi, Jakarta",
  "Asia/Krasnoyarsk": "Krasnoyarsk",
  "Asia/Shanghai": "Beijing, Chongqing, Hong Kong SAR, Urumqi",
  "Asia/Kuala_Lumpur": "Kuala Lumpur, Singapore",
  "Asia/Taipei": "Taipei",
  "Australia/Perth": "Perth",
  "Asia/Irkutsk": "Irkutsk, Ulaanbaatar",
  "Asia/Seoul": "Seoul",
  "Asia/Tokyo": "Osaka, Sapporo, Tokyo",
  "Asia/Yakutsk": "Yakutsk",
  "Australia/Darwin": "Darwin",
  "Australia/Adelaide": "Adelaide",
  "Australia/Sydney": "Canberra, Melbourne, Sydney",
  "Australia/Brisbane": "Brisbane",
  "Australia/Hobart": "Hobart",
  "Asia/Vladivostok": "Vladivostok",
  "Pacific/Guam": "Guam, Port Moresby",
  "Asia/Magadan": "Magadan, Solomon Islands, New Caledonia",
  "Asia/Kamchatka": "Kamchatka, Marshall Islands",
  "Pacific/Fiji": "Fiji Islands",
  "Pacific/Auckland": "Auckland, Wellington",
  "Pacific/Tongatapu": "Nuku'alofa",
})

export const guestUserId = "000000000000000000000000"

export const numFreeEvents = 3
