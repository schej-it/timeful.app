<div align="center">
  
<img src="./.github/assets/images/logo.svg" width="200px" alt="Timeful logo" />

</div>
<br />
<div align="center">

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-orange.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Donate](https://img.shields.io/badge/-Donate%20with%20Paypal-blue?logo=paypal)](https://www.paypal.com/donate/?hosted_button_id=KWCH6LGJCP6E6)
[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/timeful_app?label=%40timeful_app&labelColor=white)](https://x.com/timeful_app)
[![Discord](https://img.shields.io/badge/-Join%20Discord-7289DA?logo=discord&logoColor=white)](https://discord.gg/v6raNqYxx3)
[![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/schej?label=join%20r%2Fschej)](https://www.reddit.com/r/schej/)

</div>

<img src="./.github/assets/images/hero.jpg" alt="Timeful hero" />

Timeful is a scheduling platform helps you find the best time for a group to meet. It is a free availability poll that is easy to use and integrates with your calendar.

Hosted version of the site: https://timeful.app

Built with [Vue 2](https://github.com/vuejs/vue), [MongoDB](https://github.com/mongodb/mongo), [Go](https://github.com/golang/go), and [TailwindCSS](https://github.com/tailwindlabs/tailwindcss)

## Demo

[![demo video](http://markdown-videos-api.jorgenkh.no/youtube/vFkBC8BrkOk)](https://www.youtube.com/watch?v=vFkBC8BrkOk)

## Features

- See when everybody's availability overlaps
- Easily specify date + time ranges to meet between
- Google calendar, Outlook, Apple calendar integration
- "Available" vs. "If needed" times
- Determine when a subset of people are available
- Schedule across different time zones
- Email notifications + reminders
- Duplicating polls
- Availability groups - stay up to date with people's real-time calendar availability
- Export availability as CSV
- Only show responses to event creator

## Local development
- Prereqs: Node 18+, Go 1.20+, MongoDB on `localhost:27017`, GCP service account key JSON.
- Backend: create `server/.env` (includes `SERVICE_ACCOUNT_KEY_PATH` and any Stripe/OAuth/email keys), start Mongo, then `cd server && air` (or `go run main.go`) to run `http://localhost:3002/api`. Cloud Tasks is skipped if `SERVICE_ACCOUNT_KEY_PATH` is unset or the file is missing.
- Frontend: `cd frontend && npm install && npm run serve` to run `http://localhost:8080` against the local API; `npm run build` to serve from Go.
- Detailed steps and env samples: `docs/local-dev.md`.
- Docker options:
  - Hybrid (Mongo only): `docker compose up -d mongo`, then run Go/Vue locally after installing deps.
  - Full stack: `docker compose up --build` spins up Mongo, the Go API, and the Vue dev server (see `docs/local-dev.md` for env/secrets prep).
- Tool versions: `.tool-versions` pins `golang 1.20.14` and `nodejs 18.20.2` (works with asdf or as a reference) to avoid mismatched runtimes with the Go module and Vue CLI 5 stack.
- asdf + zsh: `asdf plugin add golang nodejs` (if not present), `asdf install`, ensure `source "$HOME/.asdf/asdf.sh"` is in `~/.zshrc`, and add `export PATH="$PATH:$(go env GOPATH)/bin"` so Go-installed tools (e.g., `air`) are found.
- Seed demo data (optional): `cd server/scripts/seed_demo && MONGODB_URI=mongodb://localhost:27017 go run main.go` creates a demo user/event for local testing. Avoid running other scripts in `server/scripts/*` unless you know the migration you need.

## Self-hosting

Coming soon...
