# Guru-Driven Montessori Home System

**Document Version:** 1.0
**Date:** February 26, 2026
**Scope:** Comprehensive paradigm shift for homeschool parent experience in Montree
**Status:** Concept & Implementation Plan

---

## TABLE OF CONTENTS

1. [Vision](#vision)
2. [Core Problem](#core-problem)
3. [Core Solution](#core-solution)
4. [Architecture Overview](#architecture-overview)
5. [Key Flows](#key-flows)
6. [What Exists Today](#what-exists-today)
7. [What Needs to Change](#what-needs-to-change)
8. [Implementation Phases](#implementation-phases)
9. [Technical Details](#technical-details)
10. [Data Model](#data-model)
11. [Important Principles](#important-principles)
12. [Success Metrics](#success-metrics)

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
3. The Guru automatically selects works for the shelf
4. The Guru provides DIY material-creation instructions
5. The Guru gives step-by-step presentation guides
6. The Guru initiates weekly check-ins to evaluate progress
7. The Guru marks progress, rotates works, and adjusts the plan

The classroom tools (week view, curriculum, progress) exist as **backend APIs** that the Guru controls. Parents can optionally access these advanced views, but they never need to.

---

## CORE PROBLEM

### Why the Current Approach Fails for Home Parents

1. **Knowledge Gap**: Teachers have 3-6 years of Montessori training. Parents have zero. Expecting them to navigate the curriculum database is like asking a novice to perform surgery because you showed them the instruments.

2. **Decision Paralysis**: "Which 10 works should I use? What order? How do I present Pink Tower? When does my child move from Presentation to Practicing? How do I make Sandpaper Letters?" → 50 decisions per week that a teacher makes intuitively.

3. **Disconnected Tools**: The Guru gives advice. The tools require manual action. Parents don't connect the dots: "Guru told me to use sensorial works, but how do I add them to the week view?"

4. **No Follow-up**: Teachers meet weekly. Homes don't. Without check-ins, parents drift. "My child stopped being interested, but I don't know how to adjust."

5. **Montessori Principles Violated**: True Montessori relies on observation and following the child. The parent interface encourages dashboard-watching instead of child-watching.

---

## CORE SOLUTION

### The Guru as Orchestrator

The Guru becomes:
- **Decision-maker**: "Based on what you told me, I'm adding these 8 works to your shelf this week"
- **Teacher**: "Here's how to present the Pink Tower in 3 minutes"
- **Materials engineer**: "You'll need 10 wooden blocks, 5 cm × 10 cm × 2 cm. Here's a PDF template to print on card stock"
- **Observer coach**: "That video shows great hand-eye coordination! Let's introduce the Dressing Frame next"
- **Feedback processor**: "He's throwing the blocks instead of stacking them? That's normal at this age. Let's simplify for another week"

### Key Principle: Technology Disappears

Parents should feel like they're talking to a knowledgeable Montessori friend, not using software. They describe their week. The Guru responds conversationally. Behind the scenes, the Guru updates the database, selects curriculum works, marks progress — all invisible to the parent.

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
│  │ - add_focus_work()                            │  │
│  │ - remove_focus_work()                         │  │
│  │ - update_progress()                           │  │
│  │ - set_weekly_plan()                           │  │
│  │ - schedule_checkin()                          │  │
│  │ - save_observation()                          │  │
│  └───────────────────────────────────────────────┘  │
│  ├─ Child Intake Manager (conversation-driven)     │
│  ├─ Weekly Planning System (Guru-initiated)        │
│  ├─ Check-in Scheduler (time-based triggers)       │
│  └─ Prompt Builder (context-aware Guru system)     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  EXISTING BACKEND (APIs)                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ Focus Works System (shelf management)         │  │
│  │ Progress Tracking (presented/practicing/...)  │  │
│  │ Curriculum Database (329 works, 5 areas)      │  │
│  │ Media Handling (photo uploads/analysis)       │  │
│  │ Observations (behavioral notes)               │  │
│  └───────────────────────────────────────────────┘  │
│  └─ PostgreSQL Tables (montree_works, progress, etc.)
└─────────────────────────────────────────────────────┘
```

### Information Flow

1. **Parent writes message** → Chat API endpoint
2. **Message processed** by Guru (Sonnet 4 with tool_use enabled)
3. **Guru can call tools** (add work, mark progress, etc.)
4. **Tools execute** server-side via existing APIs
5. **Guru generates response** with action confirmations + advice
6. **Parent sees conversational response** + visual feedback of actions taken

---

## KEY FLOWS

### Flow 1: Welcome & Intake (First Session)

```
Parent opens Montree
    ↓
See full-screen Guru chat
    ↓
Guru: "Welcome! I'm so excited to be your Montessori guide.
Tell me about your child. How old are they? What are they
interested in? Any challenges? Tell me everything — it helps me
build the perfect plan."
    ↓
Parent describes child (via text)
    ↓
Guru asks 2-3 follow-up questions
    ↓
Guru saves structured intake profile:
  {
    "guru_intake_complete": true,
    "guru_intake_summary": "4-year-old girl, loves animals,
     very social, struggles with sitting still",
    "guru_child_profile": {
      "age": 4,
      "interests": ["animals", "water play", "building"],
      "strengths": ["social", "language"],
      "challenges": ["concentration"],
      "personality": "extroverted, curious",
      "previous_experience": "none"
    }
  }
    ↓
Guru: "Perfect! Based on everything you told me, I've created
your first week's plan. I'm adding 8 works to your shelf:
[list with brief descriptions]

For each one, I'll give you material instructions, how to present
it, and what to observe for.

Let's start with the Pink Tower. Here's how to present it..."
    ↓
Guru calls tool: add_focus_work() for each of 8 works
    ↓
Weekly plan created in backend
    ↓
Parent sees action confirmations in chat:
  "✅ Pink Tower added to your shelf"
  "✅ Sandpaper Letters added"
  ... (8 total)
```

### Flow 2: Weekly Check-in (Repeats Every 7 Days)

```
Monday morning, parent sees chat notification
    ↓
Guru: "Good morning! It's time for our weekly check-in.
How has [child]'s learning week been? Tell me about the works
on the shelf. What did they engage with? What did they avoid?
Any 'aha' moments?"
    ↓
Parent describes the week
    ↓
Guru asks follow-ups:
  - "Did you notice how long they focused on Pink Tower?"
  - "Any interactions between different works?" (concepts)
  - "Any frustration or tears?"
    ↓
Parent may share photos/videos
    ↓
Guru analyzes photos via vision API
    ↓
Guru evaluates and decides:
  - Which works to rotate off
  - Which to keep
  - Which to introduce next
  - Whether to progress/maintain/simplify
    ↓
Guru calls tools:
  - remove_focus_work("Pink Tower") [moved to storage]
  - add_focus_work("Red Rods") [introduce progression]
  - update_progress("Pink Tower", "mastered")
  - schedule_checkin(7) [next week same time]
    ↓
Guru: "Wonderful! Here's what I'm seeing: your daughter is
ready for the next step. I'm rotating Pink Tower off for now
(she's mastered it!) and introducing Red Rods. Here's how to
present them..."
    ↓
Parent feels guided, never touches the dashboard
```

### Flow 3: Parent Question Between Check-ins

```
Wednesday, parent asks: "She keeps throwing the blocks instead
of stacking them. Is something wrong?"
    ↓
Guru: "That's completely normal! At this age, that's actually
exploratory. The throwing tells me she's learning about cause
and effect. Let's try this..."
    ↓
Guru optionally calls: save_observation("Child exploring through
throwing — demonstrates cause/effect understanding")
    ↓
Guru may adjust: "I'd also like to rotate in some softer
materials this week — maybe the Fabric Box. Let me add that
to your shelf so you can try it alongside the blocks."
    ↓
Guru calls: add_focus_work("Fabric Box")
    ↓
Guru provides step-by-step presentation guide
    ↓
Parent feels supported, not judged
```

---

## WHAT EXISTS TODAY

### Completed Infrastructure

The codebase already provides everything needed to build this system:

#### Curriculum Database
- `lib/curriculum/data/*.json` — 329 works across 5 areas
- Each work includes:
  - Name, area, category, age range
  - Materials list
  - Aims and learning objectives
  - Presentation steps (already exist as descriptions)
  - Prerequisites and progressions

#### Work Management APIs
- `POST /api/montree/focus-works` — Add work to child's shelf
- `DELETE /api/montree/focus-works/[workId]` — Remove work
- `GET /api/montree/progress` — Get child's progress on all works
- `POST /api/montree/progress/update` — Mark work as presented/practicing/mastered

#### Guru Infrastructure
- `app/api/montree/guru/route.ts` — Main chat endpoint
- `lib/montree/guru/conversational-prompt.ts` — Parent-friendly prompt builder
- `components/montree/guru/GuruChatThread.tsx` — Full chat UI (history, voice, scrolling)
- `lib/montree/guru/context-builder.ts` — Builds child context for Guru
- Child intake onboarding system (partially built)
- Voice notes via Whisper transcription
- Photo analysis via Sonnet vision API

#### Progress & Observation Tracking
- `montree_child_work_progress` table — tracks presented/practicing/mastered
- `montree_behavioral_observations` table — stores notes about child behavior
- `montree_media` table — photos/videos with metadata
- `montree_children.settings` JSONB column — flexible profile storage

#### Existing Guru Capabilities
- Daily plan generation (`/api/montree/guru/daily-plan`)
- Work presentation guides (`/api/montree/guru/work-guide`)
- End-of-day nudges and proactive suggestions
- Weekly reviews
- Photo-aware observations (vision API)

---

## WHAT NEEDS TO CHANGE

### 1. Tool-Use / Function-Calling System (NEW)

**What:** Enable the Guru to call structured functions that modify the backend state.

**Implementation:**
```typescript
// app/api/montree/guru/route.ts

const tools: Tool[] = [
  {
    name: "add_focus_work",
    description: "Add a work to the child's shelf (focus works)",
    input_schema: {
      type: "object",
      properties: {
        work_name: { type: "string", description: "Name of the work" },
        area: { type: "string", enum: ["P", "S", "M", "L", "C"] }
      },
      required: ["work_name", "area"]
    }
  },
  {
    name: "remove_focus_work",
    description: "Remove a work from the child's shelf",
    input_schema: {
      type: "object",
      properties: {
        work_name: { type: "string" }
      },
      required: ["work_name"]
    }
  },
  {
    name: "update_progress",
    description: "Update a work's progress status",
    input_schema: {
      type: "object",
      properties: {
        work_name: { type: "string" },
        status: {
          type: "string",
          enum: ["introduced", "presenting", "practicing", "mastered"]
        }
      },
      required: ["work_name", "status"]
    }
  },
  {
    name: "set_weekly_plan",
    description: "Set the complete weekly plan (replaces all focus works)",
    input_schema: {
      type: "object",
      properties: {
        works: {
          type: "array",
          items: { type: "string" },
          description: "Array of work names"
        }
      },
      required: ["works"]
    }
  },
  {
    name: "schedule_checkin",
    description: "Schedule the next check-in",
    input_schema: {
      type: "object",
      properties: {
        days_from_now: {
          type: "number",
          description: "Days until next check-in (typically 7)"
        }
      },
      required: ["days_from_now"]
    }
  },
  {
    name: "save_observation",
    description: "Save a behavioral observation about the child",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Observation text" }
      },
      required: ["text"]
    }
  }
];
```

**Flow:**
1. Parent sends message to Guru
2. API calls Claude Sonnet 4 with `tools: tools` parameter and `tool_choice: "auto"`
3. Guru responds with potential tool_use blocks
4. Backend parses response:
   ```typescript
   const { content } = await anthropic.messages.create({
     // ... messages
     tools: tools,
     tool_choice: "auto"
   });

   const toolCalls: ToolUseBlock[] = content.filter(
     block => block.type === "tool_use"
   );

   const textResponse = content
     .filter(block => block.type === "text")
     .map(b => b.text)
     .join("\n");

   // Execute tools
   for (const toolCall of toolCalls) {
     const result = await executeTool(toolCall.name, toolCall.input);
     // Add result to message history
   }
   ```
5. Return conversational response with action confirmations

**Tools Reference:**

| Tool | Input | Backend Call | Returns |
|------|-------|--------------|---------|
| `add_focus_work` | work_name, area | POST /api/montree/focus-works | {success, confirmationText} |
| `remove_focus_work` | work_name | DELETE /api/montree/focus-works | {success, confirmationText} |
| `update_progress` | work_name, status | POST /api/montree/progress/update | {success, newStatus} |
| `set_weekly_plan` | works[] | Batch API calls | {successCount, addedWorks, removedWorks} |
| `schedule_checkin` | days_from_now | PATCH /api/montree/children | {nextCheckinDate} |
| `save_observation` | text | POST /api/montree/observations | {observationId} |

**Lines of code:** ~200 (tool definitions + execution logic)

---

### 2. Enhanced Child Intake Flow (NEW)

**Current:** Concern picker (10 options, max 3 selected)

**New:** Rich conversational intake that builds a full child profile

**Implementation:**
```typescript
// app/api/montree/guru/intake/route.ts (NEW)

interface ChildProfile {
  age: number;
  personality: string; // "active, curious, shy" etc
  strengths: string[];
  challenges: string[];
  interests: string[];
  previous_experience: string;
  sensory_preferences: string;
  motor_development: string;
  social_development: string;
  learning_style: string;
}

// When child has no intake yet:
// POST /api/montree/guru with isNewChild=true
// Guru responds with intake question #1

// Parent answers → POST /api/montree/guru/intake/question
// Guru parses and asks next question

// After 4-5 questions, Guru says:
// "Now I have a clear picture of [child]! Let me create your
//  first week's plan. [Calls tools to populate weekly plan]"
```

**Intake Questions:**
1. "Tell me everything about your child — age, interests, personality, any challenges"
2. "How do they learn best? Are they hands-on, visual, listener?"
3. "What are they naturally drawn to?"
4. "Any developmental areas you want to focus on?"
5. "Have they had any Montessori experience?"

**Stored in:**
```json
{
  "guru_intake_complete": true,
  "guru_intake_date": "2026-02-26",
  "guru_intake_raw": "The full conversation text",
  "guru_child_profile": {
    "age": 4,
    "personality": "active, extroverted, curious",
    "strengths": ["language", "social"],
    "challenges": ["concentration", "frustration tolerance"],
    "interests": ["animals", "water", "building"],
    "previous_experience": "Montessori preschool for 1 year",
    "sensory_preferences": "tactile explorer",
    "motor_development": "strong gross motor, developing fine motor",
    "social_development": "very social, needs friends",
    "learning_style": "kinesthetic, needs movement"
  }
}
```

**Lines of code:** ~150

---

### 3. Guru-First Dashboard (MODIFIED)

**Current:** Teacher-style dashboard with student cards, week view nav, curriculum tabs

**New:** For homeschool parents:
- Full-screen Guru chat as primary interface
- Hidden "Advanced View" toggle (reveals teacher tools)
- Guru opening message references child and current plan

**Implementation:**
```typescript
// app/montree/dashboard/page.tsx (MODIFIED)

if (isHomeschoolParent()) {
  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader showAdvancedToggle />
      {showAdvancedView ? (
        // Original teacher dashboard (student cards, curriculum, etc)
        <TeacherDashboard />
      ) : (
        // New: Guru-first experience
        <GuruDashboardFull>
          <GuruChatThread
            openingMessage={getGuruOpeningMessage(child)}
            context={buildGuruContext(child)}
            allowToolUse={true}
          />
        </GuruDashboardFull>
      )}
    </div>
  );
}

// For teachers: render as before
return <TeacherDashboard />;
```

**Opening Message Examples:**
- New parent (intake incomplete): "Welcome! Let's talk about [child]..."
- After intake, before first check-in: "[Child] is all set up! Here's what I've put on the shelf this week..."
- Returning parent (check-in due): "Good morning! Time for our weekly check-in about [child]..."

**Guru Opening Builder:**
```typescript
function getGuruOpeningMessage(child: Child): string {
  const intake = child.settings.guru_intake_complete;
  const lastCheckin = child.settings.guru_last_checkin_date;
  const daysAgo = daysSince(lastCheckin);

  if (!intake) {
    return "Welcome! I'm excited to be your Montessori guide for [child]. " +
           "Tell me about them — how old, what interests them, any challenges? " +
           "The more I know, the better I can help.";
  }

  if (daysAgo > 8) {
    return "Good morning! It's been a week since we last checked in on [child]. " +
           "How's it been? What have they been loving? Any surprises?";
  }

  const focusWorks = await getFocusWorks(child.id);
  return "Welcome back! Here's [child]'s current shelf: [list]. " +
         "How can I help today? Any questions about presentations, " +
         "or would you like to chat about their progress?";
}
```

**Lines of code:** ~100

---

### 4. Check-in System (NEW)

**What:** The Guru proactively initiates weekly check-ins and manages the cadence.

**Implementation:**
```typescript
// app/api/montree/guru/checkin/schedule.ts (NEW)

interface CheckinSchedule {
  child_id: string;
  interval_days: number; // 7 for weekly, 14 for bi-weekly
  next_checkin_date: string;
  checkin_count: number;
  last_checkin_date: string;
  last_checkin_summary: string;
}

// Stored in montree_children.settings:
{
  "guru_checkin_interval": 7,
  "guru_next_checkin": "2026-03-05T09:00:00Z",
  "guru_last_checkin": "2026-02-26T09:00:00Z",
  "guru_checkin_count": 3,
  "guru_last_checkin_summary": "Progressed from Pink Tower to Red Rods..."
}

// Backend: Cron job or check on chat open
// SELECT montree_children WHERE
//   next_checkin <= NOW() AND
//   guru_intake_complete = true
// For each child, create in-app notification

// Parent sees: "Check-in time for [child]"
// Clicking opens Guru chat with opening message
// Guru asks about the week, reviews works, suggests adjustments
```

**Checkin Prompt Builder:**
```typescript
// lib/montree/guru/checkin-prompt.ts (NEW)

function buildCheckinPrompt(child: Child): string {
  const focusWorks = await getFocusWorks(child.id);
  const lastCheckin = child.settings.guru_last_checkin_summary;
  const progress = await getChildProgress(child.id);

  return `
You are conducting your weekly check-in with ${child.name}'s parent.

Last week you introduced: [${focusWorks.map(w => w.name).join(", ")}]

Here's what's happened since the last check-in:
- Progress updates: [${progress.recentChanges}]
- Photos/observations: [${getRecentMedia(child.id, 7)}]

Ask the parent:
1. How did ${child.name} engage with the works on the shelf?
2. Any standout moments or surprises?
3. Anything they struggled with?

Based on their answers, evaluate and decide what to rotate off,
what to keep, and what to introduce next.

Use tool calls to:
- update_progress() for works they've mastered
- remove_focus_work() for works to rotate off
- add_focus_work() for new introductions
- schedule_checkin(7) to schedule next week's check-in
  `;
}
```

**Lines of code:** ~120

---

### 5. Modified Guru Prompt System (ENHANCED)

**Current:** Prompt builder focuses on giving advice

**New:** Prompt includes:
- Current focus works (the shelf)
- Child's full intake profile
- Check-in cadence and timing
- Tool-use instructions
- Proactive check-in triggers
- Progress context (what they've mastered)

**Implementation:**
```typescript
// lib/montree/guru/prompt-builder.ts (MODIFIED)

function buildGuruSystemPrompt(child: Child, context: GuruContext): string {
  const intake = child.settings.guru_child_profile;
  const focusWorks = context.focusWorks;
  const recentProgress = context.recentProgress;
  const isCheckinTime = isDue(child.settings.guru_next_checkin);

  let prompt = `
You are [Parent]'s personal Montessori guide for [child].

## About [child]
${JSON.stringify(intake, null, 2)}

## Current Shelf (Focus Works)
${focusWorks.map(w => `- ${w.name} (${w.area})`).join("\n")}

## Recent Progress
${recentProgress.map(p => `- ${p.work}: ${p.status}`).join("\n")}

## Your Role
You are NOT a chatbot or information source. You are a mentor and
guide who:
1. Makes all curriculum decisions (the parent describes, you decide)
2. Provides step-by-step presentation guides
3. Offers DIY material-creation instructions
4. Analyzes photos for child development insights
5. Proactively initiates check-ins every 7 days
6. Uses tools to add/remove/update works in the system

## Communication Style
- Warm, encouraging, never judgmental
- Celebrate every observation the parent makes
- Use conversational language (not academic)
- Reference the child by name frequently
- Make the parent feel like they're talking to a friend, not software

## Check-in Timing
${isCheckinTime ? `IT'S CHECK-IN TIME. Start by greeting the parent
and asking about the week.` : `Last check-in was ${daysSince(child.settings.guru_last_checkin)} days
ago. Between check-ins, answer questions and provide guidance.`}

## Tools Available
You have access to these actions:
- add_focus_work(work_name, area): Add a work to the shelf
- remove_focus_work(work_name): Remove from shelf
- update_progress(work_name, status): Mark work status
- set_weekly_plan(works[]): Replace entire shelf
- schedule_checkin(days_from_now): Schedule next check-in
- save_observation(text): Save a behavioral note

Use these tools whenever appropriate. For example:
- When the parent describes their week, call update_progress()
- When it's time to rotate works, call remove_focus_work()
- When introducing new works, call add_focus_work()
- At the end of check-in, call schedule_checkin(7)

## Home Parent Adjustments
Remember: this is a home, not a classroom.
- One shelf is enough (8-12 works at a time)
- DIY materials are often better than buying
- Rotation every 7-14 days keeps things fresh
- Observation is more important than data
- Following the child means: watch what they do, not the curriculum
  `;

  if (intake.interests.length > 0) {
    prompt += `\n## [child]'s Interests\n${intake.interests.join(", ")}\n`;
  }

  return prompt;
}
```

**Lines of code:** ~80 (within existing file, mostly additions)

---

### 6. Dashboard Navigation (MINIMAL CHANGES)

Remove or hide teacher-centric navigation for home parents:
- Hide "Curriculum" tab (use Guru guidance instead)
- Hide "Invite Parent" button (not applicable to home)
- Hide "Print Labels" button (no physical classroom)
- Keep "Capture" for photos (Guru references them)
- Keep "Progress" (optional advanced view)

```typescript
// components/montree/DashboardHeader.tsx (MODIFIED)

{!isHomeschoolParent() && (
  <>
    <CurriculumTab />
    <InviteParentButton />
    <PrintLabelsButton />
  </>
)}

{isHomeschoolParent() && (
  <AdvancedViewToggle
    label="Advanced View"
    description="Show classroom tools (optional)"
  />
)}
```

**Lines of code:** ~20

---

## IMPLEMENTATION PHASES

### Phase 1: Guru Tool-Use System (Backend Foundation)

**Scope:** Enable Guru to call functions that modify state

**Files to Create:**
- `lib/montree/guru/tool-definitions.ts` — Tool schemas
- `lib/montree/guru/tool-executor.ts` — Execute tools, call existing APIs
- `app/api/montree/guru/tools/route.ts` — (optional) Separate endpoint for tool testing

**Files to Modify:**
- `app/api/montree/guru/route.ts` — Add tool_use to Anthropic call, parse responses

**Estimated effort:** 4-5 hours (implementation + testing)

**Testing:**
1. Call Guru API with tool-triggering prompt
2. Verify tool_use block in response
3. Verify backend state changes
4. Verify response includes action confirmations

**Success criteria:**
- Guru can call 3+ tools in a single response
- Tool calls execute successfully
- Response includes readable action confirmations

---

### Phase 2: Child Intake Conversation System

**Scope:** Replace concern picker with conversational intake

**Files to Create:**
- `app/api/montree/guru/intake/route.ts` — Intake endpoint
- `lib/montree/guru/intake-prompt.ts` — Intake prompt builder
- `components/montree/guru/IntakeFlow.tsx` — (optional) UI for intake

**Files to Modify:**
- `app/montree/dashboard/page.tsx` — Detect new child, route to intake
- `lib/montree/guru/prompt-builder.ts` — Add logic to switch prompts based on intake status

**Estimated effort:** 3-4 hours

**Testing:**
1. Create new homeschool parent account
2. Follow intake conversation
3. Verify child profile saved to `montree_children.settings`
4. Verify Guru initial plan created

**Success criteria:**
- Intake captures personality, strengths, challenges, interests
- Guru uses intake data to suggest age-appropriate works
- Child profile appears in subsequent conversations

---

### Phase 3: Guru-First Dashboard Layout

**Scope:** Full-screen Guru chat as default for home parents, optional advanced view

**Files to Create:**
- `components/montree/guru/GuruDashboardFull.tsx` — Full-screen Guru layout

**Files to Modify:**
- `app/montree/dashboard/page.tsx` — Branch logic for home parents
- `components/montree/DashboardHeader.tsx` — Add advanced view toggle

**Estimated effort:** 2-3 hours

**Testing:**
1. Log in as homeschool parent
2. Verify full-screen Guru appears
3. Click "Advanced View" toggle
4. Verify teacher dashboard appears
5. Toggle back to Guru

**Success criteria:**
- Home parents see Guru as primary interface
- Advanced view is optional and clearly labeled
- No visual confusion with teacher interface

---

### Phase 4: Check-in Scheduling System

**Scope:** Automatic check-in triggers, scheduling, cadence management

**Files to Create:**
- `lib/montree/guru/checkin-manager.ts` — Check-in scheduling logic
- `lib/montree/guru/checkin-prompt.ts` — Check-in-specific prompt builder
- `app/api/montree/guru/checkin/schedule.ts` — Schedule endpoint
- `app/api/montree/guru/checkin/notify.ts` — Check-in notification trigger

**Files to Modify:**
- `app/api/montree/guru/route.ts` — Detect check-in time, use check-in prompt
- `app/montree/dashboard/page.tsx` — Display check-in notification

**Estimated effort:** 4-5 hours

**Testing:**
1. Complete intake, get first plan
2. Simulate 7 days passing
3. Verify check-in notification appears
4. Open Guru, verify check-in prompt
5. Complete check-in, verify works updated
6. Verify next check-in scheduled

**Success criteria:**
- Check-in triggers automatically every 7 days
- Guru evaluates progress during check-in
- Shelf updates based on check-in evaluation
- Next check-in scheduled

---

### Phase 5: Polish & User Experience

**Scope:** Action confirmations, visual feedback, photo prompts, error handling

**Files to Modify:**
- `components/montree/guru/GuruChatThread.tsx` — Action confirmation UI
- `components/montree/guru/ChatBubble.tsx` — Confirmation messages styling
- `lib/montree/guru/prompt-builder.ts` — Enhance prompts with photo requests

**Estimated effort:** 2-3 hours

**Testing:**
1. Trigger tool calls, verify confirmation messages
2. Share photos during check-in, verify analysis
3. Test error scenarios (invalid work name, etc.)

**Success criteria:**
- Tool confirmations appear as action indicators
- Photos trigger Guru analysis
- Errors handled gracefully without breaking chat

---

## IMPLEMENTATION TIMELINE

| Phase | Duration | Effort | Blocker? |
|-------|----------|--------|----------|
| 1: Tool-Use | 4-5h | 40 lines/hour | None |
| 2: Intake | 3-4h | 35 lines/hour | None |
| 3: Dashboard | 2-3h | 50 lines/hour | None |
| 4: Check-in | 4-5h | 35 lines/hour | None |
| 5: Polish | 2-3h | 60 lines/hour | None |
| **Total** | **15-20h** | **~600 lines** | **None** |

**Recommendation:** Implement phases sequentially. Phase 1 (tool-use) is the foundation; can't proceed without it. Phases 2-4 can be done in parallel once Phase 1 is solid.

---

## TECHNICAL DETAILS

### Tool-Use Implementation Pattern

```typescript
// Pseudocode: How tool-use works

// 1. Build tools definition
const tools: Tool[] = [
  {
    name: "add_focus_work",
    description: "...",
    input_schema: { ... }
  },
  // ... more tools
];

// 2. Call Claude with tools
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 2048,
  tools: tools,
  tool_choice: "auto", // Guru decides when to use tools
  messages: [
    { role: "user", content: userMessage },
    // ... conversation history
  ],
  system: systemPrompt
});

// 3. Parse response for tool calls
const toolUseBlocks = response.content.filter(
  block => block.type === "tool_use"
);

const textBlocks = response.content.filter(
  block => block.type === "text"
);

// 4. Execute tools
const toolResults: ToolResult[] = [];
for (const toolCall of toolUseBlocks) {
  try {
    const result = await executeTool(toolCall.name, toolCall.input);
    toolResults.push({
      type: "tool_result",
      tool_use_id: toolCall.id,
      content: JSON.stringify(result)
    });
  } catch (error) {
    toolResults.push({
      type: "tool_result",
      tool_use_id: toolCall.id,
      is_error: true,
      content: error.message
    });
  }
}

// 5. Build response message with tool results
const userText = textBlocks.map(b => b.text).join("\n");

const responseMessage = {
  role: "assistant",
  content: [
    ...textBlocks,
    ...toolUseBlocks
  ]
};

const resultMessage = {
  role: "user",
  content: toolResults
};

// Add both to conversation history for next turn

// 6. Return final response to parent
return {
  message: userText,
  actionsTaken: toolResults.map(t => ({
    tool: t.tool_use_id,
    status: t.is_error ? "failed" : "success",
    result: t.content
  }))
};
```

### Existing API Routes Used

The tool-use system calls these existing routes:

| Tool | Route | Method | Payload |
|------|-------|--------|---------|
| add_focus_work | `/api/montree/focus-works` | POST | {work_id, child_id} |
| remove_focus_work | `/api/montree/focus-works/[workId]` | DELETE | {} |
| update_progress | `/api/montree/progress/update` | POST | {work_id, status} |
| schedule_checkin | `/api/montree/children/[childId]` | PATCH | {gui_next_checkin: date} |
| save_observation | `/api/montree/observations` | POST | {child_id, text} |

All routes already exist and are tested. Tool-use just calls them programmatically.

### Context-Building for Guru

Every Guru call needs rich context:

```typescript
// lib/montree/guru/context-builder.ts

interface GuruContext {
  child: Child;
  focusWorks: Work[];
  recentProgress: ProgressEntry[];
  recentObservations: Observation[];
  recentMedia: Media[];
  intakeProfile: ChildProfile;
  checkInStatus: {
    isDue: boolean;
    lastCheckIn: Date;
    nextCheckIn: Date;
  };
}

async function buildGuruContext(childId: string): Promise<GuruContext> {
  const child = await getChild(childId);
  const focusWorks = await getFocusWorks(childId);
  const recentProgress = await getProgress(childId, 30); // last 30 days
  const observations = await getObservations(childId, 7); // last 7 days
  const media = await getMedia(childId, 7);

  return {
    child,
    focusWorks,
    recentProgress,
    recentObservations: observations,
    recentMedia: media,
    intakeProfile: child.settings.guru_child_profile,
    checkInStatus: {
      isDue: isBefore(
        parseISO(child.settings.guru_next_checkin),
        now()
      ),
      lastCheckIn: parseISO(child.settings.guru_last_checkin),
      nextCheckIn: parseISO(child.settings.guru_next_checkin)
    }
  };
}
```

---

## DATA MODEL

### New Fields in `montree_children.settings` (JSONB)

```json
{
  // Existing fields...

  // Intake
  "guru_intake_complete": boolean,
  "guru_intake_date": "2026-02-26",
  "guru_intake_raw": "Full conversation text",

  // Child Profile
  "guru_child_profile": {
    "age": 4,
    "personality": "active, curious, extroverted",
    "strengths": ["language", "social skills"],
    "challenges": ["concentration", "sitting still"],
    "interests": ["animals", "water", "building"],
    "previous_experience": "Montessori preschool 1 year",
    "sensory_preferences": "tactile explorer",
    "motor_development": "strong gross, developing fine",
    "social_development": "very social",
    "learning_style": "kinesthetic"
  },

  // Check-in Schedule
  "guru_checkin_interval": 7,
  "guru_next_checkin": "2026-03-05T09:00:00Z",
  "guru_last_checkin": "2026-02-26T09:00:00Z",
  "guru_last_checkin_summary": "Text summary of what happened",
  "guru_checkin_count": 3,

  // Preferences
  "guru_prefer_advanced_view": false,
  "guru_preferred_checkin_day": "Monday",
  "guru_preferred_checkin_time": "09:00"
}
```

### No New Tables Needed

All existing tables support this system:
- `montree_children.settings` — stores intake, profile, check-in schedule
- `montree_child_work_progress` — tracks progress (already used)
- `montree_behavioral_observations` — stores observations (already used)
- `montree_media` — stores photos/videos (already used)
- `montree_guru_interactions` — stores conversation history (already used)

---

## IMPORTANT PRINCIPLES

### 1. Technology Disappears
Parents should feel like they're talking to a Montessori friend, not using software. No visible APIs, no raw data, no technical language. Everything is conversational.

### 2. One Shelf, One Child
Homeschool typically has 1-2 children and one shared shelf. The Guru manages what's on the shelf (8-12 works at a time). Regular rotation (weekly/bi-weekly) keeps things fresh without overwhelm.

### 3. Teacher Tools Are Backend
The week view, curriculum browser, progress tracker — all exist as APIs. The Guru uses them internally. Parents access them optionally via "Advanced View". This maintains the architecture but hides complexity.

### 4. No Separation Between Home and Classroom
Homeschool parents are teachers (same auth, same backend). The Guru is a specialized interface for teachers managing 1-2 children. This keeps the codebase unified.

### 5. Teacher Zero Impact
Teachers see ZERO changes. Everything is gated behind `isHomeschoolParent()`. Teachers continue using the classroom interface as before. This is a home-parent feature only.

### 6. Montessori First
The system is grounded in Montessori principles:
- Observation guides curriculum (check-ins are observations)
- Following the child (weekly re-evaluation)
- Prepared environment (Guru manages the shelf)
- Movement and sensory engagement (works are hands-on)
- Self-correction (materials provide feedback)
- Freedom within limits (Guru suggests, parent chooses)

### 7. Trust and Autonomy
Parents start guided (Guru makes all decisions). Over time, they learn and may want autonomy. The "Advanced View" supports this evolution. But they never need to graduate — some parents will be guided by the Guru indefinitely, and that's okay.

---

## SUCCESS METRICS

### Quantitative
1. **Guru Usage Rate**: % of home parents using Guru chat weekly
2. **Check-in Completion**: % of scheduled check-ins completed by parents
3. **Retention**: % of home parents active after 30 days, 60 days, 90 days
4. **Tool Usage**: # of times Guru successfully calls tools per week
5. **Average Shelf Rotation**: Works rotated per month (target: 8-12 per week)

### Qualitative
1. **Parent Confidence**: "I feel confident making Montessori decisions" (survey)
2. **Child Engagement**: "My child is interested and engaged" (weekly check-in feedback)
3. **Montessori Alignment**: Parent feedback confirms they're following child, not forcing curriculum
4. **Support Reduction**: Fewer support emails from home parents ("Guru answered my question")

### Adoption Goals
- Month 1: 50% of new home parents complete intake within first week
- Month 2: 80% of home parents complete at least one check-in
- Month 3: 70% of home parents report feeling more confident

---

## RISK MITIGATION

### Risk: Guru Makes Wrong Recommendations
**Mitigation:**
- Guru suggestions are framed as starting points, not absolute
- "Let's try this and see how [child] responds"
- Weekly check-ins allow fast course correction
- Parent can override any recommendation

### Risk: Tool-Use Causes Unintended Data Changes
**Mitigation:**
- Test all tool calls extensively before release
- Tool calls are logged (audit trail)
- Parent reviews action confirmations in chat
- Focus-works changes are reversible (can re-add anytime)

### Risk: Parents Become Dependent on Guru, Never Learn
**Mitigation:**
- "Advanced View" is always available
- Guru can suggest learning resources
- Gradual hand-off: Guru explains reasoning, encourages parent input
- Some dependency on guidance is okay (vs. parents doing nothing)

### Risk: Check-in Notifications Become Spammy
**Mitigation:**
- Check-in timing is customizable
- Cadence adjusts (weekly → bi-weekly) as parent gains confidence
- Notifications are gentle and missable (not aggressive)
- Parent can skip a check-in without penalty

---

## FUTURE EXTENSIONS (Post-MVP)

1. **Sibling Support**: Two children on different shelves, Guru manages both
2. **Material Templates**: DIY instructions for each work (with printable PDFs)
3. **Community Forum**: Parents share experiences, Guru moderates
4. **Assessment Reports**: Guru generates quarterly child development reports for parents
5. **Montessori Education**: Guru teaches parents about Montessori principles (optional)
6. **Sync with School**: If child also attends Montessori school, Guru coordinates home/school

---

## CONCLUSION

The Guru-Driven Home System represents a fundamental shift from "tool-based" to "guide-based" education. By making the Guru the primary interface and having it orchestrate the entire teaching system, we create an experience that:

- **Eliminates decision paralysis** — Guru makes curriculum decisions
- **Provides step-by-step guidance** — No guessing about how to present works
- **Enables weekly reflection** — Check-ins mirror teacher practices
- **Respects Montessori principles** — Observation and following the child are central
- **Scales expertise** — Montessori knowledge is encoded in the Guru
- **Removes technology friction** — Parents feel guided, not overwhelmed by software

This is not a chatbot feature. This is a complete re-architecture of the homeschool experience, powered by existing infrastructure and unified with the teacher system.

---

## APPENDIX: File Change Summary

### New Files (~600 lines total)
```
lib/montree/guru/tool-definitions.ts         (100 lines)
lib/montree/guru/tool-executor.ts            (80 lines)
lib/montree/guru/intake-prompt.ts            (70 lines)
lib/montree/guru/checkin-prompt.ts           (80 lines)
lib/montree/guru/checkin-manager.ts          (100 lines)
components/montree/guru/GuruDashboardFull.tsx (60 lines)
app/api/montree/guru/intake/route.ts         (40 lines)
app/api/montree/guru/checkin/schedule.ts     (50 lines)
docs/CONCEPT_GURU_DRIVEN_HOME_SYSTEM.md      (this document)
```

### Modified Files
```
app/api/montree/guru/route.ts                (+80 lines)
lib/montree/guru/prompt-builder.ts           (+50 lines)
app/montree/dashboard/page.tsx               (+40 lines)
components/montree/DashboardHeader.tsx       (+20 lines)
components/montree/guru/GuruChatThread.tsx   (+30 lines)
```

### Total Code Changes: ~930 lines (new + modified)

---

**Document prepared by:** Claude Code
**For:** Tredoux (Montree founder)
**Next step:** Review and approve concept, then begin Phase 1 implementation
