# ADR-012: Frontend Timed Event Picked-Date Slot Model

Date: 2026-05-31

Status:

- Accepted

## Context

Timed events currently use two competing frontend models:

- ordinary timed events use selected dates plus one start or end window per day
- specific-times events use explicit slot instants

That split creates inconsistent behavior across creation, edit hydration, grid rendering, date summaries, and timezone changes. It also forces the frontend to switch between a continuous-window model and a slot-based model for the same class of timed scheduling behavior.

The product intent is to use one canonical model for all non-`daysOnly` timed events. Under that model:

- timed event availability is represented as slots
- timed specific-date membership is represented as picked dates
- advanced specific-times editing changes how slots are edited, not what kind of event is being stored

Within the frontend stack migration described in ADR-008, this is a scheduling-domain modeling problem rather than a local rendering bug. The frontend needs one explicit canonical model for all timed event semantics.

## Terminology

- `picked dates`: the canonical picked-date membership for timed specific-date events
- `enabled slots`: the canonical full slot domain for the picked dates
- `active slots`: the canonical subset of enabled slots that respondents can actually answer on
- `event timezone`: the persisted timezone used to interpret picked dates and generate enabled slots
- `display timezone`: the timezone used to render timed slots in the UI; this is controlled by the `Shown in` selector and does not change canonical event state
- `slot-generation settings`: the persisted timed-event settings used to generate enabled slots for picked dates or recurrence-owned timed instances
- `advanced slot editing`: the UI mode currently exposed by the specific-times toggle; this mode allows slot-level edits to active slots without changing the canonical persistence model

This ADR standardizes on `active slots` and does not use `respondable slots` as a primary term.
The canonical invariant is `active slots ⊆ enabled slots`.

## Decision

For all non-`daysOnly` timed events, the frontend treats timed-event state as a picked-date slot model.

- enabled slots are a first-class concept
- active slots are a separate first-class concept
- both concepts are canonical persisted instant-based concepts
- the event timezone is persisted explicitly and used for projection and batch-edit operations
- slot-generation settings are persisted explicitly and used to generate enabled slots for local-day additions or timed recurrence creation
- timed specific-date picked dates are persisted explicitly and used for date-picker selections, specific-times columns, and regeneration of the enabled slot domain
- display timezone only affects projection/rendering and does not change picked dates

For timed specific-date events, the date picker is a direct view of picked dates. Picking a date adds that date to membership and regenerates the full enabled slot domain for that date.

The specific-times toggle is an advanced editing affordance, not a different persisted event kind. By default, a timed event created from selected days and a start/end window persists a full generated slot window where `active slots = enabled slots`. Advanced slot editing allows the user to narrow `active slots` without changing the picked dates or full enabled domain.

`daysOnly` events remain outside this model and continue using date-only semantics.

## Rules

### Canonical timed-event state

- Do not treat `event.dates`, `timeSeed`, or `duration` as the canonical source of truth for timed-event rendering or editing.
- Do not let compatibility dates, seed datetimes, duration windows, and slot instants compete as parallel authorities for the same timed-event UI.
- Treat `timedRecurrence.selectedDays` as the canonical picked-date membership for timed specific-date events.
- Keep enabled slots and active slots as separate canonical concepts.
- Persist enabled slots and active slots separately for canonical timed-event state.
- Keep canonical timed-event state as picked dates plus instant-based slot sets, not mixed civil-date-plus-window reconstructions.

### Timezone semantics

- Persist an explicit event timezone for timed events as the authoring and projection timezone.
- Use IANA timezone identity as the long-term persisted timezone model for timed events.
- Treat fixed-offset-only timezone data as compatibility input when needed, not as the preferred long-term event-timezone model when a richer timezone identity is available.
- Keep picked dates stable as civil dates when the event timezone changes.
- Rebuild enabled slots from picked dates and slot-generation settings in the new event timezone.
- Filter active slots to the rebuilt enabled domain.
- A display-timezone change only changes projection in the UI. It does not change picked dates, enabled slots, or active slots.

### Slot-generation semantics

- Timed events must keep explicit slot-generation settings sufficient to generate enabled slots for picked dates or timed recurrence-owned instances without inferring from viewer-local rendering.
- Those settings must be interpreted in the event timezone.
- Batch-added enabled slots for a picked date must be generated from those explicit event settings, not from incidental current viewport state.
- A default timed event created from selected local days plus start/end time must generate the full slot set for the configured window and persist that generated set as both enabled slots and active slots unless advanced slot editing changes it later.

### Advanced slot editing semantics

- Advanced slot editing does not switch a timed event into a different persistence model.
- Advanced slot editing only exposes slot-level edits over the canonical enabled-slot and active-slot state.
- Enabling advanced slot editing does not itself alter enabled slots or active slots.
- Disabling advanced slot editing for a timed event collapses back to the default full-window behavior by restoring `active slots = enabled slots` for the current picked-date domain.

### Picked-date semantics

- For timed specific-date events, the date picker displays picked dates directly.
- Picking a date adds enabled slots for that picked date using the event timezone and the event's slot-generation settings.
- Unpicking a date removes that picked date and also removes any enabled or active slots on that date so the canonical subset invariant remains valid.
- Picking a date automatically initializes `active slots = enabled slots` for that date until advanced slot editing changes the subset.

### DOW and group timed-event semantics

- Weekly and group timed events also use the timed-slot model.
- Their enabled slots and active slots are persisted as instants just like specific-date timed events.
- Any recurrence-style creation or edit flow must use slot-generation settings to generate the relevant timed instances instead of relying on a separate canonical seed-plus-duration runtime model.

### Rendering and summary semantics

- Timed grids must derive rendered date columns for timed specific-date events from picked dates.
- Timed grids must derive rendered slot existence from enabled slots after projection into the display timezone.
- Timed grids must derive participant-selectable cells from active slots.
- When the grid already shows picked dates, duplicate date-summary UI should be hidden.
- Projection from instants to rendered local slots must stay centralized at scheduling boundaries instead of being rebuilt ad hoc in views or route-local helpers.

### Compatibility semantics

- Legacy timed payloads that only carry active timed instants may decode with `enabled slots = active slots` until richer enabled-slot data is available.
- Legacy `event.dates`, `timeSeed`, and duration-style timed data are compatibility inputs only and must not override canonical picked dates, enabled slots, or active slots once present.

## Consequences

- Timed events require explicit persisted timezone semantics instead of relying on timezone identity flattened into stored instants.
- Frontend transport and internal models will need to distinguish enabled slots from active slots and persist both concepts explicitly.
- Existing ordinary timed-event `dates + duration` behavior is retired as canonical state.
- Existing `dates` and `timeSeed` behavior for timed events should be treated as compatibility-only during migration, not as the long-term canonical model.
- The specific-times toggle becomes a UI and editing concern rather than a persistence-model boundary.
- Edit hydration, date summaries, and grid rendering for all timed event types will need to stop reading competing date authorities for the same timed event.
- Timed events will need explicit slot-generation settings for date-picker batch-add behavior and recurrence-owned timed generation.
- Regression tests should lock instant-preserving timezone changes and enabled-slot versus active-slot behavior before broader refactors proceed.

## Required Acceptance Scenarios

- Creating a normal timed event with selected days and a start/end window generates full-window enabled slots and matching active slots.
- Enabling advanced slot editing does not change the persistence model; it only enables slot-level edits.
- Disabling advanced slot editing restores `active slots = enabled slots` for the current enabled domain.
- Changing only the display timezone can shift where active cells appear within a picked-date column without changing the picked date.
- Adding a date in the picker adds that picked date's full enabled slot domain and matching active slots.
- Removing a date removes its enabled slots and any active slots on that picked date.
- Changing the event timezone preserves picked dates, regenerates the enabled slot domain for those dates, and filters active slots to the rebuilt enabled domain.
- Cross-midnight enabled domains render the correct clipped slots for each picked date after display-timezone changes.
- DST gap and overlap days generate the correct enabled slots in the event timezone.
- DOW and group timed events derive displayed days and timed grids from the same slot-based state as timed specific-date events.
- Legacy timed payloads without separate enabled-slot data decode with `enabled slots = active slots` until migrated data is available.
- The main event header, timed grids, and edit dialog all derive from the same canonical timed-event state.
- `daysOnly` events remain outside this model and continue using date-only semantics.
