#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env ]; then
    echo "Error: deploy/.env not found."
    echo ""
    echo "To get started:"
    echo "  cp deploy/.env.example deploy/.env"
    echo "  # Then edit deploy/.env and fill in the required values"
    echo ""
    exit 1
fi

echo "Building and starting Timeful.app..."
docker compose up -d --build

echo ""
echo "Done! Timeful.app is running at http://localhost:3002"
echo ""
echo "Useful commands (run from the deploy/ directory):"
echo "  docker compose logs -f app     # View app logs"
echo "  docker compose ps              # Check container status"
echo "  docker compose down            # Stop all containers"
echo "  docker compose up -d --build   # Rebuild and restart"
