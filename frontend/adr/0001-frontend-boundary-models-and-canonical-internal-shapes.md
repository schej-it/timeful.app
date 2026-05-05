# ADR 0001: Frontend Boundary Models and Canonical Internal Shapes

Date: 2026-05-05

Status:

- Accepted

## Context

The frontend migration surfaced a recurring class of regressions that were broader than any one feature area:

- raw backend payload shapes leaking into internal frontend types
- multiple internal shapes being accepted for the same concept
- compatibility coercions being performed deep inside views and helpers instead of at explicit boundaries

These are architectural constraints, not single bugs. They need to stay explicit across future migration and cleanup work.

## Decision

The frontend keeps one explicit boundary model:

- transport decoding and encoding stays at boundary modules
- internal runtime code uses one canonical shape per concept
- compatibility is handled at explicit boundaries instead of being widened inward

## Rules

### Transport versus internal types

- Backend and transport payload types belong in `src/types/transport.ts`.
- Internal app types belong in `src/types/index.ts` and adjacent internal modules.
- Do not re-export raw payload shapes from `@/types`.
- Do not recover raw payload typing through downstream casts in composables or components.
- Nested backend payloads must be decoded and encoded through the main transport boundary instead of being passed through as partially raw subtrees.

### Canonical internal shapes

- Each domain concept should have one canonical internal shape.
- Compatibility coercions belong at fetch, decode, submit, or adapter boundaries.
- Internal helpers should not widen back to generic unions, broad records, or mixed container shapes.
- Downstream feature-specific types should inherit canonical shared models instead of re-declaring raw nested fields for local convenience.

## Consequences

- Future frontend findings should treat violations of these rules as concrete bugs or refactors at the call site where they appear, not as vague carry-forward backlog items.
- New shared utilities should preserve these boundaries instead of widening compatibility inward.
