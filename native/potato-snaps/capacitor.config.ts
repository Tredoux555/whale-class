import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Potato Snaps — native Android shell.
 *
 * This is a SECOND, separate Capacitor project. The repo-root capacitor.config.ts
 * is Montree's shell (xyz.montree.app) and must not be touched. Same pattern
 * though: a thin remote-URL wrapper. The webview loads the live site, so there
 * is no static export and no second copy of the app to keep in sync — a deploy
 * to Railway ships to the phone too.
 *
 * webDir points at a placeholder `www/` only because `npx cap add android`
 * insists a web directory exist. Nothing in it is ever shown: the server URL
 * below wins the moment the webview starts.
 */
const config: CapacitorConfig = {
  appId: 'xyz.teacherpotato.snaps',
  appName: 'Potato Snaps',
  webDir: 'www',

  server: {
    // The live Potato Snaps host. `www.` is load-bearing — middleware.ts
    // redirects the apex to www, and the potato session cookie is minted on
    // www, so pointing the shell at the apex would cost every launch a
    // redirect and could strand the session.
    url: 'https://www.teacherpotato.xyz',
    cleartext: false,
  },

  android: {
    appendUserAgent: 'PotatoSnaps/1.0',
    // No http:// anywhere. The site is https and getUserMedia only works in a
    // secure context regardless.
    allowMixedContent: false,
  },
};

export default config;
