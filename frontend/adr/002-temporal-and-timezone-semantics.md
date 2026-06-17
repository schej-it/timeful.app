# ADR-002: Frontend Timezone Decoding and Fixed-Offset Boundaries

Date: 2026-05-05

Status:

- Accepted

## Context

Within the frontend stack migration described in ADR-008, the shift from `Date`-heavy code to `Temporal` exposed a recurring class of timezone-specific regressions:

- timezone decoding and fixed-offset handling being reimplemented at call sites
- scheduling, plugin, and export paths drifting into incompatible offset reconstruction behavior
- route-local and component-local timezone fallback logic bypassing already normalized timezone data

These are runtime-sensitive boundary semantics rather than general type-boundary rules, so they need their own explicit architectural record.

## Decision

The frontend keeps one shared timezone boundary model:

- timezone decoding and fixed-offset reconstruction stay centralized
- shared timezone helpers stay in neutral utilities
- normalized timezone data is consumed directly instead of being rederived locally

## Rules

### Timezone decoding and fixed offsets

- Persisted timezone decoding lives in `src/utils/timezone_utils.ts`.
- Fixed-offset reconstruction must stay aligned across scheduling, plugin, and export boundaries.
- Shared timezone boundary helpers belong in neutral utilities, not plugin-local or component-local code.
- Do not reintroduce browser-timezone fallback or raw timezone reads at route-local or component-local call sites when a normalized timezone value already exists.

## Consequences

- Future frontend findings should treat violations of these rules as concrete timezone-boundary bugs or refactors at the call site where they appear.
- New shared timezone utilities should preserve these semantics instead of rebuilding them locally.
