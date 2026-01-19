#!/bin/sh
# Update yt-dlp to latest version at startup (YouTube changes constantly)
echo "=== Updating yt-dlp to latest version ==="
pip3 install --break-system-packages --upgrade yt-dlp 2>&1 || echo "Warning: yt-dlp pip upgrade failed"
echo "yt-dlp version: $(yt-dlp --version 2>/dev/null || echo 'not found')"
echo "=========================================="

# Start Next.js standalone server
echo "=== Starting Next.js standalone server ==="
echo "PORT: ${PORT:-3000}"

# CRITICAL: Next.js standalone expects to run from its folder
cd /app/.next/standalone

# CRITICAL: Railway needs HOSTNAME=0.0.0.0 for external access
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"

echo "Starting server on ${HOSTNAME}:${PORT}..."

# Use exec to replace shell with node process
exec node server.js
