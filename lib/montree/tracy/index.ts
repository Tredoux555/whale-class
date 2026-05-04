// lib/montree/tracy/index.ts
// Barrel export for Tracy — the principal's chief-of-staff AI.

export { buildTracySystemPrompt } from './system-prompt';
export type { TracySystemPromptOpts } from './system-prompt';
export { TRACY_TOOLS } from './tool-definitions';
export { executeTracyTool } from './tool-executor';
export type { TracyToolDeps, TracyToolResult } from './tool-executor';
