// lib/ai/anthropic.ts
// Anthropic Claude API client

import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY not set - AI features will be disabled');
}

export const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export const AI_ENABLED = !!anthropic;

// Model to use (Claude Sonnet for balance of speed/quality)
export const AI_MODEL = 'claude-sonnet-4-20250514';

// Token limits
export const MAX_TOKENS = 2048;


