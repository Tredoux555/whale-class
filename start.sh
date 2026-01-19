#!/bin/sh
# Update yt-dlp to latest version at startup (YouTube changes constantly)
echo "=== Updating yt-dlp to latest version ==="
pip3 install --break-system-packages --upgrade yt-dlp 2>&1 || echo "Warning: yt-dlp pip upgrade failed"
echo "yt-dlp version: $(yt-dlp --version 2>/dev/null || echo 'not found')"
echo "=========================================="

# Start Next.js standalone server
# CRITICAL: Must cd into standalone folder for proper path resolution
echo "=== Starting Next.js standalone server ==="
cd /app/.next/standalone
export PORT=${PORT:-3000}
echo "PORT: $PORT"
exec node server.js
