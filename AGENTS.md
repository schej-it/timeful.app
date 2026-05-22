# Repository Layout

This repo contains:

- a frontend in `./frontend`
- a backend in `./server`

The previous frontend implementation is at `migration/timeful.app.js`.

Comparator is at `migration/comparator`.

## Frontend Migration Focus

For frontend work, the migration is primarily from:

- `Date` / number / string
- JavaScript
- Vue 2

To:

- TypeScript
- Vue 3
- `Temporal` via `temporal-polyfill`
- Vuetify
- Composition API

## Working Defaults

Unless the user explicitly asks for server changes:

- treat `frontend/` as the primary working directory
- when asked to start frontend dev servers, follow `./migration/comparator/AGENTS.md`
- for local frontend parity work, start the migrated app from `./frontend` on `127.0.0.1:4173` and the legacy app from `./migration/timeful.app.js/frontend` on `127.0.0.1:4174`
- for local frontend parity work against the backend, start `mongo` and `server` with `docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up --build mongo server`
- keep the migrated frontend pointed at the backend through the repo-root `.env.development`, with `VITE_API_PROXY_TARGET=http://127.0.0.1:3002`
- keep the legacy frontend running through its Vue dev-server proxy on `127.0.0.1:4174` so `/api` and `/swagger` are forwarded to `http://127.0.0.1:3002`
- verify frontend-to-backend wiring through the frontend origins with `http://127.0.0.1:4173/api/health` and `http://127.0.0.1:4174/api/health`
- prefer adding regression tests before fixing migration bugs
- newly added regression tests may fail if they are meant to expose an existing bug
- first check the finding that you're going to work on whether it's actually resolved
- update the relevant findings handoff file when adding or refining reproductions
- suggest new findings if you notice them
- RUN BROWSER CHECKS USING ./migration/comparator
- Use clean layout-based fixes, not hacks, not HACKS
- Firefox is the default browser for comparator tooling; only override it intentionally

## Rewrite Safety

- when cleaning the worktree for rebases, amends, or other history rewrites, prefer explicitly moving or copying tracked and untracked files aside and restoring them afterward
- do not use `rm` as the primary cleanup mechanism when a non-destructive move or backup approach is practical

## Findings

Canonical findings location:

- `findings/*.md`

## Fixes

Use clean layout-based fixes, not hacks, NOT HACKS

## Frontend Data and Boundary Rules

- follow [frontend/adr/0001-frontend-boundary-models-and-canonical-internal-shapes.md](frontend/adr/0001-frontend-boundary-models-and-canonical-internal-shapes.md)
- keep boundary/transport types separate from internal types
- preserve one canonical internal shape per concept
- keep compatibility coercions and transport decoding/encoding at explicit boundaries, not inside views, composables, or submit paths

## Temporal Migration Notes

- follow [frontend/adr/0002-temporal-and-timezone-semantics.md](frontend/adr/0002-temporal-and-timezone-semantics.md)
- many Temporal regressions are runtime issues, so passing typecheck or build is not sufficient
- keep shared timezone decoding centralized and avoid rebuilding it at call sites
- treat Temporal values with value semantics, not identity semantics
- keep civil-date, end-of-day, and working-hours semantics explicit at domain boundaries

## Required Checks

For frontend work, run:

- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd frontend && npm run test:unit`

## Required alignment with legacy frontend

When aligning the migrated frontend with the previous frontend implementation:

- run the shared comparator package in `./migration/comparator` before making parity tweaks so changes are based on measured browser evidence, not guesses from reading code
- prefer `inspect` while investigating migrated behavior and use `compare` when you specifically need old-vs-new parity evidence
- follow `./migration/comparator/AGENTS.md` for running dev servers, inspect/comparator invocation, URL overrides, and adding new migration-verification scenarios
- use the diff output as the primary evidence for style/layout adjustments whenever the old and new versions both exist locally
- keep Firefox comparator runs sequential while the intermittent `page.goto(...): NS_ERROR_OUT_OF_MEMORY` instability remains under investigation
- for `/e/dEeaF` event scenarios, prefer the shared comparator flow so the stable locale shim and consent-dismiss setup run before snapshot collection
- run Firefox comparator tooling outside the Codex sandbox by default for this repo
- if a Firefox comparator repro only fails inside the sandboxed path, do not classify it as a frontend migration regression without reproducing it outside the sandbox
- if Firefox `page.goto(...): NS_ERROR_OUT_OF_MEMORY` only appears inside the sandboxed path, do not classify it as a frontend migration bug without stronger outside-sandbox evidence

## VS Code MCP Usage

Only use:

- `search_symbols_code`
- `get_symbol_definition_code`
- `get_diagnostics_code`

## Commits

- write conventional commit messages
- for frontend changes, use the `frontend` scope
- explain the changes in the commit body, including why they were made
- don't mention unrelated changes ("without touching unrelated frontend or server work in the dirty tree")
- add co-authored at the end of the commit message

## Local Create-Event Debug

For local frontend debugging, keep the production-oriented `compose.yaml` and layer the repo-local override on top of it.

Start the backend:

```sh
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up --build mongo server
```

Start the migrated frontend:

```sh
cd frontend
cp ../.env.development.example ../.env.development
npm run dev
```

Local frontend tooling now expects these variables in the repo-root `.env.development`:

- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_API_PROXY_TARGET`

If your local backend is on a different host or port, point `VITE_API_PROXY_TARGET` there instead:

```sh
VITE_API_PROXY_TARGET=http://127.0.0.1:4000
```

Useful local entry points:

- Fast UI debug: `http://127.0.0.1:4173/test`
- Real integrated flow: sign in, open `http://127.0.0.1:4173/home`, click create event

The Vite dev server proxies `/api` and `/swagger` to `VITE_API_PROXY_TARGET`, so local frontend requests stay same-origin and avoid browser CORS issues.
The canonical env-file contract lives in `docs/environments.md`.
