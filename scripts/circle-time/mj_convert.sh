#!/bin/bash
# mj_convert.sh — Midjourney PNG downloads -> repo JPEGs for one circle-time week.
#
#   scripts/circle-time/mj_convert.sh 32          # convert + report
#   scripts/circle-time/mj_convert.sh 32 --dry    # report only, convert nothing
#
# Source : ~/Downloads/circle-time-mj-week<NN>/*.png   (override with MJ_SRC=...)
# Target : public/circle-time-images/week<NN>/*.jpg    (sips, JPEG quality 80)
#
# Then compares what landed against the <img src> list inside the week's HTML
# and prints any missing filenames, so you know exactly which prompts to re-run.
# macOS only — `sips` is an Apple tool. Run it ON THE MAC, not in the container.
#
# Numbering is the PRINCIPAL'S SHEET week number. Two legacy pages differ:
#   sheet week 3 -> public/circle-time.html      + images week1/
#   sheet week 4 -> public/circle-time-week2.html + images week2/
set -u

NN="${1:-}"
DRY="${2:-}"
if [ -z "$NN" ]; then
  echo "usage: $0 <NN> [--dry]" >&2; exit 2
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

case "$NN" in
  3) PAGE="$ROOT/public/circle-time.html";        TOK="week1"  ;;
  4) PAGE="$ROOT/public/circle-time-week2.html";  TOK="week2"  ;;
  *) PAGE="$ROOT/public/circle-time-week$NN.html"; TOK="week$NN" ;;
esac

SRC="${MJ_SRC:-$HOME/Downloads/circle-time-mj-week$NN}"
DST="$ROOT/public/circle-time-images/$TOK"

echo "week    : $NN"
echo "page    : ${PAGE#$ROOT/}"
echo "source  : $SRC"
echo "target  : ${DST#$ROOT/}"
echo

if [ ! -f "$PAGE" ]; then
  echo "ERROR: page not found — build the page before converting its art." >&2
  exit 1
fi
if [ ! -d "$SRC" ]; then
  echo "ERROR: $SRC does not exist." >&2
  echo "       Download the Midjourney upscales there first, named exactly as the" >&2
  echo "       filenames in docs/circle-time/mj-prompts-week$NN.md." >&2
  exit 1
fi

# --- what the page asks for -------------------------------------------------
WANT="$(grep -o "circle-time-images/$TOK/[A-Za-z0-9._-]*\.jpg" "$PAGE" \
        | sed "s|.*/||" | sort -u)"
NWANT=$(printf '%s\n' "$WANT" | grep -c . )
echo "page references $NWANT unique images (expect 37)"

# --- convert ----------------------------------------------------------------
mkdir -p "$DST"
CONV=0; FAILED=0; SKIP=0
shopt -s nullglob
for f in "$SRC"/*.png "$SRC"/*.PNG; do
  base="$(basename "$f")"
  out="$DST/${base%.*}.jpg"
  if ! printf '%s\n' "$WANT" | grep -qx "${base%.*}.jpg"; then
    echo "  skip (not referenced by the page): $base"
    SKIP=$((SKIP+1))
    continue
  fi
  if [ "$DRY" = "--dry" ]; then
    echo "  would convert: $base"
    CONV=$((CONV+1))
    continue
  fi
  if sips -s format jpeg -s formatOptions 80 "$f" --out "$out" >/dev/null 2>&1; then
    CONV=$((CONV+1))
  else
    echo "  SIPS FAILED: $base" >&2
    FAILED=$((FAILED+1))
  fi
done
shopt -u nullglob

echo
echo "converted : $CONV"
[ "$SKIP"   -gt 0 ] && echo "skipped   : $SKIP  (filenames the page never asks for — rename or delete)"
[ "$FAILED" -gt 0 ] && echo "failed    : $FAILED"

HAVE="$(ls "$DST" 2>/dev/null | grep '\.jpg$' | sort -u)"
NHAVE=$(printf '%s\n' "$HAVE" | grep -c . )
echo "in folder : $NHAVE / 37"

MISSING="$(comm -23 <(printf '%s\n' "$WANT") <(printf '%s\n' "$HAVE"))"
NMISS=$(printf '%s\n' "$MISSING" | grep -c . )
echo
if [ "$NMISS" -eq 0 ] && [ "$NHAVE" -eq 37 ]; then
  echo "COMPLETE — all 37 images present. Next:"
  echo "  python3 scripts/circle-time/check_week.py $NN"
  echo "  git add public/circle-time-images/$TOK   (via Desktop Commander, never git add -A)"
  exit 0
fi
echo "MISSING $NMISS file(s) — re-run these prompts from docs/circle-time/mj-prompts-week$NN.md:"
printf '%s\n' "$MISSING" | sed 's/^/  /'
exit 1
