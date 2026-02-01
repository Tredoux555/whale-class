# Montessori Guru - Deep Plan Audit

> Critical analysis of implementation plan to catch gaps before building.

---

## ✅ STRENGTHS OF CURRENT PLAN

1. **Clear philosophy** - "Complexity absorbed, simplicity delivered" is well-defined
2. **Complete knowledge base** - 7 books, 96,877 lines, properly stored
3. **Detailed architecture** - Pipeline, database schema, API design documented
4. **Phased approach** - Realistic 10-day timeline with clear milestones
5. **User experience focused** - Simple chat UI, not overwhelming teacher

---

## ⚠️ GAPS IDENTIFIED

### GAP 1: Topic Index Creation is Manual
**Issue**: Plan says "manual curation from books" for topic_index.json
**Problem**: 96,877 lines is too much to manually curate
**Risk**: Days of work, inconsistent coverage, human error

**SOLUTION**: Build automated topic indexer
```
- Read each book
- Use Claude to identify key topics/themes per chapter
- Auto-generate topic_index.json with line references
- Human review/refine afterward
```

**Add to Phase 1**: Create `/scripts/build-topic-index.ts`

---

### GAP 2: No Existing Teacher Notes Integration
**Issue**: Plan references "recent observations" but doesn't specify data source
**Problem**: `montree_work_sessions` has teacher notes, but plan creates NEW tables

**SOLUTION**: Integrate existing data sources:
- `montree_work_sessions.notes` - Teacher observations per session
- `montree_child_progress` - Work status per child
- These already exist! Don't reinvent.

**Modify API**: Context builder should query BOTH:
- Existing: `montree_work_sessions` (teacher notes)
- Existing: `montree_child_progress` (curriculum progress)
- New: `montree_child_mental_profiles` (temperament, sensitive periods)
- New: `montree_behavioral_observations` (functional analysis)
- New: `montree_guru_interactions` (past conversations)

---

### GAP 3: Child Age Calculation
**Issue**: Architecture shows "Age: 4 years 7 months" but no calculation logic
**Problem**: `montree_children.age` is just INTEGER (e.g., 4), not precise

**SOLUTION**: Add birthday field or calculate from existing data
```sql
-- Option A: Add birthday to children table
ALTER TABLE montree_children ADD COLUMN birthday DATE;

-- Option B: Use enrollment_date to estimate
-- (less accurate but works with existing data)
```

**Add to Migration 110**: Include birthday column

---

### GAP 4: No Error Handling for Missing Profiles
**Issue**: Plan assumes mental profiles exist
**Problem**: New children won't have profiles; guru will fail

**SOLUTION**: Graceful degradation
```typescript
// In context-builder.ts
const profile = await getMentalProfile(childId);
if (!profile) {
  // Use age-appropriate defaults
  return getDefaultProfileForAge(child.age);
}
```

**Add to Plan**: Default profile generation logic

---

### GAP 5: Claude API Key Management
**Issue**: Plan doesn't mention API key storage
**Problem**: Already have Anthropic API in the app?

**CHECK**: Look for existing Claude/Anthropic integration in codebase

**SOLUTION**: Use existing pattern or add:
- `ANTHROPIC_API_KEY` to `.env`
- `/lib/anthropic.ts` for client setup

---

### GAP 6: Rate Limiting / Cost Control
**Issue**: No mention of API usage limits
**Problem**: Teachers could spam Guru, running up costs

**SOLUTION**:
- Limit: 10 guru questions per child per day
- Cooldown: 30 seconds between questions
- Warning when approaching limit
- Log usage for billing/monitoring

**Add table**:
```sql
CREATE TABLE montree_guru_usage (
  id UUID PRIMARY KEY,
  classroom_id UUID,
  date DATE,
  question_count INT DEFAULT 0,
  UNIQUE(classroom_id, date)
);
```

---

### GAP 7: No Streaming Response
**Issue**: Guru response could take 5-10 seconds
**Problem**: Teacher stares at spinner, thinks it's broken

**SOLUTION**: Use streaming:
- Server-Sent Events for response
- Show response as it generates
- Better UX than waiting for full response

**Add to Phase 3**: Implement streaming in `/api/montree/guru/route.ts`

---

### GAP 8: Mobile Responsiveness
**Issue**: UI mockups are desktop-focused
**Problem**: Teachers often use tablets/phones

**SOLUTION**: Design mobile-first
- Collapsible sections
- Touch-friendly inputs
- Bottom sheet for child selector on mobile

---

### GAP 9: No Offline/Fallback Mode
**Issue**: What if Claude API is down?
**Problem**: Teacher can't get any help

**SOLUTION**: Basic fallback
- Cache common question patterns + responses
- Show "Guru is thinking..." then fallback after 30s timeout
- Display: "Having trouble connecting. Try: [generic tips]"

---

### GAP 10: Privacy/FERPA Considerations
**Issue**: Sending child data to external API
**Problem**: Schools have privacy requirements

**SOLUTION**:
- Never send full names to Claude (use "the child" or initials)
- Document data handling in privacy policy
- Add consent checkbox for schools enabling Guru
- Consider: Local LLM option for future

**Add to onboarding**: Guru consent step

---

## 🔧 REVISED PHASE PLAN

### Phase 1: Foundation (Days 1-2) - UPDATED
- [ ] Update manifest.json ✅
- [ ] **NEW**: Run topic indexing script (automated)
- [ ] Run migration 110_guru_tables.sql
- [ ] **NEW**: Add birthday column migration
- [ ] **NEW**: Add usage tracking table
- [ ] Create basic `/api/montree/guru/route.ts`
- [ ] **NEW**: Set up Anthropic API client
- [ ] Test with hardcoded child data

### Phase 2: Context Pipeline (Days 3-4) - UPDATED
- [ ] Build context gathering functions
- [ ] **NEW**: Integrate existing montree_work_sessions
- [ ] **NEW**: Add default profile generation
- [ ] Implement knowledge base retrieval
- [ ] Create prompt builder
- [ ] Test full pipeline with real child data

### Phase 3: UI (Days 5-6) - UPDATED
- [ ] Build `/app/montree/dashboard/guru/page.tsx`
- [ ] **NEW**: Implement streaming response
- [ ] **NEW**: Mobile-responsive design
- [ ] Add "Ask Guru" button to child pages
- [ ] Build response display component
- [ ] Add save/follow-up functionality

### Phase 4: Profile System (Days 7-8)
- [ ] Build mental profile editor UI
- [ ] Create observation logging UI
- [ ] Implement pattern detection (basic)
- [ ] Connect profiles to guru context

### Phase 5: Polish (Days 9-10) - UPDATED
- [ ] Write few-shot examples
- [ ] Tune prompts based on testing
- [ ] **NEW**: Add rate limiting
- [ ] **NEW**: Add fallback mode
- [ ] Add loading states and error handling
- [ ] Performance optimization
- [ ] **NEW**: Privacy documentation

---

## 📋 PRE-BUILD CHECKLIST

Before starting implementation:

1. [ ] Verify Anthropic API key exists or add to .env
2. [ ] Check existing Claude integration in codebase
3. [ ] Confirm `montree_work_sessions` table has data
4. [ ] Decide: Add birthday column OR use age integer?
5. [ ] Review FERPA/privacy requirements with user
6. [ ] Test API connectivity from Railway deployment

---

## 🎯 CRITICAL PATH

The minimum viable Guru needs:

1. **API endpoint** that receives child_id + question
2. **Context builder** that pulls child data + notes
3. **Knowledge retriever** that finds relevant book passages
4. **Prompt builder** that constructs the mega-prompt
5. **Claude call** that generates response
6. **Simple UI** that displays question + response

Everything else (profiles, observations, patterns) is enhancement.

**MVP Timeline**: 4 days for working prototype

---

*Audit completed: Feb 1, 2026*
