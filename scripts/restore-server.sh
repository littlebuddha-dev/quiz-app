#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${1:-}"
APP_NAME="${APP_NAME:-quiz-app}"

if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "Usage: bash scripts/restore-server.sh <backup-archive-path>" >&2
  exit 1
fi

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "[restore] Backup archive not found: $ARCHIVE_PATH" >&2
  exit 1
fi

cd "$PROJECT_ROOT"

echo "[restore] Creating pre-restore safety backup..."
bash "$PROJECT_ROOT/scripts/backup-server.sh"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

DB_PATH="$PROJECT_ROOT/prisma/dev.db"
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  DATABASE_URL_LINE="$(grep '^DATABASE_URL=' "$PROJECT_ROOT/.env" || true)"
  if [[ "$DATABASE_URL_LINE" == DATABASE_URL=file:* ]]; then
    DB_PATH="${DATABASE_URL_LINE#DATABASE_URL=file:}"
    DB_PATH="${DB_PATH%\"}"
    DB_PATH="${DB_PATH#\"}"
  fi
fi

mkdir -p "$(dirname "$DB_PATH")"

if [[ -f "$TMP_DIR/dev.db" ]]; then
  cp "$TMP_DIR/dev.db" "$DB_PATH"
else
  echo "[restore] Backup archive does not contain dev.db" >&2
  exit 1
fi

if [[ -f "$TMP_DIR/.env" ]]; then
  cp "$TMP_DIR/.env" "$PROJECT_ROOT/.env"
fi

echo "[restore] Rebuilding application..."
npm run build

echo "[restore] Restarting PM2 app: ${APP_NAME}"
pm2 restart "$APP_NAME" --update-env

echo "[restore] Restore complete."
