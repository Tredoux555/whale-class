// lib/cms/i18n/index.ts
// Barrel for the i18n system. Note: server.ts is NOT re-exported here — it
// imports next/headers and would poison any client component that touched this
// barrel. Import it directly: `import { getServerT } from '@/lib/cms/i18n/server'`.

export * from './config';
export * from './t';
export { I18nProvider, useI18n, useT } from './provider';
