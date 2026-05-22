# Repository Layout

This repo contains:

- a frontend in `./frontend`
- a backend in `./server`
- the previous frontend implementation in `migration/timeful.app.js`
- the shared migration browser tooling in `migration/comparator`

## Working Defaults

Unless the user explicitly asks for server changes:

- treat `frontend/` as the primary working directory
- use clean layout-based fixes, not hacks
- prefer adding regression tests before fixing migration bugs
- newly added regression tests may fail when they are meant to expose an existing bug
- first confirm that the finding you plan to work on still reproduces
- update the relevant findings handoff file when adding or refining reproductions
- suggest new findings if you notice them

Canonical findings location:

- `findings/*.md`

## Frontend Runtime Workflow

For local frontend parity work against the backend:

- start `mongo` and `server` with `docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up --build mongo server`
- start the migrated app from `./frontend` on `127.0.0.1:4173`
- start the legacy app from `./migration/timeful.app.js/frontend` on `127.0.0.1:4174`
- keep the migrated frontend pointed at the backend through the repo-root `.env.development`, with `VITE_API_PROXY_TARGET=http://127.0.0.1:3002`
- keep the legacy frontend running through its Vue dev-server proxy on `127.0.0.1:4174` so `/api` and `/swagger` are forwarded to `http://127.0.0.1:3002`
- verify frontend-to-backend wiring through the frontend origins with `http://127.0.0.1:4173/api/health` and `http://127.0.0.1:4174/api/health`

When asked to start frontend dev servers or run browser parity checks, follow `./migration/comparator/AGENTS.md` for the detailed command flow.

## Comparator Policy

When aligning the migrated frontend with the legacy frontend:

- run browser checks using `./migration/comparator`
- prefer `inspect` while investigating migrated behavior
- use `compare` when you specifically need old-vs-new parity evidence
- use comparator output as the primary evidence for style and layout adjustments whenever both apps exist locally
- keep Firefox comparator runs sequential while the intermittent `page.goto(...): NS_ERROR_OUT_OF_MEMORY` instability remains under investigation
- for `/e/dEeaF` event scenarios, prefer the shared comparator flow so the stable locale shim and consent-dismiss setup run before snapshot collection
- run Firefox comparator tooling outside the Codex sandbox by default for this repo
- if a Firefox comparator repro only fails inside the sandboxed path, do not classify it as a frontend migration regression without reproducing it outside the sandbox
- if Firefox `page.goto(...): NS_ERROR_OUT_OF_MEMORY` only appears inside the sandboxed path, do not classify it as a frontend migration bug without stronger outside-sandbox evidence

## Cross-Cutting Frontend Rules

Follow the frontend ADRs and `./frontend/AGENTS.md` for implementation details. In particular:

- keep boundary and transport types separate from internal types
- preserve one canonical internal shape per concept
- keep compatibility coercions and transport decoding or encoding at explicit boundaries, not inside views, composables, or submit paths
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

## Local Frontend Debug

For local frontend debugging, keep the production-oriented `compose.yaml` and layer the repo-local override on top of it.

Local frontend tooling expects these variables in the repo-root `.env.development`:

- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_API_PROXY_TARGET`

If your local backend is on a different host or port, point `VITE_API_PROXY_TARGET` there instead.

Useful local entry points:

- fast UI debug: `http://127.0.0.1:4173/test`
- real integrated flow: sign in, open `http://127.0.0.1:4173/home`, then click create event

The Vite dev server proxies `/api` and `/swagger` to `VITE_API_PROXY_TARGET`, so frontend requests stay same-origin and avoid browser CORS issues.
The canonical env-file contract lives in `docs/environments.md`.

## Rewrite Safety

- when cleaning the worktree for rebases, amends, or other history rewrites, prefer explicitly moving or copying tracked and untracked files aside and restoring them afterward
- do not use `rm` as the primary cleanup mechanism when a non-destructive move or backup approach is practical

## VS Code MCP Usage

Only use:

- `search_symbols_code`
- `get_symbol_definition_code`
- `get_diagnostics_code`

## Commits

- write conventional commit messages
- for frontend changes, use the `frontend` scope
- explain the changes in the commit body, including why they were made
- do not mention unrelated changes
- add co-authored at the end of the commit message
