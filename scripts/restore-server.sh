#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${1:-}"
APP_NAME="${APP_NAME:-quiz-app}"
RESTORE_ENV="${RESTORE_ENV:-false}"

resolve_db_path() {
  local project_root="$1"
  local env_file="$project_root/.env"
  local db_path="$project_root/prisma/dev.db"

  if [[ -f "$env_file" ]]; then
    local database_url_line
    database_url_line="$(grep '^DATABASE_URL=' "$env_file" || true)"
    if [[ "$database_url_line" == DATABASE_URL=file:* ]]; then
      db_path="${database_url_line#DATABASE_URL=file:}"
      db_path="${db_path%\"}"
      db_path="${db_path#\"}"
      if [[ "$db_path" != /* ]]; then
        db_path="$project_root/$db_path"
      fi
    fi
  fi

  printf '%s\n' "$db_path"
}

print_database_url() {
  local env_file="$1/.env"
  if [[ -f "$env_file" ]]; then
    grep '^DATABASE_URL=' "$env_file" || echo "[restore] DATABASE_URL not found in .env"
  else
    echo "[restore] .env not found"
  fi
}

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

DB_PATH="$(resolve_db_path "$PROJECT_ROOT")"

mkdir -p "$(dirname "$DB_PATH")"

if [[ -f "$TMP_DIR/dev.db" ]]; then
  cp "$TMP_DIR/dev.db" "$DB_PATH"
  chmod 664 "$DB_PATH" 2>/dev/null || true
else
  echo "[restore] Backup archive does not contain dev.db" >&2
  exit 1
fi

if [[ -f "$TMP_DIR/.env" ]]; then
  if [[ "$RESTORE_ENV" == "true" ]]; then
    cp "$TMP_DIR/.env" "$PROJECT_ROOT/.env"
    echo "[restore] Restored .env from archive because RESTORE_ENV=true"
  else
    echo "[restore] Archive contains .env, but the current server .env was preserved."
    echo "[restore] If you really want to restore .env too, rerun with RESTORE_ENV=true."
  fi
fi

if [[ -d "$TMP_DIR/public/uploads" ]]; then
  mkdir -p "$PROJECT_ROOT/public"
  rm -rf "$PROJECT_ROOT/public/uploads"
  cp -R "$TMP_DIR/public/uploads" "$PROJECT_ROOT/public/uploads"
fi

echo "[restore] Using DATABASE_URL from current server .env:"
print_database_url "$PROJECT_ROOT"

if [[ ! -f "$DB_PATH" ]]; then
  echo "[restore] Database file is missing after restore: $DB_PATH" >&2
  exit 1
fi

if [[ ! -r "$DB_PATH" ]]; then
  echo "[restore] Database file exists but is not readable: $DB_PATH" >&2
  exit 1
fi

echo "[restore] Database file restored to: $DB_PATH"

echo "[restore] Rebuilding application..."
npm run build

echo "[restore] Restarting PM2 app: ${APP_NAME}"
pm2 restart "$APP_NAME" --update-env

echo "[restore] Restore complete."
