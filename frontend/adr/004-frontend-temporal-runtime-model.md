# ADR 004: Frontend Temporal Runtime Model

Date: 2026-05-06

Status:

- Accepted

## Context

The frontend migration surfaced a separate class of Temporal-specific regressions:

- internal runtime models widening one concept across `Temporal`, string, and numeric encoded forms
- `Date` continuing to appear in frontend runtime logic after the migration target moved to `Temporal`
- Temporal values being treated like identity-keyed objects instead of value-keyed domain data

Without a strict runtime model, cleanup work can drift back into mixed representations that obscure boundaries and reintroduce runtime bugs.

## Decision

The frontend keeps one explicit Temporal runtime model:

- frontend runtime and domain logic use `Temporal`, not `Date`
- one concept is represented as either an encoded boundary form or a Temporal value depending on boundary position, not a mixed representation union such as `Temporal | string` or `Temporal | number`
- Temporal values are handled with value semantics rather than identity semantics

## Rules

### Temporal instead of Date

- Do not use `Date` in frontend runtime or domain logic.
- New frontend time modeling should use `Temporal` types that match the invariant being represented.
- If an external library requires a non-Temporal representation, isolate that conversion at the explicit boundary that integrates with the library.

### No mixed encoded and Temporal unions

- Do not model one field, prop, store value, or domain concept as a mixed representation union such as `Temporal | string` or `Temporal | number`.
- Transport and persisted string or numeric encoded forms stay at explicit decode and encode boundaries.
- Internal runtime types use canonical Temporal shapes after decoding.
- Do not widen back to encoded unions in components, composables, stores, or helpers for local convenience.

### Temporal value semantics

- Do not rely on object identity for `Temporal` values in sets or maps.
- Prefer canonical value-keyed wrappers, `.equals(...)`, or `Temporal.*.compare(...)` where ordering or equality matters.
- Avoid relational operators on Temporal objects.

## Consequences

- Future frontend findings should treat `Date` usage in runtime code and mixed encoded/Temporal unions for one concept as concrete architectural violations.
- Reviews can treat downstream casts or widened time unions as a design smell unless they are part of an explicit transport boundary.
- Regression tests remain the preferred way to lock down runtime-sensitive Temporal behavior before refactoring.
