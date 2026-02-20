# WBC (Web Browser Claude) Briefing Document
## Whale Platform - Montree Progress System Upgrade

**Date:** January 10, 2026  
**Project:** Whale (teacherpotato.xyz)  
**Purpose:** Parallel development tasks for Montree progress visualization system

---

## OVERVIEW

You are a Web Browser Claude (WBC) assigned to write production-ready code for the Whale platform. Your code will be reviewed and integrated by the coordination team using Cursor. Write complete, working code - not pseudocode or outlines.

---

## TECH STACK

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5.9 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Cookie-based sessions |
| State | React hooks, localStorage for persistence |
| Real-time | Supabase Realtime subscriptions |

---

## PROJECT STRUCTURE

```
whale/
├── app/
│   ├── admin/           # Admin dashboard pages
│   │   └── montree/     # Montree admin interface
│   ├── principal/       # Principal portal
│   │   └── classrooms/[id]/  # Classroom management
│   ├── teacher/         # Teacher portal
│   │   └── progress/    # Progress tracking
│   ├── parent/          # Parent portal
│   ├── games/           # Educational games
│   └── api/             # API routes
│       ├── montree/     # Montree API endpoints
│       ├── teacher/     # Teacher API endpoints
│       └── whale/       # Core Whale APIs
├── components/          # Shared React components
├── lib/
│   ├── montree/         # Montree business logic
│   │   ├── curriculum-data.ts  # Curriculum loader
│   │   ├── db.ts        # Database operations
│   │   └── types.ts     # TypeScript interfaces
│   └── supabase/        # Supabase client setup
└── public/              # Static assets
```

---

## DATABASE SCHEMA (Relevant Tables)

### `montree_children`
```sql
id: uuid PRIMARY KEY
name: text NOT NULL
age: integer
notes: text
created_at: timestamp
```

### `children`
```sql
id: uuid PRIMARY KEY
name: text NOT NULL
date_of_birth: date
age_group: text  -- '2-3', '3-4', '4-5', '5-6'
photo_url: text
classroom_id: uuid REFERENCES classrooms(id)
active_status: boolean DEFAULT true
```

### `child_work_completion`
```sql
id: uuid PRIMARY KEY
child_id: uuid REFERENCES children(id)
curriculum_work_id: uuid NOT NULL
work_id: text  -- String ID for Montree works
status: text  -- 'in_progress', 'completed', 'mastered'
current_level: integer DEFAULT 0
started_at: timestamp
completed_at: timestamp
completion_date: date
notes: text
```

### `classrooms`
```sql
id: uuid PRIMARY KEY
school_id: uuid REFERENCES schools(id)
name: text NOT NULL
age_group: text
teacher_id: uuid
```

---

## CURRICULUM STRUCTURE

The Montessori curriculum has 5 areas, each with categories containing sequential works:

```typescript
interface CurriculumArea {
  id: string;           // 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'
  name: string;         // 'Practical Life', etc.
  icon: string;         // Emoji
  color: string;        // Hex color
  categories: Category[];
}

interface Category {
  id: string;
  name: string;
  works: Work[];        // Sequential - order matters!
}

interface Work {
  id: string;           // Unique work ID
  name: string;
  description: string;
  ageRange: string;     // '3-4', '3-6', etc.
  levels: Level[];      // Usually 3 levels per work
  prerequisites: string[];
}
```

### Status Progression
```
0 = Not Started (gray)
1 = Presented (yellow) 
2 = Practicing (blue)
3 = Mastered (green)
```

---

## EXISTING API PATTERNS

### Fetch Pattern (API Routes)
```typescript
// app/api/example/route.ts
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('table_name')
      .select('*');
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Client Component Pattern
```typescript
'use client';

import { useState, useEffect } from 'react';

export default function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/endpoint')
      .then(res => res.json())
      .then(data => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  return <div>{/* content */}</div>;
}
```

---

## WBC TASK ASSIGNMENTS

Each WBC should complete their assigned task and output the complete file(s).

---

### WBC-1: StudentProgressBars Component

**File to create:** `components/progress/StudentProgressBars.tsx`

**Requirements:**
- Horizontal progress bar for each of the 5 curriculum areas
- Each bar shows the child's current position in that area's curriculum
- Works are small tick marks along the bar
- Current work position is highlighted with a marker
- Status colors: gray (not started), yellow (presented), blue (practicing), green (mastered)
- Responsive design (mobile-first)
- Click on area expands to show category breakdown

**Props Interface:**
```typescript
interface StudentProgressBarsProps {
  childId: string;
  childName: string;
  progressData: AreaProgressData[];
  onWorkClick?: (workId: string, areaId: string) => void;
}

interface AreaProgressData {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentWorkIndex: number;  // 0-based index of furthest work in progress
  currentWorkName: string;
  worksStatus: WorkStatusItem[];  // Status of each work in sequence
}

interface WorkStatusItem {
  workId: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  categoryName: string;
}
```

**Visual Design:**
```
┌─────────────────────────────────────────────────────────┐
│ 🧹 Practical Life                          12/45 works │
│ ═══════════════●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│               ▲ Pouring - Dry                          │
├─────────────────────────────────────────────────────────┤
│ 👁️ Sensorial                               8/38 works  │
│ ════════●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│        ▲ Pink Tower                                    │
└─────────────────────────────────────────────────────────┘

Legend: ═ completed  ● current  ━ not started
```

---

### WBC-2: Progress Summary API Endpoint

**File to create:** `app/api/whale/student/[studentId]/progress-summary/route.ts`

**Requirements:**
- GET endpoint returns complete progress summary for a student
- Calculates current position in each curriculum area
- Returns data structured for StudentProgressBars component
- Efficient single query with joins

**Response Format:**
```typescript
interface ProgressSummaryResponse {
  childId: string;
  childName: string;
  lastUpdated: string;
  overallProgress: {
    totalWorks: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
  areas: AreaProgressData[];  // Same as WBC-1 interface
}
```

**Logic for calculating "current position":**
1. For each area, get all works in sequence order
2. Find the furthest work that has status > 0
3. That work's index is the current position
4. If no works started, position is 0

---

### WBC-3: Unified Principal Classroom Page

**File to create:** `app/principal/classrooms/[id]/page.tsx` (replacement)

**Requirements:**
- Single page showing all students in classroom
- Grid of student cards with photo/avatar
- Each card shows mini progress summary (5 colored dots for areas)
- "+ Add Student" button in the grid (not separate)
- Click student → opens StudentProgressBars modal/panel
- Role testing banner (existing functionality preserved)

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│ ← Back to Dashboard          🐼 Panda Class           │
│                              Ages 3-6 • 12 students    │
├────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│ │  👶     │ │  👶     │ │  👶     │ │   +     │      │
│ │  Emma   │ │  Liam   │ │  Sofia  │ │  Add    │      │
│ │ ●●●●○   │ │ ●●○○○   │ │ ●●●●●   │ │ Student │      │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│ │  👶     │ │  👶     │ │  👶     │                  │
│ │  Noah   │ │  Ava    │ │  Oliver │                  │
│ │ ●○○○○   │ │ ●●●○○   │ │ ●●●●○   │                  │
│ └─────────┘ └─────────┘ └─────────┘                  │
└────────────────────────────────────────────────────────┘

● = area with progress  ○ = area not started
```

**When student clicked:**
- Slide-in panel from right (or modal) showing full StudentProgressBars
- Include student name, age, photo at top
- "View in Teacher Mode" button links to teacher progress page

---

### WBC-4: Real-time Progress Hook

**File to create:** `lib/hooks/useStudentProgressRealtime.ts`

**Requirements:**
- Custom React hook for real-time progress updates
- Uses Supabase Realtime subscriptions
- Automatically updates when `child_work_completion` changes
- Cleans up subscription on unmount
- Returns loading state, error state, and data

**Interface:**
```typescript
function useStudentProgressRealtime(studentId: string | null): {
  progress: ProgressSummaryResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Implementation notes:**
- Subscribe to `child_work_completion` table changes WHERE child_id = studentId
- On INSERT/UPDATE/DELETE, refetch full progress summary
- Debounce rapid updates (100ms)

---

### WBC-5: Games System Audit

**File to create:** `GAMES_AUDIT_REPORT.md`

**Requirements:**
- Test each game route in `/app/games/`
- Document for each game:
  - Route path
  - Current status (working/broken/partial)
  - What works
  - What's broken
  - Console errors (if any)
  - Fix complexity estimate (easy/medium/hard)

**Games to audit:**
1. `/games/sound-games/beginning`
2. `/games/sound-games/ending`
3. `/games/sound-games/middle`
4. `/games/sound-games/blending`
5. `/games/sound-games/segmenting`
6. `/games/combined-i-spy`
7. `/games/word-builder`
8. `/games/vocabulary-builder`
9. `/games/grammar-symbols`
10. `/games/letter-sounds`
11. `/games/letter-match`
12. `/games/letter-tracer`
13. `/games/sentence-builder`
14. `/games/sentence-match`

**Report format:**
```markdown
## Game: [Name]
- **Route:** /games/xxx
- **Status:** ✅ Working | ⚠️ Partial | ❌ Broken
- **Description:** What the game does
- **Issues Found:**
  - Issue 1
  - Issue 2
- **Console Errors:** (paste any)
- **Fix Estimate:** Easy/Medium/Hard
- **Notes:** Any additional context
```

---

## IMPORTANT GUIDELINES

### Do:
- Write complete, production-ready code
- Use TypeScript with proper types
- Follow existing patterns in the codebase
- Include error handling
- Add loading states
- Make it mobile-responsive
- Use Tailwind CSS for styling

### Don't:
- Use `any` type (use `unknown` or proper interfaces)
- Leave TODO comments
- Write pseudocode
- Skip error handling
- Forget 'use client' directive for client components

### Naming Conventions:
- Components: PascalCase (`StudentProgressBars.tsx`)
- Hooks: camelCase with `use` prefix (`useStudentProgressRealtime.ts`)
- API routes: kebab-case folders (`progress-summary/route.ts`)
- Interfaces: PascalCase with descriptive names

---

## CURRICULUM AREA REFERENCE

```typescript
const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
];

const STATUS_COLORS = {
  not_started: { fill: '#e5e7eb', border: '#9ca3af', text: '#6b7280' },
  in_progress: { fill: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  practicing: { fill: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  completed: { fill: '#d1fae5', border: '#10b981', text: '#065f46' },
};
```

---

## OUTPUT INSTRUCTIONS

When you complete your task:

1. Output the complete file contents in a code block
2. Specify the exact file path at the top
3. Include any additional files needed (e.g., types file)
4. Note any dependencies that need to be installed
5. List any environment variables required

---

## QUESTIONS?

If your assigned task is unclear, output your assumptions and proceed with your best interpretation. The coordination team will adjust if needed.

**Remember:** Write complete, working code. Your output will be directly integrated into the codebase.
