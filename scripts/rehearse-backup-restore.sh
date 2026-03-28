#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${1:-}"
TMP_ROOT="$(mktemp -d)"
REHEARSAL_ROOT="$TMP_ROOT/rehearsal"
ARCHIVE_TMP="$TMP_ROOT/archive"
KEEP_REHEARSAL="${KEEP_REHEARSAL:-false}"

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

cleanup() {
  if [[ "$KEEP_REHEARSAL" == "true" ]]; then
    echo "[rehearsal] Preserved temp workspace: $TMP_ROOT"
    return
  fi
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

cd "$PROJECT_ROOT"

if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "[rehearsal] No archive provided. Creating a fresh backup first..."
  BACKUP_OUTPUT="$(bash "$PROJECT_ROOT/scripts/backup-server.sh")"
  echo "$BACKUP_OUTPUT"
  ARCHIVE_PATH="$(printf '%s\n' "$BACKUP_OUTPUT" | sed -n 's/^\[backup\] Created: //p' | tail -n 1)"
fi

if [[ -z "$ARCHIVE_PATH" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "[rehearsal] Backup archive not found: $ARCHIVE_PATH" >&2
  exit 1
fi

mkdir -p "$REHEARSAL_ROOT" "$ARCHIVE_TMP"

echo "[rehearsal] Preparing isolated workspace..."
tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./backups' \
  --exclude='./prisma/dev.db' \
  --exclude='./public/uploads' \
  -cf - . | tar -xf - -C "$REHEARSAL_ROOT"

if [[ -d "$PROJECT_ROOT/node_modules" ]]; then
  echo "[rehearsal] Copying node_modules into isolated workspace..."
  tar -cf - -C "$PROJECT_ROOT" node_modules | tar -xf - -C "$REHEARSAL_ROOT"
fi

if [[ -d "$PROJECT_ROOT/.next/cache" ]]; then
  echo "[rehearsal] Copying Next.js build cache into isolated workspace..."
  mkdir -p "$REHEARSAL_ROOT/.next"
  tar -cf - -C "$PROJECT_ROOT/.next" cache | tar -xf - -C "$REHEARSAL_ROOT/.next"
fi

echo "[rehearsal] Extracting archive: $ARCHIVE_PATH"
tar -xzf "$ARCHIVE_PATH" -C "$ARCHIVE_TMP"

if [[ -f "$ARCHIVE_TMP/.env" ]]; then
  cp "$ARCHIVE_TMP/.env" "$REHEARSAL_ROOT/.env"
fi

DB_PATH="$(resolve_db_path "$REHEARSAL_ROOT")"

mkdir -p "$(dirname "$DB_PATH")"

if [[ ! -f "$ARCHIVE_TMP/dev.db" ]]; then
  echo "[rehearsal] Archive does not contain dev.db" >&2
  exit 1
fi
cp "$ARCHIVE_TMP/dev.db" "$DB_PATH"

if [[ ! -f "$DB_PATH" ]]; then
  echo "[rehearsal] Database file is missing after restore: $DB_PATH" >&2
  exit 1
fi

if [[ -d "$ARCHIVE_TMP/public/uploads" ]]; then
  mkdir -p "$REHEARSAL_ROOT/public"
  cp -R "$ARCHIVE_TMP/public/uploads" "$REHEARSAL_ROOT/public/uploads"
fi

echo "[rehearsal] Running image integrity audit..."
(
  cd "$REHEARSAL_ROOT"
  node scripts/check-image-integrity.mjs
)

echo "[rehearsal] Running production build in isolated workspace..."
(
  cd "$REHEARSAL_ROOT"
  npm run build
)

echo "[rehearsal] Backup restore rehearsal completed successfully."
