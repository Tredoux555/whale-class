// lib/montree/ai/index.ts
// Clean exports for Montree AI module

export { MONTREE_SYSTEM_PROMPT, buildAnalyzePrompt, buildWeeklyReportPrompt, buildSuggestNextPrompt } from './prompts';

export { 
  AREA_DISPLAY_NAMES,
  getAreaDisplayName,
  transformAssignment,
  transformChildContext,
  generateFallbackAnalysis,
  generateFallbackSuggestions
} from './utils';
