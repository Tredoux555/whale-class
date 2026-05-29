// lib/montree/tracy/index.ts
// Barrel export for Astra — the principal's chief-of-staff AI.

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
// These are exported because prepare_parent_meeting and the
// `/api/montree/admin/dossier/parent-meeting` route call them directly,
// outside of Astra's tool-use loop.
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
export { preparePMeeting } from './tools/prepare_parent_meeting';
export type {
  PrepareParentMeetingInput,
  PrepareParentMeetingResult,
} from './tools/prepare_parent_meeting';

// ── Session 136 — psychological knowledge base ─────────────────────────
// Loaded from disk under lib/montree/tracy/knowledge/. The summary goes
// into Astra's chat system prompt every turn (via the route). The full
// bundle is loaded inside prepare_parent_meeting. consult_tracy_knowledge
// pulls one specific topic in full when chat needs depth.
export {
  getTracyKnowledge,
  getTracyKnowledgeSummary,
  getTracyKnowledgeFull,
  resetTracyKnowledgeCache,
} from './knowledge/loader';
export type {
  TracyKnowledge,
  TracyKnowledgeTopic,
} from './knowledge/loader';
