# Timeful frontend

Vue 2 app for Timeful.

## Quick start
- Install: `npm install`
- Dev server: `npm run serve` (http://localhost:8080 or 8081 if 8080 is busy)
- API base (dev): `http://localhost:3002/api` (see `src/constants.js`)
- Build for production: `npm run build` (Go API serves `frontend/dist`)

## Backend API docs
- http://localhost:3002/swagger/index.html (server must be running)

## Optional demo data
- From repo root: `cd server/scripts/seed_demo && MONGODB_URI=mongodb://localhost:27017 go run main.go` (adds demo user + event)

## Customize configuration
- Vue CLI reference: https://cli.vuejs.org/config/ 
