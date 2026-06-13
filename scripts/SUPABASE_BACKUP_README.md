# Weekly Supabase backup (whale/Montree production DB)

Automated weekly DATA backup of the production Supabase project, set up
2026-06-13. Same method as the proven 2026-06-11 audit backup.

## What it does

`scripts/supabase-weekly-backup.sh`:

1. Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` —
   from `whale/.env.local` when readable, otherwise from the installed
   copy at `~/Library/Scripts/montree/backup.env` (chmod 600). Secrets
   are never printed or logged.
2. Enumerates every table/view exposed by the Supabase data API
   (PostgREST OpenAPI spec at `/rest/v1/`) — ~247 of them.
3. Exports every row of every table over the REST API (read-only,
   paginated 1000 rows at a time, with an automatic drop to 100-row
   pages for fat-row tables) as one `<table>.jsonl` file per table.
4. Writes a `_done.txt` completion marker with table/row counts, then
   tars everything up.
5. Keeps the last **8** weekly tarballs, deletes older ones.
6. Holds a lock (`.backup.lock`) so two runs can never overlap.
7. Exits non-zero (and logs loudly) on any failure; refuses to produce a
   tarball if the export looks empty or is smaller than 1 MB.

**Scope — what it is NOT:** no schema/DDL, no database functions, no
storage files (photos/videos). Supabase's own daily backups remain the
full-fidelity safety net; this is an independent extra copy of the data.

## Where backups land

```
~/SupabaseBackups/whale-class-backup-YYYY-MM-DD.tar.gz   (last 8 kept, ~95 MB each)
~/SupabaseBackups/backup.log                             (run log)
~/Desktop/SupabaseBackups  ->  symlink to the above
```

Why not directly on Desktop: macOS privacy (TCC) blocks launchd
background jobs from reading or writing anything under `~/Desktop` /
`~/Documents`. The real folder lives in `~` (TCC-free); the Desktop
symlink is just for convenience.

## Two copies of the script (important)

| Copy | Purpose |
|---|---|
| `whale/scripts/supabase-weekly-backup.sh` | source of truth, in the repo |
| `~/Library/Scripts/montree/supabase-weekly-backup.sh` | what launchd actually runs (launchd can't read the repo under ~/Desktop) |

After editing the repo copy, refresh the installed one:

```sh
cp "$HOME/Desktop/Master Brain/ACTIVE/whale/scripts/supabase-weekly-backup.sh" \
   "$HOME/Library/Scripts/montree/supabase-weekly-backup.sh"
```

If you rotate the Supabase service role key, update **both**
`whale/.env.local` and `~/Library/Scripts/montree/backup.env`:

```sh
grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' \
  "$HOME/Desktop/Master Brain/ACTIVE/whale/.env.local" \
  > "$HOME/Library/Scripts/montree/backup.env" && chmod 600 "$HOME/Library/Scripts/montree/backup.env"
```

## Schedule

launchd user agent, every **Sunday 04:00** local time (runs at next wake
if the Mac was asleep; skipped if powered off):

```
~/Library/LaunchAgents/xyz.montree.supabase-backup.plist
```

Check it's loaded:

```sh
launchctl list | grep montree        # "-  0  xyz.montree.supabase-backup"
```

Run it manually right now (either works; a run takes ~15-20 min):

```sh
~/Library/Scripts/montree/supabase-weekly-backup.sh
launchctl kickstart gui/$(id -u)/xyz.montree.supabase-backup
```

Unload (disable) the job:

```sh
launchctl bootout gui/$(id -u)/xyz.montree.supabase-backup
```

Re-enable:

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/xyz.montree.supabase-backup.plist
```

## How to restore

Each tarball contains one JSON-lines file per table (one JSON object =
one row), plus `_done.txt` with counts.

```sh
tar -xzf whale-class-backup-2026-06-13.tar.gz
cat whale-class-backup-2026-06-13/_done.txt        # sanity check
head whale-class-backup-2026-06-13/schools.jsonl   # inspect a table
```

To restore rows to a table (after recreating schema from migrations in
`whale/supabase/` or from a Supabase point-in-time backup), upsert each
file back through the REST API with the service role key:

```sh
URL=...; KEY=...   # from whale/.env.local
jq -s '.' schools.jsonl | curl -X POST "$URL/rest/v1/schools" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d @-
```

(Restore parent tables before children to satisfy foreign keys. For a
full-database disaster, prefer Supabase's own backup/PITR first and use
these tarballs as the independent cross-check.)

## Failure modes to watch

- `backup.log` line `=== BACKUP FAILED ===` or `COMPLETED WITH ERRORS`
  means investigate. Per-table failures are listed in the log and in
  `_done.txt` inside the tarball.
- launchd job exit code shows in `launchctl list | grep montree`
  (second column; 0 = last run OK). launchd's own spawn errors land in
  `~/Library/Logs/montree-supabase-backup.log`.
- Service role key rotated → script fails at the credentials step.
  Update both env files (see above).
- `montree_classroom_curriculum_works` is enormous (~280 MB raw, ~47 MB
  per 1000-row page) and dominates run time and tarball size; if backups
  start failing or ballooning, look there first.
