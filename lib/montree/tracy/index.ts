// lib/montree/tracy/index.ts
// Barrel export for Tracy — the principal's chief-of-staff AI.

export { buildTracySystemPrompt } from './system-prompt';
export type { TracySystemPromptOpts } from './system-prompt';
export { TRACY_TOOLS } from './tool-definitions';
export { executeTracyTool } from './tool-executor';
export type { TracyToolDeps, TracyToolResult } from './tool-executor';
export {
  loadActiveMemories,
  formatMemoriesForPrompt,
  writeMemory,
  recallMemories,
  bumpMemoryReference,
} from './memory';
export type {
  PrincipalMemory,
  PrincipalMemoryType,
  RecallFilters,
  WriteMemoryInput,
} from './memory';

// ── Session 133 — dossier-prep building blocks ─────────────────────────
// These are exported because prepare_parent_meeting (Phase B) and the
// `/api/montree/admin/dossier/parent-meeting` route call them directly,
// outside of Tracy's tool-use loop.
export { consultGuru } from './tools/consult_guru';
export type {
  ConsultGuruInput,
  ConsultGuruResult,
  GuruAnalysis,
} from './tools/consult_guru';
export { detectPattern } from './tools/detect_pattern';
export type {
  DetectPatternInput,
  DetectPatternResult,
  PatternEvent,
} from './tools/detect_pattern';
export { fetchChildContext } from './frameworks/child-focus';
export type {
  ChildContext,
  ChildFocusMatch,
  ChildFocusResult,
  ChildFocusInput,
} from './frameworks/child-focus';
