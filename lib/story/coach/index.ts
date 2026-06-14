// lib/story/coach/index.ts — Coach barrel.

export { buildCoachSystemPrompt, type CoachPromptOpts } from './system-prompt';
export { COACH_TOOLS } from './tool-definitions';
export { executeCoachTool, type CoachToolDeps, type CoachToolResult } from './tool-executor';
export {
  loadCoachMemories,
  formatCoachMemoriesForPrompt,
  type CoachMemory,
} from './memory';
export { getCoachWisdomSummary } from './knowledge-loader';
export { computeLoad, type LoadReport } from './personal-data';

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
