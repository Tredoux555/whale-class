// lib/montree/gloria/index.ts
// Barrel re-exports for Gloria. Mirrors lib/montree/tracy/index.ts.

export { buildGloriaSystemPrompt } from './system-prompt';
export type { GloriaSystemPromptOpts } from './system-prompt';

export { GLORIA_TOOLS } from './tool-definitions';

export { executeGloriaTool } from './tool-executor';
export type { GloriaToolResult, GloriaToolDeps } from './tool-executor';

export { gloriaKeys } from './storage-keys';
