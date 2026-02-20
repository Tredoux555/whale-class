#!/bin/bash
# Build script for Capacitor - Montree Only
# Only exports the static Montree pages needed for the native app

set -e

echo "🔨 Building MONTREE for Capacitor..."

cd /Users/tredouxwillemse/Desktop/whale

# Clean
echo "🧹 Cleaning..."
rm -rf .next out

# Create temp folder
BACKUP=/tmp/whale_build_backup
rm -rf $BACKUP
mkdir -p $BACKUP/dynamic

# Backup config
cp next.config.ts next.config.ts.backup

# Use Capacitor config  
cp next.config.capacitor.ts next.config.ts

# Move non-Montree folders aside
echo "📦 Moving non-Montree folders aside..."
for dir in admin assessment auth circle-time classroom debug mission parent principal schools story student teacher test-audio; do
  if [ -d "app/$dir" ]; then
    mv "app/$dir" "$BACKUP/$dir"
  fi
done

# Move api folder
if [ -d "app/api" ]; then
  mv app/api $BACKUP/api
fi

# Move dynamic route folders (can't statically export with 'use client')
echo "📦 Moving dynamic routes aside..."
[ -d "app/montree/dashboard/student" ] && mv "app/montree/dashboard/student" "$BACKUP/dynamic/student"
[ -d "app/montree/dashboard/reports/[id]" ] && mv "app/montree/dashboard/reports/[id]" "$BACKUP/dynamic/reports-id"
[ -d "app/montree/report" ] && mv "app/montree/report" "$BACKUP/dynamic/report"
[ -d "app/games/[gameId]" ] && mv "app/games/[gameId]" "$BACKUP/dynamic/gameId"

# Build
echo "🏗️ Running Next.js build..."
npm run build

BUILD_RESULT=$?

# Restore dynamic routes
echo "📦 Restoring dynamic routes..."
[ -d "$BACKUP/dynamic/student" ] && mv "$BACKUP/dynamic/student" "app/montree/dashboard/student"
[ -d "$BACKUP/dynamic/reports-id" ] && mv "$BACKUP/dynamic/reports-id" "app/montree/dashboard/reports/[id]"
[ -d "$BACKUP/dynamic/report" ] && mv "$BACKUP/dynamic/report" "app/montree/report"
[ -d "$BACKUP/dynamic/gameId" ] && mv "$BACKUP/dynamic/gameId" "app/games/[gameId]"

# Restore non-Montree folders
echo "📦 Restoring folders..."
for dir in admin assessment auth circle-time classroom debug mission parent principal schools story student teacher test-audio api; do
  if [ -d "$BACKUP/$dir" ]; then
    mv "$BACKUP/$dir" "app/$dir"
  fi
done

# Restore config
mv next.config.ts.backup next.config.ts

# Cleanup
rm -rf $BACKUP

# Check result
if [ $BUILD_RESULT -eq 0 ] && [ -d "out" ]; then
  echo ""
  echo "✅ MONTREE BUILD SUCCESS!"
  echo ""
  echo "📁 HTML files:"
  find out -type f -name "*.html" | head -20
else
  echo "❌ Build failed"
  exit 1
fi
