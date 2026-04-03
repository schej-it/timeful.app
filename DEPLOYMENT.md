# Timeful Deployment Guide

Two deployment methods are available — pick whichever fits your setup:

| Method | Best for |
|--------|----------|
| [Docker Compose](#docker-compose) | Most servers, quick setup |
| [NixOS Flake](#nixos-flake) | Declarative NixOS hosts |

Both methods require the same environment variables and OAuth credentials — see [Configuration](#configuration).

---

## Docker Compose

<details open>
<summary><b>Deploy with Docker Compose + Caddy reverse proxy</b></summary>

### Prerequisites

- Docker and Docker Compose
- Caddy on the host (for reverse proxy + automatic HTTPS)
- Domain with DNS pointing to your server

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Razboy20/timeful.app
cd timeful.app

# 2. Create server environment file
cp server/.env.template server/.env
# Edit server/.env with your values (see Configuration below)

# 3. Build and start services
docker compose up -d --build

# 4. Configure Caddy
sudo cp Caddyfile.example /etc/caddy/Caddyfile
# Edit /etc/caddy/Caddyfile with your domain
sudo systemctl reload caddy
```

### Services

| Service | Description | Port |
|---------|-------------|------|
| `mongo` | MongoDB 7 database | Internal only |
| `frontend` | Vue.js build (outputs to shared volume) | N/A |
| `server` | Go backend | 127.0.0.1:3002 |

### Caddy

The example Caddyfile proxies all traffic to the Go backend on port 3002. Caddy handles:

- Automatic HTTPS certificates
- HTTP → HTTPS redirect
- www → non-www redirect
- Compression (gzip/zstd)
- Security headers

Edit `/etc/caddy/Caddyfile` with your domain before reloading.

### Commands

```bash
docker compose up -d              # Start services
docker compose logs -f            # View logs
docker compose logs -f server     # View specific service logs
docker compose up -d --build      # Rebuild after code changes
docker compose down               # Stop services
docker compose down -v            # Stop and remove volumes (deletes data!)
```

### Data & Backup

Data is persisted in Docker volumes: `mongo_data`, `frontend_dist`, `server_logs`.

```bash
# Backup MongoDB
docker compose exec mongo mongodump --db=schej-it --archive=/data/db/backup.archive
docker compose cp mongo:/data/db/backup.archive ./backup.archive

# Restore MongoDB
docker compose cp ./backup.archive mongo:/data/db/backup.archive
docker compose exec mongo mongorestore --drop --db=schej-it --archive=/data/db/backup.archive
```

### Troubleshooting

```bash
# Container won't start
docker compose logs server
ls -la server/.env

# MongoDB connection issues
docker compose ps
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Frontend not loading
docker compose logs frontend
docker compose exec server ls -la /app/frontend/dist
```

</details>

---

## NixOS Flake

<details>
<summary><b>Deploy with a NixOS flake module</b></summary>

The server and frontend are built as native Nix derivations. MongoDB runs as a Podman OCI container.

### Setup

```bash
# 1. Create the environment file
sudo mkdir -p /var/lib/timeful
sudo cp server/.env.template /var/lib/timeful/.env
sudo chmod 600 /var/lib/timeful/.env
sudo chown timeful:timeful /var/lib/timeful/.env
# Edit /var/lib/timeful/.env with your values (see Configuration below)
```

Add Timeful as a flake input and import the module:

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    timeful.url = "github:Razboy20/timeful.app";
  };

  outputs = { nixpkgs, timeful, ... }: {
    nixosConfigurations.my-host = nixpkgs.lib.nixosSystem {
      modules = [
        ./configuration.nix
        timeful.nixosModules.default
      ];
    };
  };
}
```

```nix
# configuration.nix
{
  services.timeful = {
    enable = true;
    domain = "timeful.example.com";
    envFile = "/var/lib/timeful/.env";
    # Optional: bake OAuth client IDs into the frontend build
    # googleClientId = "your-google-client-id";
    # microsoftClientId = "your-microsoft-client-id";
  };
}
```

```bash
# Apply the configuration
sudo nixos-rebuild switch --flake .#my-host
```

### Module Options

| Option | Default | Description |
|--------|---------|-------------|
| `enable` | `false` | Enable Timeful service |
| `domain` | — | Domain name (required) |
| `enableCaddy` | `true` | Set up Caddy reverse proxy |
| `envFile` | `/var/lib/timeful/.env` | Path to environment file |
| `dataDir` | `/var/lib/timeful` | Data directory |
| `port` | `3002` | Server listen port |
| `googleClientId` | `""` | Google OAuth client ID (frontend build) |
| `microsoftClientId` | `""` | Microsoft OAuth client ID (frontend build) |
| `posthogApiKey` | `""` | PostHog analytics key (frontend build) |

### Architecture

- **Go server** — Nix-built binary running as a systemd service (`timeful.service`)
- **MongoDB 7** — Podman OCI container managed by systemd (`podman-timeful-mongo.service`)
- **Caddy** — Optional reverse proxy with automatic HTTPS (disable with `enableCaddy = false`)

### Updating

```bash
nix flake update timeful
sudo nixos-rebuild switch --flake .#my-host
```

</details>

---

## Configuration

### Required Environment Variables

Create `server/.env` from the template (`server/.env.template`).

#### Required

| Variable | Description |
|----------|-------------|
| `CLIENT_ID` | Google OAuth client ID |
| `CLIENT_SECRET` | Google OAuth client secret |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data (32-character random string) |

#### Optional — Payments

| Variable | Description |
|----------|-------------|
| `STRIPE_API_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_*_PRICE_ID` | Stripe price IDs for various plans |

#### Optional — Additional Calendars

| Variable | Description |
|----------|-------------|
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID (for Outlook) |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret |

#### Optional — Other Services

| Variable | Description |
|----------|-------------|
| `ANALYTICS_USERNAME` / `ANALYTICS_PASSWORD` | Basic auth for /api/analytics routes |
| `SERVICE_ACCOUNT_KEY_PATH` | Google Cloud service account for Cloud Tasks |
| `SLACK_*_WEBHOOK_URL` | Slack webhooks for notifications |
| `GMAIL_APP_PASSWORD` / `SCHEJ_EMAIL_ADDRESS` | Gmail SMTP for sending emails |
| `LISTMONK_*` | Listmonk email service configuration |
| `DISCORD_BOT_TOKEN` / `GUILD_ID` | Discord bot integration |

See `server/.env.template` for the complete list.

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
