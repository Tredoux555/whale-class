// lib/montree/guru/settings-helper.ts
// Read-merge-write helper for montree_children.settings JSONB column
//
// ⚠️ Race condition note: If two tool calls (e.g. save_checkin + save_child_profile)
// run concurrently, the read-merge-write pattern can lose updates. This is acceptable
// for v1 because the tool executor runs tools sequentially (for loop, not Promise.all).
// If we ever parallelize tool execution, switch to PostgreSQL jsonb_set or || operator.

import { getSupabase } from '@/lib/supabase-client';

export async function updateChildSettings(
  childId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase();
  const { data: child } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .single();

  const existing = (child?.settings as Record<string, unknown>) || {};
  const merged = { ...existing, ...updates };

  await supabase
    .from('montree_children')
    .update({ settings: merged })
    .eq('id', childId);
}

export function getChildSettings(
  child: { settings: unknown }
): Record<string, unknown> {
  return (child?.settings as Record<string, unknown>) || {};
}
