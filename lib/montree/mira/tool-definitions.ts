// lib/montree/mira/tool-definitions.ts
//
// Mira's tool surface. Two read tools (list_my_schools, list_my_codes,
// school_health) + three drafting tools (cold outreach, follow-up, translate).
// All read tools self-scope to auth.userId — see tool-executor.ts for the
// cross-pollination contract.

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const MIRA_TOOLS: Tool[] = [
  // ── READ TOOLS ────────────────────────────────────────────────────────
  {
    name: 'list_my_schools',
    description:
      "List the schools the agent has referred. Returns each school with: id, name, created_at, student_count, revenue_share_pct, revenue_share_active, last_active_at (most recent activity signal — login, photo, or AI call). Use whenever the agent asks 'how are my schools doing?', 'what's in my book?', 'list my schools', or names a school but you don't have its id yet.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_my_codes',
    description:
      "List the agent's referral codes. Each entry: code, status ('pending' | 'redeemed' | 'revoked' | 'expired'), pitch_label (the agent's note about which school this code was for), redeemed_by_school_name (if any), revenue_share_pct, created_at. Use when the agent asks 'what codes do I have out there?', 'which codes haven't converted?', 'how is MIRA-2GH4 doing?'. Filter inline if she asks about a specific status.",
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'redeemed', 'revoked', 'expired'],
          description:
            'Optional status filter. Defaults to all statuses. Use "pending" to find schools the agent pitched but who haven\'t signed up yet — those are the follow-up candidates.',
        },
      },
    },
  },
  {
    name: 'school_health',
    description:
      "Read the activity signal of a single school the agent has referred. Returns: student_count, classroom_count, days_since_last_activity, principal_logged_in_at, recent_photo_count_this_week, ai_tier ('free' | 'haiku' | 'sonnet'), and a verdict line ('healthy' | 'quiet' | 'idle' | 'never_started'). Use when the agent names a converted school and wants to know whether to nudge, leave alone, or write off. Requires school_id — call list_my_schools first to resolve a name to an id.",
    input_schema: {
      type: 'object',
      properties: {
        school_id: { type: 'string' },
      },
      required: ['school_id'],
    },
  },

  // ── DRAFT TOOLS ───────────────────────────────────────────────────────
  {
    name: 'draft_outreach_email',
    description:
      "Draft a cold outreach email the agent can copy + send. Returns a single text body (subject line + body separated by a blank line). Use when the agent asks to 'draft an email to [school]', 'write a pitch for [school]', 'cold-pitch [school]'. Pass the school name, country (for cultural register), target language (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru), and any context the agent gave you about why this school in particular (e.g., 'they emailed asking for details', 'AMI school, training centre, multi-campus'). The tool will produce a warm, specific, decisive cold pitch in the requested language.",
    input_schema: {
      type: 'object',
      properties: {
        school_name: { type: 'string' },
        country: {
          type: 'string',
          description:
            "Country (or city if city is more specific) — used for cultural register. E.g., 'China' / 'Argentina' / 'Italy'.",
        },
        language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
          description: "Target language for the email body. Defaults to 'en' if omitted.",
        },
        context: {
          type: 'string',
          description:
            "Anything the agent told you about this school. Keep it brief — 1-3 sentences. E.g., 'AMI-affiliated, runs a training centre, three campuses across Buenos Aires'.",
        },
      },
      required: ['school_name'],
    },
  },
  {
    name: 'draft_followup_email',
    description:
      "Draft a polite follow-up nudge the agent can send to a school she's already pitched. Returns a single text body. Use when the agent says 'draft a follow-up for [school]', 'nudge [school]', 'they haven't replied to [school]'. Same parameters as draft_outreach_email — the tool generates a warmer, shorter follow-up that references the prior outreach without being apologetic.",
    input_schema: {
      type: 'object',
      properties: {
        school_name: { type: 'string' },
        country: { type: 'string' },
        language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
        },
        days_since_first_email: {
          type: 'number',
          description: 'Roughly how many days since the original pitch. Shapes the tone.',
        },
        context: {
          type: 'string',
          description: 'Anything the agent has shared since the original outreach (e.g., reply received, sentiment, anything new about the school).',
        },
      },
      required: ['school_name'],
    },
  },
  {
    name: 'translate_text',
    description:
      "Translate a piece of text the agent has already written into a target language. Use when the agent says 'translate this to Spanish', 'put this in Chinese', or pastes a draft and asks for a localised version. Pass the source text and target language. Returns the translated text only — no commentary, no explanation. The tool preserves tone, register, and line breaks.",
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        target_language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
        },
      },
      required: ['text', 'target_language'],
    },
  },
];
