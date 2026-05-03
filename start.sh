#!/bin/sh
# Update yt-dlp to latest version at startup (YouTube changes constantly).
# CRITICAL: Wrapped in `timeout 20` so a slow/unreachable PyPI cannot stall
# the Node server's port binding past Railway's 60s healthcheck window.
# Previously this line could hang indefinitely on bad network days, causing
# the container to be marked unhealthy and replaced — producing a flood of
# 503s to any in-flight client requests.
echo "=== Updating yt-dlp to latest version ==="
timeout 20 pip3 install --break-system-packages --upgrade yt-dlp 2>&1 \
  || echo "Warning: yt-dlp pip upgrade skipped/failed (container will use baked-in version)"
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
# --max-old-space-size=2048 allows Node to use up to 2GB for large video uploads
exec node --max-old-space-size=2048 server.js
