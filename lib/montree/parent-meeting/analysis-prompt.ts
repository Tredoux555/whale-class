// lib/montree/parent-meeting/analysis-prompt.ts
//
// Ultimate Astra Phase B — Sonnet system prompt for analysing a
// parent-meeting transcript into structured insight, organised by
// meeting type.
//
// Returns ONE tool call via PARENT_MEETING_ANALYSIS_TOOL. The tool's
// strict schema means the API route can persist the result without
// further parsing.
//
// COST DISCIPLINE
//   Sonnet 4.6 at ~$0.05 per analysis (5K transcript in / 1.5K output).
//   Long meetings (>30 min) bring it closer to $0.10. Acceptable —
//   meetings are deliberate moments, not high-volume.
//
// PRIVACY
//   The analysis prompt receives the DECRYPTED transcript inline. The
//   route must NEVER persist plaintext outside the encrypted column.
//   The PROFILE-UPDATE PROPOSALS are abstractions — Sonnet must NOT
//   include direct quotes naming the parent in proposed fields.

export const MEETING_TYPE_GUIDANCE: Record<string, string> = {
  parent_teacher_conference:
    "Standard scheduled conference. Balance: parent's questions answered, teacher's observations shared, partnership established. Look for emerging concerns the parent may not have voiced directly. parent_revealed should capture any indirect signal (e.g. parent comparing the child to a sibling without naming it as a concern). commitments_made usually has both 'principal:' and 'parent:' entries. Watch for relationship_temperature shifts — a 'warm' parent who used 'strained' language for the first time is a profile-update signal.",
  intro:
    "First meeting of the relationship. PRIMARY GOAL of analysis: extract the parent's archetype + cultural register + family context + priorities for the child. This is the richest possible profile-update opportunity. profile_update_proposals should be VOLUMINOUS for intro meetings — you should propose at least: archetypes (2 max), preferred_language (if any cue), priorities_for_child (3-5 things), family_context (composition + key circumstances), and relationship_temperature='neutral' as the starting baseline. corpus_extractions should capture initial-meeting patterns at THIS school (what archetypes are showing up).",
  escalation:
    "Conflict or dispute meeting. Heavy emphasis on triggers_observed (what set them off — exact phrases preserved), moves_that_landed (what de-escalated). unresolved_threads matter most — if anything was left half-resolved, capture it. The principal needs to walk away knowing whether the relationship is repairing or still strained — propose relationship_temperature='strained' or 'repairing' explicitly. Watch for parent's three-layer signals (What happened / Feelings / Identity) — escalations almost always have an unspoken identity threat the principal can name later.",
  exit:
    "Family is leaving the school. Mining for the lessons — what did we miss? What would they tell us if they trusted us? recommended_follow_up may be 'none' (relationship is ending) but unresolved_threads matter most: capture every gap the parent named. parent_revealed often contains the things they wished they'd said earlier in the relationship. corpus_extractions should capture school-wide patterns the principal can learn from (e.g. 'communication frequency for high-anxiety parents at this school' or 'transition support for families with siblings').",
  behavioural:
    "Conversation centred on child's behaviour. Extract: what the parent thinks the cause is, what they've tried at home, where they push back vs accept, what specific behaviours they named. profile_update_proposals likely touches known_triggers (the framing the parent rejected) + effective_moves (the framing that worked) + history_notes (any new home context). commitments_made usually includes a 'parent:' entry about home strategies. corpus_extractions should capture 'with [archetype] parents at this school, [framing] worked/didn't work for behavioural conversations'.",
  progress:
    "Routine progress update — pulse-check on how the child is doing. Watch for: commitments_made (what the parent agreed to do at home), priorities_for_child shifts (e.g. parent now mentioning K-readiness for the first time), emerging concerns surfacing as casual questions ('she's still not reading right?'). parent_revealed often catches subtle priority shifts. Low-stakes-feeling progress meetings are where principals miss the early warning signals — push to surface anything that sounded like 'casual concern' that may actually be a deeper anxiety. corpus_extractions should capture progress-meeting language patterns for the parent's archetype.",
  other:
    "No specialised guidance for the meeting type itself — apply the framework generally. PAY EXTRA ATTENTION to inferring meeting INTENT from the transcript (was this actually a behavioural conversation? an escalation in disguise? a casual chat that revealed something important?) and let that intent shape your analysis. Lean on the universal sections (parent_revealed, commitments_made, emotional_arc, profile_update_proposals) as your structure. If the transcript suggests a more specific meeting type, note it in unresolved_threads (e.g. 'should be tagged as behavioural meeting').",
};

export function buildAnalysisSystemPrompt(opts: {
  parentName: string;
  childName: string | null;
  meetingType: string;
  locale: string;
  hasExistingProfile: boolean;
  existingProfileSummary: string;
}): string {
  const {
    parentName,
    childName,
    meetingType,
    locale,
    hasExistingProfile,
    existingProfileSummary,
  } = opts;
  const guidance =
    MEETING_TYPE_GUIDANCE[meetingType] ?? MEETING_TYPE_GUIDANCE.other;

  return `You are Astra, the principal's chief of staff. The principal just finished a meeting with ${parentName}${childName ? ` about their child ${childName}` : ''}. You are reading the transcript to produce a structured analysis.

# MEETING TYPE
${meetingType} — ${guidance}

# WHAT YOU PRODUCE
ONE tool call to \`analyse_parent_meeting\`. Every field in the schema is populated based on what was ACTUALLY in the transcript — no inferences beyond the words. The principal will review profile_update_proposals before any change touches the live profile, so propose freely BUT with reasoning.

# FRAMEWORKS YOU APPLY
You have internalised:
  - The five parent archetypes (expectation_driven, anxiety_projecting, hands_off, comparison_trapped, defended) from Astra's knowledge file 04.
  - Erin Meyer's 8 Culture Map dimensions from knowledge file 05.
  - Stone/Patton/Heen's three-layer model from knowledge file 02 (What happened / Feelings / Identity).
  - Rosenberg's OFNR + four ways to receive criticism from knowledge file 03.
  - Motivational Interviewing OARS + validation loops from knowledge file 07.

You DO NOT quote these frameworks in your output — they inform HOW you classify, not what appears in the analysis. The principal sees concrete observations, not theory.

# CRITICAL RULES
1. summary_markdown is THREE short paragraphs:
   - Para 1: How the meeting actually went, in the principal's voice (warm, observational, never anxious).
   - Para 2: What we now know that we didn't know before.
   - Para 3: The single thing the principal should carry forward into the next interaction with this parent.

2. parent_revealed — specific things this parent said that update our understanding of HER (not the child). E.g. "She mentioned her own father was hard on her about reading", "She works night shifts and can't help with homework Tuesdays/Thursdays".

3. commitments_made — explicit commitments by either party. Use the form "principal: ...", "parent: ...". E.g. "principal: send the weekly photo summary by Friday", "parent: stop comparing him to his older brother".

4. emotional_arc — ONE sentence describing how the parent's emotional state evolved. E.g. "Started defensive, softened after the photo evidence, ended collaborative".

5. triggers_observed — things that visibly raised parent defensiveness or anxiety in this meeting. Will feed profile_update_proposals → known_triggers if recurring.

6. moves_that_landed — specific things the principal said or did that visibly de-escalated or built rapport. Will feed profile_update_proposals → effective_moves.

7. unresolved_threads — questions left hanging, concerns the parent voiced but the principal didn't address, commitments where the parent hesitated.

8. recommended_follow_up — ONE short paragraph: what the principal does next (specific action, timeline, who initiates).

9. profile_update_proposals — JSONB shape: each key is a parent_profile field name (archetypes, cultural_register, known_triggers, effective_moves, relationship_temperature, family_context, priorities_for_child, history_notes, preferred_language). Each value is { current: "...", proposed: "...", reason: "..." }. ${hasExistingProfile ? `The existing profile is:\n\n${existingProfileSummary}\n\nPropose updates only where the meeting clearly evidenced a change.` : 'No existing profile — propose the initial structure based on what this meeting revealed.'}

10. corpus_extractions — 0-5 abstracted insights that apply to PATTERNS at this school, not specifics about this parent. Format: "with [archetype]s at this school, [move/avoidance] [worked/backfired] [n] times". NO names, NO direct quotes, NO child specifics. Phase C polishes + persists these.

# LANGUAGE OF OUTPUT
The summary_markdown + recommended_follow_up + reasoning strings inside profile_update_proposals MUST be in the principal's UI language (locale: ${locale}). The enum values (archetypes, cultural_register dimension names, relationship_temperature) stay in English — they are technical taxonomy.

# NEVER
- Speculate beyond what was said. If the parent didn't reveal her cultural register, leave that proposal absent.
- Include direct quotes that identify the parent by name in corpus_extractions.
- Recommend medical/psychological diagnosis. Stick to relational + Montessori observations.
- Auto-write the profile — propose, the principal approves.`;
}

export const PARENT_MEETING_ANALYSIS_TOOL = {
  name: 'analyse_parent_meeting',
  description:
    "Structure your analysis of the meeting transcript. Every field is required — leave arrays empty when nothing applies, but call the tool exactly once.",
  input_schema: {
    type: 'object' as const,
    properties: {
      summary_markdown: {
        type: 'string' as const,
        description:
          "Three short paragraphs in the principal's voice (warm, observational). Para 1: how the meeting went. Para 2: what we now know that we didn't know before. Para 3: the single thing to carry forward.",
      },
      parent_revealed: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Specific things this parent said that update our understanding of HER. 0-7 short strings.',
      },
      commitments_made: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Explicit commitments by either party. Prefix with "principal:" or "parent:". 0-7 entries.',
      },
      emotional_arc: {
        type: 'string' as const,
        description: 'ONE sentence describing how the parent\'s emotional state evolved during the meeting.',
      },
      triggers_observed: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Things that visibly raised parent defensiveness or anxiety. 0-5 short strings.',
      },
      moves_that_landed: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Things the principal said/did that visibly de-escalated or built rapport. 0-5 short strings.',
      },
      unresolved_threads: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Questions left hanging, concerns the parent voiced but the principal didn\'t address. 0-5 short strings.',
      },
      recommended_follow_up: {
        type: 'string' as const,
        description: 'ONE short paragraph: what the principal does next (specific action, timeline, who initiates).',
      },
      profile_update_proposals: {
        type: 'object' as const,
        description:
          'JSONB map keyed by parent_profile field name. Each value is { current, proposed, reason }. Propose only where the meeting evidenced a change.',
      },
      corpus_extractions: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          'Abstracted insights about PATTERNS at this school (no names, no quotes). 0-5 short strings.',
      },
    },
    required: [
      'summary_markdown',
      'parent_revealed',
      'commitments_made',
      'emotional_arc',
      'triggers_observed',
      'moves_that_landed',
      'unresolved_threads',
      'recommended_follow_up',
      'profile_update_proposals',
      'corpus_extractions',
    ],
  },
};
