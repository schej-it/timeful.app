# ADR-011: Frontend Guest Response Ownership Semantics

Date: 2026-05-26

Status:

- Accepted

## Context

Within the frontend migration baseline described in ADR-008, guest response editing has a separate ownership model from signed-in user responses:

- signed-in users are identified by durable account IDs
- guest responses may be legacy name-keyed rows or token-backed rows with opaque guest credentials
- the frontend needs to decide which guest row is "yours" without introducing a signed-in account requirement
- the backend can authorize guest mutations only from data the client sends back on fetch and mutation paths

That creates a concrete product and architecture decision surface:

- the migrated frontend needs one canonical way to persist and reuse guest ownership state across event loads
- edit affordances must match backend mutation rules instead of treating all guest rows as interchangeable
- clearing browser-local state can remove a guest's ability to prove ownership even when the response still exists on the event

This is not just a one-off respondents-list bug. It is a frontend ownership and UX contract that affects event loading, guest editing, deletion, rename flows, and how the UI explains editability.

## Decision

The frontend keeps one shared guest-response ownership model:

- guest ownership for the current browser is represented by browser-local state, not by a signed-in account
- token-backed guest ownership uses opaque backend-issued credentials: `guestId` plus `guestEditToken`
- legacy guest ownership falls back to the stored guest display name when no token-backed identity exists
- guest-aware fetch and mutation paths reuse the stored guest identity through existing query semantics: `guestId` first, `guestName` second
- frontend edit affordances must mirror backend authorization semantics for legacy, token-backed protected, and token-backed open guest rows

This ADR does not introduce a new recovery system for guest ownership. It defines the accepted semantics of the current browser-local ownership model.

## Rules

### Canonical guest ownership state

- Shared guest ownership state belongs in the schedule-overlap guest-storage boundary, not in individual views or components.
- The canonical current-browser guest identity is the stored opaque `guestId` when present.
- If no stored `guestId` exists, the canonical fallback identity is the stored guest display name.
- Components and composables should consume shared guest ownership helpers instead of rebuilding guest lookup logic locally.

### Fetch and mutation semantics

- Guest-aware event and response fetches should send `guestId` when token-backed ownership exists.
- Guest-aware event and response fetches should send `guestName` only as the legacy fallback when no token-backed identity exists.
- Guest mutation requests should preserve the distinction between the caller's guest identity and the target guest row being edited.
- Frontend editability helpers must match backend authorization:
  - legacy guest rows are editable only by the matching stored guest identity
  - token-backed `protected` rows are editable only by the owning guest token
  - token-backed `open` rows remain guest-editable by other guests

### UX semantics

- The UI may describe a row as editable only when the current browser can actually satisfy the backend ownership rules for that row.
- The UI must not imply that all guest rows are mutually editable.
- The UI may continue to show non-editable guest responses as readable respondents so their availability still participates in overlap and filtering flows.
- Loss of browser-local guest state is an accepted consequence of the current model, not a frontend inconsistency.

### Storage-loss and orphan semantics

- Clearing `localStorage` may remove the current browser's ability to edit a previously owned guest response.
- After storage loss, a legacy guest row may become uneditable from that browser unless the same guest identity is restored.
- After storage loss, a token-backed `protected` guest row may become uneditable from that browser because the edit token is gone.
- After storage loss, a token-backed `open` guest row remains editable under the open-policy contract.
- The frontend may infer that a row is not editable for the current browser, but it must not claim that the row is globally orphaned.
- True orphan detection is out of scope for the current model because the server cannot observe browser-local guest ownership state.

### Boundary and test discipline

- Keep guest ownership transport fields at explicit boundaries, consistent with ADR-001.
- Do not widen raw guest ownership payload fields into ad hoc component-local contracts when shared helpers already define the semantics.
- Add focused regression coverage when guest editability rules change so respondents lists, selected-guest CTAs, and direct guest-edit flows remain aligned with backend authorization.

## Consequences

- Guest response editing stays available without requiring accounts, but that ownership is only as durable as the current browser's local storage.
- The migrated frontend gets one explicit contract for legacy fallback identity versus token-backed guest ownership.
- Guest responses can remain useful for scheduling even when they are no longer editable from the current browser.
- Product and support expectations should treat guest storage loss as a loss of editability, not as automatic evidence that a response is globally orphaned.
