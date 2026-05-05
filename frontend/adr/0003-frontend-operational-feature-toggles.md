# ADR 0003: Frontend Operational Feature Toggles

Date: 2026-05-05

Status:

- Accepted

## Context

Some frontend behaviors are operational rather than product-logic decisions:

- advertisement surfaces may need to be disabled quickly without editing multiple views
- third-party integrations can span layout, rendering, and script-loading call sites
- scattered per-component checks make these changes easy to miss and harder to review

The new advertisement toggle is one concrete example, but the underlying concern is architectural: operational switches should not be implemented as ad hoc conditionals across unrelated components.

## Decision

The frontend keeps operational toggles explicit and centralized:

- each operational toggle gets one shared config entry point
- components consume shared toggle state instead of reading env values directly
- third-party rendering and layout offsets must both honor the same shared toggle

## Rules

### Shared toggle boundaries

- Env-backed operational toggles belong in a shared utility such as `src/utils/ads.ts`.
- Views and components should import shared toggle helpers instead of reading `import.meta.env` directly.
- Toggle names should be explicit about the behavior they control.

### Consistent operational gating

- A toggle that disables a third-party surface must gate all related behaviors:
- rendered ad containers
- third-party script registration
- layout offsets or sticky-space reservations tied to that surface

### Defaults and tests

- Operational toggles should default to preserving current production behavior unless a migration or incident requires the inverse.
- Add focused regression coverage for env parsing and default behavior when introducing a new shared toggle.
- Document new env-backed toggles in `.env.example`.

## Consequences

- Future frontend operational switches should be added at one shared boundary instead of being reimplemented in component-local logic.
- Reviews can treat direct `import.meta.env` reads in ad or third-party UI components as a design smell unless they are part of the shared toggle module.
- Disabling advertisement blocks now has one canonical frontend path instead of multiple template edits.
