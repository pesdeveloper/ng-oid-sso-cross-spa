#!/usr/bin/env bash

# chmod +x bod-git-download.sh
# chmod +x bod-run.sh

set -euo pipefail

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-4205}"

# Si usás nvm en Mac
command -v nvm >/dev/null 2>&1 && nvm use || true

echo "==> Repo: $(pwd)"

echo "==> Rebuild lib (npm run dist:mma)"
npm run dist:mma

echo "==> Start BOD on https://${HOST}:${PORT}"
exec npx ng serve --host="$HOST" --ssl --port="$PORT"
