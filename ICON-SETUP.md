# 🐋 Whale Icon Setup Guide

To add a whale icon when users save your site to their home screen, follow these steps:

## Quick Setup (Recommended)

1. **Open the icon generator:**
   - Open `public/generate-whale-icons.html` in your web browser
   - You'll see buttons to generate different icon sizes

2. **Generate the icons:**
   - Click each button to generate and download:
     - `favicon-32x32.png` (32x32) - for browser tab
     - `apple-touch-icon.png` (180x180) - for iOS home screen
     - `icon-192.png` (192x192) - for PWA
     - `icon-512.png` (512x512) - for PWA

3. **Save the icons:**
   - Save all downloaded PNG files to the `public/` folder
   - Make sure they're named exactly as shown above

4. **Done!** The icons are already configured in:
   - `app/layout.tsx` - for browser and iOS
   - `public/manifest.json` - for PWA

## Alternative: Use Online Converter

If the HTML generator doesn't work:

1. Use the SVG files in `public/` (icon-192.svg, icon-512.svg, etc.)
2. Convert them to PNG using:
   - https://cloudconvert.com/svg-to-png
   - Or any image editor
3. Save as:
   - `apple-touch-icon.png` (180x180)
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
   - `favicon-32x32.png` (32x32)

## What Each Icon Is For

- **apple-touch-icon.png** (180x180) - iOS home screen icon
- **icon-192.png** (192x192) - PWA icon for Android/desktop
- **icon-512.png** (512x512) - PWA icon for high-res displays
- **favicon-32x32.png** (32x32) - Browser tab icon

## Testing

After adding the icons:

1. **iOS:** Add to home screen and check if whale icon appears
2. **Android:** Install as PWA and check icon
3. **Browser:** Check if favicon appears in browser tab

The icons should show a blue background (#4A90E2) with a whale emoji (🐋).

