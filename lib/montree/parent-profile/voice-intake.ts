// lib/montree/parent-profile/voice-intake.ts
//
// Sonnet-driven structurer that turns a 60-90s principal voice transcript
// about a parent into a draft `ParentProfileDraft` matching the
// montree_parent_profiles schema.
//
// USAGE
//   const { draft, costUsd, generationMs } = await parseVoiceIntake({
//     transcript, parentName, locale, anthropic
//   });
//
// FAILURE MODE
//   Graceful degradation. If Sonnet errors or returns malformed JSON, we
//   surface a `draft` with archetypes/triggers/moves all empty and the raw
//   transcript stuffed into `history_notes` — the principal can review +
//   edit on the UI rather than losing her recording.
//
// COST
//   ~$0.005 per intake (Sonnet 4.6, ~700 tokens in / ~500 tokens out).
//
// SCHOOL-SCOPING
//   This module is a pure compute helper — no DB access, no school filter
//   inside. The caller (POST /api/montree/admin/parent-profile) does the
//   school-scoping by verifying parent_id belongs to the principal's
//   school BEFORE calling this.

import type Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/anthropic';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';

// The five canonical archetypes from Astra's knowledge file 04.
export const PARENT_ARCHETYPES = [
  'expectation_driven',
  'anxiety_projecting',
  'hands_off',
  'comparison_trapped',
  'defended',
] as const;
export type ParentArchetype = (typeof PARENT_ARCHETYPES)[number];

// Erin Meyer's 8 Culture Map dimensions (knowledge file 05).
export const CULTURAL_DIMENSIONS = [
  'communicating',
  'evaluating',
  'persuading',
  'leading',
  'deciding',
  'trusting',
  'disagreeing',
  'scheduling',
] as const;
export type CulturalDimension = (typeof CULTURAL_DIMENSIONS)[number];

// Hard-checked by the migration's CHECK constraint.
export const RELATIONSHIP_TEMPERATURES = [
  'warm',
  'neutral',
  'strained',
  'repairing',
] as const;
export type RelationshipTemperature = (typeof RELATIONSHIP_TEMPERATURES)[number];

export interface ParentProfileDraft {
  archetypes: ParentArchetype[];
  cultural_register: Partial<Record<CulturalDimension, string>>;
  preferred_language: string;
  known_triggers: string[];
  effective_moves: string[];
  relationship_temperature: RelationshipTemperature;
  family_context: string;
  priorities_for_child: string[];
  history_notes: string;
}

export interface VoiceIntakeInput {
  transcript: string;
  parentName: string;
  /** ISO locale of the principal's UI (e.g. 'en', 'zh'). Influences the
   *  free-text output language but NOT the structured enums. */
  locale?: string;
  anthropic: Anthropic | null;
}

export interface VoiceIntakeResult {
  draft: ParentProfileDraft;
  costUsd: number;
  generationMs: number;
  /** True when Sonnet errored / returned malformed output and we fell
   *  back to a blank draft with the raw transcript in history_notes. */
  degraded: boolean;
}

// Sonnet pricing per million tokens (canonical $3 / $15 for sonnet-4-6).
const INPUT_USD_PER_MTOK = 3.0;
const OUTPUT_USD_PER_MTOK = 15.0;
const MAX_TOKENS = 1200;
const TIMEOUT_MS = 60_000;

const EMPTY_DRAFT: ParentProfileDraft = {
  archetypes: [],
  cultural_register: {},
  preferred_language: '',
  known_triggers: [],
  effective_moves: [],
  relationship_temperature: 'neutral',
  family_context: '',
  priorities_for_child: [],
  history_notes: '',
};

const STRUCTURE_TOOL = {
  name: 'structure_parent_profile',
  description:
    "Extract a structured parent profile from a principal's voice transcript. Only populate fields that are EXPLICITLY implied by the transcript — leave blanks blank. The principal will review and edit on the UI, so don't invent material.",
  input_schema: {
    type: 'object' as const,
    properties: {
      archetypes: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          enum: PARENT_ARCHETYPES as unknown as string[],
        },
        description:
          "Zero to two archetypes from this set. expectation_driven = focused on academic outcomes, K-readiness, getting ahead. anxiety_projecting = parent's own anxiety projected onto the child's progress. hands_off = trusts the teacher fully, low engagement. comparison_trapped = obsessed with how their child compares to other children (especially siblings). defended = pre-emptively defensive, hostile to any developmental observation.",
      },
      cultural_register: {
        type: 'object' as const,
        description:
          "Erin Meyer's Culture Map dimensions. Each value is a short descriptive phrase (e.g. 'high_context', 'indirect', 'hierarchical') derived from the transcript. Leave dimensions absent if not implied.",
        properties: {
          communicating: { type: 'string' as const },
          evaluating: { type: 'string' as const },
          persuading: { type: 'string' as const },
          leading: { type: 'string' as const },
          deciding: { type: 'string' as const },
          trusting: { type: 'string' as const },
          disagreeing: { type: 'string' as const },
          scheduling: { type: 'string' as const },
        },
      },
      preferred_language: {
        type: 'string' as const,
        description:
          "ISO 639-1 code (lowercase, 2 chars) for the language the parent emotionally processes in. Often differs from their English fluency level. Empty string if unknown.",
      },
      known_triggers: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          "Specific things to AVOID with this parent (1-7 short strings, free-text). Examples: 'comparison to older sibling', 'framing as behaviour problem', 'deficit language'.",
      },
      effective_moves: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          "Specific things that consistently land well with this parent (1-7 short strings, free-text). Examples: 'photo evidence', 'anchoring to Montessori philosophy', 'naming the strength first'.",
      },
      relationship_temperature: {
        type: 'string' as const,
        enum: RELATIONSHIP_TEMPERATURES as unknown as string[],
        description:
          "Current state of the principal-parent relationship. warm = good rapport. neutral = professional, no signal either way. strained = tension exists. repairing = was strained, actively rebuilding.",
      },
      family_context: {
        type: 'string' as const,
        description:
          "Free-text family context (max 600 chars). Siblings' names, parent's profession, household composition, key family circumstances the principal needs to remember.",
      },
      priorities_for_child: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          "What the parent has said matters most for their child (1-6 short strings, free-text). Examples: 'academic readiness for K', 'independence', 'social confidence', 'reading fluency'.",
      },
      history_notes: {
        type: 'string' as const,
        description:
          "Free-text history notes (max 1500 chars). Anything else from the transcript that doesn't fit a structured slot — past incidents, relationship history, recurring concerns.",
      },
    },
    required: [
      'archetypes',
      'cultural_register',
      'preferred_language',
      'known_triggers',
      'effective_moves',
      'relationship_temperature',
      'family_context',
      'priorities_for_child',
      'history_notes',
    ],
  },
};

function buildSystemPrompt(parentName: string, locale: string): string {
  const languageDirective = getAILanguageInstruction(locale);
  return `You are Astra, helping a Montessori school principal structure her voice-recorded notes about a parent into a profile she'll consult before meetings.

The transcript is the principal speaking freely about ${parentName} — her impressions, her history with this parent, what's worked, what to avoid. Your job is to extract structured data from it. The principal will review and edit your output.

CRITICAL RULES:
- Only populate fields that are EXPLICITLY supported by the transcript. Don't infer beyond what was said.
- Leave fields blank when unsupported. Empty arrays, empty strings, empty object — all are valid.
- Free-text fields (family_context, history_notes, items inside known_triggers / effective_moves / priorities_for_child) MUST be in the principal's UI language for her to read at a glance.
- The enum fields (archetypes, relationship_temperature, cultural_register dimension VALUES) stay in English — they are technical taxonomy, never displayed to the principal directly.
- archetypes draws from: expectation_driven, anxiety_projecting, hands_off, comparison_trapped, defended. Pick at most TWO. A parent who shows none of these in the transcript → empty array.
- cultural_register dimensions come from Erin Meyer's Culture Map: communicating, evaluating, persuading, leading, deciding, trusting, disagreeing, scheduling. Values are short descriptive phrases like 'high_context', 'indirect', 'hierarchical', 'relationship_based'. Only include dimensions the transcript actually touches.
- preferred_language is the language the parent EMOTIONALLY processes in for hard conversations — often different from their English fluency. Use ISO 639-1 (en, zh, es, fr, etc.).
${languageDirective ? `\n${languageDirective}` : ''}

Output ONLY by calling the structure_parent_profile tool. Do not write any text outside the tool call.`;
}

/**
 * Best-effort Sonnet structurer. NEVER throws.
 *
 * Audit-friendly: every Sonnet call is wrapped in try/catch. If anything
 * goes wrong (network blip, malformed tool_use, missing required field),
 * we return a `degraded: true` draft with `history_notes = transcript` so
 * the principal can edit on the UI rather than losing her recording.
 */
export async function parseVoiceIntake(
  input: VoiceIntakeInput
): Promise<VoiceIntakeResult> {
  const { transcript, parentName, locale = 'en', anthropic } = input;
  const startMs = Date.now();
  const fallbackDraft: ParentProfileDraft = {
    ...EMPTY_DRAFT,
    history_notes: transcript.slice(0, 1500),
  };

  if (!anthropic) {
    return {
      draft: fallbackDraft,
      costUsd: 0,
      generationMs: Date.now() - startMs,
      degraded: true,
    };
  }

  if (!transcript || transcript.trim().length < 30) {
    return {
      draft: fallbackDraft,
      costUsd: 0,
      generationMs: Date.now() - startMs,
      degraded: true,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await anthropic.messages.create(
        {
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(parentName, locale),
          tools: [STRUCTURE_TOOL],
          tool_choice: { type: 'tool', name: 'structure_parent_profile' },
          messages: [
            {
              role: 'user',
              content: `Principal's voice transcript about ${parentName}:\n\n${transcript.trim()}`,
            },
          ],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    // Find the tool_use block — narrow via discriminant in if-guard
    // (the canonical codebase pattern; see lib/montree/reports/replan-child.ts).
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'structure_parent_profile') {
      console.warn('[parent-profile/voice-intake] no tool_use block returned');
      return {
        draft: fallbackDraft,
        costUsd: estimateCost(response.usage),
        generationMs: Date.now() - startMs,
        degraded: true,
      };
    }

    const draft = sanitizeDraft(toolUse.input, transcript);

    return {
      draft,
      costUsd: estimateCost(response.usage),
      generationMs: Date.now() - startMs,
      degraded: false,
    };
  } catch (err) {
    console.error(
      '[parent-profile/voice-intake] Sonnet call failed:',
      err instanceof Error ? err.message : err
    );
    return {
      draft: fallbackDraft,
      costUsd: 0,
      generationMs: Date.now() - startMs,
      degraded: true,
    };
  }
}

interface SonnetUsage {
  input_tokens?: number;
  output_tokens?: number;
}

function estimateCost(usage: SonnetUsage | undefined): number {
  if (!usage) return 0;
  const inputCost =
    ((usage.input_tokens ?? 0) / 1_000_000) * INPUT_USD_PER_MTOK;
  const outputCost =
    ((usage.output_tokens ?? 0) / 1_000_000) * OUTPUT_USD_PER_MTOK;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Defensive sanitizer — accepts whatever Sonnet returned and coerces it into
 * a valid ParentProfileDraft. Never throws.
 */
function sanitizeDraft(raw: unknown, transcript: string): ParentProfileDraft {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_DRAFT, history_notes: transcript.slice(0, 1500) };
  }
  const r = raw as Record<string, unknown>;

  const validArchetypes = new Set<string>(PARENT_ARCHETYPES);
  const archetypes = Array.isArray(r.archetypes)
    ? (r.archetypes as unknown[])
        .map((a) => String(a).trim())
        .filter((a) => validArchetypes.has(a))
        .slice(0, 2) as ParentArchetype[]
    : [];

  const cultural_register: Partial<Record<CulturalDimension, string>> = {};
  if (r.cultural_register && typeof r.cultural_register === 'object') {
    const cr = r.cultural_register as Record<string, unknown>;
    for (const dim of CULTURAL_DIMENSIONS) {
      const v = cr[dim];
      if (typeof v === 'string' && v.trim().length > 0) {
        cultural_register[dim] = v.trim().slice(0, 100);
      }
    }
  }

  const preferred_language =
    typeof r.preferred_language === 'string'
      ? r.preferred_language.trim().toLowerCase().slice(0, 5)
      : '';

  const stringArrayCap = (val: unknown, cap = 7, itemMax = 240): string[] =>
    Array.isArray(val)
      ? (val as unknown[])
          .map((s) => String(s).trim().slice(0, itemMax))
          .filter((s) => s.length > 0)
          .slice(0, cap)
      : [];

  const known_triggers = stringArrayCap(r.known_triggers);
  const effective_moves = stringArrayCap(r.effective_moves);
  const priorities_for_child = stringArrayCap(r.priorities_for_child, 6);

  const validTemps = new Set<string>(RELATIONSHIP_TEMPERATURES);
  const relationship_temperature: RelationshipTemperature = validTemps.has(
    String(r.relationship_temperature ?? '')
  )
    ? (r.relationship_temperature as RelationshipTemperature)
    : 'neutral';

  const family_context =
    typeof r.family_context === 'string'
      ? r.family_context.trim().slice(0, 600)
      : '';

  const history_notes =
    typeof r.history_notes === 'string'
      ? r.history_notes.trim().slice(0, 1500)
      : transcript.slice(0, 1500);

  return {
    archetypes,
    cultural_register,
    preferred_language,
    known_triggers,
    effective_moves,
    relationship_temperature,
    family_context,
    priorities_for_child,
    history_notes,
  };
}
