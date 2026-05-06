# ADR 005: Frontend Scheduling Time Semantics

Date: 2026-05-06

Status:

- Accepted

## Context

Scheduling behavior in the frontend needs explicit domain semantics:

- civil-date concepts can drift into ad hoc datetime handling
- end-of-day behavior can regress into fake sentinel values
- working-hours and overlap construction can rebuild time values from reparsed strings
- weekly helpers can mix seed-week and caller-provided rendered-week semantics implicitly

These are scheduling-domain rules that should stay explicit at the boundary where scheduling behavior is modeled.

## Decision

The frontend keeps scheduling time semantics explicit:

- civil-date concepts use explicit date-only modeling when timezone is not part of the invariant
- end-of-day remains an explicit boundary concept
- working-hours and overlap construction operate on normalized Temporal values plus the selected schedule timezone or fixed offset
- weekly helper call sites stay explicit about their week semantics

## Rules

### Civil-date and end-of-day semantics

- Model civil-date concepts explicitly with `Temporal.PlainDate` when timezone semantics are not part of the invariant.
- Treat end-of-day as an explicit boundary concept; do not reintroduce fake `24:00` sentinels or pretend `Temporal.PlainTime` can represent them.

### Working-hours and overlap construction

- Keep working-hours and overlap construction on normalized Temporal values and the selected schedule timezone or fixed offset.
- Avoid string reparsing paths for working-hours or overlap construction.
- Do not rebuild schedule semantics locally when normalized scheduling inputs already exist.

### Weekly scheduling semantics

- Weekly helper call sites must be explicit about whether they want seed-week semantics or a caller-provided rendered week.
- Do not let helpers infer those semantics implicitly from mixed call-site inputs.

## Consequences

- Future frontend findings should treat violations of these rules as concrete scheduling-domain bugs or refactors at the call site where they appear.
- Reviews can treat implicit rendered-week inference, fake end-of-day sentinels, and reparsed working-hours paths as design smells.
- Regression tests remain the preferred way to lock down scheduling behavior before refactoring.
