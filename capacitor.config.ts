import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.montree.app',
  appName: 'Montree',
  webDir: 'out',

  // Load app from production server (thin native wrapper approach)
  // All API routes stay on Railway — zero extraction needed
  // httpOnly cookies work same-origin via this config
  server: {
    // Production URL — Capacitor webview treats this as the origin
    // All relative API calls (/api/montree/...) resolve here
    url: 'https://montree.xyz',
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0D3330', // Montree dark teal
      showSpinner: true,
      spinnerColor: '#4ADE80', // Montree emerald
    },
    // Keyboard behavior for form inputs
    Keyboard: {
      resize: 'body',
      scrollAssist: true,
    },
  },

  ios: {
    contentInset: 'automatic',
    // Allow mixed content for development
    allowsLinkPreview: false,
    // Background modes for photo upload sync
    appendUserAgent: 'Montree/1.0',
  },

  android: {
    appendUserAgent: 'Montree/1.0',
    // Allow cleartext for local dev only
    allowMixedContent: false,
  },
};

export default config;
