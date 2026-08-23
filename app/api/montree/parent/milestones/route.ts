// /api/montree/parent/milestones/route.ts
// Fetch child milestones and achievements timeline

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { getLocaleFromRequest, getTranslator, getTranslatedAreaName, getIntlLocale } from '@/lib/montree/i18n/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // 🚨 Session 113 V2 Parent audit F-1.1 — re-verify parent↔child link.
    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-child safe.
    if (!session.authorizedChildIds.includes(childId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get mastered works with dates (these are milestones)
    //
    // audit-fix (Aug 23 2026): this selected `mastery_date` and embedded
    // `work:work_id (...)`. montree_child_progress has NEITHER — no work_id
    // column and therefore no such relationship, and the mastery stamp is
    // `mastered_at` (081 + 311: work_name / work_name_chinese / area /
    // presented_at / mastered_at / work_key). PostgREST rejected the whole
    // select, so this route returned `milestones: []` for every parent, always.
    // The columns the transform actually needs live on the row itself.
    const { data: progress, error } = await supabase
      .from('montree_child_progress')
      .select('id, status, work_name, work_name_chinese, area, mastered_at, created_at, updated_at')
      .eq('child_id', childId)
      .in('status', ['mastered', 'completed'])
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({
        success: true,
        milestones: []
      });
    }

    // Transform to milestones format — locale-aware
    const locale = getLocaleFromRequest(request.url);
    const t = getTranslator(locale);
    const milestones = ((progress || []) as Array<{
      id: string;
      status: string;
      work_name: string | null;
      work_name_chinese: string | null;
      area: string | null;
      mastered_at: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>)
      .filter(p => p.work_name)
      .map(p => {
        const workName = p.work_name as string;
        const dbChinese = p.work_name_chinese;
        const areaId = p.area || '';
        // Priority: DB name_chinese (covers custom works) → static JSON → null
        const chineseName = dbChinese || (workName ? getChineseNameForWork(workName) : null);
        const displayName = locale === 'zh' && chineseName ? chineseName : workName;
        return {
          id: p.id,
          type: 'mastery',
          title: `${t('progress.mastered')}: ${displayName}`,
          work_name: workName,
          chineseName,
          area: areaId,
          area_label: getTranslatedAreaName(areaId, locale),
          date: p.mastered_at || p.updated_at || p.created_at || new Date().toISOString(),
          icon: p.status === 'mastered' ? '⭐' : '✓'
        };
      });

    // Group by month for timeline display
    const grouped: Record<string, typeof milestones> = {};
    milestones.forEach(m => {
      const date = new Date(m.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    // Convert to sorted array
    const timeline = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString(getIntlLocale(locale), { month: 'long', year: 'numeric' }),
        items
      }));

    const response = NextResponse.json({
      success: true,
      milestones,
      timeline,
      total_milestones: milestones.length
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;

  } catch (error) {
    console.error('Milestones API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
