# Inbox

Semi-structured TODO list

- [ ] Don't mention "legacy" in the code
- [ ] Add adr about using vue 3 and vuetify
- [ ] Speed up eslint and reduce memory consumption from 11GB
- [ ] remove `as unknown as`
- [ ] add eslint rule for `as unknown`
- [ ] is `$el` idiomatic modern syntax?
- [ ] add playwright e2e tests from comparator inside timeful.app repo
- [ ] commit comparator code to timeful.app until it works as expected
- [ ] Check against composition API
- [ ] Use the right palette consistently for dropdowns, selects, buttons, switches
- [ ] use clean layout-based fixes
- [ ] avoid !important
- [ ] make a design system
- [x] use `.env.example` instead of `.env.template`
  - We use `.env.development.example` and `.env.production.example`
- [ ] why is the button not blocked when none of the dates is selected
- [ ] doesn't show time on hover after clicking and moving the cursor - <http://127.0.0.1:4173/e/dEeaF>
- [ ] In Firefox, when not editing, after I click inside the grid, then release, then move cursor within the grid, the selection doesn't follow like it does if I don't click first and just move the cursor within the grid. Why so?
- [x] multi-day <http://127.0.0.1:4173/e/5Ef6f>
- [x] Let's nest all toggles under Options dropdown and make it open by default
  - Show best times is always visible, other can be opened via Options
- [ ] refactoring - get rid of duplication
- [x] overlay availabilities - each slot has a solid frame <https://timeful.app/e/c762cA>
- [x] there should be a space between grids for non-consecutive days
- [ ] add more instrumentation?
- [x] edit event button is missing
- [x] shown in should be the same size as the timezone and black
- [x] the description text should be at the same vertical position when not editing and when editing
- [ ] don't modify vuetify internals (deep)
- [x] replace the Create event button on the main page with the actual form
  - No, there's additional useful info about the app on the main page
- [ ] load all routes lazily
- [x] on the event page, near "shown in", the underline colors for the timezone and time should be the same
- [x] move adr to the repo root
  - No, keep adr for frontend inside frontend
- [ ] adr - add README that explains the ADR format
  - [ ] Add "Scope" - frontend, backend?
- [ ] adr - backend handles only particular paths for initial HTML with essential metadata
  - [ ] Scope: frontend, backend
- [ ] use the same node for frontend in dockerfile and in dev
- [ ] move hardcoded values to env vars in compose
- [ ] rename PR to Modernize the project
  - [ ] Frontend - migrate
  - [ ] Backend - reduce the responsibilities w.r.t serving static assets
  - [ ] Infra - harden dockerfiles, use a single env file for each environment
- [ ] Check whether NODE_ENV and GIN_MODE are in the example .env files
- [ ] introduce staging environment
- [ ] make more functions for business logic pure
- [x] use full "development" instead of "dev" and "production" instead of "prod"
- [ ] Get rid of eslint-disable-*
  - [ ] `eslint-disable vue/one-component-per-file`
- [x] Can't save time for the first time
- [ ] When editing the event, shouldn't be able to edit personal time (the button shouldn't be visible)
- [x] In create event -> advanced options, "Timezone" should be black
- [x] Show full grid by default
  - It's collapsed by default
- [x] add option to collapse unused hours (not hide)
- [x] make each collapsed hours uncollapsible
- [x] mobile version - switching between 3 days and 7 days doesn't work
  - Works now
- [ ] event creator can edit other's availabilities (less probability that both guest event creator and guest clear both cookies and localstorage)?
- [x] Add availability only over the responses section so that it can scroll
  - Moved to the header
- [x] When viewing an event, when clicking, dragging the box pointer in the red area, then unclicking, the box disappears
- [ ] When the guest adds availability several times, there should be several records in localstorage
- [ ] optional password for restoring. edit own responses and open for editing, can click the lock button to enter password and edit others' responses
- [ ] edit button always visible
- [ ] add description if initial event description is empty
- [ ] when user clicks edit availability, they should see a drop-down list of all respondents whose availability they can change. own availabilities first, open for editing next, people with password last
- [ ] Enforce that the user name is always non-empty

      The core of this is a functional requirement:

      - which guest names are accepted or rejected
      - how respondent names are normalized
      - what data the API returns
      - how duplicates and legacy rows are handled

      It has some non-functional aspects:

      - data quality and consistency
      - robustness against malformed input
      - maintainability of one canonical contract
- [x] in a collapsed section, upper line overlaps the original line but the lower line doesn't
  
- [x] use the same colors for all grid lines
- [x] the selection box is almost invisible
  - Now it's hatched
- [ ] the selection box overlaps vertical lines on the left at the border of a grid of subsequent dates
- [x] use the same frequency of dashes for the selection box and the grid separator at half an hour
  - we use solid selection box
- [x] when I click somewhere, the drop-down list in edit availability doesn't disappear
- [ ] when I click somewhere in the red zone, the edit availability doesn't blink
- [x] let's collapse hours when they're at the start or at the end too. These hours are useless anyway
- [ ] the grid lines should be black, not grey
- [x] Check +3:30 and +5:45
- [ ] 404 isn't centered vertically on a non-existing event page
- [ ] do we need split-gap
- [ ] add instructions for the agent to write scripts for the browser and edit it instead of inline scripts
- [x] common grey zones at the start of the day and at the end of the day must be invisible, not collapsed
- [ ] which replaced tests should be restored and adjusted?
- [ ] added days in edit event but they're not available for editing specific times
- [x] when editing event, the week day every letter looks the same as the day of month
- [x] create event with specific availability in +2, 0-4 (day 1), 0-4 (day 2). When opened in 0:00, should see the previous date
- [x] box cursor doesn't follow the mouse in the specific times grid
- [x] no Options when there are no responses
  - now there's an option to show all hours
- [ ] get rid of the comparator, leave just inspect and update docs
- [x] disallow editing past dates
  - Not disallowing because it's a feature
- [ ] after scrolling the grid, the circle inside the toggle is misaligned vertically, the No responses yet also changes the position
- [ ] options should be over responses
- [x] after adding availability, the selected segments are dark green
- [ ] specify how the color at overlapping slots is calculated
- [x] Move "Copy link" closer to the event title
- [ ] there's no time when all 8 respondents are available should be over responses
- [ ] when I move the mouse cursor out of the grid, the responses still show who's available and unavailable at specific time
- [x] too drastic width change at page width breakpoints (1/3 of the screen)
- [x] Make edit event a button with a pencil icon
- [x] When no responses, show only add availability and show all hours
- [ ] event Dates, edit event at the same height as best times, more options
- [x] show pencils
- [ ] When scrolled, then clicked edit event, the header moves higher (timeful, create an event, etc.)
- [ ] Add concurrency control (two people edit the event simultaneously)
- [ ] Disallow saving empty availability set
- [x] When one response, doesn't show best times
- [ ] Create an event with specific times for dates May 30, 31, mark hours 0-4 for both dates, edit event, set dates for 28, 29, click next. See May 28, 30, 31 in specific times page, and May 30, 31 on the event page.
- [ ] Mark dates for only one day in specific times, save, edit again and see only one day
- [ ] Create an event for may 28 with availability from 0 to 4 and timezone +02:00. If you open the date picker in +0:00, should you see two days marked in the date picker?
- [x] There's no source of truth for dates for specific times and event
  - Added ADR-012
- [x] do we have recurring events?
      Yes — it uses a custom TimedRecurrence model with two kinds: specific_dates (explicit date list) and weekly (day-of-week pattern). No iCalendar RRULE support.
- [x] In the new event form, in Advanced options, The Timezone text isn't aligned horizontally with "Time increment"
      The styling differs too
- [x] On the event page without responses, there should be only Add availability and Show all hours, not very wide Add availability and More options

      "Show all hours" should be under "Add availability", as before.
      The toggle and "Show all hours" text should be centered vertically within their box
- [x] Create event with 9 - 17, timezone +9 (<http://127.0.0.1:4173/e/ee4Cb>), june 11 and 12.
      Expected: june 10 and 11 are shown on the event page
      Actual: june 11, 12, 13 are shown there
- [x] Spacing between lines is different when editing and viewing event description
- [x] Shown in shouldn't affect the time zone
- [x] Availability not rendered at <http://127.0.0.1:4173/e/Eb67A>
- [x] <http://127.0.0.1:4173/e/Eb67A> shown in GMT -7 shows blank grey columns
- [x] <http://127.0.0.1:4173/e/Eb67A> doesn't show the bottom separator
- [x] When there are no responses, Add availability and show all hours are too wide
- [ ] When adding availability, cancel and save should be aligned to the right
- [ ] Who are the group respondents?
- [ ] Make available/If needed on mobile higher to cover the "Adding availability" text
- [ ] Remove magic constants in CSS
- [x] in What days might work, when sun and mon are selected, when enabling start on monday, both mon and sun must be selected
- [ ] what is group (NewGroup.vue)?
- [ ] Handle narrow mobile screens (e.g. iPhone 17)
- [ ] "Editing availability as" shouldn't be in italic
- [ ] Collapse hours when editing response availability
- [ ] Mismatch between event page and specific times <http://127.0.0.1:4173/e/Eb67A>
- [ ] When creating event with specific times and setting timezone, on the specific times page, the timezone should be set to the one specified in the event (during creation). For a user, shown in should be the same on the event page and specific times page
- [ ] Lost slots on the specific times page when selected all slots at +7, then switched to +6
- [ ] <http://127.0.0.1:4173/e/EE2Fc> When editing event specific times, when "shown in" is +7, all slots for jun 15 are selected. When it's set to +6, jun 14 is duplicated and jun 15 is missing and there's a gap between jun 14 and jun 14.
- [ ] When I set specific times  0-4 on jun 14 and jun 16 when shown in is +5, then switch to +3,
      jun 15 doesn't appear although it should take some timeslots from jun 16
- [ ] what is the source of truth for enabled slots?
  - date picker may show dates that aren't shown when setting specific times.
    specific times editor should show these dates even if there are no enabled slots at these dates.
- [ ] Make a demo screenshot of <http://127.0.0.1:4173/e/6df78>
- [ ] At <http://127.0.0.1:4173/e/6df78>, when I hover over Maya Patel, I see if needed (yellow) for jun 20, 13:45-14:30 but it's available (green) when I edit her availability.
- [ ] When scrolling shown in timezones, the drop-down list gets narrow or wide depending on the width of the content.
- [ ] On the specific times page <http://127.0.0.1:4173/e/Eb67A>, when I switch timezone from +5 to +6, the left-most upper-most enabled slot should become disabled
- [ ] On the specific times page <http://127.0.0.1:4173/e/Eb67A>, when I switch timezone from +5 to +4 and on june 14, 0-4 are selected, jun 13 should appear

## MUST

- [ ] Event can be edited only by the creator. The description too
- [ ] event in +3, edit specific times in +9, some time slots are lost
- [ ] event in +3,

## COULD

- [ ] anon identity to save preferences, maybe sign in by password
