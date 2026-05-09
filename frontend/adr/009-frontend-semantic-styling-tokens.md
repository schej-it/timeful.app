# ADR-009: Frontend Semantic Styling Tokens

Date: 2026-05-09

Status:

- Accepted

## Context

Within the frontend stack migration described in ADR-008, styling consistency regressions are showing up as a broader semantic problem rather than a one-off component bug:

- shared visual states currently drift because components mix raw hex literals, Tailwind palette names, and Vuetify defaults
- repeated states such as selected rows, emphasis surfaces, muted text, and elevated actions are being expressed locally instead of through shared semantics
- teleported or library-rendered surfaces are especially prone to "fix it in place" overrides when there is no shared semantic contract
- styling review becomes noisy because changing one component does not establish a reusable rule for the next one
- parity work becomes fragile because local palette fixes do not define a frontend-wide consistency contract

ADR-007 already establishes that shared UI primitive semantics should be explicit at the component boundary. The frontend also needs an adjacent rule for how shared visual state semantics are named, owned, and reused across components.

## Decision

The frontend uses semantic styling tokens as the shared consistency contract:

- semantic styling tokens are defined as global CSS custom properties at the app level
- components consume semantic tokens for shared visual meaning instead of introducing local state-palette literals
- raw palette literals stay behind shared semantic tokens as implementation details
- repeated stateful styling patterns are treated as reusable UI semantics, not per-component fixes
- library-specific styling work should prefer rendering or composing components around the semantic contract instead of overriding framework internals ad hoc

This ADR introduces the frontend semantic styling token contract, using names with a `--timeful-*` prefix and semantic meaning such as `--timeful-selection-bg` or `--timeful-selection-fg`. Token names should describe intent rather than a feature-specific implementation such as `--new-event-dropdown-green`.

## Rules

### Semantic token source of truth

- Shared styling semantics belong in app-level CSS custom properties.
- Shared frontend semantic styling tokens should be declared in one canonical app-level token layer rather than scattered across feature-local styles.
- Token names should describe intent, not a specific component.
- Prefer semantic names such as selection background, selection foreground, muted foreground, emphasis surface, accent border, or similar shared state meanings.
- Use the `--timeful-*` prefix for frontend semantic styling tokens.
- Do not redefine shared `--timeful-*` semantic tokens inside feature-local component styles.

### Raw palette versus semantic consumption

- Raw color values may exist at the global token-definition layer.
- Feature components should consume semantic tokens instead of repeating raw hex literals.
- Tailwind palette entries may still be used as raw palette inputs, but they are not the semantic contract by themselves.
- Do not introduce raw palette literals directly in feature-component styles when an existing semantic token already matches the intended meaning.
- Reject new hardcoded `hex`, `rgb()`, `rgba()`, `hsl()`, or equivalent raw palette literals in feature-component styles for shared UI states when an app-level semantic token already represents that state.
- Reject feature-specific token names for meanings that are already shared across components or screens.
- Reject adding a second semantic token for an already-defined shared visual meaning unless the distinction is explicit and documented.

### Shared-state styling

- Repeated UI states such as selected menu rows, selected chips, muted helper copy, emphasized surfaces, elevated actions, and similar cross-component states should map to shared semantic tokens.
- Treat repeated stateful styling patterns as reusable UI semantics rather than local fixes for one screen.
- When a framework default does not express the intended state cleanly, prefer explicit rendering patterns that consume shared tokens over brittle overrides against framework state layers.
- When the same visual state appears in more than one feature or shared component, prefer reusing or extracting a semantic token rather than duplicating local palette styling.

### Library-internal override discipline

- Avoid styling consistency fixes that depend on opaque Vuetify internals when the same result can be expressed through owned markup, slots, or shared classes.
- If a framework override is unavoidable, it should still consume the shared semantic token rather than hardcoded palette values.
- Styling parity fixes on library-rendered menus, selects, and similar surfaces should prefer owned rendering patterns when framework defaults drift.
- Reject framework-internal overrides that encode semantic color directly when owned markup, slots, or shared classes can express the same state through the shared token contract.

### Exceptions

- Raw palette literals are allowed in the global token-definition layer where semantic tokens are defined.
- Component-local CSS variables are allowed for component-private styling concerns, but they are not a substitute for shared app-level semantic tokens.
- If a feature needs a one-off raw palette literal or framework-internal override for a shared UI state, the code should carry a documented reason and that exception should be treated as migration debt rather than the default pattern.
- Temporary migration exceptions should include a concrete cleanup note, follow-up issue, or equivalent breadcrumb for removal.

## Non-goals

- This ADR does not define a full design system.
- This ADR does not govern spacing, typography, motion, or broad theming policy beyond the semantic styling-token contract for shared visual state.

## Acceptance

- This ADR aligns with ADR-007 and references ADR-008 for migration context instead of restating those decisions.
- This ADR is scoped to semantic styling tokens and shared state semantics, not broader design-system governance for spacing, typography, or other visual systems.
- The rules in this ADR are intended to be reviewable and reject future hardcoded state-palette drift.
- Follow-up implementation work is accepted only when repeated component state styling uses shared semantic tokens instead of local hex literals.
- Follow-up implementation work should add representative regression tests that assert semantic classes, token-backed styling, or equivalent shared-contract behavior where practical.
- Follow-up implementation work should prefer owned rendering patterns over brittle framework-internal overrides when fixing styling drift on library-rendered surfaces.
- Follow-up parity fixes should document which shared semantic token was reused or introduced when the styling change affects a repeated UI state.

## Consequences

- Reviews can treat new hardcoded state-palette literals in feature styles as a design smell when an existing semantic token already represents the intended meaning.
- Shared visual states become easier to align across teleported surfaces, component-library primitives, and feature views because semantics live in one app-level contract.
- Styling parity work can establish reusable frontend rules instead of repeating one-off visual fixes.
- Future styling cleanup can extend the semantic token contract incrementally without broadening this ADR into a full design-system manifesto.
