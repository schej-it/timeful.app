# ADR 008: Frontend Framework and Language Baseline

Date: 2026-05-08

Status:

- Accepted

## Context

The frontend migration changed the baseline application stack:

- Vue 2 moved to Vue 3
- Vuetify 2 moved to Vuetify 3
- JavaScript moved to TypeScript

That transition affects component APIs, reactivity patterns, UI-library semantics, typing expectations, and what counts as legacy compatibility code.

Multiple frontend ADRs depend on that same stack transition as background context. Keeping it in one dedicated record makes later ADRs narrower and avoids repeating the same migration setup text.

## Decision

The frontend stack baseline is explicit:

- frontend application code targets Vue 3
- shared UI-library usage targets Vuetify 3
- frontend source code targets TypeScript
- ADRs that depend on this migration context should reference this record instead of restating the transition inline

## Rules

### Framework and language baseline

- New frontend application code should target Vue 3 semantics and APIs.
- New shared UI work should use current-version Vuetify 3 APIs and conventions.
- New frontend source modules should be written in TypeScript unless the file is tooling, generated output, or another boundary with a concrete reason to stay non-TypeScript.
- Vue 2, Vuetify 2, and JavaScript-era patterns should be treated as migration compatibility debt unless they are intentionally isolated as a compatibility boundary.

### ADR and cleanup references

- When another frontend ADR depends on the framework-and-language migration as setup, reference ADR 008 instead of restating the full stack transition.
- Migration cleanup work should separate stack-baseline decisions from narrower domain or feature-specific architectural rules.

## Consequences

- Frontend ADRs can stay focused on their specific domain constraints while sharing one common migration baseline.
- Reviews can treat newly introduced Vue 2, Vuetify 2, or JavaScript-era application patterns as regressions against the accepted frontend stack baseline.
