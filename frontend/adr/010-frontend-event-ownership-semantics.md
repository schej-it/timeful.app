# ADR-010: Frontend Event Ownership Semantics

Date: 2026-05-18

Status:

- Accepted

## Context

Within the frontend stack migration described in ADR-008, event ownership semantics have drifted across multiple local checks:

- some call sites treat `ownerId` as a real user identifier
- some call sites treat `guestUserId` as an anonymous-owner sentinel
- legacy behavior also encoded ownerless semantics separately, which makes direct parity ports easy to get wrong
- event-page editability currently mixes metadata editing and availability editing under one local `canEdit` condition

That drift creates concrete migration bugs:

- anonymous-created events can leak metadata editing controls that should stay hidden
- owner lookup and premium lookup paths have to remember sentinel-specific exclusions locally
- frontend code has no shared contract for what "anonymous owner", "real owner", and "editable by current viewer" mean

This is a frontend domain-semantics problem, not just a one-off event-view bug. It needs one explicit canonical interpretation that can be reused across views, components, and composables.

## Decision

The frontend keeps one shared event-ownership interpretation:

- `event.ownerId` remains the transport/internal event field
- anonymous-created events are represented in migrated frontend code by the existing `guestUserId` sentinel
- frontend runtime code consumes shared ownership helpers instead of branching directly on raw `ownerId` values
- metadata-edit permissions stay distinct from availability-edit permissions

This ADR does not change backend payload shape or introduce new owner sentinels. It defines how the migrated frontend must interpret the existing model.

## Rules

### Canonical ownership semantics

- Shared event-ownership semantics belong in a dedicated frontend domain helper or composable, not in individual views.
- Treat `guestUserId` as the canonical migrated representation of an anonymous-created event.
- Treat missing or empty `ownerId` as anonymous-owner fallback semantics at the shared helper boundary.
- Do not reintroduce legacy `ownerId == 0` checks in migrated frontend runtime code.

### Real-owner behavior

- A real-owned event is one whose `ownerId` is present and not anonymous.
- Owner profile fetches, owner premium checks, and other owner-account lookups must run only for real-owned events.
- Components and composables should ask the shared ownership helper whether an event has a real owner instead of repeating sentinel exclusions locally.

### Permission semantics

- Metadata-edit permissions and availability-edit permissions must be modeled as separate frontend decisions.
- Metadata-edit permissions should be granted only when the current signed-in user is the real owner of the event.
- Anonymous-created events must not expose metadata-edit controls such as event-title editing, description editing, or equivalent owner-only event metadata actions.
- Availability-edit permissions may still allow the existing anonymous-created event editing flow where product behavior requires it.
- Views should receive or derive explicit permission booleans rather than overloading one generic `canEdit` flag for multiple kinds of editability.

### Boundary and test discipline

- Keep raw transport ownership data at the event boundary and derive semantic booleans from it in shared frontend logic.
- Do not widen anonymous-owner semantics back into mixed local conventions inside components for convenience.
- Add focused regression coverage when changing ownership-sensitive UI so anonymous-created and real-owned event behavior remains explicit.

## Consequences

- The migrated frontend gets one canonical ownership contract instead of mixing legacy and migrated sentinel behavior across call sites.
- Event-page regressions caused by conflating anonymous availability editing with owner metadata editing become easier to prevent and review.
- Owner-dependent fetch logic becomes simpler because shared helpers decide whether an owner ID refers to a real user.
- Future migration cleanup can preserve legacy behavior semantically without copying legacy `ownerId == 0` checks into TypeScript code.
