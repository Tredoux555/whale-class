# 🧠 MONTREE AI ANALYST - Implementation Game Plan

## Executive Summary

Build an AI-powered child development analysis system that:
1. Shows ONE work per area with spinner wheel selection
2. Analyzes weekly progress like a master Montessorian
3. Generates three report types: Teacher, Parent, AI Analysis
4. Recommends next works based on sensitive periods + readiness

---

## PHASE 1: Database Schema Updates (2 hours)

### 1.1 New Tables

```sql
-- Child sensitive period tracking
CREATE TABLE montree_child_sensitive_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES montree_children(id) ON DELETE CASCADE,
  sensitive_period TEXT NOT NULL, -- 'order', 'language', 'movement', 'sensory', 'small_objects', 'social', 'writing', 'reading', 'math'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 100),
  evidence JSONB, -- {"work_patterns": [...], "teacher_notes": [...]}
  status TEXT DEFAULT 'active' CHECK (status IN ('emerging', 'active', 'waning', 'passed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly AI analysis cache
CREATE TABLE montree_weekly_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES montree_children(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Work distribution
  area_distribution JSONB, -- {"practical_life": 0.35, "sensorial": 0.25, ...}
  expected_distribution JSONB, -- Based on age
  
  -- Concentration metrics
  avg_duration_minutes DECIMAL(5,2),
  expected_duration_minutes DECIMAL(5,2),
  concentration_score INTEGER CHECK (concentration_score BETWEEN 1 AND 100),
  
  -- Pattern analysis
  repetition_patterns JSONB, -- Works repeated 3+ times
  avoidance_patterns JSONB, -- Areas avoided
  breakthrough_indicators JSONB, -- Signs of mastery/progress
  
  -- Sensitive period detection
  active_sensitive_periods TEXT[],
  sensitive_period_evidence JSONB,
  
  -- Concerns & flags
  red_flags JSONB, -- Concerning patterns
  yellow_flags JSONB, -- Monitor closely
  
  -- Recommendations
  recommended_works JSONB, -- [{work_id, score, reason}, ...]
  recommended_areas TEXT[],
  teacher_suggestions TEXT[],
  
  -- AI-generated narratives
  teacher_summary TEXT,
  parent_summary TEXT,
  psychological_profile TEXT,
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, week_start)
);

-- Active work per area (for focus mode)
CREATE TABLE montree_child_focus_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES montree_children(id) ON DELETE CASCADE,
  area TEXT NOT NULL, -- 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'
  work_id UUID REFERENCES montree_classroom_curriculum_works(id),
  work_name TEXT NOT NULL,
  set_at TIMESTAMPTZ DEFAULT NOW(),
  set_by UUID, -- teacher_id
  UNIQUE(child_id, area)
);
```

### 1.2 Add columns to existing tables

```sql
-- Add to montree_child_progress
ALTER TABLE montree_child_progress ADD COLUMN IF NOT EXISTS
  duration_minutes INTEGER,
  repetition_count INTEGER DEFAULT 1,
  concentration_quality TEXT CHECK (concentration_quality IN ('deep', 'moderate', 'distracted', 'abandoned')),
  self_corrected BOOLEAN DEFAULT false,
  help_requested INTEGER DEFAULT 0,
  completed_cycle BOOLEAN DEFAULT true;

-- Add to montree_sessions (observation notes)
ALTER TABLE montree_sessions ADD COLUMN IF NOT EXISTS
  emotional_state TEXT, -- 'joyful', 'calm', 'frustrated', 'anxious', 'neutral'
  social_interaction TEXT, -- 'independent', 'parallel', 'collaborative', 'sought_help', 'helped_peer'
  ai_extracted_keywords TEXT[];
```

---

## PHASE 2: Focus Mode UI - Spinner Wheel (3 hours)

### 2.1 New Component: AreaSpinnerWheel

Location: `/components/montree/AreaSpinnerWheel.tsx`

```tsx
// iOS-style picker wheel for selecting works within an area
interface AreaSpinnerWheelProps {
  area: string;
  areaIcon: string;
  works: CurriculumWork[];
  currentWorkId: string | null;
  onSelect: (work: CurriculumWork) => void;
  onClose: () => void;
}
```

**Behavior:**
- Long-press on area emoji triggers wheel
- Wheel pre-scrolls to current work
- Swipe up/down to scroll through works
- Haptic feedback on iOS
- Tap outside or "Done" to confirm
- Animates in from bottom (sheet style)

### 2.2 Updated Child Dashboard Layout

Location: `/app/montree/dashboard/[childId]/page.tsx`

**New layout:**
```
┌─────────────────────────────────────┐
│  [Header: Child Name + Photo]       │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ 🧹      │  │ 👁️      │          │
│  │ Pouring │  │ Pink    │          │
│  │   [P]   │  │ Tower   │          │
│  │         │  │   [Pr]  │          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────┐ │
│  │ 🔢      │  │ 📚      │  │ 🌍  │ │
│  │ Number  │  │ Sandp.  │  │ Map │ │
│  │ Rods    │  │ Letters │  │     │ │
│  │   [—]   │  │   [M]   │  │ [—] │ │
│  └─────────┘  └─────────┘  └─────┘ │
│                                     │
├─────────────────────────────────────┤
│  [+ Add Work] [📊 Weekly Review]    │
└─────────────────────────────────────┘
```

**Interactions:**
- Tap status badge → cycle status (same as before)
- Long-press area emoji → spinner wheel opens
- Tap card body → expand for notes/actions
- Empty area shows "+" to add first work

### 2.3 API Endpoint: Focus Works

Location: `/api/montree/focus-works/route.ts`

```typescript
// GET: Get current focus works for child
// POST: Set focus work for area
// Returns: { area: work } mapping
```

---

## PHASE 3: AI Analysis Engine (4 hours)

### 3.1 Core Analysis Module

Location: `/lib/montree/ai/weekly-analyzer.ts`

```typescript
interface WeeklyAnalysisInput {
  child: {
    id: string;
    name: string;
    date_of_birth: string; // For age calculation
    enrollment_date: string;
  };
  progress: ProgressRecord[]; // All work this week
  sessions: SessionNote[]; // Teacher observations
  historical: {
    last_4_weeks: ProgressRecord[];
    sensitive_periods: SensitivePeriodRecord[];
  };
}

interface WeeklyAnalysisOutput {
  // Metrics
  area_distribution: Record<string, number>;
  concentration_score: number;
  
  // Patterns
  sensitive_periods: {
    period: string;
    status: 'emerging' | 'active' | 'waning';
    confidence: number;
    evidence: string[];
  }[];
  
  // Flags
  red_flags: { issue: string; evidence: string; recommendation: string }[];
  yellow_flags: { issue: string; evidence: string; recommendation: string }[];
  
  // Recommendations
  next_works: {
    work_id: string;
    work_name: string;
    area: string;
    score: number;
    reasons: string[];
  }[];
  
  // Narratives
  teacher_summary: string;
  parent_summary: string;
  psychological_profile: string;
}
```

### 3.2 Sensitive Period Detection Algorithm

```typescript
function detectSensitivePeriods(
  age_years: number,
  work_patterns: WorkPattern[],
  notes: string[]
): SensitivePeriod[] {
  
  const SENSITIVE_PERIOD_SIGNALS = {
    order: {
      age_range: [0, 5],
      peak_age: 2,
      work_indicators: ['sorting', 'sequencing', 'routine'],
      note_keywords: ['upset when changed', 'insists on', 'notices when moved', 'routine']
    },
    language: {
      age_range: [0, 6],
      peak_age: 3.5,
      work_indicators: ['sandpaper_letters', 'movable_alphabet', 'nomenclature', 'sound_games'],
      note_keywords: ['vocabulary explosion', 'asks what', 'fascinated by letters', 'talking constantly']
    },
    // ... etc for all 11 periods
  };
  
  // Score each period based on:
  // 1. Age alignment (is child in window?)
  // 2. Work choice frequency (gravitating toward related materials?)
  // 3. Repetition intensity (repeating related works?)
  // 4. Note keyword matches
  // 5. Duration patterns (longer engagement = stronger signal)
}
```

### 3.3 Recommendation Scoring Algorithm

```typescript
function scoreWorkRecommendations(
  child: Child,
  available_works: Work[],
  sensitive_periods: SensitivePeriod[],
  recent_progress: Progress[],
  area_distribution: Record<string, number>
): ScoredWork[] {
  
  return available_works
    .filter(w => hasPrerequisites(child, w))
    .map(work => {
      let score = 0;
      const reasons: string[] = [];
      
      // Interest alignment (40 points max)
      if (isInRecentInterestArea(work, recent_progress)) {
        score += 40;
        reasons.push('Aligns with current interests');
      }
      
      // Sensitive period match (35 points max)
      const matchingPeriod = sensitive_periods.find(sp => 
        sp.status === 'active' && workMatchesPeriod(work, sp)
      );
      if (matchingPeriod) {
        score += 35;
        reasons.push(`Matches active ${matchingPeriod.period} sensitive period`);
      }
      
      // Curriculum sequence (25 points max)
      if (isNextInSequence(work, recent_progress)) {
        score += 25;
        reasons.push('Next logical step in curriculum');
      }
      
      // Gap filling (25 points max)
      const daysSinceArea = getDaysSinceAreaWork(work.area, recent_progress);
      if (daysSinceArea > 14) {
        score += 15;
        reasons.push(`${work.area} needs attention (${daysSinceArea} days)`);
      }
      if (daysSinceArea > 28) {
        score += 10;
        reasons.push('Critical gap in curriculum coverage');
      }
      
      return { work, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
```

### 3.4 Note Keyword Extraction

```typescript
const KEYWORD_PATTERNS = {
  concentration_positive: [
    /repeated?\s*(\d+)\s*times?/i,
    /deep(ly)?\s*(engaged?|focus|concentration)/i,
    /uninterrupted\s*for\s*(\d+)/i,
    /absorbed\s*in/i,
    /wouldn't stop/i
  ],
  concentration_negative: [
    /distracted/i,
    /wandered/i,
    /couldn't\s*focus/i,
    /left\s*work\s*incomplete/i,
    /abandoned/i
  ],
  emotional_positive: [
    /joyful/i,
    /proud/i,
    /satisfied/i,
    /peaceful/i,
    /calm/i
  ],
  emotional_negative: [
    /frustrated/i,
    /upset/i,
    /anxious/i,
    /cried/i,
    /tantrum/i
  ],
  social_positive: [
    /helped\s*(a\s*)?peer/i,
    /taught\s*younger/i,
    /collaborative/i,
    /shared/i
  ],
  breakthrough: [
    /first\s*time/i,
    /finally/i,
    /explosion/i,
    /mastered/i,
    /self[- ]?correct/i
  ]
};
```

---

## PHASE 4: Three Report Types (3 hours)

### 4.1 Teacher Report

**Content:**
- Full work list with status, duration, repetitions
- Concentration metrics with benchmarks for age
- Sensitive period analysis with evidence
- Area distribution chart vs expected
- Red/yellow flags with specific recommendations
- Next work recommendations with reasoning
- Historical trend (4-week comparison)

**Format:** Detailed, data-rich, professional

### 4.2 Parent Report

**Content:**
- Child's photo + warm greeting
- Highlights of the week (2-3 accomplishments)
- Works by area with parent-friendly descriptions
- "Why it matters" for each work
- Photos from the week
- "At home" suggestions
- Encouraging closing

**Format:** Warm, accessible, celebratory

### 4.3 AI Analysis Report

**Content:**
- Psychological profile summary
- Sensitive period assessment
- Developmental trajectory analysis
- Specific concerns with evidence
- Detailed recommendations for next 2 weeks
- Questions for teacher to observe
- Suggested parent communication points

**Format:** Clinical but actionable, for teacher's eyes only

### 4.2 API Endpoint: Generate Reports

Location: `/api/montree/reports/generate/route.ts`

```typescript
// POST body:
{
  child_id: string;
  week_start: string;
  week_end: string;
  report_types: ('teacher' | 'parent' | 'ai_analysis')[];
}

// Returns:
{
  success: true;
  reports: {
    teacher?: TeacherReport;
    parent?: ParentReport;
    ai_analysis?: AIAnalysisReport;
  };
  analysis_id: string; // Reference to cached analysis
}
```

---

## PHASE 5: UI Integration (2 hours)

### 5.1 Weekly Review Page

Location: `/app/montree/dashboard/[childId]/weekly-review/page.tsx`

**Features:**
- Date range selector (week picker)
- Tab bar: Overview | Teacher | Parent | AI
- Each tab renders appropriate report
- Print/PDF export for each
- Share button for parent report

### 5.2 AI Insights Panel

Add to child dashboard as collapsible section:
- "🧠 AI Insights" header
- Active sensitive periods badges
- Top 3 recommendations
- Any red/yellow flags
- "View Full Analysis" link

---

## PHASE 6: Cron Job for Weekly Analysis (1 hour)

### 6.1 Scheduled Analysis Generation

Location: `/api/cron/weekly-analysis/route.ts`

**Schedule:** Every Sunday at 6 PM local time

**Process:**
1. Get all active children
2. For each child, run analysis for past week
3. Cache results in `montree_weekly_analysis`
4. Flag any red flags for teacher notification
5. Pre-generate parent reports (draft status)

---

## Implementation Order

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Database schema updates | 2h | 🔴 Critical |
| 2.1 | AreaSpinnerWheel component | 2h | 🔴 Critical |
| 2.2 | Focus mode dashboard layout | 1h | 🔴 Critical |
| 3.1 | Core analysis module | 2h | 🟡 High |
| 3.2 | Sensitive period detection | 1h | 🟡 High |
| 3.3 | Recommendation scoring | 1h | 🟡 High |
| 4.1 | Teacher report template | 1h | 🟡 High |
| 4.2 | Parent report template | 1h | 🟡 High |
| 4.3 | AI analysis report | 1h | 🟢 Medium |
| 5.1 | Weekly review page | 1.5h | 🟢 Medium |
| 5.2 | AI insights panel | 0.5h | 🟢 Medium |
| 6 | Cron job setup | 1h | 🟢 Medium |

**Total: ~15 hours**

---

## File Structure

```
/lib/montree/
  /ai/
    weekly-analyzer.ts      # Core analysis engine
    sensitive-periods.ts    # Period detection
    recommendation-engine.ts # Work scoring
    note-parser.ts          # Keyword extraction
    prompts.ts              # AI prompt templates
  /reports/
    teacher-report.ts       # Teacher report generator
    parent-report.ts        # Parent report generator
    ai-analysis-report.ts   # AI analysis generator

/components/montree/
  AreaSpinnerWheel.tsx      # iOS-style picker
  FocusModeCard.tsx         # Single area work card
  AIInsightsPanel.tsx       # Dashboard insights
  WeeklyReviewTabs.tsx      # Report tab navigation

/app/montree/dashboard/[childId]/
  page.tsx                  # Updated for focus mode
  weekly-review/
    page.tsx                # Full weekly review
```

---

## Success Metrics

1. **Focus Mode:** Teachers can switch works in <2 seconds
2. **AI Accuracy:** 80%+ agreement with teacher assessments
3. **Parent Engagement:** 2x report views vs current
4. **Teacher Time Saved:** 30 min/week on report writing

---

## Next Steps

1. Review and approve this plan
2. Run database migrations
3. Build AreaSpinnerWheel component
4. Implement focus mode dashboard
5. Build AI analysis engine
6. Create report templates
7. Test with real classroom data
