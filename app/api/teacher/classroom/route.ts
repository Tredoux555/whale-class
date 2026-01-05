import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSession } from '@/lib/auth-multi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get children in teacher's classroom (or all for admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'school_admin', 'teacher'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    // For now, get all active children (we'll filter by classroom later when fully set up)
    // Super admins see all, teachers see their school's children
    let query = supabase
      .from('children')
      .select(`
        id,
        name,
        date_of_birth,
        age_group,
        photo_url,
        active_status,
        school_id
      `)
      .eq('active_status', true)
      .order('name');

    // Filter by school for non-super-admins
    if (session.role !== 'super_admin' && session.schoolId) {
      query = query.eq('school_id', session.schoolId);
    }

    const { data: children, error } = await query;

    if (error) throw error;

    // Get progress counts for each child
    const childrenWithProgress = await Promise.all(
      (children || []).map(async (child) => {
        const { data: progressCounts } = await supabase
          .from('child_work_progress')
          .select('status')
          .eq('child_id', child.id);

        const counts = {
          presented: 0,
          practicing: 0,
          mastered: 0,
          total: 0,
        };

        progressCounts?.forEach(p => {
          if (p.status === 1) counts.presented++;
          else if (p.status === 2) counts.practicing++;
          else if (p.status === 3) counts.mastered++;
          counts.total++;
        });

        // Calculate age
        const birthDate = new Date(child.date_of_birth);
        const today = new Date();
        const ageYears = today.getFullYear() - birthDate.getFullYear();
        const ageMonths = today.getMonth() - birthDate.getMonth();
        const age = ageYears + (ageMonths / 12);

        return {
          ...child,
          age: Math.round(age * 10) / 10,
          progress: counts,
        };
      })
    );

    return NextResponse.json({ children: childrenWithProgress });
  } catch (error) {
    console.error('Get classroom error:', error);
    return NextResponse.json({ error: 'Failed to get classroom' }, { status: 500 });
  }
}
