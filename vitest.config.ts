import { fileURLToPath } from 'node:url';

// Minimal Vitest setup (added 2026-06-06, weekend hardening).
// Node environment — these are server-side unit/integration tests, no DOM.
// Path alias mirrors tsconfig "@/*" -> repo root.
// Plain object (not defineConfig) so the config has no hard dependency on a
// project-local `vitest/config` resolution — keeps it runnable across setups.
const config = {
  // Inline empty PostCSS so Vite does NOT load the app's Tailwind postcss
  // config — server-side tests don't touch CSS.
  css: {
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Secrets used only by tests. Real secrets live in env / Railway.
    env: {
      MONTREE_JWT_SECRET: 'test-only-secret-do-not-use-in-prod-1234567890',
      ADMIN_SECRET: 'test-only-admin-secret-do-not-use-in-prod-0987654321',
    },
  },
};

export default config;
