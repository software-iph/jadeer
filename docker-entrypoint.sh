#!/bin/sh
# Runs every time the container starts:
#   1. apply any new database migrations (safe to repeat)
#   2. create the first admin + default content if they don't exist yet (safe to repeat)
#   3. start the server
set -e

echo "[jadeer] applying database migrations…"
tries=0
until npx prisma migrate deploy; do
  tries=$((tries + 1))
  if [ "$tries" -ge 15 ]; then
    echo "[jadeer] database not reachable, giving up"; exit 1
  fi
  echo "[jadeer] database not ready yet, retrying in 3s ($tries/15)"
  sleep 3
done

echo "[jadeer] seeding (first admin + default content, only if missing)…"
node server/seed.js

echo "[jadeer] starting server on port ${PORT:-3010}"
exec "$@"
