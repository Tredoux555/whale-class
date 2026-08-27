# Potato Snaps — native Android shell

A thin Capacitor wrapper around the live site. The webview loads
`https://www.teacherpotato.xyz` directly, so **there is no web build here and no
second copy of the app to keep in sync** — deploying to Railway ships to the
phone at the same time.

This is a *separate* Capacitor project from the one at the repo root. That one
is Montree (`xyz.montree.app`, `ios/`, `android/`). Nothing in this folder
touches it.

| | |
|---|---|
| appId | `xyz.teacherpotato.snaps` |
| appName | Potato Snaps |
| server.url | `https://www.teacherpotato.xyz` |
| minSdk / targetSdk | 24 / 36 |

## Build a debug APK

```bash
cd native/potato-snaps
npm i
npx cap sync android
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

**Never commit the APK.** `.gitignore` blocks `*.apk` deliberately.

### Toolchain

Built on this Mac with:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$PATH"
```

Installed via `brew install openjdk@21` and
`brew install --cask android-commandlinetools`, then
`sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`.
JDK **21** is not optional — AGP 8.13 will not run on 17.

`android/local.properties` carries `sdk.dir` and is git-ignored, so a fresh
clone needs it written (or `ANDROID_HOME` exported) before Gradle will run.

## Why `www/` is committed

`cap add`/`cap sync` refuse to run without a non-empty `webDir`. `www/index.html`
is a placeholder that says "Loading Potato Snaps…" and is **never rendered** —
`server.url` wins the moment the webview starts. It is committed for exactly
that reason: without it, `npm i && npx cap sync` fails on a clean checkout.

## Camera permission — how it actually works

Potato Snaps does **not** use `@capacitor/camera` for capture. The web page
calls `getUserMedia()` inside the webview. That still needs the native
permission, via a chain worth spelling out because it is easy to break:

1. The page calls `getUserMedia()`.
2. The webview raises a `PermissionRequest` for
   `android.webkit.resource.VIDEO_CAPTURE`.
3. Capacitor's `BridgeWebChromeClient.onPermissionRequest()` maps that to
   `Manifest.permission.CAMERA` and launches the runtime permission prompt,
   granting the webview request only if the teacher accepts.
   (Verified in `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java`,
   lines 102–124 — behaviour present since Capacitor 3.)
4. Android only grants a permission the **manifest declared**.

So `<uses-permission android:name="android.permission.CAMERA" />` in
`android/app/src/main/AndroidManifest.xml` is load-bearing. Remove it and the
camera silently never opens — no error, no prompt. `@capacitor/camera` is kept
as a dependency only so the plugin's own permission plumbing is available if the
web side ever switches to the native picker.

`allowMixedContent` is `false`: the site is https, and `getUserMedia` requires a
secure context anyway.

## Saving to the gallery

`lib/potato/save-to-device.ts` (in the Next.js app, not here) detects the shell
at runtime via `window.Capacitor?.isNativePlatform?.()` and then talks to
`@capacitor-community/media` through `registerPlugin('Media')` — by name, so the
community package is never pulled into the **web** bundle that every browser
teacher downloads. On Android it:

1. `getAlbums()` → look for an album named `Potato Snaps`
2. `createAlbum({ name: 'Potato Snaps' })` if absent (errors tolerated)
3. `savePhoto({ path: <data URI>, albumIdentifier, fileName })` —
   `albumIdentifier` is **required on Android** and is the album's path from
   `getAlbums()`, *not* the name. Videos go to `saveVideo()`.

The plugin requests its own gallery permissions at call time. Every failure path
falls back to the old web behaviour, so a broken bridge costs a share sheet, not
a photo.

## The app this replaces — read before releasing

`public/downloads/potato-snaps.apk` used to serve a **different app**:

| | old | new (this project) |
|---|---|---|
| package | `xyz.montree.potatosnaps` | `xyz.teacherpotato.snaps` |
| version | 1.0.2 (code 3) | 1.1.0 (code 2) |
| signed by | `CN=Dark Phonics Live, O=Montree, C=CN` | Android debug key |
| target SDK | 34 | 36 |
| web assets | **bundled** (a Vite build inside the APK) | none — loads the live site |

The old build's source is **not in this repo** and neither is its keystore, so
an upgrade for `xyz.montree.potatosnaps` cannot be produced. Different package
*and* different certificate means Android installs this one **alongside** it —
two icons both labelled "Potato Snaps". The download page now tells teachers to
uninstall the old one; there is no way to do it for them.

Matching the old package name would be worse, not better: same package + wrong
signature = `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, and nothing installs at all.

**`app/api/potato/app-version/route.ts` must not go above versionCode 3.** The
old app is the only reader of that endpoint and nags whenever it sees a higher
number — which it can never satisfy, because the download installs a second app
and leaves it on 3. That is a permanent update loop. See the comment in the
route.

## Installing on a teacher's phone

1. Copy `app-debug.apk` to the phone (USB, Drive, email, or the in-app download
   link at `/downloads/potato-snaps.apk`).
2. Open it in Files. Android will say the source is unknown — tap **Settings**,
   enable **Allow from this source**, then **Install**.
3. Launch **Potato Snaps**. Grant **Camera** on the first shutter tap and
   **Photos and videos** the first time a shot is saved.

The debug APK is signed with the standard Android debug key. That is fine for
sideloading; it is *not* fine for the Play Store, which needs a release key.
