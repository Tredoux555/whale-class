// lib/story/coach/index.ts — Coach barrel.

export { buildCoachSystemPrompt, buildChildCoachSystemPrompt, type CoachPromptOpts, type ChildCoachPromptOpts } from './system-prompt';
export { COACH_TOOLS, CHILD_COACH_TOOLS } from './tool-definitions';
export { executeCoachTool, type CoachToolDeps, type CoachToolResult } from './tool-executor';
export {
  loadCoachMemories,
  formatCoachMemoriesForPrompt,
  type CoachMemory,
} from './memory';
export { getCoachWisdomSummary } from './knowledge-loader';
export { getCoachProfile, displayNameForSpace } from './profile';
export { computeLoad, type LoadReport } from './personal-data';
export { loadRecentThread, type RecentThreadOpts } from './recent-thread';
export {
  setReminder,
  listReminders,
  cancelReminder,
  loadUpcomingSection,
  nextFutureOccurrence,
  formatLocalWhen,
  type Recurrence,
} from './reminders';
export {
  writeBuildState,
  loadCurrentBuildState,
  listActiveBuildProjects,
  formatBuildStateForPrompt,
  renderBuildStateDoc,
  type BuildStateInput,
  type BuildListItem,
  type StepStatus,
  type CurrentBuildState,
} from './build-state';
export {
  isConsolidationDue,
  consolidateCoachDay,
  type ConsolidationResult,
} from './consolidation';
export {
  getFamilyRole,
  listFamilyTargets,
  getLinkKind,
  canWriteContext,
  addContextNote,
  listContextNotesForAuthor,
  editContextNote,
  setContextNoteArchived,
  loadIncomingContextForCoach,
  formatChildContextForPrompt,
  formatPartnerContextForPrompt,
  isValidSpace,
  type FamilyRole,
  type LinkKind,
  type FamilyTarget,
  type ContextNote,
  type IncomingContextNote,
} from './family';
export {
  resolveFamily,
  resolveFamilyKey,
  emitFamilySignal,
  runFamilyBrain,
  loadActiveNudgeForSpace,
  formatNudgeForPrompt,
  familyBrainObservationForParent,
  SIGNAL_TYPES,
  SIGNAL_DOMAINS,
  type SignalType,
  type SignalDomain,
  type FamilyMember,
  type EmitSignalInput,
} from './family-brain';

import type { LoadReport } from './personal-data';

/**
 * One-line live load snapshot for the Coach's system prompt, so it always knows
 * the WIP situation even without calling check_load.
 */
export function formatLoadSnapshot(load: LoadReport): string {
  if (load.active_count === 0 && load.paused_count === 0) {
    return 'No active projects on record yet.';
  }
  const active = load.active_projects
    .map((p) => `${p.title}${p.priority ? ` (P${p.priority})` : ''}`)
    .join(', ');
  const over = load.over_limit
    ? ` ⚠️ OVER the WIP limit of ${load.wip_limit} — push back hard on anything new.`
    : '';
  return `${load.active_count} active project${load.active_count === 1 ? '' : 's'} (limit ${load.wip_limit})${
    load.paused_count ? `, ${load.paused_count} paused` : ''
  }: ${active || '—'}.${over}`;
}
