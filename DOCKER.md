# Self-Hosting Timeful.app with Docker

This guide covers deploying Timeful.app on your own server using Docker, with your existing host Nginx and Let's Encrypt handling HTTPS.

## Architecture

```
[Internet] → [Host Nginx + Let's Encrypt] → [Docker: app:3002] → [Docker: mongodb:27017]
```

- **app** — Go server serving the frontend and API
- **mongodb** — MongoDB 7 with persistent storage

## Prerequisites

- Docker and Docker Compose (v2)
- Nginx installed on the host
- Certbot (Let's Encrypt) installed on the host
- A domain name pointed at your server
- Google OAuth credentials (for authentication)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/schej-it/timeful.app.git
cd timeful.app
```

### 2. Configure environment

```bash
cp docker/.env.example server/.env
```

Edit `server/.env` and fill in the **required** values:

| Variable | Description |
|---|---|
| `MONGODB_URI` | Pre-filled for Docker (`mongodb://mongodb:27017`) |
| `CLIENT_ID` | Google OAuth client ID |
| `CLIENT_SECRET` | Google OAuth client secret |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data |
| `SESSION_SECRET` | Min 32 chars. Generate with `openssl rand -hex 32` |

Optional variables (Stripe, Slack, email, etc.) are documented in `docker/.env.example`.

### 3. Deploy

```bash
./docker/deploy.sh
```

Or manually:

```bash
docker compose up -d --build
```

Verify it's running:

```bash
docker compose ps
curl http://localhost:3002
```

### 4. Configure host Nginx

Copy the example config and customize it:

```bash
sudo cp docker/nginx-example.conf /etc/nginx/sites-available/timeful
sudo nano /etc/nginx/sites-available/timeful
# Replace YOUR_DOMAIN with your actual domain
sudo ln -s /etc/nginx/sites-available/timeful /etc/nginx/sites-enabled/
```

Obtain SSL certificates:

```bash
sudo certbot --nginx -d yourdomain.com
```

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Set CORS origin (if using a custom domain)

Add your domain to `server/.env`:

```
CORS_ORIGIN=https://yourdomain.com
```

Then restart the app:

```bash
docker compose restart app
```

## Managing the Deployment

### View logs

```bash
docker compose logs -f app        # App logs
docker compose logs -f mongodb    # MongoDB logs
```

### Stop / Start

```bash
docker compose down               # Stop all containers
docker compose up -d              # Start all containers
```

### Update to latest version

```bash
git pull
docker compose up -d --build
```

### MongoDB Backup

```bash
# Backup
docker compose exec mongodb mongodump --db=schej-it --archive=/data/db/backup.archive
docker compose cp mongodb:/data/db/backup.archive ./backup.archive

# Restore
docker compose cp ./backup.archive mongodb:/data/db/backup.archive
docker compose exec mongodb mongorestore --db=schej-it --archive=/data/db/backup.archive --drop
```

## Troubleshooting

**App won't start — "Error loading .env file"**
Ensure `server/.env` exists and is bind-mounted. Check with `docker compose logs app`.

**MongoDB connection refused**
The app container must be on the same Docker network as MongoDB. Check `docker compose ps` to ensure both are running.

**CORS errors in browser**
Set `CORS_ORIGIN=https://yourdomain.com` in `server/.env` and restart.

**Port 3002 already in use**
Change the host port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3003:3002"  # Map to a different host port
```
Update your Nginx config to proxy to the new port.
