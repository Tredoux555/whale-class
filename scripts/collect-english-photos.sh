#!/bin/bash
# Collect all English teaching photos into a single folder
# Sources: Pictures Complete + School photos + Pink Series
# Run from the whale project root

DEST="$(dirname "$(dirname "$(realpath "$0")")")/../../English-Teaching-Photos"
mkdir -p "$DEST"

echo "=== Montree Photo Bank: Collecting English Teaching Photos ==="
echo "Destination: $DEST"
echo ""

# Source 1: Pictures Complete (269+ images)
SRC1="$(dirname "$(dirname "$(realpath "$0")")")/../../Master Brain/ACTIVE/Pictures Complete"
if [ -d "$SRC1" ]; then
  echo "📁 Copying from Pictures Complete..."
  find "$SRC1" -maxdepth 1 -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec cp {} "$DEST/" \;
  echo "  ✅ Done"
fi

# Source 1b: Pink Series Pictures (sub-folder of Pictures Complete)
SRC1B="$SRC1/Pink Series Pictures"
if [ -d "$SRC1B" ]; then
  echo "📁 Copying from Pink Series Pictures..."
  find "$SRC1B" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec cp {} "$DEST/" \;
  echo "  ✅ Done"
fi

# Source 2: School Photos For Pink Series Sentences
SRC2="$(dirname "$(dirname "$(realpath "$0")")")/../../School/Photos For Pink Series Sentences"
if [ -d "$SRC2" ]; then
  echo "📁 Copying from School Pink Series Photos..."
  find "$SRC2" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec cp {} "$DEST/" \;
  echo "  ✅ Done"
fi

# Source 3: School Pictures For Games
SRC3="$(dirname "$(dirname "$(realpath "$0")")")/../../School/Pictures For Games"
if [ -d "$SRC3" ]; then
  echo "📁 Copying from School Pictures For Games..."
  find "$SRC3" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec cp {} "$DEST/" \;
  echo "  ✅ Done"
fi

# Source 4: New English Corner images
SRC4="$(dirname "$(dirname "$(realpath "$0")")")/../../Master Brain/ACTIVE/New English Corner"
if [ -d "$SRC4" ]; then
  echo "📁 Copying from New English Corner..."
  find "$SRC4" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec cp {} "$DEST/" \;
  echo "  ✅ Done"
fi

# Source 5: Whale Class Pictures
SRC5="$(dirname "$(dirname "$(realpath "$0")")")/../../School/Whale Class 2025-2026/Pictures"
if [ -d "$SRC5" ]; then
  echo "📁 Copying from Whale Class Pictures..."
  find "$SRC5" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec cp {} "$DEST/" \;
  echo "  ✅ Done"
fi

# Count results
TOTAL=$(find "$DEST" -type f | wc -l)
echo ""
echo "=== Collection Complete ==="
echo "📸 Total photos collected: $TOTAL"
echo "📂 Location: $DEST"
echo ""
echo "Next: Run 'node scripts/upload-to-photo-bank.mjs' to upload to Supabase"
