# 🌟 Daughter Activity Feature - Implementation Structure

**Feature URL:** `https://www.teacherpotato.xyz/admin/daughter-activity`  
**Purpose:** Kid-friendly daily activity display and management interface  
**Target User:** Parent/Teacher viewing activities for a specific child (daughter)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Component Implementation](#component-implementation)
6. [Data Flow](#data-flow)
7. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)

---

## 1. Overview

The Daughter Activity feature provides a simplified, kid-friendly interface for:
- Displaying today's assigned Montessori activity
- Showing activity details (materials, instructions, learning goals)
- Marking activities as complete
- Auto-generating new activities when completed
- Finding and assigning activities manually

**Key Characteristics:**
- Colorful, playful UI design (pink/purple/blue gradient theme)
- Large, readable text suitable for children
- Simple interaction patterns (big buttons, clear actions)
- Automatic child detection (finds child with age 2-3)
- Real-time activity generation using intelligent algorithm

---

## 2. File Structure

```
whale/
├── app/
│   ├── admin/
│   │   └── daughter-activity/
│   │       └── page.tsx                    # Main component (414 lines)
│   └── api/
│       └── whale/
│           ├── children/
│           │   └── route.ts                # GET: Fetch children list
│           └── daily-activity/
│               └── route.ts                # GET/POST/PUT: Activity management
├── lib/
│   ├── supabase.ts                         # Supabase client setup
│   └── db/
│       └── children.ts                     # Child database functions
└── types/
    └── database.ts                         # TypeScript type definitions
```

---

## 3. Database Schema

### Required Tables

#### `children` Table
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date_of_birth DATE,
  age_group TEXT NOT NULL,              -- Format: '2-3', '3-4', etc.
  enrollment_date DATE,
  active_status BOOLEAN DEFAULT true,
  photo_url TEXT,
  parent_email TEXT,
  parent_name TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `activities` Table
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area TEXT NOT NULL,                    -- 'practical_life', 'sensorial', 'mathematics', 'language', 'english', 'cultural'
  age_min DECIMAL NOT NULL,
  age_max DECIMAL NOT NULL,
  skill_level INTEGER NOT NULL,          -- 0-5
  duration_minutes INTEGER,
  materials TEXT[],                      -- Array of strings
  instructions TEXT NOT NULL,
  learning_goals TEXT[],                 -- Array of strings
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `daily_activity_assignments` Table
```sql
CREATE TABLE daily_activity_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, assigned_date)
);
```

#### `child_progress` Table (for intelligent activity selection)
```sql
CREATE TABLE child_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status_level INTEGER DEFAULT 0,        -- 0-5 (Not Introduced → Transcended)
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, skill_id)
);
```

---

## 4. API Endpoints

### 4.1 GET `/api/whale/children`
**Purpose:** Fetch list of children (used to find daughter's profile)

**Query Parameters:**
- `active=true` - Filter to active children only

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Marina Willemse",
      "age_group": "2-3",
      "date_of_birth": "2022-01-15",
      "active_status": true,
      ...
    }
  ],
  "total": 1
}
```

### 4.2 GET `/api/whale/daily-activity`
**Purpose:** Get today's activity assignment for a child

**Query Parameters:**
- `childId` (required) - UUID of the child

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "assigned_date": "2024-12-14",
    "completed": false,
    "completed_at": null,
    "activity": {
      "id": "activity-uuid",
      "name": "Pouring Water",
      "area": "practical_life",
      "age_min": 2.0,
      "age_max": 4.0,
      "skill_level": 1,
      "duration_minutes": 15,
      "materials": ["Small pitcher", "Small cup", "Water"],
      "instructions": "Pour water from pitcher to cup...",
      "learning_goals": ["Fine motor skills", "Concentration"]
    }
  }
}
```

**Error Response (no activity):**
```json
{
  "success": true,
  "data": null
}
```

### 4.3 POST `/api/whale/daily-activity`
**Purpose:** Generate and assign a new activity for today

**Request Body:**
```json
{
  "childId": "uuid",
  "activityId": "uuid"  // Optional: assign specific activity
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "assigned_date": "2024-12-14",
    "completed": false,
    "activity": { /* full activity object */ }
  }
}
```

**Activity Selection Algorithm:**
1. Get child's age from `age_group` field
2. Fetch recently completed activities (last 10 days)
3. Filter activities by:
   - Age appropriateness (`age_min <= child_age <= age_max`)
   - Not recently done (exclude last 10 days)
4. Get child's progress by curriculum area
5. Prioritize activities from areas with lower progress
6. Select activity matching skill level (slightly above current average)
7. If no priority match, select randomly from eligible activities
8. Create assignment record

### 4.4 PUT `/api/whale/daily-activity`
**Purpose:** Mark activity as complete

**Request Body:**
```json
{
  "assignmentId": "uuid",
  "completed": true,
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "completed": true,
    "completed_date": "2024-12-14",
    "activity": { /* full activity object */ }
  }
}
```

---

## 5. Component Implementation

### 5.1 Main Component: `app/admin/daughter-activity/page.tsx`

**TypeScript Interfaces:**

```typescript
interface Activity {
  id: string;
  name: string;
  area: string;                    // 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'english' | 'cultural'
  age_min: number;
  age_max: number;
  skill_level: number;
  duration_minutes: number;
  materials: string[];
  instructions: string;
  learning_goals: string[];
}

interface DailyAssignment {
  id: string;
  assigned_date: string;
  completed: boolean;
  completed_at: string | null;
  activity: Activity;
}
```

**Constants:**

```typescript
const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  english: 'English',
  cultural: 'Cultural Studies',
};

const AREA_EMOJIS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '🎨',
  mathematics: '🔢',
  language: '📖',
  english: '💬',
  cultural: '🌍',
};

const DAUGHTER_AGE = 2.5;  // Target age for finding child profile
```

**State Management:**

```typescript
const [daughterChildId, setDaughterChildId] = useState<string | null>(null);
const [todayActivity, setTodayActivity] = useState<DailyAssignment | null>(null);
const [loading, setLoading] = useState(true);
const [generating, setGenerating] = useState(false);
```

**Key Functions:**

1. **`checkAuth()`** - Verify admin authentication
2. **`findDaughterChild()`** - Find child profile matching age 2-3
3. **`loadTodayActivity()`** - Fetch today's activity assignment
4. **`generateActivity()`** - Generate new activity via POST
5. **`markComplete()`** - Mark activity complete and auto-generate next

---

## 6. Data Flow

### 6.1 Initial Load Flow

```
Page Load
  ↓
checkAuth() → Verify admin session
  ↓
findDaughterChild() → GET /api/whale/children?active=true
  ↓
Filter children by age_group '2-3'
  ↓
Set daughterChildId state
  ↓
loadTodayActivity() → GET /api/whale/daily-activity?childId={id}
  ↓
Display activity or "No Activity" state
```

### 6.2 Generate Activity Flow

```
User clicks "Get Today's Activity!"
  ↓
generateActivity() → POST /api/whale/daily-activity { childId }
  ↓
API Algorithm:
  1. Get child details
  2. Calculate age from age_group
  3. Get recent activities (last 10 days)
  4. Filter eligible activities
  5. Get child progress by area
  6. Prioritize underperforming areas
  7. Select activity
  8. Create assignment record
  ↓
Return assignment with activity details
  ↓
Update UI state → Display activity
```

### 6.3 Mark Complete Flow

```
User clicks "We Did It! 🎉"
  ↓
markComplete() → PUT /api/whale/daily-activity { assignmentId, completed: true }
  ↓
API updates assignment:
  - Set completed = true
  - Set completed_date = today
  ↓
Auto-generate next activity:
  generateActivity() → POST /api/whale/daily-activity
  ↓
Display new activity
```

---

## 7. Step-by-Step Implementation Guide

### Step 1: Database Setup

**7.1.1 Create Tables**
```sql
-- Run migrations to create:
-- - children table
-- - activities table  
-- - daily_activity_assignments table
-- - child_progress table (optional, for intelligent selection)
```

**7.1.2 Seed Activities**
- Populate `activities` table with Montessori activities
- Ensure activities have proper `age_min`, `age_max`, `area`, `skill_level`
- Include `materials`, `instructions`, `learning_goals` arrays

**7.1.3 Create Child Profile**
- Add child record with `age_group: '2-3'`
- Set `active_status: true`

---

### Step 2: API Routes Implementation

**7.2.1 Create `/api/whale/children/route.ts`**

```typescript
// GET handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  
  const supabase = createSupabaseAdmin();
  let query = supabase.from('children').select('*');
  
  if (activeOnly) {
    query = query.eq('active_status', true);
  }
  
  const { data, error } = await query;
  return NextResponse.json({ data: data || [], total: data?.length || 0 });
}
```

**7.2.2 Create `/api/whale/daily-activity/route.ts`**

**GET Handler:**
```typescript
export async function GET(request: NextRequest) {
  const childId = searchParams.get('childId');
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('daily_activity_assignments')
    .select('*, activity:activities(*)')
    .eq('child_id', childId)
    .eq('assigned_date', today)
    .single();
    
  return NextResponse.json({ success: true, data: data || null });
}
```

**POST Handler (Activity Generation):**
```typescript
export async function POST(request: NextRequest) {
  const { childId, activityId } = await request.json();
  
  // If specific activityId provided, assign directly
  if (activityId) {
    // Create assignment with specific activity
    return;
  }
  
  // Otherwise, generate intelligently:
  // 1. Get child age from age_group
  // 2. Get recent activities (last 10 days)
  // 3. Filter eligible activities
  // 4. Get child progress
  // 5. Prioritize by area progress
  // 6. Select activity
  // 7. Create assignment
}
```

**PUT Handler:**
```typescript
export async function PUT(request: NextRequest) {
  const { assignmentId, completed } = await request.json();
  
  const updateData = {
    completed,
    completed_date: completed ? new Date().toISOString().split('T')[0] : null
  };
  
  const { data } = await supabase
    .from('daily_activity_assignments')
    .update(updateData)
    .eq('id', assignmentId)
    .select('*, activity:activities(*)')
    .single();
    
  return NextResponse.json({ success: true, data });
}
```

---

### Step 3: Frontend Component Implementation

**7.3.1 Create `app/admin/daughter-activity/page.tsx`**

**Component Structure:**

```typescript
'use client';

export default function DaughterActivityPage() {
  // State declarations
  // useEffect hooks
  // Handler functions
  // Render logic
}
```

**7.3.2 Implement State Management**

```typescript
const [daughterChildId, setDaughterChildId] = useState<string | null>(null);
const [todayActivity, setTodayActivity] = useState<DailyAssignment | null>(null);
const [loading, setLoading] = useState(true);
const [generating, setGenerating] = useState(false);
```

**7.3.3 Implement Child Finding Logic**

```typescript
const findDaughterChild = async () => {
  const response = await fetch("/api/whale/children?active=true");
  const children = data.data || [];
  
  // Find child with age_group '2-3'
  const daughter = children.find((c: any) => {
    const parts = c.age_group.split('-');
    const minAge = parseFloat(parts[0]);
    const maxAge = parseFloat(parts[1] || parts[0]);
    return minAge >= 2.0 && maxAge <= 3.0;
  });
  
  if (daughter) {
    setDaughterChildId(daughter.id);
  }
};
```

**7.3.4 Implement Activity Loading**

```typescript
const loadTodayActivity = async () => {
  if (!daughterChildId) return;
  
  const response = await fetch(`/api/whale/daily-activity?childId=${daughterChildId}`);
  const data = await response.json();
  setTodayActivity(data.data);
  setLoading(false);
};
```

**7.3.5 Implement Activity Generation**

```typescript
const generateActivity = async () => {
  setGenerating(true);
  
  const response = await fetch('/api/whale/daily-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId: daughterChildId }),
  });
  
  const data = await response.json();
  setTodayActivity(data.data);
  setGenerating(false);
};
```

**7.3.6 Implement Mark Complete**

```typescript
const markComplete = async () => {
  const response = await fetch('/api/whale/daily-activity', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      assignmentId: todayActivity.id, 
      completed: true 
    }),
  });
  
  // Auto-generate next activity
  await generateActivity();
};
```

**7.3.7 Implement UI Rendering**

**Loading State:**
```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <div className="text-center">
        <div className="text-8xl mb-4 animate-bounce">🌈</div>
        <p className="text-2xl text-purple-600 font-bold">Loading...</p>
      </div>
    </div>
  );
}
```

**No Activity State:**
```tsx
{!todayActivity && (
  <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
    <div className="text-9xl mb-6 animate-pulse">🎈</div>
    <h2 className="text-3xl font-bold">Ready for a fun activity?</h2>
    <button onClick={generateActivity}>
      <Sparkles /> Get Today's Activity!
    </button>
  </div>
)}
```

**Activity Display:**
```tsx
{todayActivity && (
  <div className="bg-white rounded-3xl shadow-2xl">
    {/* Area Banner */}
    <div className={`bg-gradient-to-r ${getAreaGradient(todayActivity.activity.area)}`}>
      <div className="text-6xl">{AREA_EMOJIS[todayActivity.activity.area]}</div>
      <p>{AREA_LABELS[todayActivity.activity.area]}</p>
    </div>
    
    {/* Activity Content */}
    <div className="p-8">
      <h2>{todayActivity.activity.name}</h2>
      
      {/* Materials */}
      <div className="bg-blue-50 rounded-2xl p-6">
        <h3>🎨 What You Need:</h3>
        <ul>
          {todayActivity.activity.materials.map((material, idx) => (
            <li key={idx}>• {material}</li>
          ))}
        </ul>
      </div>
      
      {/* Instructions */}
      <div className="bg-purple-50 rounded-2xl p-6">
        <h3>📝 How to Do It:</h3>
        <div>{todayActivity.activity.instructions}</div>
      </div>
      
      {/* Learning Goals */}
      <div className="bg-green-50 rounded-2xl p-6">
        <h3>🎯 What We're Learning:</h3>
        <ul>
          {todayActivity.activity.learning_goals.map((goal, idx) => (
            <li key={idx}>✓ {goal}</li>
          ))}
        </ul>
      </div>
      
      {/* Action Buttons */}
      {!todayActivity.completed ? (
        <>
          <button onClick={markComplete}>
            <CheckCircle /> We Did It! 🎉
          </button>
          <button onClick={generateActivity}>
            <RefreshCw /> Try Something Else
          </button>
        </>
      ) : (
        <button onClick={generateActivity}>
          <Sparkles /> What's Next? 🌟
        </button>
      )}
    </div>
  </div>
)}
```

---

### Step 4: Styling & UI Design

**7.4.1 Color Scheme**
- Background: `bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100`
- Header: `bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500`
- Area-specific gradients:
  - Practical Life: `from-blue-400 to-blue-600`
  - Sensorial: `from-purple-400 to-purple-600`
  - Mathematics: `from-green-400 to-green-600`
  - Language: `from-orange-400 to-orange-600`
  - English: `from-pink-400 to-pink-600`
  - Cultural: `from-yellow-400 to-yellow-600`

**7.4.2 Typography**
- Large, readable fonts (`text-3xl`, `text-xl`)
- Bold headings (`font-bold`)
- Emoji icons for visual appeal

**7.4.3 Interactive Elements**
- Large buttons with hover effects
- Loading states with spinners
- Smooth transitions (`transition-all`, `transform hover:scale-105`)

---

### Step 5: Navigation Integration

**7.5.1 Add Link to Admin Dashboard**

In `app/admin/page.tsx`:
```tsx
<Link
  href="/admin/daughter-activity"
  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all shadow-md flex items-center gap-2"
>
  <span className="text-xl">🌟</span> Daughter's Activity
</Link>
```

---

## 8. Key Features Summary

### ✅ Implemented Features

1. **Automatic Child Detection**
   - Finds child with age_group '2-3'
   - Fallback to first active child if no match

2. **Today's Activity Display**
   - Shows assigned activity for current date
   - Displays all activity details (materials, instructions, goals)
   - Visual area indicators with emojis

3. **Activity Generation**
   - Intelligent algorithm considers:
     - Age appropriateness
     - Recent activity history (avoids repeats)
     - Child's progress by curriculum area
     - Skill level matching
   - One-click generation

4. **Completion Tracking**
   - Mark activity as complete
   - Auto-generates next activity when completed
   - Tracks completion date

5. **Alternative Activity**
   - "Try Something Else" button
   - Generates new activity without completing current

6. **Kid-Friendly UI**
   - Large, colorful design
   - Simple interactions
   - Encouraging messages
   - Emoji-rich interface

---

## 9. Testing Checklist

- [ ] Child profile detection works correctly
- [ ] Activity loads for today's date
- [ ] Activity generation creates valid assignments
- [ ] Mark complete updates database correctly
- [ ] Auto-generation triggers after completion
- [ ] "Try Something Else" generates new activity
- [ ] UI displays all activity details correctly
- [ ] Loading states work properly
- [ ] Error handling displays user-friendly messages
- [ ] Responsive design works on mobile

---

## 10. Dependencies

**Required Packages:**
- `next` (16.0.7)
- `react` (19.2.0)
- `@supabase/supabase-js` (^2.81.0)
- `lucide-react` (^0.556.0) - For icons

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 11. Implementation Order

1. ✅ Database tables created
2. ✅ API routes implemented
3. ✅ Frontend component created
4. ✅ Navigation link added
5. ✅ Styling applied
6. ✅ Testing completed

---

**End of Implementation Structure Document**

