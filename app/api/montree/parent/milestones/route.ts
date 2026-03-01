// /api/montree/parent/milestones/route.ts
// Fetch child milestones and achievements timeline

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { getChineseNameMap } from '@/lib/montree/curriculum-loader';
import { getLocaleFromRequest, getTranslator, getTranslatedAreaName } from '@/lib/montree/i18n/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // SECURITY: Authenticate parent via session cookie
    const session = await verifyParentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Verify the requested child matches the authenticated session
    if (session.childId !== childId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get mastered works with dates (these are milestones)
    const { data: progress, error } = await supabase
      .from('montree_child_progress')
      .select(`
        id,
        status,
        mastery_date,
        created_at,
        updated_at,
        work:work_id (
          name,
          area_id
        )
      `)
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
    const cnMap = getChineseNameMap();
    const milestones = (progress || [])
      .filter(p => p.work)
      .map(p => {
        const workName = (p.work as Record<string, unknown>).name as string;
        const areaId = (p.work as Record<string, unknown>).area_id as string;
        const chineseName = workName ? cnMap.get(workName.toLowerCase().trim()) || null : null;
        const displayName = locale === 'zh' && chineseName ? chineseName : workName;
        return {
          id: p.id,
          type: 'mastery',
          title: `${t('progress.mastered')}: ${displayName}`,
          work_name: workName,
          chineseName,
          area: areaId,
          area_label: getTranslatedAreaName(areaId, locale),
          date: p.mastery_date || p.updated_at,
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
        label: new Date(month + '-01').toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' }),
        items
      }));

    return NextResponse.json({
      success: true,
      milestones,
      timeline,
      total_milestones: milestones.length
    });

  } catch (error) {
    console.error('Milestones API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
