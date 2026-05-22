# Environment Files

Timeful uses one root env file per environment:

- `.env.dev` for local development
- `.env.prod` for production builds and production-style runs

Shareable defaults live in:

- `.env.dev.example`
- `.env.prod.example`

## How the env files are used

- Frontend dev tooling reads `.env.dev` through `frontend/config/tooling.ts`.
- Frontend production builds and `vite preview` read `.env.prod`.
- Vite client env loading uses the repo root as `envDir`, so `import.meta.env.VITE_*` also comes from the same root file for the active mode.
- Docker Compose reads the selected root env file through `--env-file`.
- `frontend-artifacts` receives frontend build-time values from that same Compose env file.
- `server` receives backend runtime variables from Compose interpolation based on that same file.
- When the Go server is run directly, it prefers `.env.dev` in debug-style runs and `.env.prod` in production-style runs. `ENV_FILE=/path/to/file` overrides that lookup.

## Variable ownership

Frontend tooling variables:

- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_API_PROXY_TARGET`
- `VITE_PREVIEW_HOST`
- `VITE_PREVIEW_PORT`

Frontend build-time variables:

- `VITE_POSTHOG_API_KEY`
- `VITE_ENABLE_FREEMIUM`
- `VITE_ENABLE_THIRD_PARTY_SHELL`
- `VITE_SHOW_FORMERLY_KNOWN_AS_SCHEJ`

Compose-to-frontend build arg mappings:

- `CLIENT_ID` -> `VITE_GOOGLE_CLIENT_ID`
- `MICROSOFT_CLIENT_ID` -> `VITE_MICROSOFT_CLIENT_ID`
- the `VITE_*` build-time flags above are passed through directly

Backend runtime variables:

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

## Precedence

- For frontend tooling, shell variables override values from `.env.dev` or `.env.prod`.
- For Compose commands, shell variables passed into `docker compose --env-file ...` override values from the selected env file during interpolation.
- `ENV_FILE` has highest priority for direct backend runs because it explicitly selects which file the Go server should load.

## Commands

Development:

```sh
cp .env.dev.example .env.dev
docker compose --env-file .env.dev -f compose.yaml -f compose.dev.yaml up --build mongo server
cd frontend
npm run dev
```

Production-style local build/preview:

```sh
cp .env.prod.example .env.prod
cd frontend
npm run build
npm run preview
```

Production Docker Compose:

```sh
cp .env.prod.example .env.prod
docker compose --env-file .env.prod up -d --build
```
