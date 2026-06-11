# App Store Phase 1 — native hardening notes

Branch: `appstore/phase1-native`. These changes target the native shell only — they do NOT affect the Railway web app.

## Delivered in this branch

1. **Branded app icon** — `resources/icon-master.svg` (1024 master).
2. **Branded splash** — `resources/splash-master.svg` (2732 master, tree mark + wordmark).
3. **Offline fallback page** — `native-assets/offline.html` — self-contained, brand-styled, with Retry + auto-retry on reconnect. This is the white-screen fix (Apple 4.2 + quality).
4. **`resources/gen-assets.mjs`** — rasterizes the SVGs (needs librsvg-backed sharp; see gate below).

## To finish in the toolchain session (with simulator)

### Icons + splash (1 command)
Once CocoaPods + a librsvg-capable image lib are installed:
```
npm i -D @capacitor/assets
# put icon.png (1024) + splash.png (2732) in resources/  (rasterize the SVGs;
# easiest: brew install librsvg && rsvg-convert -w 1024 -h 1024 resources/icon-master.svg > resources/icon.png )
npx @capacitor/assets generate --ios --android
```
This writes every required icon/splash size into `ios/` and `android/`.

### Offline fallback wiring (needs device/simulator test)
The app uses `server.url: https://montree.xyz`, so on a cold start with no network the WebView goes blank. Two ways to show `offline.html` instead — **validate in the simulator with airplane mode on**:

- **Option 1 (recommended, preserves Capacitor bridge):** keep `server.url`; add a native load-error handler.
  - iOS: in `ios/App/App/AppDelegate.swift` (or a `WKNavigationDelegate`), on `didFailProvisionalNavigation`, load the bundled `public/offline.html`.
  - Android: in `MainActivity`, override `onReceivedError` to load `file:///android_asset/public/offline.html`.
  - Copy `native-assets/offline.html` into the bundled web dir so both platforms ship it.
- **Option 2 (simpler, risk: bridge):** drop `server.url`; bundle a local launcher `index.html` that pings `/api/warm` then `location.replace('https://montree.xyz')` when online, else shows offline. Test that camera/push still work after the redirect before choosing this.

### Native features to verify as real (the 4.2 insurance)
- **Push notifications** — `@capacitor/push-notifications` is installed. Confirm registration + a test push end-to-end. This is the single strongest "more than a website" signal for review.
- **Camera** — `lib/montree/platform/camera.ts` exists; confirm native capture works in-app.
- **Status bar / safe areas** — set `StatusBar` style (light content on dark teal) and confirm no content under the notch (viewport-fit=cover is already in offline.html).

## The gate
Local Mac is missing: CocoaPods, Java (JDK), Android SDK, librsvg. Xcode 26.3 is present. Installing CocoaPods + librsvg + Fastlane is CLI (I can do it on request); Android Studio + JDK + accounts are yours. Nothing here can be store-built until that's done — which is why Phase 0 (setup) comes first.
