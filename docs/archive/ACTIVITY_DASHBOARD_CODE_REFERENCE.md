# Activity Dashboard - Code Reference

## Quick Integration Guide

### How to Access the Dashboard

```typescript
// From any page, principals can navigate to:
/montree/admin/activity

// The page will check authentication using:
localStorage.getItem('montree_school')
localStorage.getItem('montree_principal')
```

## API Endpoint Details

### Endpoint: GET `/api/montree/admin/activity`

**Request:**
```bash
curl -X GET http://localhost:3000/api/montree/admin/activity \
  -H "x-school-id: school-uuid-here" \
  -H "x-principal-id: principal-uuid-here"
```

**Response Structure:**
```json
{
  "success": true,
  "teacher_activity": [
    {
      "teacher_id": "uuid",
      "teacher_name": "Jane Smith",
      "teacher_email": "jane@school.edu",
      "photos_this_week": 12,
      "photos_this_month": 45,
      "work_updates_this_week": 8,
      "work_updates_this_month": 32,
      "observations_this_week": 5,
      "sessions_this_week": 10,
      "last_active_at": "2025-02-02T14:30:00Z",
      "last_activity_type": "photo"
    }
  ],
  "student_coverage": [
    {
      "child_id": "uuid",
      "child_name": "Emma Johnson",
      "classroom_id": "uuid",
      "last_photo_at": "2025-02-02T13:45:00Z",
      "last_update_at": "2025-02-02T14:15:00Z",
      "days_without_activity": 0
    }
  ],
  "activity_feed": [
    {
      "timestamp": "2025-02-02T14:30:00Z",
      "teacher_name": "Jane Smith",
      "action_type": "photo",
      "action_description": "took a photo",
      "child_name": "Emma Johnson"
    }
  ],
  "summary": {
    "total_teachers": 5,
    "active_this_week": 4,
    "total_students_covered_this_week": 23,
    "students_without_activity": 2
  }
}
```

## Data Aggregation Logic

### Time Window Constants
```typescript
const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
```

### Teacher Activity Calculation
```typescript
// For each teacher, count:
photos_this_week = COUNT(*) from montree_media
  WHERE captured_by = teacher_id
  AND captured_at >= weekAgo

work_updates_this_week = COUNT(*) from montree_child_progress
  WHERE teacher_id = teacher_id
  AND updated_at >= weekAgo

observations_this_week = COUNT(*) from montree_behavioral_observations
  WHERE observed_by = teacher_id
  AND observed_at >= weekAgo

sessions_this_week = COUNT(*) from montree_work_sessions
  WHERE teacher_id = teacher_id
  AND observed_at >= weekAgo
```

### Last Activity Detection
```typescript
// Compare timestamps across all activity types
const timestamps = [
  photos.captured_at,
  workUpdates.updated_at,
  observations.observed_at,
  sessions.observed_at,
].filter(Boolean);

const lastActiveAt = new Date(Math.max(...timestamps.map(t => new Date(t).getTime())));
const lastActivityType = determineWhichTypeHasLatestTimestamp();
```

### Student Coverage Calculation
```typescript
// For each student, find latest activity
const lastActivity = Math.max(
  lastPhotoDate,
  lastUpdateDate,
  lastObservationDate,
  lastSessionDate
);

const daysWithoutActivity = Math.floor(
  (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)
);

// Flag if idle for 7+ days
const needsAttention = daysWithoutActivity >= 7;
```

## Frontend Implementation

### Component Structure
```typescript
// /app/montree/admin/activity/page.tsx

export default function ActivityPage() {
  // State
  const [teachers, setTeachers] = useState<TeacherActivity[]>([]);
  const [students, setStudents] = useState<StudentCoverage[]>([]);
  const [feed, setFeed] = useState<ActivityFeed[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'coverage' | 'feed'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Effects
  // - Check auth on mount
  // - Fetch data on mount
  // - Setup auto-refresh interval if enabled

  // Render
  // - Header with summary cards
  // - Tab navigation
  // - Tab content (overview, coverage, or feed)
}
```

### Data Fetching
```typescript
const fetchActivity = async () => {
  try {
    const res = await fetch('/api/montree/admin/activity', {
      headers: {
        'Content-Type': 'application/json',
        'x-school-id': localStorage.getItem('montree_school')?.id,
        'x-principal-id': localStorage.getItem('montree_principal')?.id,
      },
    });

    if (res.status === 401) {
      router.push('/montree/principal/login');
      return;
    }

    const data = await res.json();
    setTeachers(data.teacher_activity);
    setStudents(data.student_coverage);
    setFeed(data.activity_feed);
    setSummary(data.summary);
  } catch (error) {
    toast.error('Failed to load activity data');
  }
};
```

### Tab Components
```typescript
// TEACHER ACTIVITY TAB
{selectedTab === 'overview' && (
  <div className="space-y-3">
    {teachers.map(teacher => (
      <TeacherActivityCard
        key={teacher.teacher_id}
        teacher={teacher}
      />
    ))}
  </div>
)}

// STUDENT COVERAGE TAB
{selectedTab === 'coverage' && (
  <div className="space-y-2">
    {students.map(student => (
      <StudentCoverageRow
        key={student.child_id}
        student={student}
      />
    ))}
  </div>
)}

// ACTIVITY FEED TAB
{selectedTab === 'feed' && (
  <div className="space-y-3">
    {feed.map((event, i) => (
      <ActivityFeedItem
        key={i}
        event={event}
      />
    ))}
  </div>
)}
```

## Styling with Tailwind

### Summary Cards
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
    <div className="text-gray-400 text-sm mb-1">Total Teachers</div>
    <div className="text-3xl font-bold text-emerald-400">5</div>
  </div>
</div>
```

### Activity Cards
```tsx
<div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700">
  <div className="flex items-start justify-between mb-4">
    <div>
      <h3 className="text-lg font-semibold">{teacher.teacher_name}</h3>
      <p className="text-gray-400 text-sm">{teacher.teacher_email}</p>
    </div>
    <div className="text-right">
      <div className="text-2xl font-bold text-emerald-400">40</div>
      <div className="text-gray-400 text-sm">actions this week</div>
    </div>
  </div>

  {/* Activity breakdown grid */}
  <div className="grid grid-cols-4 gap-4">
    {/* Photo, Work, Observation, Session boxes */}
  </div>
</div>
```

### Status Indicator
```tsx
{isActive && (
  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
)}
```

## Time Formatting Utility

```typescript
function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
```

## Usage Examples

### Display Teacher Activity
```typescript
const teacher = teachers[0];

// Display all metrics
console.log(`${teacher.teacher_name}:`);
console.log(`  Photos: ${teacher.photos_this_week}w / ${teacher.photos_this_month}m`);
console.log(`  Work updates: ${teacher.work_updates_this_week}w / ${teacher.work_updates_this_month}m`);
console.log(`  Last active: ${formatTimeAgo(teacher.last_active_at)}`);
console.log(`  Activity type: ${teacher.last_activity_type}`);
```

### Identify Students Needing Attention
```typescript
const idleStudents = students.filter(s => s.days_without_activity >= 7);

idleStudents.forEach(student => {
  console.log(`${student.child_name}: ${student.days_without_activity} days without activity`);
});
```

### Process Activity Feed
```typescript
feed.forEach(event => {
  console.log(`[${formatTimeAgo(event.timestamp)}] ${event.teacher_name} ${event.action_description} ${event.child_name ? `of ${event.child_name}` : ''}`);
});
```

## Database Indexes for Performance

To optimize the API queries, ensure these indexes exist:

```sql
-- Index for teacher activity queries
CREATE INDEX idx_montree_media_teacher_date
ON montree_media(captured_by, captured_at DESC);

CREATE INDEX idx_montree_child_progress_teacher_date
ON montree_child_progress(teacher_id, updated_at DESC);

CREATE INDEX idx_montree_behavioral_observations_teacher_date
ON montree_behavioral_observations(observed_by, observed_at DESC);

CREATE INDEX idx_montree_work_sessions_teacher_date
ON montree_work_sessions(teacher_id, observed_at DESC);

-- Index for student coverage queries
CREATE INDEX idx_montree_media_student_date
ON montree_media(child_id, captured_at DESC);

CREATE INDEX idx_montree_child_progress_student_date
ON montree_child_progress(child_id, updated_at DESC);

-- Index for school queries
CREATE INDEX idx_montree_teachers_school
ON montree_teachers(school_id, is_active);

CREATE INDEX idx_montree_classrooms_school
ON montree_classrooms(school_id);

CREATE INDEX idx_montree_children_classroom
ON montree_children(classroom_id, is_active);
```

## Environment Variables

No new environment variables needed. Uses existing:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Testing

### Manual Testing Checklist
```
[ ] Login as principal
[ ] Navigate to /montree/admin/activity
[ ] Verify teachers load in Teacher Activity tab
[ ] Verify summary metrics display
[ ] Switch to Student Coverage tab
[ ] Verify students with 7+ days idle show orange flag
[ ] Switch to Activity Feed tab
[ ] Click Refresh button and verify data updates
[ ] Toggle Live mode and verify auto-refresh
[ ] Check mobile responsive design
[ ] Verify no console errors
[ ] Verify proper time ago formatting
```

### Test Query
```typescript
// Test fetching activity data directly
const response = await fetch('/api/montree/admin/activity', {
  headers: {
    'x-school-id': 'your-school-id',
    'x-principal-id': 'your-principal-id',
  },
});

const data = await response.json();
console.log('Teachers:', data.teacher_activity);
console.log('Students:', data.student_coverage);
console.log('Summary:', data.summary);
```

## Error Handling

### 401 Unauthorized
```typescript
if (res.status === 401) {
  // Not authenticated, redirect to login
  router.push('/montree/principal/login');
  return;
}
```

### API Error
```typescript
if (!res.ok) {
  toast.error('Failed to load activity data');
  return;
}
```

### Network Error
```typescript
catch (error) {
  console.error('Fetch failed:', error);
  toast.error('Network error - check your connection');
}
```

## Future Enhancements

### Add Filtering
```typescript
const [filterTeacher, setFilterTeacher] = useState('all');
const [filterClassroom, setFilterClassroom] = useState('all');

const filteredTeachers = teachers.filter(t =>
  (filterTeacher === 'all' || t.teacher_id === filterTeacher) &&
  (filterClassroom === 'all' || t.classroom_id === filterClassroom)
);
```

### Add Sorting
```typescript
const [sortBy, setSortBy] = useState<'activity' | 'name' | 'lastActive'>('activity');

const sortedTeachers = [...teachers].sort((a, b) => {
  switch (sortBy) {
    case 'activity':
      return (b.photos_this_week + b.work_updates_this_week) -
             (a.photos_this_week + a.work_updates_this_week);
    case 'name':
      return a.teacher_name.localeCompare(b.teacher_name);
    case 'lastActive':
      return new Date(b.last_active_at || 0).getTime() -
             new Date(a.last_active_at || 0).getTime();
  }
});
```

### Add Export to CSV
```typescript
const exportToCSV = () => {
  const csv = teachers.map(t =>
    `${t.teacher_name},${t.photos_this_week},${t.work_updates_this_week},...`
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'activity-report.csv';
  a.click();
};
```
