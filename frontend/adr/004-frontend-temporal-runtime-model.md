# ADR 004: Frontend Temporal Runtime Model

Date: 2026-05-06

Status:

- Accepted

## Context

Within the frontend stack migration described in ADR 008, a separate class of Temporal-specific regressions surfaced:

- internal runtime models widening one concept across `Temporal`, string, and numeric encoded forms
- `Date` continuing to appear in frontend runtime logic after the frontend time model moved to `Temporal`
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
- The only acceptable frontend `Date` usage is an explicit adapter around a third-party or browser API that requires a native `Date` object.
- `Date` must not leak from those adapters into props, emits, stores, composables, shared helpers, or canonical internal types.
- Prefer named boundary helpers or adapter modules for those conversions instead of ad hoc inline `Date` usage inside feature logic.

### Encoded boundaries should still prefer Temporal

- Do not use `Date.parse(...)`, `Date.now()`, or `Date.UTC(...)` when a boundary value is already modeled as a canonical Temporal value or a Temporal-compatible encoded string.
- Prefer `Temporal.Instant`, `Temporal.ZonedDateTime`, or the canonical domain Temporal type when encoding and decoding transport or persisted time values.
- Reserve native `Date` usage for boundaries that literally require a `Date` object, not for general parsing, encoding, clock access, or arithmetic.

### No mixed encoded and Temporal unions

- Do not model one field, prop, store value, or domain concept as a mixed representation union such as `Temporal | string` or `Temporal | number`.
- Transport and persisted string or numeric encoded forms stay at explicit decode and encode boundaries.
- Internal runtime types use canonical Temporal shapes after decoding.
- Do not widen back to encoded unions in components, composables, stores, or helpers for local convenience.

### Temporal value semantics

- Do not rely on object identity for `Temporal` values in sets or maps.
- Prefer canonical value-keyed wrappers, `.equals(...)`, or `Temporal.*.compare(...)` where ordering or equality matters.
- Avoid relational operators on Temporal objects.

### Tests follow the same model

- Regression and unit tests should model frontend runtime time values with `Temporal` by default.
- Fake clocks should use epoch numbers or Temporal-derived helpers rather than `new Date(...)`.
- Test fixtures may use native `Date` only when explicitly covering a native-Date integration boundary.

## Consequences

- Future frontend findings should treat `Date` usage in runtime code and mixed encoded/Temporal unions for one concept as concrete architectural violations.
- Reviews can treat downstream casts or widened time unions as a design smell unless they are part of an explicit transport boundary.
- Regression tests remain the preferred way to lock down runtime-sensitive Temporal behavior before refactoring.
