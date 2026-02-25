// lib/montree/guru/progress-analyzer.ts
// Helper to detect stale or inactive progress patterns for proactive suggestions

import { SupabaseClient } from '@supabase/supabase-js';

export interface StaleWork {
  work_name: string;
  area: string;
  status: string;
  last_updated: string;
  days_stale: number;
}

export interface ProgressAnalysis {
  staleWorks: StaleWork[];
  daysInactive: number; // days since any progress update
  hasActivity: boolean;
}

/**
 * Analyze a child's progress for stale works and inactivity.
 * Returns stale works (2+ weeks same status) and days since last activity.
 */
export async function analyzeChildProgress(
  supabase: SupabaseClient,
  childId: string
): Promise<ProgressAnalysis> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get stale works — practicing or presented for 14+ days
  const { data: staleData } = await supabase
    .from('montree_child_work_progress')
    .select('work_name, area, status, updated_at')
    .eq('child_id', childId)
    .in('status', ['practicing', 'presented'])
    .lt('updated_at', fourteenDaysAgo.toISOString())
    .order('updated_at', { ascending: true })
    .limit(10);

  const now = new Date();
  const staleWorks: StaleWork[] = (staleData || []).map(w => ({
    work_name: w.work_name,
    area: w.area,
    status: w.status,
    last_updated: w.updated_at,
    days_stale: Math.floor((now.getTime() - new Date(w.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Check last activity date
  const { data: recentActivity } = await supabase
    .from('montree_child_work_progress')
    .select('updated_at')
    .eq('child_id', childId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  const lastActivity = recentActivity?.updated_at ? new Date(recentActivity.updated_at) : null;
  const daysInactive = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    staleWorks,
    daysInactive,
    hasActivity: daysInactive < 7,
  };
}
