// /api/montree/admin/activity/route.ts
// Teacher activity dashboard - aggregates engagement metrics
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface TeacherActivity {
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  photos_this_week: number;
  photos_this_month: number;
  work_updates_this_week: number;
  work_updates_this_month: number;
  observations_this_week: number;
  sessions_this_week: number;
  last_active_at: string | null;
  last_activity_type: string | null;
}

interface StudentCoverage {
  child_id: string;
  child_name: string;
  classroom_id: string;
  last_photo_at: string | null;
  last_update_at: string | null;
  days_without_activity: number;
}

interface ActivityFeed {
  timestamp: string;
  teacher_name: string;
  action_type: string;
  action_description: string;
  child_name?: string;
  count?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');

    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all teachers for this school
    const { data: teachers, error: teacherError } = await supabase
      .from('montree_teachers')
      .select('id, name, email, school_id')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (teacherError) {
      console.error('Teacher fetch error:', teacherError);
      return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }

    const teacherIds = (teachers || []).map(t => t.id);

    if (teacherIds.length === 0) {
      return NextResponse.json({
        success: true,
        teacher_activity: [],
        student_coverage: [],
        activity_feed: [],
        summary: {
          total_teachers: 0,
          active_this_week: 0,
          total_students_covered_this_week: 0,
          students_without_activity: 0,
        },
      });
    }

    // Calculate date ranges
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch photos by teacher
    const { data: photos } = await supabase
      .from('montree_media')
      .select('id, captured_by, captured_at, child_id')
      .in('captured_by', teacherIds)
      .order('captured_at', { ascending: false });

    // Fetch work updates by teacher
    const { data: workUpdates } = await supabase
      .from('montree_child_progress')
      .select('id, teacher_id, updated_at, child_id, work_name')
      .in('teacher_id', teacherIds)
      .order('updated_at', { ascending: false });

    // Fetch observations by teacher
    const { data: observations } = await supabase
      .from('montree_behavioral_observations')
      .select('id, observed_by, observed_at, child_id')
      .in('observed_by', teacherIds)
      .order('observed_at', { ascending: false });

    // Fetch work sessions by teacher
    const { data: sessions } = await supabase
      .from('montree_work_sessions')
      .select('id, teacher_id, observed_at, child_id')
      .in('teacher_id', teacherIds)
      .order('observed_at', { ascending: false });

    // Get all students for coverage calculation
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('school_id', schoolId);

    const classroomIds = (classrooms || []).map(c => c.id);

    let students: any[] = [];
    if (classroomIds.length > 0) {
      const { data: studentData } = await supabase
        .from('montree_children')
        .select('id, name, classroom_id')
        .in('classroom_id', classroomIds)
        .eq('is_active', true);
      students = studentData || [];
    }

    // ============================================
    // AGGREGATE TEACHER ACTIVITY
    // ============================================
    const teacherActivityMap = new Map<string, TeacherActivity>();

    // Initialize all teachers
    teachers?.forEach(teacher => {
      const latestPhoto = photos?.find(p => p.captured_by === teacher.id);
      const latestUpdate = workUpdates?.find(u => u.teacher_id === teacher.id);
      const latestObservation = observations?.find(o => o.observed_by === teacher.id);
      const latestSession = sessions?.find(s => s.teacher_id === teacher.id);

      const timestamps = [
        latestPhoto?.captured_at,
        latestUpdate?.updated_at,
        latestObservation?.observed_at,
        latestSession?.observed_at,
      ].filter(Boolean);

      const lastActiveAt = timestamps.length > 0
        ? new Date(Math.max(...timestamps.map(t => new Date(t as string).getTime()))).toISOString()
        : null;

      // Determine last activity type
      let lastActivityType = null;
      if (lastActiveAt) {
        if (latestPhoto?.captured_at === lastActiveAt) lastActivityType = 'photo';
        else if (latestUpdate?.updated_at === lastActiveAt) lastActivityType = 'work_update';
        else if (latestObservation?.observed_at === lastActiveAt) lastActivityType = 'observation';
        else if (latestSession?.observed_at === lastActiveAt) lastActivityType = 'session';
      }

      teacherActivityMap.set(teacher.id, {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        teacher_email: teacher.email,
        photos_this_week: 0,
        photos_this_month: 0,
        work_updates_this_week: 0,
        work_updates_this_month: 0,
        observations_this_week: 0,
        sessions_this_week: 0,
        last_active_at: lastActiveAt,
        last_activity_type: lastActivityType,
      });
    });

    // Count photos
    photos?.forEach(photo => {
      const activity = teacherActivityMap.get(photo.captured_by);
      if (activity) {
        const photoDate = new Date(photo.captured_at);
        if (photoDate >= weekAgo) activity.photos_this_week++;
        if (photoDate >= monthAgo) activity.photos_this_month++;
      }
    });

    // Count work updates
    workUpdates?.forEach(update => {
      const activity = teacherActivityMap.get(update.teacher_id);
      if (activity) {
        const updateDate = new Date(update.updated_at);
        if (updateDate >= weekAgo) activity.work_updates_this_week++;
        if (updateDate >= monthAgo) activity.work_updates_this_month++;
      }
    });

    // Count observations
    observations?.forEach(obs => {
      const activity = teacherActivityMap.get(obs.observed_by);
      if (activity) {
        const obsDate = new Date(obs.observed_at);
        if (obsDate >= weekAgo) activity.observations_this_week++;
      }
    });

    // Count sessions
    sessions?.forEach(session => {
      const activity = teacherActivityMap.get(session.teacher_id);
      if (activity) {
        const sessionDate = new Date(session.observed_at);
        if (sessionDate >= weekAgo) activity.sessions_this_week++;
      }
    });

    const teacherActivity = Array.from(teacherActivityMap.values()).sort((a, b) => {
      // Sort by last active date (most recent first)
      if (!a.last_active_at && !b.last_active_at) return 0;
      if (!a.last_active_at) return 1;
      if (!b.last_active_at) return -1;
      return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
    });

    // ============================================
    // CALCULATE STUDENT COVERAGE
    // ============================================
    const studentCoverageMap = new Map<string, StudentCoverage>();

    students.forEach(student => {
      const lastPhoto = photos?.find(p => p.child_id === student.id);
      const lastUpdate = workUpdates?.find(u => u.child_id === student.id);

      const lastPhotoDate = lastPhoto ? new Date(lastPhoto.captured_at) : null;
      const lastUpdateDate = lastUpdate ? new Date(lastUpdate.updated_at) : null;

      const lastActivityDate = [lastPhotoDate, lastUpdateDate]
        .filter(Boolean)
        .reduce((latest, date) => !latest || date! > latest ? date : latest, null as Date | null);

      const daysWithoutActivity = lastActivityDate
        ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000))
        : 999; // Very high number if never had activity

      studentCoverageMap.set(student.id, {
        child_id: student.id,
        child_name: student.name,
        classroom_id: student.classroom_id,
        last_photo_at: lastPhoto?.captured_at || null,
        last_update_at: lastUpdate?.updated_at || null,
        days_without_activity: daysWithoutActivity,
      });
    });

    const studentCoverage = Array.from(studentCoverageMap.values());

    // ============================================
    // BUILD ACTIVITY FEED
    // ============================================
    const allActivityEvents: Array<{
      timestamp: string;
      teacher_id: string;
      teacher_name: string;
      action_type: string;
      action_description: string;
      child_id?: string;
      child_name?: string;
      count?: number;
    }> = [];

    // Collect all activities with timestamps
    photos?.forEach(photo => {
      const teacher = teachers?.find(t => t.id === photo.captured_by);
      const child = students.find(s => s.id === photo.child_id);
      if (teacher) {
        allActivityEvents.push({
          timestamp: photo.captured_at,
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          action_type: 'photo',
          action_description: `took a photo`,
          child_id: photo.child_id,
          child_name: child?.name,
        });
      }
    });

    workUpdates?.forEach(update => {
      const teacher = teachers?.find(t => t.id === update.teacher_id);
      const child = students.find(s => s.id === update.child_id);
      if (teacher) {
        allActivityEvents.push({
          timestamp: update.updated_at,
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          action_type: 'work_update',
          action_description: `updated progress on ${update.work_name}`,
          child_id: update.child_id,
          child_name: child?.name,
        });
      }
    });

    observations?.forEach(obs => {
      const teacher = teachers?.find(t => t.id === obs.observed_by);
      const child = students.find(s => s.id === obs.child_id);
      if (teacher) {
        allActivityEvents.push({
          timestamp: obs.observed_at,
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          action_type: 'observation',
          action_description: `logged an observation`,
          child_id: obs.child_id,
          child_name: child?.name,
        });
      }
    });

    // Sort by timestamp and take last 20
    const activityFeed = allActivityEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map(event => ({
        timestamp: event.timestamp,
        teacher_name: event.teacher_name,
        action_type: event.action_type,
        action_description: event.action_description,
        child_name: event.child_name,
      }));

    // ============================================
    // CALCULATE SUMMARY STATS
    // ============================================
    const activeThisWeek = teacherActivity.filter(t => {
      const lastActive = t.last_active_at;
      return lastActive && new Date(lastActive) >= weekAgo;
    }).length;

    const studentsWithActivityThisWeek = new Set(
      [...photos, ...workUpdates, ...observations, ...sessions]
        .filter(item => {
          const date = item.captured_at || item.updated_at || item.observed_at;
          return date && new Date(date) >= weekAgo;
        })
        .map(item => item.child_id)
    ).size;

    const studentsWithoutActivity = studentCoverage.filter(s => s.days_without_activity >= 7).length;

    return NextResponse.json({
      success: true,
      teacher_activity: teacherActivity,
      student_coverage: studentCoverage,
      activity_feed: activityFeed,
      summary: {
        total_teachers: teacherActivity.length,
        active_this_week: activeThisWeek,
        total_students_covered_this_week: studentsWithActivityThisWeek,
        students_without_activity: studentsWithoutActivity,
      },
    });

  } catch (error) {
    console.error('Admin activity error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
