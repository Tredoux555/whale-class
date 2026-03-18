#!/bin/bash
# scripts/build-native.sh
# Build and sync Capacitor native app
#
# Architecture: "Thin native wrapper" — Capacitor loads from montree.xyz (server.url)
# The webDir 'out' only needs a minimal index.html for Capacitor init.
# All actual pages load from the production server.
#
# To run:
#   cd ~/Desktop/Master\ Brain/ACTIVE/whale
#   bash scripts/build-native.sh
#
# Then:
#   npx cap open ios      # Opens Xcode
#   npx cap open android  # Opens Android Studio

set -e

WHALE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WHALE_DIR"

echo "📱 Montree Native App Build"
echo "==========================="
echo ""

# Step 1: Ensure dependencies are installed
echo "📦 Installing dependencies..."
npm install --no-audit --no-fund 2>&1 | tail -5

# Step 2: Create minimal 'out' directory for Capacitor
# (Since we use server.url, this is just a fallback shell)
echo "📂 Creating Capacitor web directory..."
mkdir -p out
cat > out/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Montree</title>
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; background: #0D3330; font-family: -apple-system, sans-serif; }
    .loader { text-align: center; color: white; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.2);
               border-top-color: #4ADE80; border-radius: 50%;
               animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { opacity: 0.7; font-size: 14px; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Loading Montree...</p>
  </div>
</body>
</html>
EOF

# Step 3: Add Capacitor platforms if they don't exist
if [ ! -d "$WHALE_DIR/ios" ]; then
  echo "🍎 Adding iOS platform..."
  npx cap add ios
fi

if [ ! -d "$WHALE_DIR/android" ]; then
  echo "🤖 Adding Android platform..."
  npx cap add android
fi

# Step 4: Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  npx cap open ios       # Open in Xcode (build & run on simulator)"
echo "  npx cap open android   # Open in Android Studio"
echo ""
echo "The app loads from https://montree.xyz"
echo "Native plugins: camera, filesystem, network, push notifications"
echo "Offline photo queue: saves photos locally, syncs when online"
