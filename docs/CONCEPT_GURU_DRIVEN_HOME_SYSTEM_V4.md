# Guru-Driven Montessori Home System — Implementation Plan

**Version:** 4.1 (v3 + Cycle 1 + Cycle 2 audit corrections)
**Date:** February 26, 2026
**Status:** FINAL — ready for implementation
**Scope:** Enable the Guru to autonomously manage a homeschool child's shelf, progress, and observations via Anthropic tool-use

---

## 1. WHAT WE'RE BUILDING

The Guru becomes an **orchestrator** for homeschool parents. Instead of parents manually navigating week views and curriculum browsers, the Guru:

- Conducts an intake conversation → saves a structured child profile
- Sets up the shelf (5 focus works, one per Montessori area)
- Runs weekly check-ins → evaluates progress → rotates the shelf
- Saves behavioral observations from parent descriptions
- All via natural conversation — parents never touch the backend

**What changes:** The guru route gains tool-use capability. The frontend gains action confirmations.
**What doesn't change:** All existing API routes, tables, teacher UI, and auth systems stay untouched.

---

## 2. VERIFIED SCHEMAS (from migration files)

### montree_child_focus_works (migration: archive/MONTREE-AUDIT-FIX.sql:90)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
area TEXT NOT NULL,
work_name TEXT NOT NULL,
set_at TIMESTAMPTZ DEFAULT NOW(),
set_by TEXT DEFAULT 'teacher',
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE (child_id, area)    -- ⚠️ ONE work per area per child = 5 max
```
**Columns that DO NOT exist:** `classroom_id`, `work_id`

### montree_child_progress (migration: archive/MONTREE-AUDIT-FIX.sql)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
work_name TEXT NOT NULL,
area TEXT,
status TEXT DEFAULT 'not_started',  -- 'not_started' | 'presented' | 'practicing' | 'mastered'
presented_at TIMESTAMPTZ,
mastered_at TIMESTAMPTZ,            -- set on FIRST mastery only, never overwritten
updated_at TIMESTAMPTZ DEFAULT NOW(),
notes TEXT,
UNIQUE (child_id, work_name)
```

### montree_behavioral_observations (migration: 110_guru_tables.sql:63)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
child_id UUID REFERENCES children(id) ON DELETE CASCADE,  -- ⚠️ FK to OLD table
classroom_id UUID,
observed_at TIMESTAMPTZ DEFAULT now(),
observed_by UUID,                     -- ⚠️ UUID type, not TEXT
behavior_description TEXT NOT NULL,
antecedent TEXT,
behavior_function TEXT CHECK (IN ('attention','escape','sensory','tangible','unknown')),
consequence TEXT,
time_of_day TEXT CHECK (IN ('arrival','morning_work','snack','outdoor','afternoon_work','dismissal')),
activity_during TEXT,
environmental_notes TEXT,
intervention_used TEXT,
effectiveness TEXT CHECK (IN ('effective','partially','ineffective','not_applicable'))
```

### montree_guru_interactions (migration: 110_guru_tables.sql:90)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
child_id UUID REFERENCES children(id) ON DELETE CASCADE,
teacher_id UUID,
classroom_id UUID,
asked_at TIMESTAMPTZ DEFAULT now(),
question TEXT NOT NULL,
question_type TEXT,        -- 'behavior','focus','social','academic','family','emotional','general','chat'
context_snapshot JSONB,
response_insight TEXT NOT NULL,
response_root_cause TEXT,
response_action_plan JSONB,
response_timeline TEXT,
response_parent_talking_point TEXT,
sources_used TEXT[],
processing_time_ms INT,
model_used TEXT
```

### montree_children.settings (JSONB column)
Currently stores: `{ guru_concerns: string[], guru_onboarded: boolean }`
Written via merge pattern in concerns/route.ts.

---

## 3. VERIFIED CURRENT BEHAVIOR

### Guru Route (app/api/montree/guru/route.ts)
- **Model:** `claude-sonnet-4-20250514` (from `AI_MODEL` in lib/ai/anthropic.ts)
- **No streaming** — single blocking `anthropic.messages.create()` call
- **No tool_use** — pure text generation
- **Conversation memory:** last 5 interactions from `montree_guru_interactions`, rebuilt as user/assistant message pairs
- **Conversational branch:** when `conversational: true` AND role is homeschool_parent
  - Uses `buildConversationalPrompt()` from `lib/montree/guru/conversational-prompt.ts`
  - Returns: `{ success: true, insight: string, interaction_id: UUID, conversational: true }`
- **Structured branch:** for teachers/principals
  - Parses response into insight + root_cause + action_plan + timeline + parent_talking_point
- **Both branches** save to `montree_guru_interactions` with same schema

### Context Builder (lib/montree/guru/context-builder.ts)
Fetches 7 things in parallel:
1. Basic child info (name, age, classroom_id)
2. Mental profile (temperament, modality, sensitive periods)
3. Current progress (all works with status/mastered_at)
4. Recent observations (last 30 days)
5. Past guru interactions (last 5, reversed chronologically)
6. Teacher notes (last 20 non-empty)
7. Work counts (mastered/practicing/presented)

**⚠️ Does NOT fetch focus works — must add.**

### GuruChatThread (components/montree/guru/GuruChatThread.tsx)
- Reads: `data.insight` from API response
- No `data.actions` handling exists
- ChatMessage: `{ id, content, isUser, timestamp }`
- On mount: fetches concerns + history, adds welcome/follow-up greeting

### SDK: @anthropic-ai/sdk@0.71.2
- ✅ Full tool_use support (Tool, ToolChoice, ToolUseBlock, ToolResultBlockParam types all present)
- ✅ `stop_reason: 'tool_use'` in StopReason union
- ✅ `tool_choice: { type: 'auto' | 'any' | 'none' | 'tool' }` supported

---

## 4. PRE-REQUISITE FIXES (Phase 0)

These bugs exist today, independent of this feature. Fix them first.

### Fix 0a: focus-works/route.ts sends non-existent columns
**File:** `app/api/montree/focus-works/route.ts` lines 125-133
**Bug:** Upsert includes `classroom_id` and `work_id` — columns don't exist in table
**Fix:** Remove both from the upsert object:
```typescript
// BEFORE (lines 123-138):
const { data, error } = await supabase
  .from('montree_child_focus_works')
  .upsert({
    child_id,
    classroom_id,  // ← REMOVE
    area,
    work_id,       // ← REMOVE
    work_name,
    set_at: new Date().toISOString(),
    set_by: set_by || 'teacher',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'child_id,area' })

// AFTER:
const { data, error } = await supabase
  .from('montree_child_focus_works')
  .upsert({
    child_id,
    area,
    work_name,
    set_at: new Date().toISOString(),
    set_by: set_by || 'teacher',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'child_id,area' })
```
**Lines changed:** ~2 lines removed

### Fix 0b: observations + guru_interactions FK references wrong table
**Tables:** `montree_behavioral_observations` AND `montree_guru_interactions`
**Bug:** Both have `child_id UUID REFERENCES children(id)` — should be `montree_children(id)`
**Fix:** Single migration (`migrations/133_fix_fk_references.sql`):
```sql
-- Fix montree_behavioral_observations FK
ALTER TABLE montree_behavioral_observations
  DROP CONSTRAINT IF EXISTS montree_behavioral_observations_child_id_fkey;
ALTER TABLE montree_behavioral_observations
  ADD CONSTRAINT montree_behavioral_observations_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;

-- Fix montree_guru_interactions FK
ALTER TABLE montree_guru_interactions
  DROP CONSTRAINT IF EXISTS montree_guru_interactions_child_id_fkey;
ALTER TABLE montree_guru_interactions
  ADD CONSTRAINT montree_guru_interactions_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;
```
**⚠️ TEST FIRST:** Check if inserts work today. If Supabase ignores orphan FKs (the `children` table may still exist), this might not be blocking — but fix it anyway for correctness.

---

## 5. IMPLEMENTATION

### Phase 1: Context + Settings Helper (~40 lines, 2 files)

**File 1: lib/montree/guru/context-builder.ts** — Add focus works fetch

Add 8th parallel query:
```typescript
const focusWorksPromise = supabase
  .from('montree_child_focus_works')
  .select('area, work_name, set_at, set_by')
  .eq('child_id', childId);
```

Add to ChildContext interface (REQUIRED — TypeScript will error without this):
```typescript
// In the ChildContext interface definition:
focus_works: Array<{ area: string; work_name: string; set_at: string; set_by: string }>;
```
And initialize it in the `buildChildContext` return object (even if query fails, return `[]`).

Add to context string output:
```typescript
const shelfSection = focusWorks.length > 0
  ? "CURRENT SHELF (Focus Works):\n" +
    focusWorks.map(fw => `- ${fw.area}: ${fw.work_name} (since ${fw.set_at})`).join("\n")
  : "CURRENT SHELF: Empty — no focus works set yet.";
```
**~15 lines added**

**File 2: lib/montree/guru/settings-helper.ts** — NEW file

Extracted from the merge pattern in `app/api/montree/guru/concerns/route.ts`.

**⚠️ Race condition note:** If two tool calls (e.g. `save_checkin` + `save_child_profile`)
run concurrently, the read-merge-write pattern can lose updates. This is acceptable for v1
because the tool executor runs tools sequentially (for loop, not Promise.all). If we ever
parallelize tool execution, switch to PostgreSQL `jsonb_set` or `||` operator.

```typescript
import { getSupabase } from '@/lib/supabase-client';

export async function updateChildSettings(
  childId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase();
  const { data: child } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .single();

  const existing = (child?.settings as Record<string, unknown>) || {};
  const merged = { ...existing, ...updates };

  await supabase
    .from('montree_children')
    .update({ settings: merged })
    .eq('id', childId);
}

export function getChildSettings(
  child: { settings: unknown }
): Record<string, unknown> {
  return (child?.settings as Record<string, unknown>) || {};
}
```
**~25 lines**

---

### Phase 2: Tool Definitions (~130 lines, 1 new file)

**File: lib/montree/guru/tool-definitions.ts**

```typescript
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const GURU_TOOLS: Tool[] = [
  {
    name: "set_focus_work",
    description: "Set the focus work for one Montessori area on the child's shelf. Replaces any existing work for that area (upsert). Call once per area. The shelf holds exactly 5 works max (one per area: practical_life, sensorial, mathematics, language, cultural).",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area"
        },
        work_name: {
          type: "string",
          description: "Exact name of the work from the curriculum (e.g. 'Pink Tower', 'Pouring (dry)')"
        }
      },
      required: ["area", "work_name"]
    }
  },
  {
    name: "clear_focus_work",
    description: "Remove the focus work from a specific area (empty that shelf slot). Use when the child should take a break from an area.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"]
        }
      },
      required: ["area"]
    }
  },
  {
    name: "update_progress",
    description: "Update a work's progress status. Use after check-ins when the parent reports how the child engaged. Status flow: not_started → presented → practicing → mastered.",
    input_schema: {
      type: "object" as const,
      properties: {
        work_name: { type: "string", description: "Exact work name" },
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area this work belongs to"
        },
        status: {
          type: "string",
          enum: ["not_started", "presented", "practicing", "mastered"]
        },
        notes: { type: "string", description: "Optional notes about this update" }
      },
      required: ["work_name", "status"]
    }
  },
  {
    name: "save_observation",
    description: "Save a behavioral observation. Use when the parent describes something notable about concentration, interests, challenges, or development.",
    input_schema: {
      type: "object" as const,
      properties: {
        behavior_description: { type: "string", description: "What was observed" },
        behavior_function: {
          type: "string",
          enum: ["attention", "escape", "sensory", "tangible", "unknown"]
        },
        activity_during: { type: "string", description: "What activity was happening" }
      },
      required: ["behavior_description"]
    }
  },
  {
    name: "save_checkin",
    description: "Record a weekly check-in summary and schedule the next one. ALWAYS call this at the END of every check-in conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Brief summary of what was discussed and decided" },
        next_checkin_days: { type: "number", description: "Days until next check-in (typically 7)" }
      },
      required: ["summary", "next_checkin_days"]
    }
  },
  {
    name: "save_child_profile",
    description: "Save the child's intake profile from the initial conversation. Call after gathering enough info about the child.",
    input_schema: {
      type: "object" as const,
      properties: {
        personality: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        challenges: { type: "array", items: { type: "string" } },
        interests: { type: "array", items: { type: "string" } },
        previous_experience: { type: "string" },
        learning_style: { type: "string" }
      },
      required: ["personality", "interests"]
    }
  }
];
```
**~130 lines**

---

### Phase 3: Tool Executor (~120 lines, 1 new file)

**File: lib/montree/guru/tool-executor.ts**

```typescript
import { getSupabase } from '@/lib/supabase-client';
import { updateChildSettings } from './settings-helper';
import { loadAllCurriculumWorks } from '@/lib/curriculum/curriculum-loader';

// Build a set of valid work names at module load for fast lookup
const VALID_WORK_NAMES: Set<string> = new Set();
try {
  const allWorks = loadAllCurriculumWorks();
  for (const work of allWorks) {
    VALID_WORK_NAMES.add(work.name.toLowerCase());
  }
} catch {
  console.warn('[Tool Executor] Could not load curriculum for validation');
}

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export interface ToolResult {
  success: boolean;
  message: string;
}

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  childId: string
): Promise<ToolResult> {
  const supabase = getSupabase();

  switch (toolName) {
    case 'set_focus_work': {
      const area = input.area as string;
      const work_name = input.work_name as string;
      if (!area || !work_name) return { success: false, message: 'Missing area or work_name' };
      if (work_name.length > 200) return { success: false, message: 'Work name too long' };

      // Validate work_name exists in curriculum (prevents Claude hallucinating work names)
      if (VALID_WORK_NAMES.size > 0 && !VALID_WORK_NAMES.has(work_name.toLowerCase())) {
        // Also check DB for custom works before rejecting
        const { data: customWork } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .ilike('name', work_name)
          .limit(1)
          .maybeSingle();
        if (!customWork) {
          return { success: false, message: `Unknown work: "${work_name}". Use an exact name from the curriculum.` };
        }
      }

      const { error } = await supabase
        .from('montree_child_focus_works')
        .upsert({
          child_id: childId,
          area,
          work_name,
          set_at: new Date().toISOString(),
          set_by: 'guru',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id,area' });

      if (error) return { success: false, message: 'Failed to set focus work' };
      return { success: true, message: `✅ ${AREA_LABELS[area] || area}: ${work_name}` };
    }

    case 'clear_focus_work': {
      const area = input.area as string;
      const { error } = await supabase
        .from('montree_child_focus_works')
        .delete()
        .eq('child_id', childId)
        .eq('area', area);

      if (error) return { success: false, message: 'Failed to clear focus work' };
      return { success: true, message: `Cleared ${AREA_LABELS[area] || area} from shelf` };
    }

    case 'update_progress': {
      const work_name = input.work_name as string;
      const area = (input.area as string) || null;
      const status = input.status as string;
      const notes = (input.notes as string) || null;

      const record: Record<string, unknown> = {
        child_id: childId,
        work_name,
        area,
        status,
        notes,
        updated_at: new Date().toISOString(),
      };

      // First mastery protection: only set mastered_at if not already set
      if (status === 'mastered') {
        const { data: existing } = await supabase
          .from('montree_child_progress')
          .select('mastered_at')
          .eq('child_id', childId)
          .eq('work_name', work_name)
          .maybeSingle();

        if (!existing?.mastered_at) {
          record.mastered_at = new Date().toISOString();
        }
      }

      if (status === 'presented') {
        // Check if presented_at already set
        const { data: existing } = await supabase
          .from('montree_child_progress')
          .select('presented_at')
          .eq('child_id', childId)
          .eq('work_name', work_name)
          .maybeSingle();

        if (!existing?.presented_at) {
          record.presented_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('montree_child_progress')
        .upsert(record, { onConflict: 'child_id,work_name' });

      if (error) return { success: false, message: 'Failed to update progress' };
      return { success: true, message: `${work_name} → ${status}` };
    }

    case 'save_observation': {
      // Validate behavior_function enum
      const validFunctions = ['attention', 'escape', 'sensory', 'tangible', 'unknown'];
      const behaviorFunc = (input.behavior_function as string) || 'unknown';
      if (!validFunctions.includes(behaviorFunc)) {
        return { success: false, message: `Invalid behavior_function: ${behaviorFunc}` };
      }

      const { error } = await supabase
        .from('montree_behavioral_observations')
        .insert({
          child_id: childId,
          classroom_id: null,    // Explicit null — home observations have no classroom
          observed_by: null,     // UUID column — null for guru-created observations
          behavior_description: input.behavior_description as string,
          behavior_function: behaviorFunc,
          activity_during: (input.activity_during as string) || null,
        });

      if (error) {
        console.error('[Tool] save_observation failed:', error.message);
        return { success: false, message: 'Failed to save observation' };
      }
      return { success: true, message: 'Observation saved' };
    }

    case 'save_checkin': {
      const summary = input.summary as string;
      const days = input.next_checkin_days as number;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (days || 7));

      // Read existing settings to get checkin_count
      const { data: child } = await supabase
        .from('montree_children')
        .select('settings')
        .eq('id', childId)
        .single();
      const existing = (child?.settings as Record<string, unknown>) || {};
      const count = (existing.guru_checkin_count as number) || 0;

      await updateChildSettings(childId, {
        guru_last_checkin: new Date().toISOString(),
        guru_last_checkin_summary: summary,
        guru_next_checkin: nextDate.toISOString(),
        guru_checkin_count: count + 1,
      });

      return { success: true, message: `📅 Next check-in: ${nextDate.toLocaleDateString()}` };
    }

    case 'save_child_profile': {
      await updateChildSettings(childId, {
        guru_intake_complete: true,
        guru_intake_date: new Date().toISOString(),
        guru_child_profile: input,
      });

      return { success: true, message: 'Child profile saved' };
    }

    default:
      console.warn(`[Tool Executor] Unknown tool requested: ${toolName}`, JSON.stringify(input).slice(0, 200));
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
```
**~120 lines**

---

### Phase 4: Multi-Turn Loop in Guru Route (~80 lines modified)

**File: app/api/montree/guru/route.ts**

Modify the conversational branch (after line ~156 where `conversational` is detected). Replace the single `anthropic.messages.create()` call with the tool-use loop.

**Key changes:**
1. Import GURU_TOOLS + executeTool
2. Add `tools` and `tool_choice` to the Claude API call
3. Add while loop for `stop_reason === 'tool_use'`
4. Execute tools, collect results, send back to Claude
5. Extract final text, return with actions array
6. Add MAX_TOOL_ROUNDS = 3 guard

```typescript
import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { executeTool, ToolResult } from '@/lib/montree/guru/tool-executor';

const MAX_TOOL_ROUNDS = 3;
const API_TIMEOUT_MS = 25_000; // 25s timeout per API call (Vercel limit is 30s)

// Helper: race API call against timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Inside conversational branch:

// First Claude call — may return tool_use blocks
let response = await withTimeout(
  anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    tools: GURU_TOOLS,
    tool_choice: { type: "auto" },
    messages: conversationMessages.concat([{ role: 'user', content: userPrompt }]),
  }),
  API_TIMEOUT_MS,
  'Guru initial call'
);

const actionsTaken: Array<{ tool: string } & ToolResult> = [];
let rounds = 0;

// Multi-turn loop
while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
  rounds++;
  const toolUseBlocks = response.content.filter(
    (b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use'
  );

  const toolResults = [];
  for (const toolCall of toolUseBlocks) {
    try {
      const result = await executeTool(
        toolCall.name,
        toolCall.input as Record<string, unknown>,
        child_id
      );
      actionsTaken.push({ tool: toolCall.name, ...result });
      toolResults.push({
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        content: JSON.stringify(result),
      });
    } catch (err) {
      console.error(`[Guru Tool] ${toolCall.name} failed:`, err);
      toolResults.push({
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        is_error: true,
        content: JSON.stringify({
          success: false,
          message: `Tool failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        }),
      });
    }
  }

  // Build next turn
  const nextMessages = [
    ...conversationMessages,
    { role: 'user' as const, content: userPrompt },
    { role: 'assistant' as const, content: response.content },
    { role: 'user' as const, content: toolResults },
  ];

  response = await withTimeout(
    anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: GURU_TOOLS,
      tool_choice: { type: "auto" },
      messages: nextMessages,
    }),
    API_TIMEOUT_MS,
    `Guru tool round ${rounds}`
  );
}

// Guard: if loop exited due to MAX_TOOL_ROUNDS, log it
if (rounds >= MAX_TOOL_ROUNDS && response.stop_reason === 'tool_use') {
  console.warn(`[Guru] Max tool rounds (${MAX_TOOL_ROUNDS}) reached. Some actions may be incomplete.`);
}

// Extract final text (with fallback for empty responses after tool loop)
let responseText = response.content
  .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
  .map(b => b.text)
  .join('\n');

if (!responseText.trim() && actionsTaken.length > 0) {
  // Claude used tools but didn't produce a text response — generate a summary
  const successes = actionsTaken.filter(a => a.success);
  responseText = successes.length > 0
    ? `I've made ${successes.length} update${successes.length > 1 ? 's' : ''}: ${successes.map(a => a.message).join(', ')}.`
    : "I tried to make some changes but ran into issues. Could you try again?";
}

// Log cost estimate
const { input_tokens, output_tokens } = response.usage;
const estCost = (input_tokens * 3 + output_tokens * 15) / 1_000_000;
console.log(`[Guru] Tool rounds: ${rounds}, tokens: ${input_tokens}+${output_tokens}, est: $${estCost.toFixed(4)}`);
```

Then the existing save + return logic, modified to include actions:
```typescript
return NextResponse.json({
  success: true,
  insight: responseText,
  actions: actionsTaken.length > 0 ? actionsTaken : undefined,
  interaction_id: saved?.id,
  conversational: true,
});
```

**~80 lines added/modified in route**

---

### Phase 5: Enhanced Prompts (~80 lines modified)

**File: lib/montree/guru/conversational-prompt.ts**

Add intake/checkin/normal mode detection + tool-use instructions to system prompt.

**IMPORTANT:** The guru route must also pass `childSettings` when calling this function.
In `app/api/montree/guru/route.ts`, where `buildConversationalPrompt()` is called (~line 162),
add the 6th argument. The settings are already available from the concerns fetch:

```typescript
// In guru/route.ts conversational branch — fetch settings:
const { data: childRecord } = await supabase
  .from('montree_children')
  .select('settings')
  .eq('id', child_id)
  .single();
const childSettings = (childRecord?.settings as Record<string, unknown>) || {};

// Then pass to prompt builder:
const convPrompt = buildConversationalPrompt(
  question, childContext, knowledge, savedConcerns, isFirstMessage,
  childSettings  // ← 6th arg — enables mode detection
);
```

```typescript
export function buildConversationalPrompt(
  question: string,
  childContext: ChildContext,
  knowledge: KnowledgeResult,
  savedConcerns: string[],
  isFirstMessage: boolean,
  childSettings?: Record<string, unknown>  // ← NEW param (optional for backward compat)
): ConversationalPromptParts {

  // Determine mode — defaults to NORMAL if childSettings not passed
  const intakeComplete = (childSettings?.guru_intake_complete as boolean) ?? false;
  const nextCheckin = childSettings?.guru_next_checkin as string | null ?? null;
  const isCheckinDue = nextCheckin ? new Date(nextCheckin) <= new Date() : false;

  let modeInstructions: string;

  if (!intakeComplete) {
    modeInstructions = INTAKE_MODE;
  } else if (isCheckinDue) {
    modeInstructions = CHECKIN_MODE;
  } else {
    modeInstructions = NORMAL_MODE;
  }

  // Build shelf context
  const shelfContext = childContext.focus_works?.length > 0
    ? "CURRENT SHELF:\n" +
      childContext.focus_works.map(fw =>
        `- ${AREA_LABELS[fw.area]}: ${fw.work_name} (since ${new Date(fw.set_at).toLocaleDateString()})`
      ).join("\n")
    : "CURRENT SHELF: Empty — no focus works set. You should set up the shelf.";

  const systemPrompt = `${CONVERSATIONAL_SYSTEM_PROMPT}

${modeInstructions}

${TOOL_USE_INSTRUCTIONS}

${shelfContext}

${childContext.guru_child_profile ? `CHILD PROFILE:\n${JSON.stringify(childContext.guru_child_profile)}` : ''}`;

  // ... rest of prompt building
}
```

**Mode prompts (add as constants):**

```typescript
const INTAKE_MODE = `MODE: INTAKE
This is a new family. Your goal:
1. Ask about the child — personality, interests, challenges, any Montessori experience
2. Ask 2-3 follow-up questions to understand the child deeply
3. When you have enough info, call save_child_profile with structured data
4. Then set up the shelf: call set_focus_work once for each of the 5 areas
5. Call save_checkin to schedule the first weekly check-in (7 days)
6. Explain what you've set up and walk them through the first work`;

const CHECKIN_MODE = `MODE: WEEKLY CHECK-IN
It's time for this child's weekly check-in. Your goal:
1. Greet warmly, ask how the week went
2. Go through each area on the shelf — ask about each work
3. Based on reports: update_progress for works that changed status
4. Rotate the shelf: set_focus_work for any areas where the child is ready for a new work
5. Save notable observations via save_observation
6. Call save_checkin with a summary and schedule the next check-in
7. Give encouragement and preview what's coming next week`;

const NORMAL_MODE = `MODE: NORMAL CONVERSATION
Answer the parent's question naturally. You may use tools if the conversation warrants it
(e.g., parent says "she mastered it!" → call update_progress), but don't force tool use.`;

const TOOL_USE_INSTRUCTIONS = `You have access to tools that modify the child's learning plan.
Use them naturally during conversation — don't announce "I'm calling a tool."
After using tools, reference what you did conversationally:
  "I've updated the shelf — here's what's new this week..."
  "Great news! I've marked Pink Tower as mastered."
Do NOT call tools unnecessarily. Only call them when the conversation warrants a real change.`;
```
**~80 lines total**

---

### Phase 6: Frontend — Action Confirmations (~50 lines modified, 2 files)

**File 1: components/montree/guru/GuruChatThread.tsx**

Update the send handler to process `data.actions`:

```typescript
// After receiving response:
if (data.success && data.insight) {
  const guruMsg: ChatMessage = {
    id: `guru-${Date.now()}`,
    content: data.insight,
    isUser: false,
    timestamp: new Date().toISOString(),
  };

  // Append action confirmations if present
  if (data.actions && data.actions.length > 0) {
    guruMsg.actions = data.actions;
  }

  setMessages(prev => [...prev, guruMsg]);
}
```

Update ChatMessage interface:
```typescript
interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  actions?: Array<{ tool: string; success: boolean; message: string }>;
}
```
**~15 lines**

**File 2: components/montree/guru/ChatBubble.tsx**

Add action chips rendering after the markdown content:

```typescript
// After existing markdown rendering:
{actions && actions.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {actions.map((action, i) => (
      <span
        key={i}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          action.success
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {action.message}
      </span>
    ))}
  </div>
)}
```
**~20 lines**

---

### Phase 7: Dashboard — Guru-First for Parents (~40 lines modified, 2 files)

**File 1: app/montree/dashboard/page.tsx**

For homeschool parents, render full-screen Guru instead of student grid.
Handles single AND multi-child families:

```typescript
// After children are loaded, before main render:
const [showAdvanced, setShowAdvanced] = useState(false);
const [selectedChildIdx, setSelectedChildIdx] = useState(0);

if (isHomeschoolParent() && children.length >= 1 && !showAdvanced) {
  const child = children[selectedChildIdx] || children[0];
  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader onToggleAdvanced={() => setShowAdvanced(true)}>
        {children.length > 1 && (
          <div className="flex gap-2">
            {children.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildIdx(i)}
                className={`px-3 py-1 rounded-full text-sm ${
                  i === selectedChildIdx
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </DashboardHeader>
      <GuruChatThread
        childId={child.id}
        childName={child.name}
        classroomId={classroomId}
      />
    </div>
  );
}
```
**~30 lines**

**File 2: components/montree/DashboardHeader.tsx**

Add Advanced View toggle (homeschool parents only):

```typescript
{isHomeschoolParent() && onToggleAdvanced && (
  <button
    onClick={onToggleAdvanced}
    className="text-xs text-gray-500 hover:text-gray-700"
  >
    🔧 Advanced View
  </button>
)}
```
**~10 lines**

---

## 6. CHECK-IN TRIGGER

No cron jobs needed. The `buildConversationalPrompt()` function already detects time gaps. With the new `childSettings` parameter:

1. Frontend loads → fetches child settings from API (or from guru/concerns GET which already returns settings)
2. Passes settings to guru route
3. Prompt builder checks `guru_next_checkin` date
4. If overdue → switches to CHECKIN_MODE prompt
5. Guru naturally starts the check-in conversation

**No component changes needed** — the mode detection happens server-side in the prompt builder.

---

## 7. CONVERSATION PERSISTENCE

Current `montree_guru_interactions` stores:
- `question` TEXT — the user's message
- `response_insight` TEXT — the guru's final text response
- `question_type` TEXT — detected type

For tool-use conversations:
- `question` = user's message (unchanged)
- `response_insight` = final text response after all tool rounds (unchanged)
- `question_type` = 'chat' (unchanged, conversational mode already sets this)

**Actions are NOT persisted in the interaction record.** They're visible in the chat session via the `actions` field in the API response, but they don't need to be stored because:
- Focus works, progress, and observations are stored in their own tables
- Settings changes are stored in the JSONB column
- The final text response references what was done ("I've updated your shelf...")

If we later want a tool-use audit trail, add an `actions_taken` JSONB column via ALTER TABLE (no migration needed).

---

## 8. FILE SUMMARY

### New Files (3 files, ~310 lines)
```
lib/montree/guru/tool-definitions.ts      (~135 lines — includes area on update_progress)
lib/montree/guru/tool-executor.ts         (~150 lines — curriculum validation + error logging + unknown tool warning)
lib/montree/guru/settings-helper.ts       (~30 lines — includes race condition docs)
```

### Modified Files (7 files, ~340 lines)
```
app/api/montree/guru/route.ts             (+110 lines — tool loop + timeout wrapper + cost logging + settings fetch + responseText fallback)
lib/montree/guru/conversational-prompt.ts  (+80 lines — modes + tool instructions)
lib/montree/guru/context-builder.ts        (+20 lines — fetch focus works + interface update)
components/montree/guru/GuruChatThread.tsx  (+15 lines — actions in messages)
components/montree/guru/ChatBubble.tsx      (+20 lines — action chips)
app/montree/dashboard/page.tsx             (+30 lines — guru-first view, multi-child selector)
components/montree/DashboardHeader.tsx      (+10 lines — advanced toggle)
```

### Pre-requisite Fix Files (2 files + 1 migration)
```
app/api/montree/focus-works/route.ts       (-2 lines — remove classroom_id, work_id)
migrations/133_fix_observation_fk.sql      (~10 lines — fix FK on observations + guru_interactions)
```

### Total: ~650 new lines + ~340 modified + prereq fixes across 11 files
### No new API routes. No new tables. No new npm packages.

---

## 9. IMPLEMENTATION ORDER

```
Phase 0: Pre-requisite fixes           (~30 min)
  - Fix focus-works upsert columns
  - Create FK fix migration
  - Test observations insert with Montree child

Phase 1: Context + Settings helper     (~30 min)
  - Add focus works to context-builder
  - Create settings-helper.ts

Phase 2: Tool definitions               (~1 hour)
  - Create tool-definitions.ts
  - Verify types match SDK

Phase 3: Tool executor                  (~2 hours)
  - Create tool-executor.ts
  - Unit test each tool against real DB

Phase 4: Multi-turn loop in guru route  (~3 hours)
  - Modify guru/route.ts conversational branch
  - Test: send message → tool called → DB updated → natural response
  - Test: multi-tool round (set 5 focus works)
  - Test: MAX_TOOL_ROUNDS guard

Phase 5: Enhanced prompts               (~2 hours)
  - Add mode detection to conversational-prompt.ts
  - Add tool-use instructions
  - Test: intake mode (new parent)
  - Test: check-in mode (past due)
  - Test: normal mode (question)

Phase 6: Frontend action display        (~1 hour)
  - Update GuruChatThread message handling
  - Add action chips to ChatBubble

Phase 7: Dashboard guru-first           (~1 hour)
  - Add full-screen guru for homeschool parents
  - Add advanced view toggle

Total: ~11-14 hours
```

---

## 10. TEST CHECKLIST

### Pre-requisites
```
[ ] focus-works POST no longer sends classroom_id/work_id
[ ] Migration 133 run — observation + guru_interactions FKs fixed
[ ] Observation insert works for montree_children child IDs (test with test account)
[ ] Guru interaction insert works for montree_children child IDs
```

### Tool Executor (test each tool individually first)
```
[ ] set_focus_work: creates row in montree_child_focus_works
[ ] set_focus_work: upsert replaces existing work for same area
[ ] set_focus_work: rejects work_name > 200 chars
[ ] clear_focus_work: deletes by area
[ ] update_progress: upserts montree_child_progress with area field populated
[ ] update_progress: preserves mastered_at on repeat mastery
[ ] update_progress: sets presented_at on first presentation only
[ ] update_progress: sets mastered_at on first mastery only
[ ] save_observation: inserts with classroom_id=null, observed_by=null
[ ] save_observation: rejects invalid behavior_function values
[ ] save_checkin: updates settings JSONB with next_checkin date
[ ] save_checkin: increments guru_checkin_count correctly
[ ] save_child_profile: saves structured profile to settings JSONB
[ ] save_child_profile: sets guru_intake_complete=true
```

### Multi-Turn Tool Loop
```
[ ] Single tool call → result sent back → natural response references action
[ ] Multiple tools (5× set_focus_work) → all execute → combined response
[ ] MAX_TOOL_ROUNDS=3 prevents runaway (test with prompt that triggers many tools)
[ ] Tool error → is_error=true sent to Claude → graceful response continues
[ ] Cost logging appears in server console with token counts
```

### Prompt Modes
```
[ ] New parent (no guru_intake_complete) → intake mode, Guru asks about child
[ ] Check-in overdue (guru_next_checkin < now) → check-in mode
[ ] Normal question (intake done, no check-in due) → no forced tool use
[ ] childSettings passed to buildConversationalPrompt (verify in server logs)
[ ] Focus works appear in Guru context ("CURRENT SHELF" section)
```

### Frontend
```
[ ] Actions array renders as colored chips in ChatBubble
[ ] No actions → no chips (backward compatible with existing messages)
[ ] ChatMessage interface includes optional actions field (TypeScript compiles)
```

### Dashboard
```
[ ] Homeschool parent with 1 child → full-screen guru (no student grid)
[ ] Homeschool parent with 2+ children → child selector tabs above guru
[ ] Switching children resets/reloads GuruChatThread
[ ] Teacher → ZERO changes (no guru view, no toggle)
[ ] Advanced view toggle shows normal dashboard
[ ] Guru view toggle returns to guru
```

### Curriculum Validation (Cycle 2 addition)
```
[ ] set_focus_work: accepts valid curriculum work name (e.g. "Pink Tower")
[ ] set_focus_work: rejects hallucinated work name not in curriculum or DB
[ ] set_focus_work: accepts custom work that exists in montree_classroom_curriculum_works
[ ] VALID_WORK_NAMES set loads at module init (329 works from static JSON)
[ ] Graceful degradation: if curriculum fails to load, validation is skipped (set stays empty)
```

### API Timeout & Resilience (Cycle 2 addition)
```
[ ] withTimeout() rejects after 25s with descriptive error message
[ ] Timeout error caught in route-level try/catch → returns 500 to client
[ ] Empty responseText after tool loop → fallback summary generated from actions
[ ] Unknown tool name → logged with console.warn (check server logs)
```

### Cost & Performance
```
[ ] Typical question (no tools): 1 API call, <$0.02
[ ] Check-in with shelf rotation: 2-3 API calls, <$0.06
[ ] Full intake (profile + 5 focus works + checkin): 2-3 API calls, <$0.08
[ ] No request takes >25 seconds (per-call timeout enforced)
```

---

---

## 11. AUDIT CORRECTIONS LOG

### v3→v4 (Cycle 1 audit, Feb 26 2026)
- **CRITICAL #1** (already in plan): focus-works upsert sends non-existent columns → Fix 0a
- **CRITICAL #2**: `presented_at` not set on first presentation → Added to tool executor
- **CRITICAL #3**: `area` field missing from update_progress tool → Added to tool def + executor
- **CRITICAL #4**: observation missing explicit nulls for classroom_id/observed_by → Fixed
- **CRITICAL #5** (false alarm): message format for tool loop → Verified SDK accepts ContentBlock[] as assistant content and is_error is a valid ToolResultBlockParam field
- **HIGH #1** (verified OK): SDK enum format → Verified correct against SDK types
- **HIGH #2**: multi-child not handled → Added child selector to dashboard
- **HIGH #3**: childSettings not passed to buildConversationalPrompt → Added explicit fetch + pass-through in route + prompt builder
- **HIGH #4**: ChildContext missing focus_works field → Added interface note + initialization
- **MEDIUM #1**: weak error handling in loop → Added console.error + structured error JSON
- **MEDIUM #2**: MAX_TOOL_ROUNDS exits silently → Added console.warn
- **MEDIUM #3**: settings helper race condition → Documented; OK for v1 (sequential tool execution)
- **MEDIUM #7**: behavior_function not validated → Added enum check in tool executor
- **MEDIUM #8**: no cost logging → Added token + cost logging after loop

### v4→v4.1 (Cycle 2 audit, Feb 26 2026)
- **CRITICAL #1**: API timeout not handled → Added `withTimeout()` helper with `Promise.race` (25s per call, under Vercel 30s limit)
- **CRITICAL #2**: No curriculum validation in set_focus_work → Added `VALID_WORK_NAMES` set from `loadAllCurriculumWorks()` + DB fallback for custom works. Claude cannot hallucinate work names.
- **CRITICAL #3**: Empty responseText after tool loop possible → Added fallback that summarizes actions taken
- **HIGH #1**: Unknown tool name silent failure → Added `console.warn` with tool name and truncated input
- **HIGH #2**: Conversation history doesn't persist tool context → Acceptable for v1 (documented), consider `actions_taken` JSONB column later
- **VERIFIED ✅**: All SDK types correct (Tool, ToolChoice, ToolUseBlock, ToolResultBlockParam with is_error)
- **VERIFIED ✅**: Implementation order has no circular dependencies
- **VERIFIED ✅**: Integration points between all files verified

**Version 4.1 FINAL** — v3 + Cycle 1 + Cycle 2 audit corrections, Feb 26, 2026
