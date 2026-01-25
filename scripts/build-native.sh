#!/bin/bash
# scripts/build-native.sh
# Build script for Capacitor native app
# Temporarily moves dynamic routes that don't work with static export

set -e

echo "🔧 Preparing native build..."

# Store paths
WHALE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="/tmp/whale-native-build-backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Move dynamic routes that can't be statically exported
# These use query params in native (/view?id=xxx)
echo "📦 Moving dynamic routes..."
if [ -d "$WHALE_DIR/app/montree/dashboard/reports/[id]" ]; then
  mv "$WHALE_DIR/app/montree/dashboard/reports/[id]" "$BACKUP_DIR/reports-id"
fi

# Run the build
echo "🏗️ Building static export..."
cd "$WHALE_DIR"
CAPACITOR_BUILD=true npx next build --webpack

# Restore dynamic routes
echo "📦 Restoring dynamic routes..."
if [ -d "$BACKUP_DIR/reports-id" ]; then
  mv "$BACKUP_DIR/reports-id" "$WHALE_DIR/app/montree/dashboard/reports/[id]"
fi

# Cleanup
rm -rf "$BACKUP_DIR"

echo "✅ Native build complete! Output in ./out"
echo ""
echo "Next steps:"
echo "  npx cap sync"
echo "  npx cap open ios"
