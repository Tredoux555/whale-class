// lib/ai/anthropic.ts
// Anthropic Claude API client

import Anthropic from '@anthropic-ai/sdk';


export const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export const AI_ENABLED = !!anthropic;

// Model to use — claude-sonnet-4-6 is the current stable alias (auto-updates)
export const AI_MODEL = 'claude-sonnet-4-6';

// Haiku model for fast, cheap operations
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Token limits
export const MAX_TOKENS = 2048;

// Guru tier → model mapping
export function getModelForTier(tier: 'haiku' | 'sonnet'): string {
  switch (tier) {
    case 'haiku': return HAIKU_MODEL;
    case 'sonnet': return AI_MODEL;
    default: return AI_MODEL;
  }
}
