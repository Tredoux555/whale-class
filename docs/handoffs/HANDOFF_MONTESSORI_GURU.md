# HANDOFF: Montessori Guru

> For next Claude session or developer picking up this work.

---

## 🎯 WHAT WE'RE BUILDING

**Montessori Guru** - An AI assistant integrated into the teacher dashboard that:
- Takes a simple question about a child ("Rachel can't focus, what should I do?")
- Invisibly gathers all context (age, notes, works, behavior, family situation)
- Uses deep Montessori knowledge (from Maria Montessori's actual books)
- Returns genius-level, child-specific advice

**Philosophy**: Complexity absorbed, simplicity delivered.

---

## ✅ WHAT'S DONE

### Knowledge Base (100% Complete)
**Location**: `/data/guru_knowledge/sources/`

| Book | Lines | Ready |
|------|-------|-------|
| The Absorbent Mind | 16,471 | ✅ |
| The Secret of Childhood | 10,306 | ✅ |
| The Montessori Method | 13,181 | ✅ |
| Dr. Montessori's Own Handbook | 3,364 | ✅ |
| Pedagogical Anthropology | 24,261 | ✅ |
| Spontaneous Activity in Education | 11,766 | ✅ |
| The Montessori Elementary Material | 17,528 | ✅ |
| **TOTAL** | **96,877** | ✅ |

### Documentation (Complete)
- `/docs/MONTESSORI_GURU_ARCHITECTURE.md` - Full system design with mockups
- `/docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` - 10-day build plan
- `/docs/GURU_PLAN_AUDIT.md` - Critical review with 10 gaps identified

### Infrastructure (Already Exists)
- **Anthropic client**: `/lib/ai/anthropic.ts` ✅
- **API key**: Already in `.env.local` ✅
- **Model configured**: Claude Sonnet ✅
- **Guru folder**: `/app/montree/dashboard/guru/` (empty, ready)

---

## ❌ WHAT'S NOT DONE

| Component | Status | Effort |
|-----------|--------|--------|
| Topic index (JSON) | Not built | 2-3 hours |
| Database tables | Not created | 30 min |
| Guru API endpoint | Not built | 4-6 hours |
| Context builder | Not built | 2-3 hours |
| Knowledge retriever | Not built | 2-3 hours |
| Prompt builder | Not built | 1-2 hours |
| Chat UI | Not built | 3-4 hours |
| Mental profile editor | Not built | 2-3 hours |

**Total estimated**: 4-5 days for full implementation

---

## 🚀 QUICKSTART FOR NEXT SESSION

### Step 1: Update Manifest
The manifest at `/data/guru_knowledge/manifest.json` is outdated. Update it:
```bash
# Read current: shows wrong status for some books
cat /data/guru_knowledge/manifest.json
```

### Step 2: Create Topic Index
This is the biggest prep task. Options:
- **Manual**: Read books, identify topics, create JSON (slow but precise)
- **Automated**: Use Claude to scan each book and generate index (faster)

### Step 3: Run Migration
Create and run `/migrations/110_guru_tables.sql` (schema in implementation plan)

### Step 4: Build MVP API
Create `/app/api/montree/guru/route.ts`:
1. Receive question + child_id
2. Query child data from DB
3. Find relevant book passages
4. Build prompt with context
5. Call Claude API
6. Return structured response

### Step 5: Build UI
Create `/app/montree/dashboard/guru/page.tsx`:
- Child selector
- Question input
- Response display

---

## 📂 KEY FILES TO READ

In this order:

1. **This file** - You're here
2. `/docs/MONTESSORI_GURU_ARCHITECTURE.md` - Detailed design
3. `/docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` - Build phases
4. `/docs/GURU_PLAN_AUDIT.md` - Gaps to address
5. `/BRAIN.md` - Overall project context
6. `/lib/ai/anthropic.ts` - Existing Claude integration

---

## 🧠 CONTEXT FROM CONVERSATION

Key decisions made with user:

1. **Web research insufficient** - User wanted real Montessori books, not summaries
2. **Abstraction is key** - Teacher sees simple chat, everything else invisible
3. **Child-specific, not generic** - "Try a fidget toy" is useless; need "For Rachel, with her high activity level and current sensitive period for order, try..."
4. **Books acquired** - User downloaded from Project Gutenberg + Archive.org after network issues blocked automated downloads
5. **OCR performed** - "The Secret of Childhood" was a scanned PDF; we extracted via tesseract

---

## ⚠️ WATCH OUT FOR

### Technical
- Network restrictions may block external downloads
- `montree_children.age` is INTEGER (not decimal)
- Existing data in `montree_work_sessions` has teacher notes - use them!
- Books are plain text with line numbers - need robust parsing

### Design
- Don't over-engineer profiles - start simple
- Streaming responses are important (5-10s wait feels broken)
- Mobile-first for tablet-using teachers

### Privacy
- Don't send full child names to Claude API
- Document data handling for school compliance

---

## 🔗 RELATED FEATURES

The Guru builds on existing work:
- **AI Analysis** - `/app/api/montree/analysis/route.ts` does weekly child analysis
- **Work Sessions** - `/api/montree/work-sessions/` tracks teacher observations
- **Child Progress** - `/api/montree/progress/` tracks curriculum mastery

---

## 📊 DATABASE REFERENCE

### Existing Tables (USE THESE)
- `montree_children` - Child records
- `montree_work_sessions` - Session notes from teachers
- `montree_child_progress` - Work status per child
- `montree_classroom_curriculum_works` - Curriculum per classroom

### New Tables (CREATE THESE)
- `montree_child_mental_profiles` - Temperament, sensitive periods
- `montree_behavioral_observations` - Functional behavior analysis
- `montree_guru_interactions` - Conversation history
- `montree_child_patterns` - Detected patterns

---

## 💡 IMPLEMENTATION TIPS

### For Knowledge Retrieval
```typescript
// Simple approach - keyword matching
function findRelevantPassages(question: string, books: string[]) {
  const keywords = extractKeywords(question); // "focus", "wandering", "attention"

  // Check topic_index.json for matching sections
  // Pull those line ranges from source files
  // Return concatenated passages (max 2000 lines)
}
```

### For Prompt Building
```typescript
// Layer the context
const systemPrompt = MONTESSORI_EXPERT_PERSONA;
const childContext = await getChildContext(childId);
const knowledgeContext = await findRelevantPassages(question);
const examples = getFewShotExamples(questionType);

const fullPrompt = `
${systemPrompt}

CHILD PROFILE:
${childContext}

RELEVANT MONTESSORI KNOWLEDGE:
${knowledgeContext}

EXAMPLES:
${examples}

TEACHER'S QUESTION:
${question}

Provide insight, root cause, action plan, timeline, and parent talking point.
`;
```

---

## 🎁 BONUS: Example Guru Response

**Question**: "Rachel can't focus, wanders around"

**Ideal Response**:
```
💡 INSIGHT
Rachel's focus change appears connected to her new sibling (born 3 weeks ago).
This is a normal, temporary regression. Her wandering is seeking connection
and security, not avoiding work.

📋 THIS WEEK'S PLAN

1. MORNING CHECK-IN (5 min)
   Greet at door. Ask about baby brother. Fill attention need positively.

2. RESTORE ORDER
   Give "special job" - arranging Practical Life shelf.
   Meets need for order AND connection.

3. MOVEMENT BEFORE FOCUS
   Walk the line for 3 minutes before any presentation.
   High activity level needs outlet first.

⏰ Expected: 2-3 weeks for improvement

💬 Parent talking point:
"Rachel is adjusting beautifully to being a big sister. We're giving her
extra connection time at school."
```

---

## 🏁 DEFINITION OF DONE

MVP is complete when:
- [ ] Teacher can select child and type question
- [ ] System returns child-specific insight + action plan
- [ ] Response references actual Montessori principles
- [ ] Conversation is logged to database
- [ ] Response time < 10 seconds (with loading state)

Full version adds:
- [ ] Mental profile editor
- [ ] Observation logging
- [ ] Pattern detection
- [ ] Follow-up reminders

---

*Created: Feb 1, 2026*
*Author: Claude (session with Tredoux)*
*Next action: Start Phase 1 - Foundation*
