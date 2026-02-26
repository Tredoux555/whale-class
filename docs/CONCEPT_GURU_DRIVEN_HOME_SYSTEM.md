# Guru-Driven Montessori Home System

**Document Version:** 2.0 (audited against codebase)
**Date:** February 26, 2026
**Scope:** Comprehensive paradigm shift for homeschool parent experience in Montree
**Status:** Concept & Implementation Plan — audited and corrected

---

## TABLE OF CONTENTS

1. [Vision](#vision)
2. [Core Problem](#core-problem)
3. [Core Solution](#core-solution)
4. [Schema Decision: The Shelf](#schema-decision-the-shelf)
5. [Architecture Overview](#architecture-overview)
6. [Key Flows](#key-flows)
7. [What Exists Today](#what-exists-today)
8. [What Needs to Change](#what-needs-to-change)
9. [Implementation Phases](#implementation-phases)
10. [Technical Details](#technical-details)
11. [Data Model](#data-model)
12. [Important Principles](#important-principles)
13. [Risk Mitigation](#risk-mitigation)

---

## VISION

Transform the Montree homeschool experience from a "teacher interface with a chatbot helper" into a **Guru-driven coaching system where the AI is the primary interface and the entire teaching system is the backend**.

### Current State (Problem)
Homeschool parents see a trimmed-down version of the classroom interface:
- Week view (confusing for non-teachers)
- Curriculum browser (overwhelming with 329 works)
- Progress tracker (data-heavy, not actionable)
- Guru chat on the side (helpful but disconnected from the tools)

**The fundamental problem:** Parents don't know Montessori. They don't know what to teach, how to create materials, how to present works, or when to progress. They need a GUIDE, not a tool.

### New State (Solution)
**The Guru IS the entire interface.**

Parents open their classroom and see:
1. A personalized welcome message from the Guru
2. A conversational chat interface that guides every decision
3. The Guru automatically selects works for the shelf (one per area, 5 areas)
4. The Guru provides DIY material-creation instructions
5. The Guru gives step-by-step presentation guides
6. The Guru initiates weekly check-ins to evaluate progress
7. The Guru marks progress, rotates works, and adjusts the plan

The classroom tools (week view, curriculum, progress) exist as **backend APIs** that the Guru controls. Parents can optionally access these advanced views, but they never need to.

---

## CORE PROBLEM

### Why the Current Approach Fails for Home Parents

1. **Knowledge Gap**: Teachers have 3-6 years of Montessori training. Parents have zero. Expecting them to navigate the curriculum database is like asking a novice to perform surgery because you showed them the instruments.

2. **Decision Paralysis**: "Which works should I use? What order? How do I present Pink Tower? When does my child move to Practicing? How do I make Sandpaper Letters?" — dozens of decisions per week that a teacher makes intuitively.

3. **Disconnected Tools**: The Guru gives advice. The tools require manual action. Parents don't connect the dots: "Guru told me to use sensorial works, but how do I add them to the week view?"

4. **No Follow-up**: Teachers meet weekly. Homes don't. Without check-ins, parents drift. "My child stopped being interested, but I don't know how to adjust."

5. **Montessori Principles Violated**: True Montessori relies on observation and following the child. The parent interface encourages dashboard-watching instead of child-watching.

---

## CORE SOLUTION

### The Guru as Orchestrator

The Guru becomes:
- **Decision-maker**: "Based on what you told me, I'm setting up your shelf with one work per area"
- **Teacher**: "Here's how to present the Pink Tower in 3 minutes"
- **Materials engineer**: "You'll need 10 wooden blocks, 5 cm × 10 cm × 2 cm. Here's what to build"
- **Observer coach**: "That video shows great hand-eye coordination! Let's introduce the Dressing Frame next"
- **Feedback processor**: "He's throwing the blocks instead of stacking them? That's normal at this age. Let's simplify for another week"

### Key Principle: Technology Disappears

Parents should feel like they're talking to a knowledgeable Montessori friend, not using software. They describe their week. The Guru responds conversationally. Behind the scenes, the Guru updates the database, selects curriculum works, marks progress — all invisible to the parent.

---

## SCHEMA DECISION: THE SHELF

### ⚠️ Critical Constraint

The `montree_child_focus_works` table has a **hard UNIQUE constraint**:

```sql
UNIQUE(child_id, area)  -- ONE work per area per child
```

This means the "shelf" is **exactly 5 works maximum** (one per P, S, M, L, C).

### Design Decision: Keep the Constraint

**We keep the 1-per-area constraint.** This actually aligns beautifully with Montessori:

- A real Montessori shelf has one primary work per area at any time
- The teacher observes which work the child is drawn to and adjusts
- Rotation means swapping the Sensorial work from Pink Tower → Brown Stair, not adding 12 random works
- 5 focused works prevents overwhelm — parents can handle 5, not 12

**Guru shelf management = choosing the right ONE work per area**, then rotating when the child is ready.

### What This Means for the Guru

When the Guru says "I'm setting up your shelf this week", it means:
- Practical Life → Pouring (dry)
- Sensorial → Pink Tower
- Mathematics → Number Rods 1-5
- Language → Sandpaper Letters (first set)
- Cultural → Globe of Land and Water

That's 5 works. Each week, the Guru evaluates and may swap 1-3 of these based on the child's progress and interests. This is exactly how a Montessori teacher manages a shelf.

### API Implications

- `POST /api/montree/focus-works` — **UPSERTS** (replaces current work for that area)
- `DELETE /api/montree/focus-works?child_id={id}&area={area}` — removes by **area**, not by work name
- No need for `set_weekly_plan(works[])` tool — the Guru calls `set_focus_work` once per area

---

## ARCHITECTURE OVERVIEW

### System Layers

```
┌─────────────────────────────────────────────────────┐
│  PARENT EXPERIENCE (WhatsApp-style Chat)            │
│  ┌───────────────────────────────────────────────┐  │
│  │ Guru Chat Thread (full-screen primary UI)     │  │
│  │ - Welcome & intake questions                  │  │
│  │ - Weekly check-ins & guidance                 │  │
│  │ - Photo analysis & observations               │  │
│  │ - Progress summaries (embedded in chat)       │  │
│  └───────────────────────────────────────────────┘  │
│  └─ "Advanced View" button (optional, hidden)      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  GURU ORCHESTRATION LAYER (New)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Tool-Use System (Anthropic function calling)  │  │
│  │ - set_focus_work(area, work_name)             │  │
│  │ - clear_focus_work(area)                      │  │
│  │ - update_progress(work_name, status)          │  │
│  │ - save_observation(behavior_description)      │  │
│  │ - save_checkin(summary, next_days)            │  │
│  └───────────────────────────────────────────────┘  │
│  ├─ Child Intake (conversation-driven, in main route)│
│  ├─ Check-in Trigger (on chat open, day-gap check)  │
│  └─ Enhanced Prompt (focus works + intake profile)   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  EXISTING BACKEND (APIs — zero changes)             │
│  ┌───────────────────────────────────────────────┐  │
│  │ Focus Works (montree_child_focus_works)       │  │
│  │ Progress Tracking (montree_child_work_progress)│  │
│  │ Curriculum Database (329 works, 5 areas)      │  │
│  │ Media Handling (photo uploads/analysis)       │  │
│  │ Observations (montree_behavioral_observations)│  │
│  │ Guru Interactions (montree_guru_interactions) │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Information Flow (Tool-Use Multi-Turn Loop)

```
1. Parent writes message
       ↓
2. Build context (child profile + focus works + recent progress)
       ↓
3. Call Claude Sonnet with tools + tool_choice: "auto"
       ↓
4. Parse response → extract tool_use blocks + text blocks
       ↓
5. If tool_use blocks exist:
   a. Execute each tool server-side (call existing API logic directly)
   b. Collect tool_result for each
   c. Send assistant message (with tool_use) + user message (with tool_results)
         back to Claude for final response
   d. Parse final response → extract text
       ↓
6. If no tool_use: use text response directly
       ↓
7. Save interaction to montree_guru_interactions
       ↓
8. Return { message: string, actions: ActionConfirmation[] }
```

**Key detail:** Tool-use requires a **multi-turn loop**. Claude returns tool_use blocks, we execute them, then send the results BACK to Claude so it can write a natural response that references what it just did. This is NOT a single API call — it's 2 calls minimum when tools are used.

---

## KEY FLOWS

### Flow 1: Welcome & Intake (First Session)

```
Parent opens Montree → full-screen Guru chat
    ↓
Guru detects: no guru_intake_complete in settings
    ↓
Guru: "Welcome! I'm so excited to be your Montessori guide.
Tell me about your child. How old are they? What are they
interested in? Any challenges? Tell me everything — it helps
me build the perfect plan."
    ↓
Parent describes child (via text or voice)
    ↓
Guru asks 2-3 follow-up questions
    ↓
Guru calls tool: save_child_profile(structured profile data)
    → writes to montree_children.settings JSONB
    ↓
Guru calls tools:
    set_focus_work("practical_life", "Pouring (dry)")
    set_focus_work("sensorial", "Pink Tower")
    set_focus_work("mathematics", "Number Rods 1-5")
    set_focus_work("language", "Sandpaper Letters Set 1")
    set_focus_work("cultural", "Globe of Land and Water")
    save_checkin("Initial setup complete", 7)
    ↓
Guru: "I've set up your shelf with 5 works — one for each
area of Montessori. Let me walk you through each one..."
    ↓
Parent sees action confirmations:
  "✅ Practical Life: Pouring (dry)"
  "✅ Sensorial: Pink Tower"
  ... (5 total)
  "📅 First check-in: next Monday"
```

### Flow 2: Weekly Check-in

```
Parent opens chat → Guru detects guru_next_checkin has passed
    ↓
Guru: "Good morning! It's check-in time for [child].
How has their week been? Let's go area by area.
Starting with Practical Life — how did Pouring go?"
    ↓
Parent describes the week (text/voice/photos)
    ↓
Guru evaluates and calls tools:
    update_progress("Pouring (dry)", "mastered")
    set_focus_work("practical_life", "Pouring (wet)")  ← rotation
    update_progress("Pink Tower", "practicing")         ← keep
    save_observation("Strong concentration on Pink Tower,
      10+ minutes uninterrupted")
    save_checkin("Mastered pouring dry, progressing to wet...", 7)
    ↓
Guru: "Wonderful progress! She's mastered dry pouring —
I'm moving her to wet pouring. Pink Tower stays, she's
clearly loving it. Here's how to present wet pouring..."
```

### Flow 3: Mid-Week Question

```
Parent: "She keeps throwing the blocks instead of stacking them"
    ↓
Guru: "That's completely normal! At this age, that's actually
exploratory — she's learning about cause and effect. Let's try..."
    ↓
Guru optionally calls:
    save_observation("Throwing blocks instead of stacking —
      cause/effect exploration, age-appropriate")
    ↓
Guru provides guidance — no shelf changes needed
```

---

## WHAT EXISTS TODAY

### Infrastructure We Reuse (zero changes needed)

| System | Table / Route | Used For |
|--------|--------------|----------|
| Focus Works | `montree_child_focus_works` + `POST/DELETE /api/montree/focus-works` | Shelf management (1 per area) |
| Progress | `montree_child_work_progress` + `POST /api/montree/progress/update` | Status tracking (not_started → presented → practicing → mastered) |
| Curriculum | `lib/curriculum/data/*.json` (329 works) | Work selection |
| Observations | `montree_behavioral_observations` + `POST /api/montree/observations` | Notes about child behavior |
| Guru Chat | `montree_guru_interactions` + `POST /api/montree/guru` | Conversation history (last 5 turns as memory) |
| Child Settings | `montree_children.settings` JSONB | Flexible profile storage |
| Media | `montree_media` + photo analysis via Sonnet vision | Photo uploads & analysis |
| Voice | Whisper transcription | Voice note → text |
| Context Builder | `lib/montree/guru/context-builder.ts` | Fetches child info, mental profile, progress, observations, past interactions |
| Conversational Prompt | `lib/montree/guru/conversational-prompt.ts` | WhatsApp-style chat persona for parents |
| Concern Picker | `app/api/montree/guru/concerns/route.ts` | Writes to `montree_children.settings` (JSONB merge pattern) |

### Key API Details (Verified Against Code)

**Focus Works POST** — sets ONE work for an area:
```typescript
// Request body
{
  child_id: UUID,      // REQUIRED
  area: string,        // REQUIRED — "practical_life" | "sensorial" | "mathematics" | "language" | "cultural"
  work_name: string,   // REQUIRED (max 200 chars)
  work_id?: UUID,      // optional
  classroom_id?: UUID, // optional
  set_by?: string      // optional, defaults to 'teacher'
}
// UPSERTS on (child_id, area) — replaces existing work for that area
```

**Focus Works DELETE** — removes by AREA not by name:
```
DELETE /api/montree/focus-works?child_id={id}&area={area}
```

**Progress Update POST** — key fields:
```typescript
{
  child_id: UUID,       // REQUIRED
  work_name: string,    // REQUIRED (or work_key)
  status: string,       // REQUIRED — "not_started" | "presented" | "practicing" | "mastered"
  area?: string,
  notes?: string,
  is_focus?: boolean    // if true, ALSO upserts montree_child_focus_works
}
```

**Observations POST** — key fields:
```typescript
{
  child_id: UUID,                // REQUIRED
  behavior_description: string,  // REQUIRED (NOT "text" — field name matters)
  classroom_id?: UUID,
  antecedent?: string,
  behavior_function?: string,    // "attention" | "escape" | "sensory" | "tangible" | "unknown"
  time_of_day?: string,
  activity_during?: string,
  environmental_notes?: string,
  observed_by?: string
}
```

**Guru Main Route** — current behavior:
- Model: `AI_MODEL` (Claude Sonnet 4) from `lib/ai/anthropic.ts`
- **NO streaming** — single blocking `anthropic.messages.create()` call
- **NO tool_use** — pure text generation
- Conversation memory: last 5 interactions rebuilt as user/assistant message pairs
- `conversational: true` flag → uses `buildConversationalPrompt()` instead of structured prompt
- Returns full response text (not streamed)

**Context Builder** — currently fetches (7 parallel queries):
1. Basic child info (name, age, classroom_id)
2. Mental profile (temperament, learning modality, sensitive periods)
3. Current progress (all works with status/mastered_at)
4. Recent observations (last 10, past 30 days)
5. Past Guru interactions (last 5)
6. Teacher notes (last 20 with non-empty notes)
7. Work counts (mastered/practicing/presented)

**⚠️ Does NOT fetch focus works** — context-builder needs extending.

**Children Settings** — no direct PATCH endpoint. Only the concerns route writes to settings:
```typescript
// concerns/route.ts POST — merges into existing settings:
const updated = { ...existingSettings, guru_concerns: concerns, guru_onboarded: true };
await supabase.from('montree_children').update({ settings: updated }).eq('id', childId);
```

---

## WHAT NEEDS TO CHANGE

### Change 0: Prerequisites (extend existing code)

**0a. Add focus works to context builder** (`lib/montree/guru/context-builder.ts`):
```typescript
// Add 8th parallel query:
const focusWorksPromise = supabase
  .from('montree_child_focus_works')
  .select('*')
  .eq('child_id', childId);

// Add to context string:
"CURRENT SHELF (Focus Works):\n" +
focusWorks.map(fw => `- ${fw.area}: ${fw.work_name} (set ${fw.set_at})`).join("\n")
```
~15 lines.

**0b. Create settings update helper** (`lib/montree/guru/settings-helper.ts`):
```typescript
// Reusable function to merge fields into montree_children.settings JSONB
export async function updateChildSettings(
  childId: string,
  updates: Record<string, any>
): Promise<void> {
  const { data: child } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .single();

  const merged = { ...(child?.settings || {}), ...updates };
  await supabase
    .from('montree_children')
    .update({ settings: merged })
    .eq('id', childId);
}
```
~25 lines. Extracted from the pattern already used in `concerns/route.ts`.

---

### Change 1: Tool-Use System (NEW — core feature)

**What:** Enable the Guru to call structured functions that modify backend state.

**Tool Definitions** (`lib/montree/guru/tool-definitions.ts`):

```typescript
import { Tool } from '@anthropic-ai/sdk/resources/messages';

export const GURU_TOOLS: Tool[] = [
  {
    name: "set_focus_work",
    description: "Set the focus work for a specific Montessori area on the child's shelf. Replaces any existing work for that area. Use this when introducing a new work or rotating the shelf.",
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
          description: "The name of the work to place on the shelf"
        }
      },
      required: ["area", "work_name"]
    }
  },
  {
    name: "clear_focus_work",
    description: "Remove the focus work from a specific area (clear that area's shelf slot). Use when the child should take a break from an area.",
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
    description: "Update a work's progress status for the child. Use after check-ins when the parent reports how the child engaged with a work.",
    input_schema: {
      type: "object" as const,
      properties: {
        work_name: { type: "string" },
        status: {
          type: "string",
          enum: ["not_started", "presented", "practicing", "mastered"],
          description: "The new status. presented = just shown to child, practicing = child is working on it, mastered = child can do it independently"
        },
        notes: {
          type: "string",
          description: "Optional teacher/parent notes about this progress update"
        }
      },
      required: ["work_name", "status"]
    }
  },
  {
    name: "save_observation",
    description: "Save a behavioral observation about the child. Use when the parent describes something notable about their child's behavior, concentration, or development.",
    input_schema: {
      type: "object" as const,
      properties: {
        behavior_description: {
          type: "string",
          description: "Description of the observed behavior"
        },
        behavior_function: {
          type: "string",
          enum: ["attention", "escape", "sensory", "tangible", "unknown"],
          description: "Optional: the function this behavior serves"
        },
        activity_during: {
          type: "string",
          description: "Optional: what work/activity was happening"
        }
      },
      required: ["behavior_description"]
    }
  },
  {
    name: "save_checkin",
    description: "Record a check-in summary and schedule the next one. Call this at the END of every check-in conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "Brief summary of what was discussed and decided"
        },
        next_checkin_days: {
          type: "number",
          description: "Days until next check-in (typically 7)"
        }
      },
      required: ["summary", "next_checkin_days"]
    }
  },
  {
    name: "save_child_profile",
    description: "Save or update the child's intake profile. Use during the initial intake conversation when the parent describes their child.",
    input_schema: {
      type: "object" as const,
      properties: {
        age: { type: "number" },
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

**Tool Executor** (`lib/montree/guru/tool-executor.ts`):

```typescript
// Each tool calls existing DB operations directly (not HTTP routes)
// This avoids auth overhead — the guru route already verified the user

export async function executeTool(
  toolName: string,
  input: any,
  childId: string,
  classroomId: string,
  schoolId: string
): Promise<{ success: boolean; message: string }> {

  switch (toolName) {
    case 'set_focus_work':
      // Upsert into montree_child_focus_works
      // Uses same DB logic as POST /api/montree/focus-works
      await supabase.from('montree_child_focus_works').upsert({
        child_id: childId,
        classroom_id: classroomId,
        area: input.area,
        work_name: input.work_name,
        set_by: 'guru'
      }, { onConflict: 'child_id,area' });
      return { success: true, message: `✅ ${areaLabel(input.area)}: ${input.work_name}` };

    case 'clear_focus_work':
      await supabase.from('montree_child_focus_works')
        .delete()
        .eq('child_id', childId)
        .eq('area', input.area);
      return { success: true, message: `Cleared ${areaLabel(input.area)} from shelf` };

    case 'update_progress':
      // Same logic as POST /api/montree/progress/update
      // Upsert into montree_child_work_progress
      await supabase.from('montree_child_work_progress').upsert({
        child_id: childId,
        classroom_id: classroomId,
        work_name: input.work_name,
        status: input.status,
        notes: input.notes || null,
        ...(input.status === 'mastered' ? { mastered_at: new Date().toISOString() } : {})
      }, { onConflict: 'child_id,work_name' });
      return { success: true, message: `${input.work_name} → ${input.status}` };

    case 'save_observation':
      await supabase.from('montree_behavioral_observations').insert({
        child_id: childId,
        classroom_id: classroomId,
        behavior_description: input.behavior_description,
        behavior_function: input.behavior_function || 'unknown',
        activity_during: input.activity_during || null,
        observed_by: 'guru'
      });
      return { success: true, message: `Observation saved` };

    case 'save_checkin':
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + input.next_checkin_days);
      await updateChildSettings(childId, {
        guru_last_checkin: new Date().toISOString(),
        guru_last_checkin_summary: input.summary,
        guru_next_checkin: nextDate.toISOString(),
        guru_checkin_count: (existingCount || 0) + 1
      });
      return { success: true, message: `📅 Next check-in: ${formatDate(nextDate)}` };

    case 'save_child_profile':
      await updateChildSettings(childId, {
        guru_intake_complete: true,
        guru_intake_date: new Date().toISOString(),
        guru_child_profile: input
      });
      return { success: true, message: `Profile saved for ${childName}` };
  }
}
```

~150 lines for definitions + ~120 lines for executor = **~270 lines total**

---

### Change 2: Multi-Turn Tool-Use Loop in Guru Route

**Modify:** `app/api/montree/guru/route.ts`

This is the hardest part. The current route does ONE `anthropic.messages.create()` call. For tool-use, we need a loop:

```typescript
// Inside the conversational branch of the guru route:

import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { executeTool } from '@/lib/montree/guru/tool-executor';

// 1. First Claude call — may return tool_use blocks
let response = await anthropic.messages.create({
  model: AI_MODEL,
  max_tokens: 2048,
  system: systemPrompt,
  tools: GURU_TOOLS,
  tool_choice: { type: "auto" },
  messages: conversationHistory  // includes last 5 turns from DB
});

// 2. Collect actions taken
const actionsTaken: ActionConfirmation[] = [];

// 3. Multi-turn loop: keep going while Claude wants to use tools
while (response.stop_reason === 'tool_use') {
  // Extract tool calls
  const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

  // Execute each tool
  const toolResults = [];
  for (const toolCall of toolUseBlocks) {
    try {
      const result = await executeTool(
        toolCall.name, toolCall.input,
        child_id, classroom_id, schoolId
      );
      actionsTaken.push({ tool: toolCall.name, ...result });
      toolResults.push({
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        content: JSON.stringify(result)
      });
    } catch (error) {
      toolResults.push({
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        is_error: true,
        content: 'Failed to execute action'
      });
    }
  }

  // Send tool results back to Claude for natural language response
  conversationHistory.push(
    { role: 'assistant', content: response.content },
    { role: 'user', content: toolResults }
  );

  response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    tools: GURU_TOOLS,
    tool_choice: { type: "auto" },
    messages: conversationHistory
  });
}

// 4. Extract final text response
const responseText = response.content
  .filter(b => b.type === 'text')
  .map(b => b.text)
  .join('\n');

// 5. Return to frontend
return NextResponse.json({
  success: true,
  response_text: responseText,
  actions: actionsTaken  // displayed as confirmation chips in chat
});
```

**~100 lines** added to guru route.

**⚠️ Cost consideration:** Each tool-use round is a separate API call. A check-in that updates 5 focus works + marks 3 progresses could be 2-3 API calls × Sonnet pricing. Still reasonable for a paid feature.

---

### Change 3: Intake via Main Guru Route (NOT separate endpoint)

**No new route.** The existing conversational guru route handles intake naturally:

1. `buildConversationalPrompt()` already checks `isFirstMessage`
2. Enhance it: if `!child.settings.guru_intake_complete`, use an intake-specific system prompt
3. The Guru asks questions naturally → parent answers → Guru calls `save_child_profile` tool → Guru calls `set_focus_work` × 5
4. All within the normal chat flow — no separate intake API

**Modify:** `lib/montree/guru/conversational-prompt.ts` — add intake detection:
```typescript
if (!childSettings.guru_intake_complete) {
  // Intake mode: Ask about the child, build profile, set up shelf
  return INTAKE_SYSTEM_PROMPT;
} else if (isCheckinDue(childSettings)) {
  // Check-in mode: Review the week, evaluate progress, rotate shelf
  return CHECKIN_SYSTEM_PROMPT;
} else {
  // Normal mode: Answer questions, provide guidance
  return NORMAL_SYSTEM_PROMPT;
}
```

~60 lines of prompt additions.

---

### Change 4: Check-in Trigger (on chat open)

**No cron jobs.** Next.js on Railway doesn't support cron. Instead:

When the `GuruChatThread` component loads, it checks `guru_next_checkin` from child settings. If it's past due, it adds a system-generated "check-in" message to the conversation that triggers the Guru to start the check-in flow.

**Modify:** `components/montree/guru/GuruChatThread.tsx`:
```typescript
// On mount, after loading history:
if (childSettings.guru_next_checkin &&
    new Date(childSettings.guru_next_checkin) <= new Date()) {
  // Auto-send a check-in trigger (invisible to parent)
  // The Guru's system prompt already has CHECKIN mode
  setMessages(prev => [...prev, {
    role: 'system',
    content: 'CHECK_IN_DUE',
    hidden: true
  }]);
  // Optionally auto-send to trigger Guru response
}
```

~30 lines.

**Alternative (simpler):** The conversational prompt builder already detects 2+ day gaps and generates a "welcome back" message. Extend this to detect `guru_next_checkin` and switch to check-in mode. This means check-ins happen naturally when the parent opens the chat — no notifications needed for MVP.

---

### Change 5: Guru-First Dashboard

**Modify:** `app/montree/dashboard/page.tsx`

For homeschool parents with a single child, render full-screen Guru chat:

```typescript
if (isHomeschoolParent() && children.length === 1) {
  const child = children[0];
  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader showAdvancedToggle />
      {showAdvancedView ? (
        <ExistingDashboardContent />
      ) : (
        <GuruChatThread
          childId={child.id}
          childName={child.name}
          classroomId={classroomId}
        />
      )}
    </div>
  );
}
```

**Modify:** `components/montree/DashboardHeader.tsx` — add Advanced View toggle:
```typescript
{isHomeschoolParent() && (
  <button onClick={() => setShowAdvanced(!showAdvanced)}>
    {showAdvanced ? '💬 Guru View' : '🔧 Advanced View'}
  </button>
)}
```

~50 lines total.

---

### Change 6: Enhanced Guru System Prompt

**Modify:** `lib/montree/guru/conversational-prompt.ts`

Add to the system prompt:
- Current shelf contents (from focus works query)
- Child's intake profile (from settings JSONB)
- Check-in schedule and status
- Tool-use instructions and examples
- Persona guidance for different modes (intake/checkin/normal)

~80 lines of prompt template additions.

---

## IMPLEMENTATION PHASES

### Phase 0: Prerequisites (~1 hour)
- Add focus works fetch to context-builder.ts (+15 lines)
- Create settings-helper.ts for JSONB updates (+25 lines)
- Verify montree_child_work_progress upsert behavior

### Phase 1: Tool-Use System (4-6 hours)
- Create tool-definitions.ts (~150 lines)
- Create tool-executor.ts (~120 lines)
- Modify guru/route.ts with multi-turn loop (~100 lines)
- Test: send message that should trigger tool → verify DB changes

### Phase 2: Enhanced Prompts + Intake (3-4 hours)
- Modify conversational-prompt.ts with intake/checkin/normal modes (~80 lines)
- Add shelf + profile context to all prompts (~40 lines)
- Test: new parent → intake conversation → profile saved → shelf set up

### Phase 3: Dashboard + Check-in UX (2-3 hours)
- Modify dashboard/page.tsx for full-screen Guru (~30 lines)
- Modify DashboardHeader.tsx for Advanced toggle (~20 lines)
- Modify GuruChatThread.tsx for check-in detection (~30 lines)
- Add action confirmation display in chat UI (~40 lines)

### Phase 4: Polish (2-3 hours)
- Action confirmation chips/cards in ChatBubble
- Error handling (tool fails → graceful message)
- Photo prompts at key moments
- Edge cases (multiple children, missing data)

**Total: ~12-16 hours, ~800-1000 lines**

| Phase | New Lines | Modified Lines | Files Touched |
|-------|-----------|---------------|---------------|
| 0 | 25 | 15 | 2 |
| 1 | 270 | 100 | 3 |
| 2 | 0 | 120 | 2 |
| 3 | 0 | 120 | 3 |
| 4 | 0 | 80 | 2 |
| **Total** | **~295** | **~435** | **~8 unique** |

No new API routes. No new tables. No new npm packages.

---

## DATA MODEL

### New Fields in `montree_children.settings` (JSONB)

```json
{
  // EXISTING (from concern picker):
  "guru_concerns": ["speech_delay", "social_skills"],
  "guru_onboarded": true,

  // NEW — Intake Profile:
  "guru_intake_complete": true,
  "guru_intake_date": "2026-02-26T09:00:00Z",
  "guru_child_profile": {
    "age": 4,
    "personality": "active, curious, extroverted",
    "strengths": ["language", "social skills"],
    "challenges": ["concentration", "sitting still"],
    "interests": ["animals", "water", "building"],
    "previous_experience": "none",
    "learning_style": "kinesthetic"
  },

  // NEW — Check-in Schedule:
  "guru_checkin_interval": 7,
  "guru_next_checkin": "2026-03-05T09:00:00Z",
  "guru_last_checkin": "2026-02-26T09:00:00Z",
  "guru_last_checkin_summary": "Mastered dry pouring, progressing to wet...",
  "guru_checkin_count": 3,

  // NEW — Preferences:
  "guru_prefer_advanced_view": false
}
```

### No New Tables

All existing tables support this system. The `set_by` column in `montree_child_focus_works` accepts any string — we use `'guru'` to distinguish Guru-set works from teacher-set ones.

---

## IMPORTANT PRINCIPLES

### 1. Technology Disappears
Parents feel like they're talking to a Montessori friend. No visible APIs, no raw data, no technical language.

### 2. One Work Per Area
The shelf has 5 slots (P/S/M/L/C). The Guru picks one work per area. Rotation means swapping, not adding. This prevents overwhelm and aligns with real Montessori practice.

### 3. Teacher Tools Are Backend
Week view, curriculum browser, progress tracker exist as APIs. The Guru uses them internally. Parents access via "Advanced View" if they want.

### 4. No Separation Between Home and Classroom
Homeschool parents are teachers with `role='homeschool_parent'`. Same auth, same backend, same tables. The Guru is a specialized interface.

### 5. Teacher Zero Impact
Everything gated behind `isHomeschoolParent()`. Teachers see zero changes.

### 6. Montessori First
- Observation guides curriculum (check-ins = observations)
- Following the child (weekly re-evaluation based on parent reports)
- Prepared environment (Guru manages the shelf)
- Freedom within limits (Guru suggests, parent decides pace)

### 7. Multi-Turn Tool-Use is Non-Negotiable
The Guru MUST use Anthropic's tool_use feature. It's not enough to parse keywords from responses and guess what actions to take. Claude decides when to use tools based on context. This is the difference between a chatbot and an orchestrator.

---

## RISK MITIGATION

### Risk: Tool-Use Causes Unintended Data Changes
**Mitigation:** All tool calls logged in `montree_guru_interactions`. Action confirmations visible in chat. Focus work changes are reversible. The Guru runs `set_focus_work` (upsert), not raw SQL.

### Risk: Multi-Turn Loop Runs Away (infinite tool calls)
**Mitigation:** Hard limit: max 3 loop iterations. If Claude keeps returning tool_use after 3 rounds, break the loop and return whatever text we have.

### Risk: API Cost (multiple Sonnet calls per conversation)
**Mitigation:** Typical conversation = 1-2 API calls ($0.01-0.03). Weekly check-in with shelf rotation = 2-3 calls ($0.02-0.06). At $5/month subscription, this is sustainable. Use Haiku for non-tool-use follow-ups if cost becomes a concern.

### Risk: Parents Become Dependent on Guru
**Mitigation:** "Advanced View" always available. The Guru explains reasoning, encouraging parent learning. Some dependency is okay — it's better than parents doing nothing.

### Risk: Guru Recommends Wrong Works
**Mitigation:** Framed as suggestions ("let's try this and see"). Weekly check-ins allow fast correction. Parent can always say "that didn't work" and Guru adjusts.

---

## APPENDIX: File Change Summary

### New Files (~295 lines)
```
lib/montree/guru/tool-definitions.ts     (~150 lines)
lib/montree/guru/tool-executor.ts        (~120 lines)
lib/montree/guru/settings-helper.ts      (~25 lines)
```

### Modified Files (~435 lines)
```
app/api/montree/guru/route.ts            (+100 lines — tool-use loop)
lib/montree/guru/conversational-prompt.ts (+80 lines — intake/checkin/normal modes)
lib/montree/guru/context-builder.ts      (+15 lines — fetch focus works)
app/montree/dashboard/page.tsx           (+30 lines — full-screen Guru for parents)
components/montree/DashboardHeader.tsx    (+20 lines — Advanced View toggle)
components/montree/guru/GuruChatThread.tsx (+30 lines — check-in detection)
components/montree/guru/ChatBubble.tsx    (+40 lines — action confirmations)
```

### Total: ~730 lines across 10 files. No new routes. No new tables. No new packages.

---

**Document Version:** 2.0 — audited against codebase Feb 26, 2026
**Audit corrections:** Schema constraint (1-per-area), API field names, status enums, multi-turn loop detail, line estimates, check-in trigger mechanism, removed incorrect separate intake route
**Next step:** Review and approve, then begin Phase 0 + Phase 1
