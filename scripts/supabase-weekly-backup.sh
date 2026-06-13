#!/bin/bash
# ============================================================================
# supabase-weekly-backup.sh — weekly DATA backup of the whale/Montree
# production Supabase project.
#
# Method (same as the proven 2026-06-11 audit backup):
#   Per-table export over the Supabase REST API (PostgREST), read-only,
#   using the service role key. One JSON-lines file per table, then
#   everything tar-gzipped.
#
# Scope: every row of every table/view exposed by the data API.
#        NOT included: schema/DDL, database functions, storage files
#        (photos/videos). Supabase's own daily backups remain the
#        full-fidelity safety net; this is an independent extra copy.
#
# Output:    ~/SupabaseBackups/whale-class-backup-YYYY-MM-DD.tar.gz
#            (symlinked from ~/Desktop/SupabaseBackups — launchd background
#            jobs cannot touch ~/Desktop directly because of macOS TCC)
# Retention: last 8 weekly tarballs (older ones deleted)
# Log:       ~/SupabaseBackups/backup.log
#
# Credentials: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, read from
# whale/.env.local when readable, else from the installed copy at
# ~/Library/Scripts/montree/backup.env (chmod 600). Secrets are never
# printed or logged. If you rotate the service role key, update BOTH files.
#
# The launchd job runs the INSTALLED copy at
# ~/Library/Scripts/montree/supabase-weekly-backup.sh — after editing this
# repo copy, refresh it with:
#   cp "$HOME/Desktop/Master Brain/ACTIVE/whale/scripts/supabase-weekly-backup.sh" \
#      "$HOME/Library/Scripts/montree/supabase-weekly-backup.sh"
#
# Exit codes: 0 = success, non-zero = failure (logged loudly).
# Scheduled via launchd: ~/Library/LaunchAgents/xyz.montree.supabase-backup.plist
# ============================================================================
set -uo pipefail

REPO_DIR="$HOME/Desktop/Master Brain/ACTIVE/whale"
# Credential sources, in order of preference. The launchd copy of this script
# cannot read ~/Desktop (macOS TCC blocks background jobs), so an installed
# copy of the two needed vars lives next to the installed script.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_CANDIDATES=("$REPO_DIR/.env.local" "$SCRIPT_DIR/backup.env" "$HOME/Library/Scripts/montree/backup.env")
# NOTE: ~/Desktop is TCC-protected and unreachable from launchd background
# jobs, so backups land in ~/SupabaseBackups; a symlink at
# ~/Desktop/SupabaseBackups points there for convenience.
BACKUP_ROOT="$HOME/SupabaseBackups"
LOG_FILE="$BACKUP_ROOT/backup.log"
DATE="$(date +%Y-%m-%d)"
NAME="whale-class-backup-$DATE"
STAGE_DIR="$BACKUP_ROOT/.staging-$NAME"
TARBALL="$BACKUP_ROOT/$NAME.tar.gz"
PAGE_SIZE=1000
KEEP=8

mkdir -p "$BACKUP_ROOT"

# --- single-instance lock (stale after 4h) -----------------------------------
LOCK_DIR="$BACKUP_ROOT/.backup.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  lock_age=$(( $(date +%s) - $(stat -f%m "$LOCK_DIR" 2>/dev/null || echo 0) ))
  if [ "$lock_age" -lt 14400 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') FATAL: another backup is already running (lock: $LOCK_DIR)" | tee -a "$LOG_FILE"
    exit 1
  fi
  rm -rf "$LOCK_DIR"; mkdir "$LOCK_DIR"
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"
}

fail() {
  log "FATAL: $*"
  log "=== BACKUP FAILED ($NAME) ==="
  rm -rf "$STAGE_DIR"
  exit 1
}

log "=== Starting Supabase weekly backup ($NAME) ==="

# --- credentials (never printed) --------------------------------------------
SUPABASE_URL=""
SERVICE_KEY=""
ENV_USED=""
for env_file in "${ENV_CANDIDATES[@]}"; do
  u="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$env_file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')"
  k="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$env_file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')"
  if [ -n "$u" ] && [ -n "$k" ]; then
    SUPABASE_URL="$u"; SERVICE_KEY="$k"; ENV_USED="$env_file"
    break
  fi
done
[ -n "$SUPABASE_URL" ] && [ -n "$SERVICE_KEY" ] \
  || fail "no readable credential file found (tried: ${ENV_CANDIDATES[*]})"
log "Credentials loaded from $ENV_USED"

REST="$SUPABASE_URL/rest/v1"
AUTH=(-H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY")

command -v jq >/dev/null 2>&1 || fail "jq is required but not installed"

# --- enumerate tables via the PostgREST OpenAPI spec -------------------------
TABLES="$(curl -sf --retry 2 --max-time 60 "$REST/" "${AUTH[@]}" \
  | jq -r '.paths | keys[]' | grep -v '^/rpc/' | grep -v '^/$' | sed 's|^/||' | sort)" \
  || fail "could not enumerate tables from $REST/ (network or auth problem)"

TABLE_COUNT="$(echo "$TABLES" | grep -c .)"
[ "$TABLE_COUNT" -gt 0 ] || fail "table enumeration returned zero tables"
log "Enumerated $TABLE_COUNT tables/views from data API"

# --- export every table as JSONL ---------------------------------------------
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/$NAME"

TOTAL_ROWS=0
FAILED_TABLES=()
PAGE_TMP="$(mktemp)"
trap 'rm -f "$PAGE_TMP"; rm -rf "$LOCK_DIR"' EXIT

# Fetch one page; on failure retry with progressively smaller page sizes
# (some tables have very fat rows — 1000 rows can be tens of MB).
fetch_page() { # $1=table $2=offset $3=limit -> rows written to $PAGE_TMP
  curl -sf --retry 2 --retry-all-errors --max-time 300 \
    "$REST/$1?select=*&limit=$3&offset=$2" \
    "${AUTH[@]}" -o "$PAGE_TMP" && jq -e 'type == "array"' "$PAGE_TMP" >/dev/null 2>&1
}

for t in $TABLES; do
  out="$STAGE_DIR/$NAME/$t.jsonl"
  : > "$out"
  offset=0
  table_rows=0
  table_ok=1
  page_size=$PAGE_SIZE
  while :; do
    if ! fetch_page "$t" "$offset" "$page_size"; then
      if [ "$page_size" -gt 100 ]; then
        page_size=100   # fat-row table: drop to small pages and retry
        if ! fetch_page "$t" "$offset" "$page_size"; then
          table_ok=0; break
        fi
      else
        table_ok=0; break
      fi
    fi
    n="$(jq 'length' "$PAGE_TMP" 2>/dev/null)" || { table_ok=0; break; }
    [ "$n" -gt 0 ] && jq -c '.[]' "$PAGE_TMP" >> "$out"
    table_rows=$((table_rows + n))
    offset=$((offset + n))
    [ "$n" -lt "$page_size" ] && break
  done
  if [ "$table_ok" -eq 1 ]; then
    TOTAL_ROWS=$((TOTAL_ROWS + table_rows))
  else
    FAILED_TABLES+=("$t")
    log "WARN: failed to export table: $t"
  fi
done

OK_COUNT=$((TABLE_COUNT - ${#FAILED_TABLES[@]}))
log "Exported $OK_COUNT/$TABLE_COUNT tables, $TOTAL_ROWS rows total"

# Sanity: a production DB with ~0 rows means something went badly wrong.
[ "$TOTAL_ROWS" -gt 100 ] || fail "only $TOTAL_ROWS rows exported — refusing to call this a backup"

# --- completion marker + tarball ---------------------------------------------
{
  echo "backup: $NAME"
  echo "completed: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "tables exported: $OK_COUNT/$TABLE_COUNT"
  echo "total rows: $TOTAL_ROWS"
  echo "method: Supabase REST API per-table JSONL export (read-only)"
  if [ "${#FAILED_TABLES[@]}" -gt 0 ]; then
    echo "FAILED tables:"
    printf '  %s\n' "${FAILED_TABLES[@]}"
  fi
} > "$STAGE_DIR/$NAME/_done.txt"

tar -czf "$TARBALL" -C "$STAGE_DIR" "$NAME" || fail "tar failed"
rm -rf "$STAGE_DIR"

SIZE_BYTES="$(stat -f%z "$TARBALL")"
SIZE_HUMAN="$(du -h "$TARBALL" | cut -f1 | tr -d ' ')"
[ "$SIZE_BYTES" -gt 1048576 ] || fail "tarball suspiciously small ($SIZE_BYTES bytes)"
log "Wrote $TARBALL ($SIZE_HUMAN)"

# --- retention: keep the newest $KEEP weekly tarballs -------------------------
ls -1t "$BACKUP_ROOT"/whale-class-backup-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old"
  log "Retention: deleted $old"
done

if [ "${#FAILED_TABLES[@]}" -gt 0 ]; then
  log "=== BACKUP COMPLETED WITH ERRORS: ${#FAILED_TABLES[@]} table(s) failed ==="
  exit 1
fi

log "=== Backup complete ($NAME) ==="
exit 0
