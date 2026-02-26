#!/usr/bin/env bash
set -euo pipefail

# chmod +x bod-git-download.sh
# chmod +x bod-run.sh

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"

echo "==> Repo: $(pwd)"
echo "==> Downloading latest from ${REMOTE}/${BRANCH}"

git fetch "$REMOTE"
git reset --hard "${REMOTE}/${BRANCH}"
git clean -fd

echo "==> Current commit:"
git log -1 --oneline

echo "==> Done."
