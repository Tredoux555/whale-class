#!/bin/bash
# Fleet monitor v2 — fixes the v1 bug where pruning matched a project folder
# to a STALE pre-existing output mp4 (from an earlier, unrelated test render
# with the same title) and deleted a fresh job's inputs mid-flight.
#
# SAFE RULE: only prune a project's audio/images if its song TITLE is not
# currently queued or rendering on the daemon, AND its output mp4 exists.
# "Currently queued/rendering" is read live from the daemon every pass, so a
# project is protected for its entire time in the queue, however long.

LOG=/tmp/fleet_monitor_jul15c.log
REPO="/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
PROJECTS_ROOT="/Users/tredouxwillemse/Desktop/Music Videos/_projects"
DAEMON="http://127.0.0.1:8787"

echo "=== fleet monitor v2 started $(date) ===" >> "$LOG"

while true; do
  JOBS_JSON=$(curl -s "$DAEMON/api/jobs")
  STATS=$(echo "$JOBS_JSON" | python3 -c "
import json,sys
from collections import Counter
try:
    d = json.load(sys.stdin)
except Exception as e:
    print('queued=? rendering=? PARSE_ERROR', e)
    sys.exit(0)
jobs = d.get('jobs', [])
c = Counter(j.get('status') for j in jobs)
print('queued=%d rendering=%d done=%d failed=%d cancelled=%d total=%d' % (
    c.get('queued',0), c.get('rendering',0), c.get('done',0),
    c.get('failed',0), c.get('cancelled',0), len(jobs)))
")
  DISK_FREE=$(df -g / | tail -1 | awk '{print $4}')
  TS=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TS] $STATS | disk_free_gb=$DISK_FREE" >> "$LOG"

  QUEUED=$(echo "$STATS" | grep -oE 'queued=[0-9]+' | cut -d= -f2)
  RENDERING=$(echo "$STATS" | grep -oE 'rendering=[0-9]+' | cut -d= -f2)
  FAILED=$(echo "$STATS" | grep -oE 'failed=[0-9]+' | cut -d= -f2)

  if [ "${FAILED:-0}" -gt "0" ] 2>/dev/null; then
    echo "[$TS] WARN: $FAILED failed job(s) present — check daemon /api/jobs" >> "$LOG"
  fi

  if [ "$DISK_FREE" -lt 8 ] 2>/dev/null; then
    echo "[$TS] disk <8GB — pruning (guarded: never touch an ACTIVE title)" >> "$LOG"
    echo "$JOBS_JSON" > /tmp/fleet_jobs_snapshot_jul15c.json
    python3 - "$PROJECTS_ROOT" /tmp/fleet_jobs_snapshot_jul15c.json >> "$LOG" 2>&1 <<'PYEOF'
import os, sys, shutil, json
proot = sys.argv[1]
music_root = os.path.dirname(proot)
with open(sys.argv[2], encoding='utf-8') as fh:
    data = json.load(fh)
active_titles = set()
for j in data.get('jobs', []):
    if j.get('status') in ('queued', 'rendering'):
        active_titles.add((j.get('song') or '').strip())

if not os.path.isdir(proot):
    sys.exit(0)
freed = 0
skipped_active = []
for slug in sorted(os.listdir(proot)):
    sp = os.path.join(proot, slug)
    if not os.path.isdir(sp):
        continue
    audio_dir = os.path.join(sp, 'audio')
    if not os.path.isdir(audio_dir):
        continue
    mp3s = [f for f in os.listdir(audio_dir) if f.lower().endswith('.mp3')]
    if not mp3s:
        continue
    title = os.path.splitext(mp3s[0])[0]
    if title in active_titles:
        skipped_active.append(slug)
        continue
    out_mp4 = os.path.join(music_root, title, title + '.mp4')
    if os.path.isfile(out_mp4) and os.path.getsize(out_mp4) > 100000:
        sz = 0
        for root, _, files in os.walk(sp):
            for f in files:
                try:
                    sz += os.path.getsize(os.path.join(root, f))
                except OSError:
                    pass
        try:
            if os.path.isdir(os.path.join(sp, 'audio')):
                shutil.rmtree(os.path.join(sp, 'audio'))
            if os.path.isdir(os.path.join(sp, 'images')):
                shutil.rmtree(os.path.join(sp, 'images'))
            freed += sz
        except OSError as e:
            print('  prune error %s: %s' % (slug, e))
print('  pruned inactive+confirmed-done project inputs, freed ~%.0fMB (protected %d active: %s)'
      % (freed / 1e6, len(skipped_active), ','.join(skipped_active) if skipped_active else 'none'))
PYEOF
  fi

  if [ "${QUEUED:-1}" = "0" ] && [ "${RENDERING:-1}" = "0" ]; then
    echo "[$TS] FLEET_DRAINED" >> "$LOG"
    PUB="$REPO/scripts/curriculum/publish-videos.mjs"
    if [ -f "$PUB" ]; then
      echo "[$TS] publish-videos.mjs found — running --all" >> "$LOG"
      (cd "$REPO" && node scripts/curriculum/publish-videos.mjs --all) >> /tmp/publish_videos.log 2>&1
      echo "[$TS] PUBLISH_TRIGGERED" >> "$LOG"
    else
      echo "[$TS] publish-videos.mjs not found yet — skipping publish step" >> "$LOG"
    fi
    break
  fi

  sleep 120
done

echo "=== fleet monitor v2 exiting $(date) ===" >> "$LOG"
