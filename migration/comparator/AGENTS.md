# Comparator Package

This package holds the shared migration comparator for old-vs-new frontend parity checks.

## Purpose

- use this package to verify migration correctness before making parity tweaks
- use comparator output as the primary evidence for style and layout adjustments
- do not reintroduce one-off root scripts for migration verification

## Commands

Run commands from `./migration/comparator` from the repo root:

- `npm run compare:landing-styles`
- `npm run compare:new-event-form-styles`
- `npm run compare:new-event-calendar-styles`
- `npm run compare:new-event-calendar-interaction`
- `npm run compare -- --target <scenario-name>`
- `npm run typecheck`

## Runtime Defaults

- default target: `landing`
- migrated app default URL: `http://127.0.0.1:4173`
- legacy app default URL: `http://127.0.0.1:4174`
- override URLs with `OLD_APP_URL` and `NEW_APP_URL` when local ports differ
- in this checkout, start the migrated app from `../frontend` with `npm run dev -- --host 127.0.0.1 --port 4173`
- start the legacy app from `timeful.app.js/frontend` with `npm run serve -- --host 127.0.0.1 --port 4174`
- if you launch from a different working directory, adjust those relative paths accordingly

## Startup Sequence

- install dependencies before first run in any package that does not already have `node_modules`
- from the `migration/` repo root, start the migrated app with `cd ../frontend && npm run dev -- --host 127.0.0.1 --port 4173`
- from the `migration/` repo root, start the legacy app with `cd timeful.app.js/frontend && npm run serve -- --host 127.0.0.1 --port 4174`
- keep both servers running while invoking comparator scenarios from `migration/comparator`
- if either app is already using a different local port, export `OLD_APP_URL` and `NEW_APP_URL` when running comparator commands

Example:

- `OLD_APP_URL=http://127.0.0.1:<old-port> NEW_APP_URL=http://127.0.0.1:<new-port> npm run compare -- --target landing`

## Scenario Rules

- add new migration-verification scenarios in `src/compare.ts`
- keep new scenarios inside the shared typed CLI instead of adding ad hoc scripts
- keep selector discovery, page preparation, and diff collection inside the shared comparator flow
- preserve existing behavior for current scenarios unless the change is intentional and verified

## Comparator Flow

- when comparator output and the browser disagree, inspect the live migrated DOM and computed styles before changing selectors again
- prefer explaining parity decisions with comparator output first, then use live DOM inspection to resolve cases the diff does not explain cleanly
- after a style-only parity fix, refresh the running migrated app and re-check the exact scenario state before assuming the change took effect

## Styling Checks

- keep these checks scoped to comparator-driven styling parity work; they are not a blanket frontend styling policy
- for Vuetify disabled-state parity work, verify wrapper opacity on rendered ancestors such as `.v-input`, `.v-input__details`, `.v-messages`, and `.v-selection-control`, not just the leaf helper text node
- in non-scoped Vue style blocks, prefer plain selectors over `:deep(...)` for framework wrapper overrides
- use `:deep(...)` only when scoped styles actually need to cross component boundaries
- confirm the final selector matches the rendered class structure in the browser

## Maintenance

- keep this package TypeScript-based
- run it with `node --import tsx`
- do not add a separate build output just to run the comparator
- keep Playwright-based collection behavior consistent across scenarios
