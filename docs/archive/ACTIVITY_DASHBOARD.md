# Admin Activity Dashboard for Montree

## Overview

The Admin Activity Dashboard is a real-time monitoring tool that helps school principals and administrators see which teachers are actively engaging with students. It provides a bird's-eye view of classroom activity without being intrusive to the teaching process.

## Features

### 1. Teacher Activity Summary
Displays each teacher's engagement metrics:
- **Photos taken**: This week and this month
- **Work updates**: Progress recorded on student work
- **Observations**: Behavioral observations logged
- **Sessions**: Teaching sessions conducted
- **Last active timestamp**: When they last engaged with students
- **Activity indicator**: Live dot shows active teachers

**Key Metrics:**
- Total teachers in the school
- Number of teachers active this week
- Total students documented this week
- Students needing attention (no activity for 7+ days)

### 2. Student Coverage Tab
Shows which students have recent documentation and flags those who need attention:
- **Last photo date**: Most recent photo taken
- **Last update date**: Most recent progress update
- **Days without activity**: Automatic calculation
- **Attention flags**: Orange highlight for students with 7+ days of no activity

Helps identify:
- Which students are getting documented attention
- Which students may be overlooked
- Coverage gaps in the classroom

### 3. Activity Feed Tab
Real-time stream of recent activities:
- **Photo taken**: "[Teacher] took a photo of [Student] - 2 hours ago"
- **Progress update**: "[Teacher] updated progress on [Work Name] - 45 minutes ago"
- **Observation logged**: "[Teacher] logged an observation - 1 hour ago"
- **Session conducted**: Teaching session with student

Shows the 20 most recent activities for quick reference.

## How It Works

### Data Sources

The dashboard aggregates data from four main tables:

```
montree_media (Photos)
├── captured_by (teacher_id)
├── captured_at (timestamp)
└── child_id (student)

montree_child_progress (Work Updates)
├── teacher_id
├── updated_at (timestamp)
├── child_id
└── work_name

montree_behavioral_observations (Observations)
├── observed_by (teacher_id)
├── observed_at (timestamp)
└── child_id

montree_work_sessions (Teaching Sessions)
├── teacher_id
├── observed_at (timestamp)
└── child_id
```

### Time Windows

- **This Week**: Last 7 days
- **This Month**: Last 30 days
- **Activity Idle**: 7+ days without any documentation

## Access & Security

### Authorization
The dashboard is protected by:
1. Principal login (email + password)
2. School ID validation via `x-school-id` header
3. Role verification (must be school admin/principal)

Only school admins and principals can view activity data for their school.

### Data Scope
Each principal only sees:
- Their own school's teachers
- Their own school's students
- Activity within their classrooms

## File Structure

```
/app/montree/admin/
├── layout.tsx           # Admin navigation (includes Activity link)
└── activity/
    └── page.tsx         # Activity dashboard UI

/app/api/montree/admin/
└── activity/
    └── route.ts         # API endpoint for aggregating activity data
```

## API Endpoint

### GET `/api/montree/admin/activity`

**Headers Required:**
```javascript
{
  'x-school-id': '<school_id>',
  'x-principal-id': '<principal_id>'
}
```

**Response:**
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

## Usage Guide

### For Principals

1. **Daily Check-In**
   - Visit the Activity Dashboard daily
   - Check which teachers have been active
   - Identify any teachers with no activity

2. **Student Coverage**
   - Switch to "Student Coverage" tab
   - Look for orange "Needs Attention" flags
   - Follow up on students not documented for 7+ days

3. **Live Monitoring (Optional)**
   - Toggle "Live" mode for auto-refresh every 30 seconds
   - Watch real-time activity as it happens
   - Great for spot-checks during school hours

### Interpreting the Metrics

**Green Indicators:**
- ✓ Active teachers (green dot)
- ✓ Students with recent activity
- ✓ High engagement numbers

**Orange Warnings:**
- ⚠️ Students without activity for 7+ days
- ⚠️ Teachers with no activity this week

**Red Flags:**
- ❌ Teachers with no activity for 30+ days
- ❌ Students with no documentation ever

## Performance

- **Load Time**: < 2 seconds for most schools
- **Refresh**: Real-time or manual refresh available
- **Auto-refresh**: Optional 30-second intervals for live monitoring
- **Scalability**: Efficient date-range queries, handles 500+ students/teachers

## Technical Details

### Database Queries

The API makes optimized queries:
1. Fetch all teachers for the school (indexed by school_id)
2. Fetch activities from the past 30 days (indexed by timestamp)
3. Aggregate counts by teacher and student
4. Calculate age of last activity

All queries use proper indexing to keep response times fast even with large datasets.

### Frontend

Built with React and Tailwind CSS:
- **Responsive design**: Works on desktop and tablets
- **Light theme**: Dark background with emerald green accents
- **Real-time updates**: Live refresh option
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Future Enhancements

Potential features to consider:

1. **Teacher Performance Tiers**
   - Gold (50+ activities/week)
   - Silver (25-49 activities/week)
   - Bronze (10-24 activities/week)
   - Red (0-9 activities/week)

2. **Student Engagement Scoring**
   - Weighted by activity type (photos > updates > observations)
   - Trending over time

3. **Export & Reports**
   - Weekly engagement reports
   - CSV export for analysis
   - Email alerts for coverage gaps

4. **Classroom-level View**
   - Toggle between school and classroom views
   - Per-classroom engagement comparisons

5. **Teacher Coaching Tools**
   - Suggestions based on activity patterns
   - Peer comparison (benchmarking)

## Troubleshooting

### No data showing
- Verify teachers are marked as active (`is_active = true`)
- Check that activities have been recorded in the system
- Try refreshing the page

### Incorrect last active time
- The dashboard looks at photos, work updates, observations, and sessions
- Ensure these activities are being recorded with correct timestamps

### Students missing from coverage
- Students must have a classroom assignment
- Students must be marked as active (`is_active = true`)

## Support

For issues or questions:
1. Check that your school is properly set up in the admin panel
2. Verify teachers are assigned to classrooms
3. Review the browser console for any error messages
4. Contact support with dashboard screenshots if needed
