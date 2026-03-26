# Self-Hosting Timeful.app with Docker

Deploy Timeful.app on your own server using Docker. This setup assumes your host machine already runs **Nginx** and **Let's Encrypt (certbot)** for HTTPS termination.

## Architecture

```
[Internet] → [Host Nginx + Let's Encrypt] → [Docker: app:3002] → [Docker: mongodb:27017]
```

| Container | Purpose |
|---|---|
| **app** | Go server serving the frontend and API |
| **mongodb** | MongoDB 7 with persistent storage |

The host's Nginx reverse-proxies HTTPS traffic to the app container on port 3002.

## Prerequisites

- Docker and Docker Compose v2
- Nginx + certbot on the host machine
- A domain name pointed at your server
- Google OAuth credentials ([create here](https://console.cloud.google.com/apis/credentials))

## Quick Start

```bash
# 1. Clone
git clone https://github.com/schej-it/timeful.app.git
cd timeful.app

# 2. Configure
cp deploy/.env.example deploy/.env
# Edit deploy/.env — fill in CLIENT_ID, CLIENT_SECRET, ENCRYPTION_KEY,
# SESSION_SECRET, BASE_URL, and CORS_ORIGIN

# 3. Deploy
./deploy/deploy.sh
```

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `CLIENT_ID` | Google OAuth client ID |
| `CLIENT_SECRET` | Google OAuth client secret |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data |
| `SESSION_SECRET` | Min 32 chars. Generate: `openssl rand -hex 32` |
| `BASE_URL` | Your instance's public URL (e.g. `https://timeful.example.com`) |
| `CORS_ORIGIN` | Same as `BASE_URL` |

### Optional

See `deploy/.env.example` for all optional integrations (Stripe, Slack, email, Google Cloud Tasks, etc.).

## Host Nginx Configuration

Copy and customize the example config:

```bash
sudo cp deploy/nginx-example.conf /etc/nginx/sites-available/timeful
sudo nano /etc/nginx/sites-available/timeful   # Replace YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/timeful /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

## Google OAuth Setup

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Create an OAuth 2.0 Client ID (Web application type)
2. Add your domain to **Authorized JavaScript origins**: `https://yourdomain.com`
3. Add to **Authorized redirect URIs**: `https://yourdomain.com/api/auth/google-callback`
4. Copy the Client ID and Secret to `deploy/.env`

## Build-Time Patches

To avoid modifying upstream source files (making updates easier), a patch file is applied during the Docker build. The patch (`deploy/patches/self-hosting.patch`) makes these changes:

- **MongoDB URI**: Reads from `MONGODB_URI` env var (defaults to `mongodb://localhost`)
- **Base URL**: Reads from `BASE_URL` env var (defaults to `https://timeful.app`)
- **CORS**: Reads additional origin from `CORS_ORIGIN` env var
- **Google Cloud Tasks**: Skips initialization if `SERVICE_ACCOUNT_KEY_PATH` is not set (prevents crash)
- **.env file**: Non-fatal if missing (env vars are passed via Docker)

If you update the upstream project and the patch fails to apply, you may need to regenerate it against the new code.

## Managing the Deployment

```bash
cd deploy/

# View logs
docker compose logs -f app
docker compose logs -f mongodb

# Stop / Start
docker compose down
docker compose up -d

# Update to latest
cd ..
git pull
cd deploy/
docker compose up -d --build

# Change port (edit docker-compose.yml ports, then)
docker compose up -d
```

## MongoDB Backup & Restore

```bash
cd deploy/

# Backup
docker compose exec mongodb mongodump --db=schej-it --archive=/tmp/backup.archive
docker compose cp mongodb:/tmp/backup.archive ./backup.archive

# Restore
docker compose cp ./backup.archive mongodb:/tmp/backup.archive
docker compose exec mongodb mongorestore --db=schej-it --archive=/tmp/backup.archive --drop
```

## Troubleshooting

| Problem | Solution |
|---|---|
| App won't start | Check `docker compose logs app` for errors |
| MongoDB connection refused | Ensure both containers are running: `docker compose ps` |
| CORS errors in browser | Set `CORS_ORIGIN=https://yourdomain.com` in `.env`, restart |
| Port 3002 in use | Change port in `docker-compose.yml`: `"3003:3002"`, update Nginx |
| Patch fails on update | Regenerate patch against the new upstream code |
