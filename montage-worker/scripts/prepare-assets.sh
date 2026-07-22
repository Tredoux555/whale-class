#!/usr/bin/env bash
# Prepare the montage worker's binary assets. Run ON THE MAC from inside the
# montage-worker/ directory, BEFORE committing / building the Docker image.
#
#   cd montage-worker && bash scripts/prepare-assets.sh
#
# It copies the approved Phase-0 assets (overlay/font/logo) and the beat-mapped
# music library out of ../montage-kit/, and downloads the CJK fallback font.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
KIT="${MONTAGE_KIT:-$HERE/../montage-kit}"
PROOF_PUBLIC="$KIT/proof/public"
MUSIC_SRC="$KIT/music"
PUBLIC="$HERE/remotion/public"
MUSIC_DST="$HERE/assets/music"

echo "worker root : $HERE"
echo "montage-kit : $KIT"

mkdir -p "$PUBLIC" "$MUSIC_DST"

# --- 1. brand/composition assets from the proof project ---
for f in overlay.png Lora.ttf logo.png; do
  if [[ -f "$PROOF_PUBLIC/$f" ]]; then
    cp -f "$PROOF_PUBLIC/$f" "$PUBLIC/$f"
    echo "  copied $f"
  else
    echo "  WARNING: $PROOF_PUBLIC/$f not found — composition needs it" >&2
  fi
done

# --- 2. music: mp3 + beats.json for every track ---
if [[ -d "$MUSIC_SRC" ]]; then
  shopt -s nullglob
  for mp3 in "$MUSIC_SRC"/*.mp3; do
    cp -f "$mp3" "$MUSIC_DST/"
    echo "  copied $(basename "$mp3")"
  done
  for beats in "$MUSIC_SRC"/*.beats.json; do
    cp -f "$beats" "$MUSIC_DST/"
    echo "  copied $(basename "$beats")"
  done
  shopt -u nullglob
else
  echo "  WARNING: $MUSIC_SRC not found" >&2
fi

# --- 3. Noto Serif SC (CJK fallback for Chinese child names) ---
# Subset OTF (~11.6 MB) — verified reachable 2026-07-22.
NOTO_URL="https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf"
NOTO_DST="$PUBLIC/NotoSerifSC-Regular.otf"
if [[ -f "$NOTO_DST" ]]; then
  echo "  NotoSerifSC-Regular.otf already present"
else
  echo "  downloading Noto Serif SC ..."
  if command -v curl >/dev/null 2>&1; then
    curl -fSL "$NOTO_URL" -o "$NOTO_DST"
  else
    wget -O "$NOTO_DST" "$NOTO_URL"
  fi
  echo "  saved $NOTO_DST"
fi

echo "done. assets ready under remotion/public/ and assets/music/"
