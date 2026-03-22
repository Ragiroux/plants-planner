#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Running database seed..."
npx tsx src/lib/db/seed.ts

echo "Starting application..."
exec node server.js
