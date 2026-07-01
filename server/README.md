# Schej.it API

Swagger (when running): http://localhost:3002/swagger/index.html

## Quick start
- Prereqs: MongoDB, Go 1.20+
- Env: copy `.env.example` to `.env` and fill required keys; optional integrations can stay blank for local dev
- Live reload: `go install github.com/cosmtrek/air@v1.43.0`
- Run: `air` (or `go run main.go`)
- Mongo URI: `mongodb://localhost:27017/schej-it` (or `mongodb://mongo:27017/schej-it` in docker-compose)

## Seeding (optional)
- `cd scripts/seed_demo && MONGODB_URI=mongodb://localhost:27017 go run main.go` (creates demo user + event)

## Migrations
- Scripts in `scripts/*` are one-off data migrations. Only run them if you need that specific migration on existing data.

## Backups
- Backup: `mongodump --host="localhost:27017" --db=schej-it`
- Restore: `mongorestore --uri mongodb://localhost:27017 ./dump --drop`
