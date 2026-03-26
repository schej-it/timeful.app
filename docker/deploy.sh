#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check that server/.env exists
if [ ! -f server/.env ]; then
    echo "Error: server/.env not found."
    echo ""
    echo "To get started:"
    echo "  cp docker/.env.example server/.env"
    echo "  # Edit server/.env and fill in the required values"
    echo ""
    exit 1
fi

echo "Building and starting Timeful.app..."
docker compose up -d --build

echo ""
echo "Done! Timeful.app is running at http://localhost:3002"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app     # View app logs"
echo "  docker compose ps              # Check container status"
echo "  docker compose down            # Stop all containers"
echo "  docker compose up -d --build   # Rebuild and restart"
