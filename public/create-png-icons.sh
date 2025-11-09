#!/bin/bash
# Simple script to create placeholder PNG icons using ImageMagick or sips

if command -v convert &> /dev/null; then
    # Using ImageMagick
    convert -size 192x192 xc:#4A90E2 -gravity center -pointsize 80 -fill white -annotate +0+0 "🐋" icon-192.png
    convert -size 512x512 xc:#4A90E2 -gravity center -pointsize 200 -fill white -annotate +0+0 "🐋" icon-512.png
    echo "Icons created with ImageMagick"
elif command -v sips &> /dev/null; then
    # Using macOS sips (limited - creates solid color)
    echo "Creating solid color placeholders with sips..."
    # Create solid blue squares as placeholders
    # Note: sips doesn't support emoji, so these will be solid color
    sips -z 192 192 --setProperty format png --out icon-192.png /System/Library/CoreServices/DefaultDesktop.heic 2>/dev/null || echo "PNG creation skipped - use SVG icons or convert manually"
    echo "For proper icons with emoji, convert the SVG files to PNG"
else
    echo "ImageMagick or sips not found. Please convert SVG files manually:"
    echo "  - Use online tool: https://cloudconvert.com/svg-to-png"
    echo "  - Or install ImageMagick: brew install imagemagick"
fi
