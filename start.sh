#!/bin/sh
# Update yt-dlp to latest version at startup (YouTube changes constantly)
echo "Updating yt-dlp to latest version..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp 2>/dev/null || echo "yt-dlp update failed, using existing version"
chmod a+rx /usr/local/bin/yt-dlp 2>/dev/null || true
echo "yt-dlp version: $(yt-dlp --version 2>/dev/null || echo 'unknown')"

# Start Next.js on the port specified by Railway (or default to 3000)
exec ./node_modules/.bin/next start -p ${PORT:-3000}
