# ADR 0002: Frontend Temporal and Timezone Semantics

Date: 2026-05-05

Status:

- Accepted

## Context

The frontend migration from Vue 2 / JavaScript / `Date`-heavy code to Vue 3 / TypeScript / `Temporal` exposed a second class of regressions that are specific to date, time, and timezone behavior:

- timezone decoding and fixed-offset handling being reimplemented at call sites
- Temporal values being treated like identity-keyed objects instead of value-keyed domain data
- civil-date, end-of-day, working-hours, and rendered-week semantics drifting into ad hoc component logic

These are runtime-sensitive semantics rather than general type-boundary rules, so they need their own explicit architectural record.

## Decision

The frontend keeps one shared time model:

- timezone decoding and fixed-offset reconstruction stay centralized
- Temporal values are handled with value semantics rather than identity semantics
- civil-date, end-of-day, working-hours, and weekly semantics stay explicit at domain boundaries

## Rules

### Timezone decoding and fixed offsets

- Persisted timezone decoding lives in `src/utils/timezone_utils.ts`.
- Fixed-offset reconstruction must stay aligned across scheduling, plugin, and export boundaries.
- Shared timezone boundary helpers belong in neutral utilities, not plugin-local or component-local code.
- Do not reintroduce browser-timezone fallback or raw timezone reads at route-local or component-local call sites when a normalized timezone value already exists.

### Temporal value semantics

- Do not rely on object identity for `Temporal` values in sets or maps.
- Prefer canonical value-keyed wrappers, `.equals(...)`, or `Temporal.*.compare(...)` where ordering or equality matters.
- Avoid relational operators on Temporal objects.

### Civil-date, end-of-day, and working-hours semantics

- Model civil-date concepts explicitly with `Temporal.PlainDate` when timezone semantics are not part of the invariant.
- Treat end-of-day as an explicit boundary concept; do not reintroduce fake `24:00` sentinels or pretend `Temporal.PlainTime` can represent them.
- Keep working-hours and overlap construction on normalized Temporal values and the selected schedule timezone or fixed offset.
- Avoid string reparsing paths for working-hours or overlap construction.

### Weekly scheduling semantics

- Weekly helper call sites must be explicit about whether they want seed-week semantics or a caller-provided rendered week.
- Do not let helpers infer those semantics implicitly from mixed call-site inputs.

## Consequences

- Future frontend findings should treat violations of these rules as concrete time-domain bugs or refactors at the call site where they appear.
- New shared time utilities should preserve these semantics instead of rebuilding them locally.
- Regression tests remain the preferred way to lock down runtime-sensitive Temporal behavior before refactoring.
