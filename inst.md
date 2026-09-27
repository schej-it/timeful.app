
# Goal

Self-host the open-source Timeful scheduling app from:

`https://github.com/jimfangx/timeful.app`

for roughly 40 account holders, with public scheduling links that guests can fill out without creating accounts.

Target architecture:

```text
                          Internet
                             |
                       Cloudflare Free
                       time.ucb.bar
                             |
                         HTTPS/IPv6
                             |
                             v
                       GCP e2-micro
                    us-west1, Debian 12
                 1 GB RAM / 30 GB disk
                     NO external IPv4
                             |
             +---------------+---------------+
             |               |               |
          Caddy          Timeful Go       MongoDB 7
           :443            :3002          :27017
                             |               ^
                             +-- localhost --+

GitHub Actions
    |
    +-- build Vue frontend
    +-- build Go backend
    +-- deploy through Google IAP
```

Expected recurring hosting cost if all Free Tier limits are respected:

```text
GCP e2-micro        $0
30 GB pd-standard   $0
external IPv6       $0
external IPv4       none
MongoDB local       $0
Cloudflare Free     $0
GitHub Actions      $0 for normal public-repo usage
-----------------------------------------------
Total               approximately $0/month
```

The main reason MongoDB is local rather than MongoDB Atlas is that Atlas currently requires IPv4 client connectivity. Opening Atlas to `0.0.0.0/0` removes the IP allowlist requirement but does not solve the protocol problem: an IPv6-only VM still cannot directly connect to an IPv4-only Atlas endpoint. GCP external IPv4 costs money whether static or ephemeral. Therefore local MongoDB is the cleanest $0 option.

---

# Important conclusions from the investigation

## Hosting suitability

Timeful is lightweight:

- Vue 2 frontend, compiled to static files
- Go/Gin backend
- MongoDB
- Caddy reverse proxy

For approximately 40 registered users plus guest respondents, a GCP `e2-micro` is adequate if:

- all compilation happens in GitHub Actions
- Node and Go toolchains are not installed/used for builds on the VM
- MongoDB WiredTiger cache is capped at approximately 256 MB
- a 2 GB swapfile is configured

Approximate steady-state memory:

```text
MongoDB              ~300–450 MB
Timeful Go            ~50–150 MB
Caddy                 ~20–40 MB
Debian/system         ~150–250 MB
--------------------------------
Total                 ~520–890 MB
```

## Account/event behavior

One Timeful instance can have all ~40 people create accounts.

Event organizers can create public scheduling events.

People receiving an event link do not need accounts; guest responses are supported by the backend.

## Built-in 3-event limit

The open-source fork still contains the hosted Timeful paywall behavior.

The frontend currently contains roughly:

```js
numFreeEvents = 3
```

and defaults to:

```js
enablePaywall: true
```

The three-event restriction is enforced in the frontend, not the backend event creation route.

For this self-hosted deployment, disable the paywall and optionally treat all authenticated users as premium.

Recommended changes are documented near the end of this file.

## Account whitelist

The current fork does not have a built-in exact-email signup whitelist.

Recommended implementation:

```ini
ALLOWED_EMAILS=user1@berkeley.edu,user2@berkeley.edu,...
```

with an auth helper in the backend that rejects non-whitelisted emails.

Implementation is documented near the end.

---

# Deployment assumptions

Examples below use:

```text
Project ID:  YOUR_GCP_PROJECT_ID
Region:      us-west1
Zone:        us-west1-b
VM name:     timeful
Network:     timeful-net
Subnet:      timeful-west1
Domain:      time.ucb.bar
Repo:        jimfangx/timeful.app
Branch:      main
```

Change `time.ucb.bar` as needed.

If hosting directly on `ucb.bar`, use the root Cloudflare record instead of `time`.

---

# 1. Create/configure the GCP project

Open Google Cloud Shell.

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"

export REGION="us-west1"
export ZONE="us-west1-b"

export NETWORK="timeful-net"
export SUBNET="timeful-west1"
export VM="timeful"

export DOMAIN="time.ucb.bar"

gcloud config set project "$PROJECT_ID"
```

Enable required APIs:

```bash
gcloud services enable \
  compute.googleapis.com \
  iap.googleapis.com \
  oslogin.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

For Google sign-in/calendar integration:

```bash
gcloud services enable \
  calendar-json.googleapis.com \
  people.googleapis.com \
  admin.googleapis.com
```

Use `us-west1`, `us-central1`, or `us-east1` to remain within the GCP Compute Engine Free Tier.

---

# 2. Create the network

Create a custom VPC:

```bash
gcloud compute networks create "$NETWORK" \
  --subnet-mode=custom
```

Create a dual-stack subnet:

```bash
gcloud compute networks subnets create "$SUBNET" \
  --network="$NETWORK" \
  --range=10.20.0.0/24 \
  --stack-type=IPV4_IPV6 \
  --ipv6-access-type=EXTERNAL \
  --region="$REGION"
```

Desired VM networking:

```text
internal IPv4       yes
external IPv4       NO
external IPv6       yes
```

The internal IPv4 is free and only exists inside the VPC.

---

# 3. Create the free-tier VM

```bash
gcloud compute instances create "$VM" \
  --zone="$ZONE" \
  --machine-type=e2-micro \
  --subnet="$SUBNET" \
  --stack-type=IPV4_IPV6 \
  --no-address \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-type=pd-standard \
  --boot-disk-size=30GB \
  --metadata=enable-oslogin=TRUE \
  --tags=timeful-web,timeful-iap \
  --no-service-account
```

Important:

```text
--no-address
```

means no external IPv4.

Also intentionally use:

```text
--no-service-account
```

because the Timeful VM does not need to call GCP APIs with a VM identity in the base configuration.

Verify:

```bash
gcloud compute instances describe "$VM" \
  --zone="$ZONE" \
  --format='yaml(networkInterfaces)'
```

Expect:

- internal IPv4 such as `10.20.0.x`
- external IPv6
- no external IPv4

---

# 4. Record/promote the IPv6

Get the IPv6:

```bash
export IPV6="$(
  gcloud compute instances describe "$VM" \
    --zone="$ZONE" \
    --format='value(networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)'
)"

echo "$IPV6"
```

Promote it to static if supported by the CLI/account:

```bash
gcloud compute addresses create timeful-v6 \
  --region="$REGION" \
  --addresses="$IPV6" \
  --prefix-length=96
```

If that command does not work, use:

```text
Google Cloud Console
→ VPC Network
→ IP addresses
→ find the VM IPv6
→ Promote to static
```

Do this before later stopping/recreating the VM.

---

# 5. Firewall rules

## Critical GCP quirk

GCP firewall rules cannot mix IPv4 and IPv6 source ranges in one rule.

This command is invalid:

```text
--source-ranges="35.235.240.0/20,2600:2d00:1:7::/64"
```

Create separate IPv4 and IPv6 firewall rules.

## IAP SSH IPv4

```bash
gcloud compute firewall-rules create timeful-iap-ssh-v4 \
  --network="$NETWORK" \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges="35.235.240.0/20" \
  --target-tags=timeful-iap
```

## IAP SSH IPv6

```bash
gcloud compute firewall-rules create timeful-iap-ssh-v6 \
  --network="$NETWORK" \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges="2600:2d00:1:7::/64" \
  --target-tags=timeful-iap
```

## HTTPS from Cloudflare only

Cloudflare published IPv6 proxy ranges:

```bash
gcloud compute firewall-rules create timeful-cloudflare-https \
  --network="$NETWORK" \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:443 \
  --source-ranges="2400:cb00::/32,2606:4700::/32,2803:f800::/32,2405:b500::/32,2405:8100::/32,2a06:98c0::/29,2c0f:f248::/32" \
  --target-tags=timeful-web
```

Do not expose:

```text
27017  MongoDB
3002   Timeful backend
```

to the Internet.

Do not create a broad public SSH rule.

---

# 6. Give your own account IAP/OS Login access

```bash
export ME="$(gcloud config get-value account)"
```

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$ME" \
  --role="roles/iap.tunnelResourceAccessor"
```

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$ME" \
  --role="roles/compute.osAdminLogin"
```

Connect:

```bash
gcloud compute ssh "$VM" \
  --zone="$ZONE" \
  --tunnel-through-iap
```

---

# 7. Bootstrap Debian

On the VM:

```bash
curl -6 -I https://deb.debian.org
```

Verify IPv6 Internet connectivity.

Then:

```bash
sudo apt update

sudo apt install -y \
  caddy \
  ca-certificates \
  curl \
  gnupg \
  openssl \
  libcurl4 \
  libgssapi-krb5-2 \
  libldap-common \
  libwrap0 \
  libsasl2-2 \
  libsasl2-modules \
  libsasl2-modules-gssapi-mit \
  liblzma5
```

---

# 8. Add 2 GB swap

On a 1 GB `e2-micro`, this is strongly recommended.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

Persist:

```bash
echo '/swapfile none swap sw 0 0' \
  | sudo tee -a /etc/fstab
```

Reduce swappiness:

```bash
echo 'vm.swappiness=10' \
  | sudo tee /etc/sysctl.d/99-timeful.conf

sudo sysctl --system
```

Verify:

```bash
free -h
```

Expected roughly:

```text
Mem:   1.0 GiB
Swap:  2.0 GiB
```

---

# 9. Install MongoDB 7 locally

The upstream Compose setup uses MongoDB 7.

Because the VM has no external IPv4 and MongoDB download infrastructure may not always be IPv6 reachable, download MongoDB from Cloud Shell and copy it through IAP.

Exit the VM:

```bash
exit
```

In Cloud Shell:

```bash
export MONGO_VERSION="7.0.43"
```

Use the current desired/patched MongoDB 7.0 release if this version becomes stale.

```bash
curl -fLO \
  "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian12-${MONGO_VERSION}.tgz"
```

Upload through IAP:

```bash
gcloud compute scp \
  "mongodb-linux-x86_64-debian12-${MONGO_VERSION}.tgz" \
  "$VM:/tmp/mongodb.tgz" \
  --zone="$ZONE" \
  --tunnel-through-iap
```

Reconnect:

```bash
gcloud compute ssh "$VM" \
  --zone="$ZONE" \
  --tunnel-through-iap
```

Extract:

```bash
sudo tar -xzf /tmp/mongodb.tgz -C /opt
```

Set a stable symlink:

```bash
sudo ln -sfn \
  "/opt/mongodb-linux-x86_64-debian12-${MONGO_VERSION}" \
  /opt/mongodb
```

Create MongoDB user:

```bash
sudo useradd \
  --system \
  --home /var/lib/mongodb \
  --shell /usr/sbin/nologin \
  mongodb
```

Directories:

```bash
sudo mkdir -p \
  /var/lib/mongodb \
  /var/log/mongodb

sudo chown -R mongodb:mongodb \
  /var/lib/mongodb \
  /var/log/mongodb
```

---

# 10. Configure MongoDB for 1 GB RAM

Create:

```bash
sudo nano /etc/mongod.conf
```

Use:

```yaml
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.256

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  bindIp: 127.0.0.1
  port: 27017

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
```

Critical:

```yaml
bindIp: 127.0.0.1
```

MongoDB must not listen on:

```text
0.0.0.0
::
```

Internet access should be impossible.

---

# 11. Create MongoDB systemd service

```bash
sudo tee /etc/systemd/system/mongod.service >/dev/null <<'EOF'
[Unit]
Description=MongoDB
After=network.target

[Service]
Type=simple
User=mongodb
Group=mongodb

ExecStart=/opt/mongodb/bin/mongod --config /etc/mongod.conf

Restart=on-failure
RestartSec=3

LimitNOFILE=64000

[Install]
WantedBy=multi-user.target
EOF
```

Enable/start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mongod
```

Check:

```bash
sudo systemctl status mongod --no-pager
```

Check listener:

```bash
sudo ss -lntp | grep 27017
```

Expected:

```text
127.0.0.1:27017
```

---

# 12. Google OAuth configuration

Create a Google OAuth Web Application client.

Configure:

```text
Authorized JavaScript origin:
https://time.ucb.bar
```

Important correction discovered while inspecting the current fork:

```text
Authorized redirect URI:
https://time.ucb.bar/auth
```

The repo deployment README mentioned another callback path, but the current frontend code actually constructs:

```js
`${window.location.origin}/auth`
```

so `/auth` is the correct redirect for this fork.

Save:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

If the OAuth app is in Testing mode, add the intended users as test users.

---

# 13. Create the Timeful runtime account/directories

```bash
sudo useradd \
  --system \
  --home /opt/timeful \
  --shell /usr/sbin/nologin \
  timeful
```

```bash
sudo mkdir -p \
  /opt/timeful/releases \
  /etc/timeful \
  /etc/caddy/certs

sudo chown -R timeful:timeful /opt/timeful
```

---

# 14. Generate Timeful secrets

Generate two secrets:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Use them for:

```text
ENCRYPTION_KEY
SESSION_SECRET
```

`SESSION_SECRET` must be at least 32 characters.

---

# 15. Create Timeful runtime environment

```bash
sudo nano /etc/timeful/timeful.env
```

Use:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017

CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

ENCRYPTION_KEY=YOUR_RANDOM_ENCRYPTION_KEY
SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET

CORS_ORIGINS=https://time.ucb.bar

FRONTEND_DIST=/opt/timeful/current/frontend/dist
```

Optional later:

```ini
ALLOWED_EMAILS=user1@berkeley.edu,user2@berkeley.edu
```

after implementing whitelist support in source.

You do not need initially:

```text
SERVICE_ACCOUNT_KEY_PATH
LISTMONK_*
MICROSOFT_*
STRIPE_*
```

Cloud Tasks disables itself when its service account config is absent.

Protect:

```bash
sudo chown root:timeful /etc/timeful/timeful.env
sudo chmod 640 /etc/timeful/timeful.env
```

---

# 16. Create the Timeful systemd service

```bash
sudo tee /etc/systemd/system/timeful.service >/dev/null <<'EOF'
[Unit]
Description=Timeful
After=network-online.target mongod.service
Wants=network-online.target
Requires=mongod.service

[Service]
Type=simple

User=timeful
Group=timeful

WorkingDirectory=/opt/timeful/current
EnvironmentFile=/etc/timeful/timeful.env

ExecStart=/opt/timeful/current/timeful-server -release=true

Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

Do not start yet because no release exists.

```bash
sudo systemctl daemon-reload
sudo systemctl enable timeful
```

---

# 17. Create deployment helper

```bash
sudo tee /usr/local/sbin/deploy-timeful >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

archive="${1:?usage: deploy-timeful ARCHIVE}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
release="/opt/timeful/releases/$stamp"

install -d -o timeful -g timeful "$release"

tar -xzf "$archive" -C "$release"

chown -R timeful:timeful "$release"
chmod +x "$release/timeful-server"

ln -sfn "$release" /opt/timeful/current

systemctl restart timeful

find /opt/timeful/releases \
  -mindepth 1 -maxdepth 1 -type d \
  -printf '%T@ %p\n' \
  | sort -nr \
  | tail -n +6 \
  | cut -d' ' -f2- \
  | xargs -r rm -rf --
EOF

sudo chmod 755 /usr/local/sbin/deploy-timeful
```

---

# 18. Cloudflare DNS

In Cloudflare for `ucb.bar`:

Create:

```text
Type:         AAAA
Name:         time
Content:      <GCP IPv6>
Proxy status: Proxied / orange cloud
TTL:          Auto
```

Do not create an `A` record.

This allows:

```text
IPv4 browser → Cloudflare → IPv6 → GCP
IPv6 browser → Cloudflare → IPv6 → GCP
```

The origin remains IPv6-only externally.

---

# 19. Cloudflare Origin Certificate

Go to:

```text
Cloudflare
→ ucb.bar
→ SSL/TLS
→ Origin Server
→ Create Certificate
```

Create an ECC Origin CA certificate for:

```text
time.ucb.bar
```

Save certificate:

```bash
sudo nano /etc/caddy/certs/timeful.pem
```

Save key:

```bash
sudo nano /etc/caddy/certs/timeful.key
```

Permissions:

```bash
sudo chown root:root /etc/caddy/certs/timeful.pem
sudo chmod 644 /etc/caddy/certs/timeful.pem

sudo chown root:caddy /etc/caddy/certs/timeful.key
sudo chmod 640 /etc/caddy/certs/timeful.key
```

Set Cloudflare SSL mode:

```text
Full (strict)
```

Enable:

```text
Always Use HTTPS
```

---

# 20. Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

Use:

```caddy
time.ucb.bar {
    tls /etc/caddy/certs/timeful.pem /etc/caddy/certs/timeful.key

    reverse_proxy 127.0.0.1:3002

    encode gzip zstd

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }

    log {
        output file /var/log/caddy/timeful.log
        format json
    }
}
```

Validate:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

Restart:

```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
```

---

# 21. Create GitHub deployment service account

Back in Cloud Shell:

```bash
export DEPLOY_SA="github-timeful-deployer"

gcloud iam service-accounts create "$DEPLOY_SA" \
  --display-name="GitHub Timeful deployer"

export DEPLOY_SA_EMAIL="$DEPLOY_SA@$PROJECT_ID.iam.gserviceaccount.com"
```

Grant Compute visibility:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/compute.viewer"
```

OS Login admin:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/compute.osAdminLogin"
```

IAP:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/iap.tunnelResourceAccessor"
```

---

# 22. GitHub → GCP Workload Identity Federation

Create pool:

```bash
gcloud iam workload-identity-pools create github \
  --project="$PROJECT_ID" \
  --location=global \
  --display-name="GitHub Actions"
```

Create provider restricted to this repo and branch:

```bash
gcloud iam workload-identity-pools providers create-oidc timeful \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool=github \
  --display-name="jimfangx/timeful.app" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='jimfangx/timeful.app' && assertion.ref=='refs/heads/main'"
```

Get pool name:

```bash
export POOL_NAME="$(
  gcloud iam workload-identity-pools describe github \
    --project="$PROJECT_ID" \
    --location=global \
    --format='value(name)'
)"
```

Authorize the repo:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "$DEPLOY_SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/jimfangx/timeful.app"
```

Get provider resource name:

```bash
export PROVIDER_NAME="$(
  gcloud iam workload-identity-pools providers describe timeful \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool=github \
    --format='value(name)'
)"

echo "$PROVIDER_NAME"
echo "$DEPLOY_SA_EMAIL"
```

---

# 23. GitHub repository variables

In:

```text
jimfangx/timeful.app
→ Settings
→ Secrets and variables
→ Actions
→ Variables
```

add:

```text
GCP_PROJECT_ID
GCP_WIF_PROVIDER
GCP_SERVICE_ACCOUNT
GCP_ZONE
GCP_VM
GOOGLE_CLIENT_ID
```

Typical values:

```text
GCP_PROJECT_ID
    your-project-id

GCP_WIF_PROVIDER
    projects/123456789/locations/global/workloadIdentityPools/github/providers/timeful

GCP_SERVICE_ACCOUNT
    github-timeful-deployer@your-project-id.iam.gserviceaccount.com

GCP_ZONE
    us-west1-b

GCP_VM
    timeful

GOOGLE_CLIENT_ID
    xxxxxxxxx.apps.googleusercontent.com
```

Commands to print most of them:

```bash
echo "GCP_PROJECT_ID=$(gcloud config get-value project)"

echo "GCP_ZONE=$(
  gcloud compute instances list \
    --filter='name=timeful' \
    --format='value(zone.basename())'
)"

echo "GCP_VM=$(
  gcloud compute instances list \
    --filter='name=timeful' \
    --format='value(name)'
)"

echo "GCP_SERVICE_ACCOUNT=$(
  gcloud iam service-accounts list \
    --filter='email:github-timeful-deployer@' \
    --format='value(email)'
)"

echo "GCP_WIF_PROVIDER=$(
  gcloud iam workload-identity-pools providers describe timeful \
    --location=global \
    --workload-identity-pool=github \
    --format='value(name)'
)"
```

Get `GOOGLE_CLIENT_ID` from:

```text
Google Cloud Console
→ Google Auth Platform
→ Clients
```

---

# 24. GitHub Actions workflow

Create:

```text
.github/workflows/deploy.yml
```

Use:

```yaml
name: Deploy Timeful

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

concurrency:
  group: timeful-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Build frontend
        working-directory: frontend
        env:
          VUE_APP_GOOGLE_CLIENT_ID: ${{ vars.GOOGLE_CLIENT_ID }}
          VUE_APP_POSTHOG_API_KEY: ""
          VUE_APP_MICROSOFT_CLIENT_ID: ""
        run: |
          npm ci
          npm run build

      - name: Set up Go
        uses: actions/setup-go@v6
        with:
          go-version: "1.25"
          cache-dependency-path: server/go.sum

      - name: Build backend
        working-directory: server
        env:
          CGO_ENABLED: "0"
          GOOS: linux
          GOARCH: amd64
        run: |
          go build \
            -buildvcs=false \
            -trimpath \
            -ldflags="-s -w" \
            -o ../timeful-server \
            .

      - name: Package release
        run: |
          mkdir -p release/frontend

          cp timeful-server release/timeful-server
          cp -a frontend/dist release/frontend/dist

          chmod +x release/timeful-server

          tar -C release -czf timeful-release.tar.gz .

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v3
        with:
          project_id: ${{ vars.GCP_PROJECT_ID }}
          workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
          service_account: ${{ vars.GCP_SERVICE_ACCOUNT }}

      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v3

      - name: Upload release
        run: |
          gcloud compute scp \
            timeful-release.tar.gz \
            "${{ vars.GCP_VM }}:/tmp/timeful-release.tar.gz" \
            --project="${{ vars.GCP_PROJECT_ID }}" \
            --zone="${{ vars.GCP_ZONE }}" \
            --tunnel-through-iap \
            --quiet

      - name: Activate release
        run: |
          gcloud compute ssh \
            "${{ vars.GCP_VM }}" \
            --project="${{ vars.GCP_PROJECT_ID }}" \
            --zone="${{ vars.GCP_ZONE }}" \
            --tunnel-through-iap \
            --quiet \
            --command="sudo /usr/local/sbin/deploy-timeful /tmp/timeful-release.tar.gz && rm -f /tmp/timeful-release.tar.gz"
```

Push:

```bash
git add .github/workflows/deploy.yml
git commit -m "Deploy Timeful to GCP"
git push origin main
```

---

# 25. Important IAM failure that occurred during deployment

Observed GitHub Actions failure:

```text
ERROR: (gcloud.compute.scp) PERMISSION_DENIED:
User does not have iam.serviceAccounts.actAs permission
on the instance's service account.
```

This happens if the VM has a service account attached.

If the VM was created exactly with:

```text
--no-service-account
```

this should not occur.

If it does occur, inspect:

```bash
export VM_SA="$(
  gcloud compute instances describe "$VM" \
    --project="$PROJECT_ID" \
    --zone="$ZONE" \
    --format='value(serviceAccounts.email)'
)"

echo "$VM_SA"
```

If an attached service account exists, grant the GitHub deployment identity Service Account User on only that account:

```bash
gcloud iam service-accounts add-iam-policy-binding "$VM_SA" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

This provides:

```text
iam.serviceAccounts.actAs
```

Better long-term option: remove the VM-attached service account entirely if it is unnecessary.

To remove one:

```bash
gcloud compute instances stop "$VM" \
  --project="$PROJECT_ID" \
  --zone="$ZONE"

gcloud compute instances set-service-account "$VM" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --no-service-account \
  --no-scopes

gcloud compute instances start "$VM" \
  --project="$PROJECT_ID" \
  --zone="$ZONE"
```

Only do this after making sure the VM IPv6 is static.

---

# 26. Verify deployment

SSH:

```bash
gcloud compute ssh timeful \
  --zone=us-west1-b \
  --tunnel-through-iap
```

MongoDB:

```bash
sudo systemctl status mongod --no-pager
```

Timeful:

```bash
sudo systemctl status timeful --no-pager
```

Caddy:

```bash
sudo systemctl status caddy --no-pager
```

Memory:

```bash
free -h
```

Processes:

```bash
ps aux --sort=-%mem | head
```

Backend:

```bash
curl http://127.0.0.1:3002/api/health
```

Mongo listener:

```bash
sudo ss -lntp | grep 27017
```

Expected:

```text
127.0.0.1:27017
```

Open:

```text
https://time.ucb.bar
```

---

# 27. End-to-end functional test

Test:

1. Sign in with Google.
2. Create an event.
3. Copy the public event URL.
4. Open incognito/private browsing.
5. Do not sign in.
6. Fill out availability as a guest.
7. Return to organizer account.
8. Verify guest response appears.

This confirms both account-based organizers and unauthenticated guest respondents work.

---

# 28. Add exact-email signup whitelist

The current fork has no built-in whitelist.

Recommended environment interface:

```ini
ALLOWED_EMAILS=alice@berkeley.edu,bob@berkeley.edu,charlie@berkeley.edu
```

In:

```text
server/routes/auth.go
```

add imports for `os` and `strings` if not already present.

Add:

```go
func isAllowedEmail(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))

	raw := os.Getenv("ALLOWED_EMAILS")
	if raw == "" {
		return true
	}

	for _, allowed := range strings.Split(raw, ",") {
		if email == strings.ToLower(strings.TrimSpace(allowed)) {
			return true
		}
	}

	return false
}
```

In the common sign-in helper, immediately after:

```go
email = utils.NormalizeEmail(email)
```

add:

```go
if !isAllowedEmail(email) {
	return models.User{}, fmt.Errorf("email not allowed")
}
```

If enabling OTP/email login, also reject non-whitelisted users in the OTP routes:

```go
if !isAllowedEmail(email) {
	c.JSON(http.StatusForbidden, gin.H{"error": "email-not-allowed"})
	return
}
```

Ideally apply this to:

```text
sendOtp()
verifyOtp()
checkEmail()
```

Then add to `/etc/timeful/timeful.env`:

```ini
ALLOWED_EMAILS=user1@example.com,user2@example.com,...
```

Restart after deployment:

```bash
sudo systemctl restart timeful
```

---

# 29. Disable the 3-events/month paywall

The open-source version does not automatically disable Timeful's hosted-service monetization logic.

Current frontend behavior includes:

```js
numFreeEvents = 3
```

and:

```js
enablePaywall: true
```

The frontend prevents creation after the free quota if the user is not premium.

The backend event creation route itself does not currently enforce the three-event limit.

## Recommended change 1

In:

```text
frontend/src/store/index.js
```

change:

```diff
- enablePaywall: true,
+ enablePaywall: false,
```

## Recommended change 2

In:

```text
frontend/src/utils/general_utils.js
```

replace the Stripe-based premium logic with:

```js
export const isPremiumUser = (authUser) => {
  return !!authUser
}
```

This makes:

```text
authenticated user = full/premium self-hosted functionality
guest              = guest
```

For this private ~40-person instance, that is the cleanest semantic model.

Commit:

```bash
git add frontend/src/store/index.js \
        frontend/src/utils/general_utils.js

git commit -m "Disable hosted paywall for self-hosted deployment"

git push origin main
```

GitHub Actions rebuilds/deploys automatically.

---

# 30. Why local MongoDB rather than Atlas

MongoDB Atlas was originally considered because its M0 tier is free.

However:

```text
IPv6-only GCP VM
      |
      X
      |
MongoDB Atlas IPv4 endpoint
```

cannot directly connect.

Even if Atlas Network Access is set to:

```text
0.0.0.0/0
```

the actual TCP connection still requires IPv4.

Possible ways to reach Atlas:

```text
external IPv4 on VM    costs about $3.65/month
Cloud NAT              costs money
NAT64 bridge           extra infrastructure
local MongoDB          free
```

Therefore local MongoDB is preferred for this deployment.

---

# 31. Why not Cloudflare-only hosting

Pure Cloudflare Pages/Workers was considered.

The frontend would work easily on Cloudflare, but the existing Go/Gin application is not directly a Workers application.

Cloudflare Containers could run the Go server, but persistent MongoDB storage cannot simply live inside an ephemeral container.

That architecture would require:

```text
Cloudflare Container
        |
external MongoDB
```

and is more complex than necessary for 40 users.

The single free GCP VM is much simpler.

---

# 32. AWS comparison

AWS can host the application, but its current free program for newer accounts is based on temporary free-plan/credits rather than a permanent always-free EC2 VM.

Suitable AWS sizes would be:

```text
t3.micro   2 vCPU / 1 GB   workable with care
t3.small   2 vCPU / 2 GB   comfortable
t4g.small  2 vCPU / 2 GB   ARM, assuming builds support it
```

Long-term, GCP's `e2-micro` was chosen because the goal is a true approximately $0 recurring deployment.

---

# 33. Operational notes

## Monitor memory

```bash
free -h
```

```bash
ps aux --sort=-%mem | head
```

If Mongo/Timeful routinely cause hundreds of MB of swap use or OOM kills, move to a 2 GB VM.

## Inspect Mongo logs

```bash
sudo journalctl -u mongod -n 200 --no-pager
```

or:

```bash
sudo tail -n 200 /var/log/mongodb/mongod.log
```

## Inspect Timeful logs

```bash
sudo journalctl -u timeful -n 200 --no-pager
```

## Inspect Caddy

```bash
sudo journalctl -u caddy -n 200 --no-pager
```

## Restart

```bash
sudo systemctl restart mongod
sudo systemctl restart timeful
sudo systemctl restart caddy
```

---

# 34. Strongly recommended follow-up: backups

With local MongoDB, the GCP disk is the primary copy of all account/event data.

Add an off-machine backup.

At minimum:

```bash
mongodump
```

nightly, compressed and copied elsewhere.

Potential destinations:

- another machine you control
- Cloudflare R2
- Google Cloud Storage if costs are acceptable
- GitHub is not appropriate for private database dumps

Do not rely solely on the VM disk.

---

# 35. Set a billing alert

Even when targeting Free Tier:

```text
Google Cloud Console
→ Billing
→ Budgets & alerts
```

Create something like:

```text
Monthly budget: $5
Alerts: 50%, 90%, 100%
```

Budget alerts do not automatically stop billing, but they catch mistakes.

---

# Final desired configuration

```text
                         time.ucb.bar
                              |
                         Cloudflare
                              |
                            IPv6
                              |
                              v
                   GCP e2-micro Free Tier
                    1 GB RAM + 2 GB swap
                         30 GB disk
                              |
         +--------------------+-------------------+
         |                    |                   |
      Caddy                Timeful             MongoDB
       443                   3002               27017
         |                    |                   |
         +--------------------+-------------------+
                          localhost

No public IPv4
No Docker required
No Node builds on VM
No Go builds on VM
No Atlas
No exposed MongoDB
No public SSH
GitHub Actions builds/releases
Google IAP handles deployment SSH/SCP
Cloudflare handles public IPv4/IPv6 users
Exact-email account whitelist
Paywall disabled
Authenticated users receive full self-hosted functionality
Guests can respond to event links without accounts
```

The key pitfalls already discovered were:

1. GCP firewall rules cannot mix IPv4 and IPv6 source ranges; split them.
2. The current fork uses `https://<host>/auth` as the Google OAuth redirect.
3. External GCP IPv4 costs money even if ephemeral.
4. Atlas needs IPv4 connectivity; `0.0.0.0/0` does not eliminate that requirement.
5. Local MongoDB fits on the `e2-micro` if capped and paired with swap.
6. Build everything in GitHub Actions, not on the 1 GB VM.
7. If GitHub SCP reports `iam.serviceAccounts.actAs`, the VM has an attached service account; either grant the deploy account `roles/iam.serviceAccountUser` on it or remove the VM service account.
8. The open-source frontend still contains the 3-events/month paywall; explicitly disable it for this deployment.
9. The current fork does not have an account whitelist; add one in the auth backend.
