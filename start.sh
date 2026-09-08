#!/usr/bin/env sh
# Launch the Information Maps dev server.
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "→ installing dependencies (first run)…"
  npm install
fi

echo "→ starting dev server…"
npm run dev
