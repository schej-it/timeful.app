# ADR 007: Frontend UI Primitive Semantics

Date: 2026-05-07

Status:

- Accepted

## Context

Within the frontend stack migration described in ADR 008, a recurring class of UI regressions surfaced around shared component-library primitives:

- legacy Vuetify shorthand props can continue to compile while changing rendered behavior
- visual semantics such as button style, size, and contrast can drift when they rely on deprecated or ambiguous props
- high-visibility shared surfaces such as headers, dialogs, floating actions, and owner menus are especially sensitive to this drift
- broad visual regressions are expensive to detect after the fact if the intended primitive semantics are not explicit at the call site

This is not just a one-off button cleanup. It is a boundary rule for how frontend code should express shared UI-library semantics after the migration.

## Decision

The frontend keeps shared UI primitive semantics explicit at the component boundary:

- Vuetify 3 call sites should use explicit current-version props instead of legacy shorthand props
- visual intent such as variant, size, and contrast should be expressed directly rather than inferred from deprecated flags
- migration-sensitive shared primitives should get focused regression coverage on representative usage patterns

## Rules

### Explicit UI-library semantics

- Prefer explicit current-version Vuetify props when a primitive’s visual behavior is being selected.
- Do not rely on legacy shorthand props that are deprecated, ambiguous, or migration-sensitive when there is an explicit Vuetify 3 equivalent.
- Express visual semantics at the call site where the primitive is rendered instead of depending on implicit framework defaults.

### Button semantics

- Use explicit button variants such as `variant="text"`, `variant="plain"`, and `variant="outlined"` instead of legacy `text`, `plain`, or `outlined` props.
- Use explicit button sizes such as `size="small"` or `size="x-small"` instead of legacy boolean size props.
- Express contrast explicitly through classes or other explicit styling choices instead of `dark`.
- Express floating round icon actions with explicit button semantics such as `icon`, `size`, and explicit classes instead of `fab`.
- Preserve valid current-version props that already match the intended semantics instead of churning them for style-only reasons.

### Shared-surface regression coverage

- When a migration-sensitive primitive is used across many views, prefer representative regression coverage over broad snapshots.
- Tests should target the shared patterns most likely to drift visually, such as:
- header and navigation actions
- dialog footer actions
- owner-menu and overflow actions
- floating or speed-dial actions
- Regression tests should assert explicit semantic props where practical instead of relying only on rendered text presence.

## Consequences

- Reviews can treat legacy or ambiguous Vuetify shorthand on shared primitives as a design smell unless there is a documented compatibility reason.
- Frontend cleanup work can normalize primitive semantics directly at call sites without introducing wrapper abstractions by default.
- Shared UI behavior becomes easier to audit during future Vuetify upgrades because intent is expressed explicitly in repo code.
- Focused regression tests remain the preferred way to lock down migration-sensitive UI semantics before or during refactors.
