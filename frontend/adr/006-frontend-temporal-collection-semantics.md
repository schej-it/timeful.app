# ADR 006: Frontend Temporal Collection Semantics

Date: 2026-05-07

Status:

- Accepted

## Context

Within the frontend stack migration described in ADR 008, the move to `Temporal` exposed a collection-specific class of regressions around Temporal object types:

- native `Set` and `Map` use object identity, not Temporal value semantics
- equal Temporal values can accidentally fork collection membership or keyed lookup state when they are reconstructed separately
- schedule-overlap flows already depend on repeated membership, merge, and lookup operations over canonical time values

ADR 004 established that Temporal values use value semantics, but the frontend also needs an explicit rule for how those semantics are preserved inside collection types.

## Decision

The frontend uses dedicated shared collection wrappers or helpers when runtime logic needs set or map semantics for Temporal object types:

- do not use native `Set` or `Map` for Temporal object types when frontend runtime logic depends on value-based equality or keyed lookup
- introduce a specialized shared collection or helper with explicit value semantics for the Temporal type being modeled
- `ZdtSet` is the canonical set shape for frontend runtime membership over `Temporal.ZonedDateTime`
- `ZdtMap<T>` is the canonical keyed map shape when `Temporal.ZonedDateTime` values are used as map keys
- value-keyed Temporal collection helpers stay centralized in `src/utils/temporalPrimitives.ts`

## Rules

### Canonical Temporal collections

- If frontend runtime logic needs repeated set membership or keyed lookup for a Temporal object type, introduce or use a specialized shared collection or helper with explicit value semantics.
- Do not rely on native `Set` or `Map` identity semantics for Temporal object types unless object identity is explicitly the invariant being modeled.
- Prefer shared helpers exported from `src/utils/temporalPrimitives.ts` for keyed Temporal access patterns instead of rebuilding local keying logic.

### ZonedDateTime collections

- Use `ZdtSet` instead of native `Set<Temporal.ZonedDateTime>` when equality or membership is part of frontend runtime logic.
- Use `ZdtMap<T>` instead of native `Map<Temporal.ZonedDateTime, T>` when keyed lookup depends on Temporal value equality.
- `ZdtSet` and `ZdtMap<T>` key entries by epoch-nanosecond value, not object identity.
- Equal instants must resolve to one collection entry even when the source `Temporal.ZonedDateTime` instances differ by annotation or were reconstructed separately.
- Do not compare or normalize `Temporal.ZonedDateTime` collection membership through ad hoc stringification at call sites when the shared wrappers already model the lookup semantics.

### Boundary and internal shape rules

- Transport and persisted boundary shapes still use explicit encoded forms such as arrays and records.
- Decode boundary data into specialized Temporal collections such as `ZdtSet` and `ZdtMap<T>` at explicit frontend boundaries when runtime collection semantics are needed.
- Do not widen canonical internal collection shapes back to mixed native and specialized collection types for local convenience.

## Consequences

- Reviews can treat native `Set<Temporal.*>` or `Map<Temporal.*, ...>` usage in runtime feature code as a design smell unless identity semantics are explicitly intended.
- Schedule-overlap and related Temporal-heavy flows keep one canonical collection model for membership and keyed lookup behavior.
- Future Temporal collection needs for types other than `Temporal.ZonedDateTime` should be handled by adding a dedicated shared wrapper or helper rather than ad hoc native collection usage.
- Regression tests remain the preferred way to lock down collection behavior when changing value-keyed Temporal utilities or their callers.
