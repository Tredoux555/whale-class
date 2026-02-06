# 🎓 STUDENT ONBOARDING SYSTEM - HANDOFF

> **Status:** DESIGN COMPLETE - Ready for Implementation
> **Date:** February 6, 2026
> **Priority:** 🥇 FIRST PROJECT for next fresh session

---

## 🚀 NEXT SESSION PROMPT

```
Build the Student Onboarding System.
Read HANDOFF_ONBOARDING_SYSTEM.md first.
The design mockup is at /mnt/whale/onboarding-mockup.jsx
```

---

## 🎯 WHAT WE'RE BUILDING

An Excel-style spreadsheet for onboarding students that:
1. Teacher fills in student info (Name, Age, Time at School, current level per area, Temperament, Focus)
2. Clicks "Ask Guru" → Guru analyzes and recommends specific works
3. Teacher reviews, modifies if needed, approves
4. Approved works automatically appear in child's profile tab for the week

**Philosophy:** Teachers know their children. Guru knows Montessori. Together they create the perfect plan.

---

## 📋 SPREADSHEET COLUMNS

| Column | Description | Example |
|--------|-------------|---------|
| **Name** | Child's full name | Emma Chen |
| **Age** | Years and months | 3y 4m |
| **Time at School** | How long enrolled | 2 months |
| **Practical Life** | Current level/works | Pouring, Spooning |
| **Sensorial** | Current level/works | Pink Tower (exploring) |
| **Math** | Current level/works | Not yet presented |
| **Language** | Current level/works | Sound games |
| **Cultural** | Current level/works | Globe work |
| **Temperament** | Behavioral notes | High energy, cautious with new activities |
| **Teacher Focus** | What to work on | Building concentration |
| **Action** | Ask Guru / View Plan / ✓ Set Up | Button |

---

## 🧠 GURU RECOMMENDATION OUTPUT

When teacher clicks "Ask Guru", the system returns:

### 1. Insight
A brief analysis of the child's current state based on all inputs.

*Example:* "Emma's high energy combined with only 2 months at school suggests she's still in the adjustment period. Her persistence once engaged is a strength to build on."

### 2. Recommended Works (Priority Ordered)
4 specific works for this week with:
- Work name
- Area (PL/SE/MA/LA/CU)
- Priority number (1-4)
- Reason for recommendation

*Example:*
1. **Wet Pouring** (PL) - Builds on her pouring success, adds sensory element for focus
2. **Tonging** (PL) - Prepares hand strength for later pencil work
3. **Pink Tower guided** (SE) - Move from exploring to purposeful work
4. **Silence Game** (PL) - Channel high energy into self-regulation

### 3. Prerequisite Alert ⚠️
Critical guidance about what to do if child attempts work they're not ready for.

*Example:* "If Emma attempts writing work, redirect to tonging/spooning first"

### 4. Timeline
Expected time to see results.

*Example:* "2-3 weeks to establish concentration cycle"

---

## 🔄 USER FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING SPREADSHEET                    │
├──────┬─────┬───────┬────┬────┬────┬────┬────┬─────┬────────┤
│ Name │ Age │ Time  │ PL │ SE │ MA │ LA │ CU │Temp │ Focus  │
├──────┼─────┼───────┼────┼────┼────┼────┼────┼─────┼────────┤
│Emma  │3y4m │2 mo   │... │... │... │... │... │...  │ ...    │ [Ask Guru]
├──────┼─────┼───────┼────┼────┼────┼────┼────┼─────┼────────┤
│Marcus│4y1m │8 mo   │... │... │... │... │... │...  │ ...    │ [View Plan]
├──────┼─────┼───────┼────┼────┼────┼────┼────┼─────┼────────┤
│Sofia │5y2m │1y 3mo │... │... │... │... │... │...  │ ...    │ ✓ Set Up
└──────┴─────┴───────┴────┴────┴────┴────┴────┴─────┴────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   ASK GURU      │
                    └────────┬────────┘
                             │
                             ▼
           ┌─────────────────────────────────────┐
           │     GURU RECOMMENDATIONS PANEL      │
           ├─────────────────────────────────────┤
           │ INSIGHT: Emma's high energy...      │
           │                                     │
           │ RECOMMENDED WORKS:                  │
           │ 1. Wet Pouring (PL) ☑              │
           │ 2. Tonging (PL) ☑                  │
           │ 3. Pink Tower guided (SE) ☑        │
           │ 4. Silence Game (PL) ☑             │
           │                                     │
           │ ⚠️ PREREQUISITE: If attempts        │
           │    writing → redirect to tonging   │
           │                                     │
           │ TIMELINE: 2-3 weeks                │
           │                                     │
           │ [Approve & Set Up] [Modify]        │
           └─────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  CHILD'S PROFILE TAB         │
              │  Week of Feb 6 - Feb 12      │
              │                              │
              │  📌 Focus Works:             │
              │  • Wet Pouring               │
              │  • Tonging                   │
              │  • Pink Tower (guided)       │
              │  • Silence Game              │
              │                              │
              │  ⚠️ If writing → tonging    │
              └──────────────────────────────┘
```

---

## 🎤 VOICE INPUT (OPTIONAL FEATURE)

Teacher can click "Voice Input Mode" and speak into any cell.

**Implementation Options:**
1. **Web Speech API** - Built into browser, free, works offline
2. **Whisper API** - More accurate, requires API call

**Recommended:** Start with Web Speech API for MVP.

```typescript
// Basic Web Speech API usage
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  // Set the active cell's value to transcript
};
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Spreadsheet UI (2-3 hours)
- [ ] Create `/app/montree/dashboard/onboarding/page.tsx`
- [ ] Build spreadsheet component with editable cells
- [ ] Connect to `montree_children` table for persistence
- [ ] Add "Time at School" field (use existing `enrolled_at` column)

### Phase 2: Guru Integration (3-4 hours)
- [ ] Create `/api/montree/onboarding/recommend/route.ts`
- [ ] Build prompt that includes all spreadsheet data
- [ ] Structure response: Insight, Works, Prerequisites, Timeline
- [ ] Return checkable work recommendations

### Phase 3: Approval Flow (2-3 hours)
- [ ] Create recommendation review panel
- [ ] Allow teacher to check/uncheck works
- [ ] On approve: Insert works into `montree_child_focus_works`
- [ ] Add prerequisite alerts to child's profile

### Phase 4: Profile Integration (1-2 hours)
- [ ] Show approved works in child's Week tab
- [ ] Display prerequisite warnings prominently
- [ ] Add "Onboarding Plan" section to child profile

### Phase 5: Voice Input (2-3 hours) - OPTIONAL
- [ ] Add microphone button to cells
- [ ] Implement Web Speech API
- [ ] Visual feedback during recording

---

## 📁 FILES TO CREATE

```
app/
├── montree/
│   └── dashboard/
│       └── onboarding/
│           └── page.tsx          # Main onboarding spreadsheet
├── api/
│   └── montree/
│       └── onboarding/
│           ├── route.ts          # CRUD for onboarding data
│           └── recommend/
│               └── route.ts      # Guru recommendations
components/
└── montree/
    ├── OnboardingSpreadsheet.tsx # Spreadsheet component
    ├── GuruRecommendationPanel.tsx # Recommendation display
    └── VoiceInput.tsx            # Voice input component (optional)
```

---

## 🧠 GURU PROMPT STRUCTURE

```
You are a Montessori Guru with deep knowledge of child development.

CHILD PROFILE:
- Name: {name}
- Age: {age}
- Time at School: {timeAtSchool}
- Current Levels:
  - Practical Life: {practicalLife}
  - Sensorial: {sensorial}
  - Math: {math}
  - Language: {language}
  - Cultural: {cultural}
- Temperament: {temperament}
- Teacher's Focus: {teacherFocus}

Based on this profile, recommend 4 specific works for this week.

Consider:
1. What the child is ready for (prerequisites met)
2. Active sensitive periods for their age
3. Teacher's stated focus areas
4. Building on current successes
5. What to redirect them TO if they attempt something too advanced

Respond with:
1. INSIGHT: Brief analysis of child's current state
2. RECOMMENDED WORKS: 4 prioritized works with reasons
3. PREREQUISITE ALERT: What to redirect them to if they attempt X
4. TIMELINE: Expected time to see results
```

---

## 📊 DATABASE CHANGES NEEDED

### Existing Tables to Use:
- `montree_children` - Has `enrolled_at` for time at school ✅
- `montree_child_mental_profiles` - Has temperament ✅
- `montree_child_focus_works` - For approved works ✅

### New Table (Optional):
```sql
CREATE TABLE montree_onboarding_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES montree_children(id),
  created_by UUID REFERENCES montree_teachers(id),
  guru_insight TEXT,
  guru_recommendations JSONB, -- Array of recommended works
  prerequisite_alerts TEXT,
  timeline TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, modified
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 DESIGN MOCKUP

Visual mockup created at: `/mnt/whale/onboarding-mockup.jsx`

Shows:
- Excel-style spreadsheet with colored area columns
- Sample data for 3 students (Emma, Marcus, Sofia)
- Guru recommendation panel with all sections
- Approve/Modify buttons
- Voice input button

---

## ⚠️ KEY CONSIDERATIONS

### Prerequisite Intelligence
The system must know curriculum sequence. When Guru recommends works, it should:
- Check what prerequisites are required
- Warn if child might attempt advanced work (e.g., pencil grip before tonging)
- Provide specific redirect guidance ("If X, redirect to Y")

### Already Built:
- Curriculum sequence is in `montree_classroom_curriculum_works` with proper `sequence` values
- Guru system exists at `/lib/montree/guru/`
- Context builder already gathers child data
- Knowledge retriever pulls from Montessori texts

### Integration Points:
- Use existing Guru infrastructure (`/lib/montree/guru/`)
- Use existing curriculum data (sequence, prerequisites)
- Use existing child profile system (`enrolled_at`, mental profiles)

---

## ✅ SUCCESS CRITERIA

- [ ] Teacher can fill in spreadsheet for all students
- [ ] "Ask Guru" returns intelligent, personalized recommendations
- [ ] Recommendations include prerequisite warnings
- [ ] Teacher can approve with one click
- [ ] Approved works appear in child's profile tab
- [ ] Voice input works (optional stretch goal)

---

*The teacher knows the child. The Guru knows Montessori. Together, magic happens.* 🌳🧠
