#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${1:-main}"
APP_NAME="${APP_NAME:-quiz-app}"
STAMP="$(date +%Y%m%d-%H%M%S)"
AUTO_STASHED=0

cd "$PROJECT_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "[deploy] Local changes detected. Stashing them before deploy..."
  git stash push -u -m "auto-stash-before-deploy-${STAMP}"
  AUTO_STASHED=1
fi

CURRENT_REV="$(git rev-parse HEAD)"

echo "[deploy] Fetching origin/${BRANCH}..."
git fetch origin

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "[deploy] Switching branch: ${CURRENT_BRANCH} -> ${BRANCH}"
  git checkout "$BRANCH"
fi

echo "[deploy] Pulling latest changes..."
git pull --ff-only origin "$BRANCH"

NEW_REV="$(git rev-parse HEAD)"

if ! git diff --quiet "$CURRENT_REV" "$NEW_REV" -- package.json package-lock.json; then
  echo "[deploy] Dependency files changed. Running npm install..."
  npm install
else
  echo "[deploy] Dependency files unchanged. Skipping npm install."
fi

echo "[deploy] Building application..."
npm run build

echo "[deploy] Restarting PM2 app: ${APP_NAME}"
pm2 restart "$APP_NAME" --update-env

echo "[deploy] Done."
echo "[deploy] Revision: ${NEW_REV}"

if [[ "$AUTO_STASHED" -eq 1 ]]; then
  echo "[deploy] Note: local server changes were stashed."
  echo "[deploy] Check with: git stash list"
fi
