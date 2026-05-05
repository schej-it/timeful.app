# ADR 0003: Frontend Freemium Operational Gating

Date: 2026-05-05

Status:

- Accepted

## Context

Frontend freemium behavior needs one explicit operational boundary:

- freemium gating may need to be disabled quickly without editing multiple views
- ad rendering spans layout, rendering, upgrade prompts, and third-party script-loading call sites
- scattered per-component checks make these changes easy to miss and harder to review
- frontend access semantics can drift if product-account state and operational bypass state are mixed together

Without a shared boundary, the frontend can drift into multiple incompatible interpretations of "premium":

- actual persisted premium state for owners or authenticated users
- operational bypass state when freemium is disabled globally
- ad-specific exceptions implemented separately from paywall checks

The frontend needs one freemium-specific decision record that keeps these semantics aligned.

## Decision

The frontend keeps freemium operational gating explicit and centralized:

- the frontend freemium boundary is controlled by one shared env-backed switch: `VITE_ENABLE_FREEMIUM`
- shared freemium helpers in `src/utils/freemium.ts` own env parsing and access semantics
- components and stores consume shared freemium helpers instead of reading env values directly
- ad rendering, paywall enforcement, and upgrade-prompt gating all honor the same shared operational switch
- persisted product state remains separate from operational access state

## Rules

### Shared toggle boundaries

- Env-backed freemium toggles belong in `src/utils/freemium.ts`.
- Views, components, and stores should import shared freemium helpers instead of reading `import.meta.env` directly.
- Toggle names should be explicit about the behavior they control.

### Product state vs. operational access state

- Real product state stays explicit:
- owner premium means the event owner has actual premium status
- user premium means the authenticated user has actual premium status
- Operational access state stays explicit:
- viewer premium access means the current viewer bypasses frontend freemium gating
- Operational helpers must not be named as though they represent persisted product state when they actually represent a toggle-driven bypass.

### Consistent operational gating

- The freemium switch must gate all related frontend behaviors consistently:
- ad containers and third-party ad script registration
- layout offsets or sticky-space reservations tied to those surfaces
- paywall enforcement and upgrade prompts
- shared viewer-access checks used by views and components

### Defaults and tests

- Freemium gating should default to preserving current production behavior unless a migration or incident requires the inverse.
- Add focused regression coverage for env parsing and default behavior when introducing a new shared toggle.
- Add regression coverage for access semantics when product state and operational bypass state interact.
- Document new env-backed toggles in `.env.example`.

## Consequences

- Freemium-related frontend behavior now has one canonical operational boundary instead of separate ad and paywall paths.
- Reviews can treat direct `import.meta.env` reads or component-local freemium conditionals as a design smell unless they are part of the shared freemium module.
- Ads and upgrade/paywall checks now share the same operational switch instead of being toggled independently in unrelated components.
- Product-state checks such as owner premium remain available where they describe real persisted data, but frontend bypass behavior now flows through shared viewer-access semantics.
