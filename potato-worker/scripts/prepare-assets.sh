#!/usr/bin/env bash
# Prepare the Potato Snaps worker's binary assets. Run ON THE MAC from inside
# the potato-worker/ directory, BEFORE committing / building the Docker image.
#
#   cd potato-worker && bash scripts/prepare-assets.sh
#
# Music (mp3 + beat grids) and the warm-grade overlay are lifted straight from
# the sibling montage-worker service — same tracks, same precomputed grids, so
# there is still ZERO audio analysis at render time. The type faces are
# downloaded from the Google Fonts repo.
#
# 🚨 Montree's `remotion/public/logo.png` is DELIBERATELY NOT COPIED. It is the
# gold Montree M; a Potato Snaps film must never show it. The end card renders
# text-only when logo.png is absent (useOptionalImage degrades cleanly). Drop a
# Potato Snaps mark in at remotion/public/logo.png whenever one exists.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${MONTAGE_WORKER:-$HERE/../montage-worker}"
PUBLIC="$HERE/remotion/public"
MUSIC_DST="$HERE/assets/music"

echo "worker root    : $HERE"
echo "asset source   : $SRC"

mkdir -p "$PUBLIC" "$MUSIC_DST"

# --- 1. music: mp3 + beats.json for every track ---------------------------
if [[ -d "$SRC/assets/music" ]]; then
  shopt -s nullglob
  for f in "$SRC/assets/music"/*.mp3 "$SRC/assets/music"/*.beats.json; do
    cp -f "$f" "$MUSIC_DST/"
    echo "  copied $(basename "$f")"
  done
  shopt -u nullglob
else
  echo "  WARNING: $SRC/assets/music not found — the worker will not boot" >&2
fi

# --- 2. warm grade / vignette overlay (optional but recommended) -----------
if [[ -f "$SRC/remotion/public/overlay.png" ]]; then
  cp -f "$SRC/remotion/public/overlay.png" "$PUBLIC/overlay.png"
  echo "  copied overlay.png"
else
  echo "  note: overlay.png absent — photos render without the warm grade"
fi

# --- 3. type faces --------------------------------------------------------
# Baloo 2 (display) + Nunito (body) per the Potato Snaps design tokens, plus
# Noto Serif SC as the CJK fallback for Chinese child names. All three are
# optional at render time; a missing file falls back to the system sans.
fetch() { # fetch <url> <dest> <label>
  local url="$1" dest="$2" label="$3"
  if [[ -f "$dest" ]]; then
    echo "  $label already present"
    return 0
  fi
  echo "  downloading $label ..."
  if command -v curl >/dev/null 2>&1; then
    curl -fSL "$url" -o "$dest" || { echo "  WARNING: $label download failed" >&2; rm -f "$dest"; return 0; }
  else
    wget -O "$dest" "$url" || { echo "  WARNING: $label download failed" >&2; rm -f "$dest"; return 0; }
  fi
  echo "  saved $dest"
}

# Variable TTFs (wght axis) — verified reachable 2026-08-07.
fetch "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf" \
      "$PUBLIC/Baloo2.ttf" "Baloo 2"
fetch "https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/Nunito%5Bwght%5D.ttf" \
      "$PUBLIC/Nunito.ttf" "Nunito"
fetch "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf" \
      "$PUBLIC/NotoSerifSC-Regular.otf" "Noto Serif SC"

echo "done. assets ready under remotion/public/ and assets/music/"
