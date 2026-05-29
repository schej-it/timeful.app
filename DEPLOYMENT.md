# Timeful Deployment Guide

Production and staging deployment using Docker Compose behind a Caddy reverse proxy.

## Prerequisites

- Docker and Docker Compose
- Caddy on the host (for reverse proxy + automatic HTTPS, although you can use any reverse proxy)
- Domain with DNS pointing to your server

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/schej-it/timeful.app
cd timeful.app

# 2. Create the root deployment environment file
cp .env.production.example .env.production
# Or for staging:
# cp .env.staging.example .env.staging

# Edit the selected env file with your values (see Configuration below)

# 3. Build and start services
docker compose --env-file .env.production up -d --build
# Or for staging:
# docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build

# 4. Configure Caddy
sudo cp Caddyfile.example /etc/caddy/Caddyfile
# Edit /etc/caddy/Caddyfile with your domain
sudo systemctl reload caddy
```

## Services

| Service              | Description                                                   | Port           |
| -------------------- | ------------------------------------------------------------- | -------------- |
| `mongo`              | MongoDB 7 database                                            | Internal only  |
| `frontend-artifacts` | Vue.js artifact export (outputs to shared volume, then exits) | N/A            |
| `server`             | Go backend                                                    | 127.0.0.1:3002 |

For staging, use `.env.staging` together with `compose.staging.yaml`; the server binds `127.0.0.1:3003`.

## Caddy

The example Caddyfile proxies all traffic to the Go backend on port 3002. Caddy handles:

- Automatic HTTPS certificates
- HTTP → HTTPS redirect
- www → non-www redirect
- Compression (gzip/zstd)
- Security headers

Edit `/etc/caddy/Caddyfile` with your domain before reloading.

## Commands

> [!CAUTION]
> Use `down -v` only when intentionally discarding the Docker-managed data volumes for the selected environment.
>
> For production, this deletes the MongoDB data volume unless a backup is restored afterward.

```bash
docker compose --env-file .env.production up -d              # Start services
docker compose --env-file .env.production logs -f            # View logs
docker compose --env-file .env.production logs -f server     # View specific service logs
docker compose --env-file .env.production up -d --build      # Rebuild after code changes
docker compose --env-file .env.production down               # Stop services
docker compose --env-file .env.production down -v            # Stop and remove volumes (deletes data!)
```

Staging uses the same base commands with the staging env file and override:

```bash
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml logs -f
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml down
```

## Data & Backup

Data is persisted in Docker volumes: `mongo_data`, `frontend_dist`, `server_logs`.

The restore command below uses `--drop`.

> [!CAUTION]
> Run it only when you intend to replace the current `schej-it` database with the backup archive.

```bash
# Backup MongoDB
docker compose --env-file .env.production exec mongo mongodump --db=schej-it --archive=/data/db/backup.archive
docker compose --env-file .env.production cp mongo:/data/db/backup.archive ./backup.archive

# Restore MongoDB
docker compose --env-file .env.production cp ./backup.archive mongo:/data/db/backup.archive
docker compose --env-file .env.production exec mongo mongorestore --drop --db=schej-it --archive=/data/db/backup.archive
```

## Troubleshooting

```bash
# Container won't start
docker compose --env-file .env.production logs server
ls -la .env.production

# MongoDB connection issues
docker compose --env-file .env.production ps
docker compose --env-file .env.production exec mongo mongosh --eval "db.adminCommand('ping')"

# Frontend not loading
docker compose --env-file .env.production logs frontend-artifacts
docker compose --env-file .env.production exec server ls -la /app/frontend/dist
```

---

## Configuration

### Required Environment Variables

Create `.env.production` from `.env.production.example` for production, or `.env.staging` from `.env.staging.example` for staging.

The selected root env file is the single source of truth for:

- Docker Compose interpolation
- frontend build args
- backend runtime configuration

See `docs/environments.md` for the full contract and development commands.

#### Required

| Variable         | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `CLIENT_ID`      | Google OAuth client ID                                                      |
| `CLIENT_SECRET`  | Google OAuth client secret                                                  |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data (generate with `openssl rand -base64 32`) |
| `SESSION_SECRET` | Session cookie encryption key (generate with `openssl rand -base64 32`)     |

#### Optional — Payments

| Variable                | Description                        |
| ----------------------- | ---------------------------------- |
| `STRIPE_API_KEY`        | Stripe API key                     |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret      |
| `STRIPE_*_PRICE_ID`     | Stripe price IDs for various plans |

#### Optional — Additional Calendars

| Variable                  | Description                             |
| ------------------------- | --------------------------------------- |
| `MICROSOFT_CLIENT_ID`     | Microsoft OAuth client ID (for Outlook) |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret           |

#### Optional — CORS

| Variable       | Description                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS` | Comma-separated allowed origins (default: production domains). For local development, set to `http://localhost:8080` |

#### Optional — Other Services

| Variable                                     | Description                                  |
| -------------------------------------------- | -------------------------------------------- |
| `ANALYTICS_USERNAME` / `ANALYTICS_PASSWORD`  | Basic auth for /api/analytics routes         |
| `SERVICE_ACCOUNT_KEY_PATH`                   | Google Cloud service account for Cloud Tasks |
| `SLACK_*_WEBHOOK_URL`                        | Slack webhooks for notifications             |
| `GMAIL_APP_PASSWORD` / `SCHEJ_EMAIL_ADDRESS` | Gmail SMTP for sending emails                |
| `LISTMONK_*`                                 | Listmonk email service configuration         |
| `DISCORD_BOT_TOKEN` / `GUILD_ID`             | Discord bot integration                      |

See `.env.production.example` and `.env.staging.example` for the complete lists.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Google Calendar API
   - People API (Contacts)
   - Admin SDK API (Directory)
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback`
   - `http://localhost:3002/api/auth/callback` (for development)
6. Copy the Client ID and Client Secret to your `.env`
