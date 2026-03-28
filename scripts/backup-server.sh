#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-7}"
TMP_DIR="$(mktemp -d)"

cd "$PROJECT_ROOT"

mkdir -p "$BACKUP_DIR"

DB_PATH="$PROJECT_ROOT/prisma/dev.db"
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  DATABASE_URL_LINE="$(grep '^DATABASE_URL=' "$PROJECT_ROOT/.env" || true)"
  if [[ "$DATABASE_URL_LINE" == DATABASE_URL=file:* ]]; then
    DB_PATH="${DATABASE_URL_LINE#DATABASE_URL=file:}"
    DB_PATH="${DB_PATH%\"}"
    DB_PATH="${DB_PATH#\"}"
  fi
fi

if [[ ! -f "$DB_PATH" ]]; then
  echo "[backup] Database file not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$TMP_DIR/meta"

git rev-parse HEAD > "$TMP_DIR/meta/git-revision.txt" || true
git branch --show-current > "$TMP_DIR/meta/git-branch.txt" || true
date -Iseconds > "$TMP_DIR/meta/created-at.txt"
printf '%s\n' "$DB_PATH" > "$TMP_DIR/meta/database-path.txt"

cp "$DB_PATH" "$TMP_DIR/dev.db"
cp "$PROJECT_ROOT/.env" "$TMP_DIR/.env" 2>/dev/null || true
cp "$PROJECT_ROOT/ecosystem.config.js" "$TMP_DIR/ecosystem.config.js" 2>/dev/null || true
cp "$PROJECT_ROOT/package.json" "$TMP_DIR/package.json"
cp "$PROJECT_ROOT/package-lock.json" "$TMP_DIR/package-lock.json" 2>/dev/null || true
if [[ -d "$PROJECT_ROOT/public/uploads" ]]; then
  mkdir -p "$TMP_DIR/public"
  cp -R "$PROJECT_ROOT/public/uploads" "$TMP_DIR/public/uploads"
fi

ARCHIVE_PATH="$BACKUP_DIR/quiz-app-backup-${STAMP}.tar.gz"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE_PATH" -C "$TMP_DIR" .
rm -rf "$TMP_DIR"

echo "[backup] Created: $ARCHIVE_PATH"

BACKUP_FILES="$(find "$BACKUP_DIR" -maxdepth 1 -name 'quiz-app-backup-*.tar.gz' | sort)"
BACKUP_COUNT="$(printf '%s\n' "$BACKUP_FILES" | sed '/^$/d' | wc -l | tr -d ' ')"

if (( BACKUP_COUNT > KEEP_BACKUPS )); then
  REMOVE_COUNT=$(( BACKUP_COUNT - KEEP_BACKUPS ))
  printf '%s\n' "$BACKUP_FILES" | sed '/^$/d' | head -n "$REMOVE_COUNT" | while IFS= read -r old_backup; do
    rm -f "$old_backup"
    echo "[backup] Removed old backup: $old_backup"
  done
fi
