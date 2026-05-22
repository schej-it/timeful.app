# Environment Files

Timeful uses one root env file per environment:

- `.env.development` for local development
- `.env.staging` for staging deployments and staging-style runs
- `.env.production` for production builds and production-style runs

The application-level deployment environment is defined separately from toolchain mode:

- backend runtime: `APP_ENV`
- frontend build-time/browser boundary: `VITE_APP_ENV`

Allowed values for both are `development`, `staging`, and `production`.
When unset, blank, or invalid, both sides default to `development`.
Normal deployments should keep `APP_ENV` and `VITE_APP_ENV` aligned.
`staging` is preserved as a distinct label, but it uses production-like defaults unless overridden explicitly.

Shareable defaults live in:

- `.env.development.example`
- `.env.staging.example`
- `.env.production.example`

## How the env files are used

- Frontend dev tooling reads `.env.development` through `frontend/config/tooling.ts`.
- Frontend staging-style builds read `.env.staging`.
- Frontend production builds and `vite preview` read `.env.production`.
- Vite client env loading uses the repo root as `envDir`, so `import.meta.env.VITE_*` also comes from the same root file for the active mode.
- Docker Compose reads the selected root env file through `--env-file`.
- `frontend-artifacts` receives frontend build-time values from that same Compose env file.
- `server` receives backend runtime variables from Compose interpolation based on that same file.
- When the Go server is run directly, it prefers `.env.development` for `APP_ENV=development`, `.env.staging` for `APP_ENV=staging`, and `.env.production` for `APP_ENV=production`. `GIN_MODE` still controls Gin release/debug behavior, and `ENV_FILE=/path/to/file` overrides the lookup entirely.

`NODE_ENV` and Vite mode are toolchain concerns only. They no longer control application behavior.

## Variable ownership

Frontend tooling variables:

- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_API_PROXY_TARGET`
- `VITE_PREVIEW_HOST`
- `VITE_PREVIEW_PORT`

Frontend build-time variables:

- `VITE_APP_ENV`
- `VITE_POSTHOG_API_KEY`
- `VITE_ENABLE_FREEMIUM`
- `VITE_ENABLE_THIRD_PARTY_SHELL`
- `VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ`

Compose-to-frontend build arg mappings:

- `CLIENT_ID` -> `VITE_GOOGLE_CLIENT_ID`
- `MICROSOFT_CLIENT_ID` -> `VITE_MICROSOFT_CLIENT_ID`
- the `VITE_*` build-time flags above are passed through directly

Backend runtime variables:

- `APP_ENV`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `ANDROID_CLIENT_ID`
- `IOS_CLIENT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MONGODB_URI`
- `ENCRYPTION_KEY`
- `SESSION_SECRET`
- `CORS_ORIGINS`
- `SERVICE_ACCOUNT_KEY_PATH`
- `ANALYTICS_USERNAME`
- `ANALYTICS_PASSWORD`
- `DISCORD_BOT_TOKEN`
- `GUILD_ID`
- `SLACK_DEV_WEBHOOK_URL`
- `SLACK_PROD_WEBHOOK_URL`
- `SLACK_MONETIZATION_WEBHOOK_URL`
- `MAILCHIMP_API_KEY`
- `MAILJET_API_KEY`
- `MAILJET_API_SECRET`
- `MAILJET_LIST_ID`
- `LISTMONK_ENABLED`
- `LISTMONK_URL`
- `LISTMONK_USERNAME`
- `LISTMONK_PASSWORD`
- `LISTMONK_LIST_ID`
- `LISTMONK_INITIAL_EMAIL_REMINDER_ID`
- `LISTMONK_SECOND_EMAIL_REMINDER_ID`
- `LISTMONK_FINAL_EMAIL_REMINDER_ID`
- `LISTMONK_OTP_EMAIL_TEMPLATE_ID`
- `GMAIL_APP_PASSWORD`
- `SCHEJ_EMAIL_ADDRESS`
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_MONTHLY_STUDENT_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `STRIPE_YEARLY_STUDENT_PRICE_ID`
- `STRIPE_LIFETIME_PRICE_ID`
- `STRIPE_LIFETIME_PRICE_ID_2`
- `STRIPE_LIFETIME_STUDENT_PRICE_ID`
- `GIN_MODE`

Deployment environment semantics:

- `APP_ENV=development` defaults the Go server to port `3002`, prefers `.env.development`, and defaults Gin to debug unless `GIN_MODE` overrides it.
- `APP_ENV=staging` defaults the Go server to port `3003`, prefers `.env.staging`, and defaults Gin to release unless `GIN_MODE` overrides it.
- `APP_ENV=production` defaults the Go server to port `3002`, prefers `.env.production`, and defaults Gin to release unless `GIN_MODE` overrides it.
- `VITE_APP_ENV` is the frontend-facing mirror for browser-exposed environment-dependent behavior and should normally match `APP_ENV`.

## Precedence

- For frontend tooling, shell variables override values from `.env.development`, `.env.staging`, or `.env.production`.
- For Compose commands, shell variables passed into `docker compose --env-file ...` override values from the selected env file during interpolation.
- `ENV_FILE` has highest priority for direct backend runs because it explicitly selects which file the Go server should load.

## Commands

Development:

```sh
cp .env.development.example .env.development
docker compose --env-file .env.development -f compose.yaml -f compose.development.yaml up --build mongo server
cd frontend
npm run dev
```

Staging Docker Compose:

```sh
cp .env.staging.example .env.staging
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build
```

Production-style local build/preview:

```sh
cp .env.production.example .env.production
cd frontend
npm run build
npm run preview
```

Production Docker Compose:

```sh
cp .env.production.example .env.production
docker compose --env-file .env.production up -d --build
```
