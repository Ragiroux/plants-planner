#!/bin/bash
set -e

echo "Building Docker image..."
docker build -t ragiroux/technorag:plantes-latest .

echo "Pushing to Docker Hub..."
docker push ragiroux/technorag:plantes-latest

echo ""
echo "Image pushed. Deploy on NAS with:"
echo "  ssh nas 'cd /volume1/docker/plantes-planner && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d'"
