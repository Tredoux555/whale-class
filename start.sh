#!/bin/sh
# Update yt-dlp to latest version at startup (YouTube changes constantly)
echo "=== Updating yt-dlp to latest version ==="
pip3 install --break-system-packages --upgrade yt-dlp 2>&1 || echo "Warning: yt-dlp pip upgrade failed"
echo "yt-dlp version: $(yt-dlp --version 2>/dev/null || echo 'not found')"
echo "=========================================="

# Start Next.js on the port specified by Railway (or default to 3000)
exec ./node_modules/.bin/next start -p ${PORT:-3000}
