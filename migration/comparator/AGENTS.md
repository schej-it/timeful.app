# Comparator Package

This package holds the shared migration browser tooling for migrated-only inspection and old-vs-new parity checks.

## Purpose

- use this package to inspect migrated frontend behavior before making tweaks
- use this package to verify migration correctness before making parity tweaks
- use comparator output as the primary evidence for style and layout adjustments
- do not reintroduce one-off root scripts for migration verification

## Commands

Run commands from `./migration/comparator` from the repo root:

- `npm run inspect:landing`
- `npm run inspect:event-respondents-panel`
- `npm run inspect:event-heatmap-grid`
- `npm run inspect:event-best-times-grid`
- `npm run inspect:event-overlay-availability`
- `npm run inspect:event-timezone-menu`
- `npm run profile:route`
- `npm run inspect -- --target <scenario-name>`
- `npm run compare:landing-styles`
- `npm run compare:new-event-form-styles`
- `npm run compare:new-event-calendar-styles`
- `npm run compare:new-event-calendar-interaction`
- `npm run compare -- --target <scenario-name>`
- `npm run typecheck`

Prefer `inspect` for migrated-only investigation and selector/debug work. Use `compare` when you specifically need old-vs-new parity evidence.
Use `profile:route` when you need a migrated-only Firefox navigation summary for a real event route without running the full snapshot collector.

## Runtime Defaults

- default target: `landing`
- default browser: `firefox`
- migrated app default URL: `http://127.0.0.1:4173`
- legacy app default URL: `http://127.0.0.1:4174`
- backend default URL: `http://127.0.0.1:3002`
- override URLs with `OLD_APP_URL` and `NEW_APP_URL` when local ports differ
- override the shared real-event route with `COMPARATOR_EVENT_PATH=/e/<short-id>` when a scenario supports route-owned event navigation
- override route-navigation readiness with `COMPARATOR_EVENT_WAIT_UNTIL=commit` or `COMPARATOR_EVENT_WAIT_UNTIL=domcontentloaded` when investigating Firefox event-route failures
- in this checkout, start the backend first with `docker compose -f compose.yaml -f compose.dev.yaml up --build mongo server`
- in this checkout, start the migrated app from `../frontend` with `npm run dev -- --host 127.0.0.1 --port 4173`
- start the legacy app from `timeful.app.js/frontend` with `npm run serve -- --host 127.0.0.1 --port 4174`
- if you launch from a different working directory, adjust those relative paths accordingly

## Startup Sequence

- install dependencies before first run in any package that does not already have `node_modules`
- before launching the frontend dev servers, ensure the backend is up on `127.0.0.1:3002`
- for the migrated app, keep `../frontend/.env.local` set to `VITE_API_PROXY_TARGET=http://127.0.0.1:3002`, or pass that value inline when starting Vite
- for the legacy app, use the repo's Vue dev-server proxy config so requests to `/api` and `/swagger` go to `http://127.0.0.1:3002`
- from the `migration/` repo root, start the migrated app with `cd ../frontend && npm run dev -- --host 127.0.0.1 --port 4173`
- from the `migration/` repo root, start the legacy app with `cd timeful.app.js/frontend && npm run serve -- --host 127.0.0.1 --port 4174`
- keep the migrated app running while invoking `inspect` scenarios from `migration/comparator`
- keep both apps running while invoking `compare` scenarios from `migration/comparator`
- if either app is already using a different local port, export `NEW_APP_URL` for inspect runs and export both `OLD_APP_URL` and `NEW_APP_URL` for compare runs
- verify the live frontend wiring with `http://127.0.0.1:4173/api/health` and `http://127.0.0.1:4174/api/health` before trusting parity results

Example:

- `npm run inspect -- --target landing`
- `OLD_APP_URL=http://127.0.0.1:<old-port> NEW_APP_URL=http://127.0.0.1:<new-port> npm run compare -- --target landing`
- `COMPARATOR_EVENT_PATH=/e/B2a3A npm run inspect -- --target event-description-real`
- `COMPARATOR_EVENT_PATH=/e/B2a3A COMPARATOR_EVENT_WAIT_UNTIL=commit npm run inspect -- --target event-description-real`
- `COMPARATOR_EVENT_PATH=/e/B2a3A npm run profile:route`

## Checks

- Check only in Firefox (Playwright)
- `inspect` and `compare` default to Firefox; set `PLAYWRIGHT_BROWSER` only when you intentionally want a different browser
- prefer migrated-only inspection runs with `npm run inspect -- --target <scenario-name>`
- run comparator scenarios with `npm run compare -- --target <scenario-name>`
- keep Firefox comparator runs sequential; do not run multiple Firefox Playwright/comparator commands in parallel while the intermittent `NS_ERROR_OUT_OF_MEMORY` issue is still open
- for `/e/dEeaF` scenarios, prefer the shared comparator scenarios/helpers so the stable locale shim and consent-dismiss logic run before snapshot collection
- if you need to reproduce the remaining Firefox browser failure directly, use the collector repro in `../../findings/firefox-fail-repro.md` instead of inventing a new one-off browser script
- run Firefox comparator commands outside the Codex sandbox by default for this repo, including `inspect`, `compare`, `profile:route`, and `collector-bisect`
- if Firefox `page.goto(...): NS_ERROR_OUT_OF_MEMORY` only appears inside the sandboxed path, do not treat it as an app/frontend bug without reproducing it outside the sandbox
- use outside-sandbox execution especially for Firefox repro commands from `findings/firefox-fail-repro.md`, including:
  - `env NEW_APP_URL=http://127.0.0.1:4173 COMPARATOR_EVENT_PATH=/e/B2a3A node --import tsx ./src/collector-bisect.ts --target event-description-real`
  - `env NEW_APP_URL=http://127.0.0.1:4173 COMPARATOR_EVENT_PATH=/e/B2a3A npm run inspect -- --target event-description-real`

## Scenario Rules

- add new migration-verification scenarios in `src/compare.ts`
- keep new scenarios inside the shared typed CLI instead of adding ad hoc scripts
- keep selector discovery, page preparation, inspection, and diff collection inside the shared comparator flow
- preserve existing behavior for current scenarios unless the change is intentional and verified

## Comparator Flow

- when comparator output and the browser disagree, inspect the live migrated DOM and computed styles before changing selectors again
- when a migrated-only investigation is sufficient, prefer `inspect` instead of forcing a compare run
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
