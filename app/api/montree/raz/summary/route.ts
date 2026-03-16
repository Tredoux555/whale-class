// /api/montree/raz/summary/route.ts
// RAZ Summary & Audit API
// GET ?type=daily&classroom_id=X&date=Y → daily summary (grouped by status)
// GET ?type=audit&classroom_id=X&child_id=Y&weeks=N → child audit (missed weeks)
// GET ?type=weekly&classroom_id=X&weeks=N → weekly overview for all children

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`raz-summary-${auth.userId}`, 60, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // CRITICAL: Verify classroom belongs to the requesting user's school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate date format helper
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    if (type === 'daily') {
      // Daily summary for a specific date
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      if (!DATE_REGEX.test(date)) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }

      const { data: records, error } = await supabase
        .from('raz_reading_records')
        .select('child_id, status, record_date')
        .eq('classroom_id', classroomId)
        .eq('record_date', date);

      if (error) {
        console.error('RAZ daily summary error:', error);
        return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
      }

      // Group by status
      const summary: Record<string, string[]> = {
        read: [],
        not_read: [],
        no_folder: [],
        absent: [],
      };
      for (const r of (records || [])) {
        if (summary[r.status]) {
          summary[r.status].push(r.child_id);
        }
      }

      const response = NextResponse.json({ summary, date });
      response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
      return response;
    }

    if (type === 'audit') {
      // Per-child audit: how many weeks they missed reading / didn't bring folder
      const childId = searchParams.get('child_id');
      const weeks = Math.max(1, Math.min(parseInt(searchParams.get('weeks') || '12', 10) || 12, 52));

      if (!childId) {
        return NextResponse.json({ error: 'child_id required for audit' }, { status: 400 });
      }

      const childCheck = await verifyChildBelongsToSchool(childId, auth.schoolId!);
      if (!childCheck.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Fetch all records for this child in the date range
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - (weeks * 7));
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = new Date().toISOString().split('T')[0];

      const { data: records, error } = await supabase
        .from('raz_reading_records')
        .select('record_date, status')
        .eq('child_id', childId)
        .eq('classroom_id', classroomId)
        .gte('record_date', fromStr)
        .lte('record_date', toStr)
        .order('record_date', { ascending: true });

      if (error) {
        console.error('RAZ audit error:', error);
        return NextResponse.json({ error: 'Failed to fetch audit data' }, { status: 500 });
      }

      // Build weekly buckets (Mon-Fri school weeks)
      const weeklyData: Array<{
        weekStart: string;
        weekEnd: string;
        days: Array<{ date: string; status: string | null }>;
        readCount: number;
        notReadCount: number;
        noFolderCount: number;
        absentCount: number;
        totalDays: number;
      }> = [];

      // Build record lookup
      const recordMap: Record<string, string> = {};
      for (const r of (records || [])) {
        recordMap[r.record_date] = r.status;
      }

      // Walk through weeks
      const cursor = new Date(fromStr);
      // Align to Monday
      while (cursor.getDay() !== 1) cursor.setDate(cursor.getDate() + 1);

      const endDate = new Date(toStr);
      while (cursor <= endDate) {
        const weekStart = cursor.toISOString().split('T')[0];
        const days: Array<{ date: string; status: string | null }> = [];
        let readCount = 0, notReadCount = 0, noFolderCount = 0, absentCount = 0;

        for (let d = 0; d < 5; d++) { // Mon-Fri
          const dayDate = new Date(cursor);
          dayDate.setDate(dayDate.getDate() + d);
          if (dayDate > endDate) break;
          const dateStr = dayDate.toISOString().split('T')[0];
          const status = recordMap[dateStr] || null;
          days.push({ date: dateStr, status });

          if (status === 'read') readCount++;
          else if (status === 'not_read') notReadCount++;
          else if (status === 'no_folder') noFolderCount++;
          else if (status === 'absent') absentCount++;
        }

        const friday = new Date(cursor);
        friday.setDate(friday.getDate() + 4);
        weeklyData.push({
          weekStart,
          weekEnd: friday.toISOString().split('T')[0],
          days,
          readCount,
          notReadCount,
          noFolderCount,
          absentCount,
          totalDays: days.length,
        });

        cursor.setDate(cursor.getDate() + 7);
      }

      // Calculate totals
      const totals = {
        totalRead: weeklyData.reduce((s, w) => s + w.readCount, 0),
        totalNotRead: weeklyData.reduce((s, w) => s + w.notReadCount, 0),
        totalNoFolder: weeklyData.reduce((s, w) => s + w.noFolderCount, 0),
        totalAbsent: weeklyData.reduce((s, w) => s + w.absentCount, 0),
        totalWeeks: weeklyData.length,
        weeksWithNoRead: weeklyData.filter(w => w.readCount === 0 && w.totalDays > 0).length,
        weeksWithNoFolder: weeklyData.filter(w => w.noFolderCount > 0).length,
      };

      const response = NextResponse.json({ weeks: weeklyData, totals, childId, from: fromStr, to: toStr });
      response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
      return response;
    }

    if (type === 'weekly') {
      // Weekly overview for ALL children — summary per child over N weeks
      const weeks = Math.min(parseInt(searchParams.get('weeks') || '4', 10), 52);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - (weeks * 7));
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = new Date().toISOString().split('T')[0];

      const { data: records, error } = await supabase
        .from('raz_reading_records')
        .select('child_id, record_date, status')
        .eq('classroom_id', classroomId)
        .gte('record_date', fromStr)
        .lte('record_date', toStr)
        .order('record_date', { ascending: true });

      if (error) {
        console.error('RAZ weekly overview error:', error);
        return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
      }

      // Group by child
      const childStats: Record<string, {
        totalRead: number;
        totalNotRead: number;
        totalNoFolder: number;
        totalAbsent: number;
        totalDays: number;
      }> = {};

      for (const r of (records || [])) {
        if (!childStats[r.child_id]) {
          childStats[r.child_id] = { totalRead: 0, totalNotRead: 0, totalNoFolder: 0, totalAbsent: 0, totalDays: 0 };
        }
        childStats[r.child_id].totalDays++;
        if (r.status === 'read') childStats[r.child_id].totalRead++;
        else if (r.status === 'not_read') childStats[r.child_id].totalNotRead++;
        else if (r.status === 'no_folder') childStats[r.child_id].totalNoFolder++;
        else if (r.status === 'absent') childStats[r.child_id].totalAbsent++;
      }

      const response = NextResponse.json({ childStats, from: fromStr, to: toStr, weeks });
      response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
      return response;
    }

    return NextResponse.json({ error: 'Invalid type. Use: daily, audit, weekly' }, { status: 400 });
  } catch (err) {
    console.error('RAZ summary GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
