# Montessori Guru - Implementation Plan

> **Philosophy**: Complexity absorbed, simplicity delivered.
> Teacher sees: simple chat. System does: genius-level reasoning.

---

## 1. CURRENT STATE AUDIT ✅

### Knowledge Base (COMPLETE)
**Location**: `/data/guru_knowledge/sources/`

| Book | Lines | Size | Status |
|------|-------|------|--------|
| The Absorbent Mind | 16,471 | 627 KB | ✅ |
| The Secret of Childhood | 10,306 | 431 KB | ✅ |
| The Montessori Method | 13,181 | 737 KB | ✅ |
| Dr. Montessori's Own Handbook | 3,364 | 173 KB | ✅ |
| Pedagogical Anthropology | 24,261 | 1.3 MB | ✅ |
| Spontaneous Activity in Education | 11,766 | 656 KB | ✅ |
| The Montessori Elementary Material | 17,528 | 751 KB | ✅ |
| **TOTAL** | **96,877** | **4.6 MB** | ✅ |

### Existing Architecture
- **Architecture Doc**: `/docs/MONTESSORI_GURU_ARCHITECTURE.md` ✅
- **Guru Folder**: `/app/montree/dashboard/guru/` (empty - ready for implementation)
- **Database Schema**: Designed in architecture doc (needs SQL migration)

### What Needs Building

| Component | Status | Priority |
|-----------|--------|----------|
| Knowledge Index (Layer 1) | ❌ Not built | HIGH |
| Database Tables | ❌ Not built | HIGH |
| Guru API Endpoint | ❌ Not built | HIGH |
| Guru UI (Chat Interface) | ❌ Not built | HIGH |
| Child Mental Profile UI | ❌ Not built | MEDIUM |
| Few-Shot Examples | ❌ Not built | MEDIUM |

---

## 2. DATA STRUCTURE FIXES

### 2.1 Update Manifest (Required)
The manifest at `/data/guru_knowledge/manifest.json` is outdated. It shows books as "pending" that are complete.

**Action**: Update manifest to reflect actual state:
```json
{
  "sources": [
    { "id": "absorbent_mind", "status": "complete", "lines": 16471 },
    { "id": "secret_of_childhood", "status": "complete", "lines": 10306 },
    { "id": "montessori_method", "status": "complete", "lines": 13181 },
    { "id": "own_handbook", "status": "complete", "lines": 3364 },
    { "id": "pedagogical_anthropology", "status": "complete", "lines": 24261 },
    { "id": "spontaneous_activity", "status": "complete", "lines": 11766 },
    { "id": "elementary_material", "status": "complete", "lines": 17528 }
  ]
}
```

### 2.2 Create Topic Index (Layer 1)
**Purpose**: Fast lookup for RAG retrieval

**Location**: `/data/guru_knowledge/topic_index.json`

**Structure**:
```json
{
  "sensitive_periods": {
    "order": { "sources": ["secret_of_childhood"], "lines": [100, 450], "summary": "..." },
    "language": { "sources": ["absorbent_mind", "secret_of_childhood"], "lines": [...] },
    "movement": { "sources": ["absorbent_mind"], "lines": [...] },
    "sensory": { "sources": ["secret_of_childhood"], "lines": [...] },
    "small_objects": { "sources": ["secret_of_childhood"], "lines": [...] }
  },
  "concentration": {
    "development": { "sources": ["absorbent_mind"], "lines": [...] },
    "obstacles": { "sources": ["secret_of_childhood"], "lines": [...] }
  },
  "discipline": {
    "natural_discipline": { "sources": ["montessori_method"], "lines": [...] },
    "freedom_limits": { "sources": ["absorbent_mind"], "lines": [...] }
  },
  "materials": {
    "practical_life": { "sources": ["own_handbook", "montessori_method"], "lines": [...] },
    "sensorial": { "sources": ["elementary_material"], "lines": [...] },
    "math": { "sources": ["elementary_material"], "lines": [...] }
  },
  "normalization": {
    "process": { "sources": ["absorbent_mind", "secret_of_childhood"], "lines": [...] },
    "deviations": { "sources": ["secret_of_childhood"], "lines": [...] }
  },
  "teacher_role": {
    "observation": { "sources": ["montessori_method", "spontaneous_activity"], "lines": [...] },
    "intervention": { "sources": ["secret_of_childhood"], "lines": [...] }
  }
}
```

---

## 3. DATABASE SCHEMA

### 3.1 New Tables Required

**Migration**: `migrations/110_guru_tables.sql`

```sql
-- Child mental/developmental profile
CREATE TABLE montree_child_mental_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE,

  -- Temperament (1-5 scale)
  temperament_activity_level INT CHECK (temperament_activity_level BETWEEN 1 AND 5),
  temperament_regularity INT CHECK (temperament_regularity BETWEEN 1 AND 5),
  temperament_initial_reaction INT CHECK (temperament_initial_reaction BETWEEN 1 AND 5),
  temperament_adaptability INT CHECK (temperament_adaptability BETWEEN 1 AND 5),
  temperament_intensity INT CHECK (temperament_intensity BETWEEN 1 AND 5),
  temperament_mood_quality INT CHECK (temperament_mood_quality BETWEEN 1 AND 5),
  temperament_distractibility INT CHECK (temperament_distractibility BETWEEN 1 AND 5),
  temperament_persistence INT CHECK (temperament_persistence BETWEEN 1 AND 5),
  temperament_sensory_threshold INT CHECK (temperament_sensory_threshold BETWEEN 1 AND 5),

  -- Learning profile
  learning_modality_visual INT CHECK (learning_modality_visual BETWEEN 1 AND 5),
  learning_modality_auditory INT CHECK (learning_modality_auditory BETWEEN 1 AND 5),
  learning_modality_kinesthetic INT CHECK (learning_modality_kinesthetic BETWEEN 1 AND 5),
  baseline_focus_minutes INT,
  optimal_time_of_day TEXT, -- 'morning', 'midday', 'afternoon'

  -- Sensitive periods (status: 'active', 'waning', 'complete', 'not_started')
  sensitive_period_order TEXT DEFAULT 'active',
  sensitive_period_language TEXT DEFAULT 'active',
  sensitive_period_movement TEXT DEFAULT 'active',
  sensitive_period_sensory TEXT DEFAULT 'active',
  sensitive_period_small_objects TEXT DEFAULT 'active',
  sensitive_period_grace_courtesy TEXT DEFAULT 'not_started',

  -- Environmental context
  family_notes TEXT,
  sleep_status TEXT DEFAULT 'normal',
  special_considerations TEXT,

  -- What works
  successful_strategies TEXT[],
  challenging_triggers TEXT[],

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  updated_by UUID
);

-- Behavioral observations with function analysis
CREATE TABLE montree_behavioral_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  observed_at TIMESTAMP DEFAULT now(),
  observed_by UUID,

  behavior_description TEXT NOT NULL,
  antecedent TEXT, -- What happened before
  behavior_function TEXT, -- 'attention', 'escape', 'sensory', 'tangible'
  consequence TEXT, -- What happened after

  time_of_day TEXT,
  activity_during TEXT,
  environmental_notes TEXT,

  intervention_used TEXT,
  effectiveness TEXT -- 'effective', 'partially', 'ineffective'
);

-- Guru conversation history
CREATE TABLE montree_guru_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  teacher_id UUID,
  classroom_id UUID,
  asked_at TIMESTAMP DEFAULT now(),

  question TEXT NOT NULL,
  context_snapshot JSONB, -- Full context at time of question

  response TEXT NOT NULL,
  action_plan JSONB,
  root_cause TEXT,

  follow_up_date DATE,
  follow_up_notes TEXT,
  outcome TEXT -- 'improved', 'no_change', 'worsened', 'ongoing'
);

-- Detected patterns (learned over time)
CREATE TABLE montree_child_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  pattern_type TEXT, -- 'focus', 'social', 'emotional', 'learning'
  pattern_description TEXT,
  first_observed DATE,
  still_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_mental_profiles_child ON montree_child_mental_profiles(child_id);
CREATE INDEX idx_observations_child ON montree_behavioral_observations(child_id);
CREATE INDEX idx_guru_child ON montree_guru_interactions(child_id);
CREATE INDEX idx_patterns_child ON montree_child_patterns(child_id);
```

---

## 4. API ARCHITECTURE

### 4.1 Main Guru Endpoint

**File**: `/app/api/montree/guru/route.ts`

```
POST /api/montree/guru

Request:
{
  "child_id": "uuid",
  "question": "Rachel can't focus, what should I do?",
  "classroom_id": "uuid",
  "teacher_id": "uuid"
}

Response:
{
  "insight": "Rachel's focus change appears connected to...",
  "root_cause": "Life transition (new sibling)",
  "action_plan": [
    {
      "priority": 1,
      "action": "Morning check-in",
      "duration": "5 minutes",
      "details": "Greet Rachel at the door...",
      "rationale": "Fills attention-seeking need positively"
    }
  ],
  "timeline": "2-3 weeks",
  "follow_up_date": "2024-02-14",
  "parent_talking_point": "Rachel is adjusting beautifully...",
  "sources_used": ["absorbent_mind", "secret_of_childhood"]
}
```

### 4.2 Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        GURU PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. RECEIVE QUESTION                                            │
│     └─ "Rachel can't focus"                                     │
│                                                                 │
│  2. GATHER CONTEXT (parallel queries)                           │
│     ├─ Child profile (age, time at school)                      │
│     ├─ Mental profile (temperament, sensitive periods)          │
│     ├─ Recent observations (last 30 days)                       │
│     ├─ Current works & progress                                 │
│     ├─ Behavioral observations                                  │
│     ├─ Past guru interactions (what's been tried)               │
│     └─ Work sessions with teacher notes                         │
│                                                                 │
│  3. QUERY KNOWLEDGE BASE                                        │
│     ├─ Analyze question → identify topics                       │
│     ├─ Look up topic_index.json                                 │
│     └─ Pull relevant passages from source files                 │
│                                                                 │
│  4. BUILD MEGA-PROMPT                                           │
│     ├─ System context (Montessori expert persona)               │
│     ├─ Child context (all gathered data)                        │
│     ├─ Knowledge context (relevant Montessori wisdom)           │
│     ├─ Few-shot examples                                        │
│     └─ Teacher's question                                       │
│                                                                 │
│  5. CALL CLAUDE API                                             │
│     └─ With structured output schema                            │
│                                                                 │
│  6. LOG & RETURN                                                │
│     ├─ Save to guru_interactions table                          │
│     ├─ Optionally update child patterns                         │
│     └─ Return clean response to teacher                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Supporting Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/montree/guru/history?child_id=x` | Past guru conversations for child |
| `POST /api/montree/guru/followup` | Update outcome of past interaction |
| `GET /api/montree/children/[id]/profile` | Get child's mental profile |
| `PUT /api/montree/children/[id]/profile` | Update mental profile |
| `POST /api/montree/observations` | Log behavioral observation |

---

## 5. UI COMPONENTS

### 5.1 Guru Chat Interface

**File**: `/app/montree/dashboard/guru/page.tsx`

**Design**:
```
┌────────────────────────────────────────────────────────────────┐
│  🔮 Montessori Guru                                    [Close] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Asking about: Rachel Martinez (4y 7m)              [Change ▾] │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Rachel can't seem to focus lately. She wanders around    │  │
│  │ the classroom and won't settle into work.                │  │
│  │ What should I do?                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                    [Ask Guru]  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  💡 INSIGHT                                                    │
│  Rachel's focus change appears connected to her new sibling   │
│  (born 3 weeks ago) - this is a normal, temporary regression. │
│                                                                │
│  Her wandering is likely seeking connection and security,     │
│  not avoiding work.                                            │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│  📋 THIS WEEK'S PLAN                                          │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  1. MORNING CHECK-IN (5 min)                                  │
│     Greet Rachel at the door. Ask about her baby brother...   │
│                                                                │
│  2. RESTORE ORDER                                              │
│     Give her a "special job" - arranging the shelf...          │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│  ⏰ Expected improvement: 2-3 weeks                            │
│                                                                │
│  💬 Parent talking point:                                      │
│  "Rachel is adjusting beautifully to being a big sister..."   │
│                                                                │
│  [✓ Save to Rachel's Profile]  [📅 Set Follow-up Reminder]    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Quick Access Button

Add to child detail page (`/app/montree/dashboard/[childId]/page.tsx`):

```tsx
<button onClick={() => router.push(`/montree/dashboard/guru?child=${childId}`)}>
  🔮 Ask Guru
</button>
```

### 5.3 Mental Profile Editor

**File**: `/app/montree/dashboard/[childId]/profile/page.tsx`

Simple form for updating child's:
- Temperament sliders (1-5)
- Learning modality preferences
- Sensitive period statuses
- Family notes
- Successful strategies (tags)

---

## 6. PROMPT ENGINEERING

### 6.1 System Prompt Template

```
You are a master Montessori guide with 30 years of experience. You understand
child development deeply - not just symptoms, but root causes. You think about
the whole child: their temperament, sensitive periods, family context, and
individual patterns.

Your responses should be:
- Specific to THIS child (never generic advice)
- Rooted in Montessori philosophy
- Actionable and practical
- Warm but professional
- Include timeline expectations

When analyzing behavior, always consider:
1. What is the FUNCTION of this behavior? (attention, escape, sensory, tangible)
2. What unmet NEED is the child expressing?
3. What sensitive periods are active?
4. What environmental factors might be contributing?
5. What has worked for this child before?
```

### 6.2 Few-Shot Examples

**Location**: `/data/guru_knowledge/few_shot_examples.json`

Include 5-10 high-quality examples showing:
- Focus issues → identify root cause → specific plan
- Social conflicts → function analysis → resolution
- Regression → normalize + timeline + strategies
- Material readiness → sensitive period alignment
- Parent communication → talking points

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Foundation (Days 1-2)
- [ ] Update manifest.json
- [ ] Create topic_index.json (manual curation from books)
- [ ] Run migration 110_guru_tables.sql
- [ ] Create basic `/api/montree/guru/route.ts`
- [ ] Test with hardcoded child data

### Phase 2: Context Pipeline (Days 3-4)
- [ ] Build context gathering functions
- [ ] Implement knowledge base retrieval
- [ ] Create prompt builder
- [ ] Test full pipeline with real child data

### Phase 3: UI (Days 5-6)
- [ ] Build `/app/montree/dashboard/guru/page.tsx`
- [ ] Add "Ask Guru" button to child pages
- [ ] Build response display component
- [ ] Add save/follow-up functionality

### Phase 4: Profile System (Days 7-8)
- [ ] Build mental profile editor UI
- [ ] Create observation logging UI
- [ ] Implement pattern detection (basic)
- [ ] Connect profiles to guru context

### Phase 5: Polish (Days 9-10)
- [ ] Write few-shot examples
- [ ] Tune prompts based on testing
- [ ] Add loading states and error handling
- [ ] Performance optimization

---

## 8. TECHNICAL DECISIONS

### 8.1 RAG Strategy
**Decision**: Hybrid (Index + Full Text)
- Use `topic_index.json` for fast topic lookup
- Pull full passages from source files for context
- Claude does the reasoning, not embedding search

### 8.2 Context Window Management
**Challenge**: 96,877 lines of source material won't fit in context
**Solution**:
- Topic index identifies relevant sections
- Pull only relevant passages (1000-2000 lines max)
- Prioritize most relevant books per question

### 8.3 Claude Model
**Decision**: Use Claude Sonnet for balance of quality/cost
- Opus for complex edge cases (optional upgrade)
- Haiku too shallow for nuanced child development reasoning

### 8.4 Caching
- Cache frequently accessed child profiles
- Cache guru responses for identical questions (with same context)
- 30-minute TTL on context snapshots

---

## 9. FILES TO CREATE

| File | Purpose |
|------|---------|
| `/data/guru_knowledge/manifest.json` | Update existing |
| `/data/guru_knowledge/topic_index.json` | New - topic lookup |
| `/data/guru_knowledge/few_shot_examples.json` | New - example Q&A |
| `/migrations/110_guru_tables.sql` | New - database schema |
| `/app/api/montree/guru/route.ts` | New - main API |
| `/app/api/montree/guru/history/route.ts` | New - conversation history |
| `/app/api/montree/observations/route.ts` | New - log observations |
| `/app/api/montree/children/[id]/profile/route.ts` | New - mental profile CRUD |
| `/app/montree/dashboard/guru/page.tsx` | New - chat UI |
| `/app/montree/dashboard/[childId]/profile/page.tsx` | New - profile editor |
| `/lib/montree/guru/context-builder.ts` | New - gather child context |
| `/lib/montree/guru/knowledge-retriever.ts` | New - query knowledge base |
| `/lib/montree/guru/prompt-builder.ts` | New - construct prompts |
| `/components/montree/GuruChat.tsx` | New - chat component |
| `/components/montree/GuruResponse.tsx` | New - response display |
| `/components/montree/TemperamentSlider.tsx` | New - profile input |

---

## 10. SUCCESS METRICS

### MVP Success (Week 1)
- [ ] Teacher can ask question about child
- [ ] System gathers context and queries knowledge base
- [ ] Response includes insight + action plan
- [ ] Response logged to database

### Full Success (Week 2)
- [ ] Mental profiles populated for existing children
- [ ] Observations can be logged
- [ ] Past conversations accessible
- [ ] Follow-up reminders working
- [ ] Teacher feedback: "This actually understands my kids"

---

## 11. RISKS & MITIGATIONS

| Risk | Mitigation |
|------|------------|
| Context too large for API | Aggressive topic filtering, passage limits |
| Generic advice (not child-specific) | Emphasize child data in prompt, test extensively |
| Slow response times | Cache, parallel DB queries, streaming response |
| Knowledge gaps | Acknowledge limitations, recommend human consultation |
| Teacher doesn't populate profiles | Default profiles, learn from observations over time |

---

## 12. QUICK START CHECKLIST

```
□ Read this document
□ Read /docs/MONTESSORI_GURU_ARCHITECTURE.md for design details
□ Read BRAIN.md for project context
□ Check /data/guru_knowledge/sources/ for book files
□ Start with Phase 1: Foundation
□ Test early, test often
```

---

*Last updated: Feb 1, 2026*
*Author: Claude (from session with Tredoux)*
