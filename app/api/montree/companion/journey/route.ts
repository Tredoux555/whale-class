// app/api/montree/companion/journey/route.ts
// GET ?child_id=… → the child's journey: moments (photos), milestone markers,
// quiet notes, and Ivy's one-line insight. Powers the Journey tab on Montree Home.
//
// COPY RULE (vision plan, Jul 2 2026): everything returned here is parent-facing.
// No area names, no presented/practicing/mastered, no "shelf/work" jargon —
// milestones are phrased the way a parent would remember them.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { loadCompanionMemories } from '@/lib/montree/companion/memory';

export const maxDuration = 30;

interface JourneyEvent {
  type: 'moment' | 'milestone' | 'note';
  date: string;
  text: string;
  photo_url?: string;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const childId = (request.nextUrl.searchParams.get('child_id') || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();
  try {
    const [childRes, mediaRes, obsRes, masteredRes, memories] = await Promise.all([
      supabase.from('montree_children').select('name').eq('id', childId).maybeSingle(),
      supabase
        .from('montree_media')
        .select('id, storage_path, caption, captured_at')
        .eq('child_id', childId)
        .eq('media_type', 'photo')
        // Canonical parent-facing hide gate (rule #140): default-true with
        // explicit-hide override. Group-photo junction (montree_media_children)
        // deliberately omitted — home photos always carry child_id directly.
        .neq('parent_visible', false)
        .order('captured_at', { ascending: false })
        .limit(30),
      supabase
        .from('montree_behavioral_observations')
        .select('behavior_description, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('montree_child_progress')
        .select('work_name, mastered_at')
        .eq('child_id', childId)
        .eq('status', 'mastered')
        .not('mastered_at', 'is', null)
        .order('mastered_at', { ascending: false })
        .limit(10),
      loadCompanionMemories(supabase, childId, 80).catch(() => []),
    ]);

    const childName = ((childRes.data?.name as string) || '').split(' ')[0] || 'your child';

    const events: JourneyEvent[] = [];

    for (const m of (mediaRes.data || []) as Array<{ storage_path: string | null; caption: string | null; captured_at: string | null }>) {
      if (!m.storage_path || !m.captured_at) continue;
      events.push({
        type: 'moment',
        date: m.captured_at,
        text: (m.caption || '').trim(),
        photo_url: getProxyUrl(m.storage_path),
      });
    }

    for (const o of (obsRes.data || []) as Array<{ behavior_description: string | null; created_at: string | null }>) {
      const text = (o.behavior_description || '').trim();
      if (!text || !o.created_at) continue;
      events.push({ type: 'note', date: o.created_at, text });
    }

    // Mastery → a parent-language milestone. Never the word "mastered".
    for (const p of (masteredRes.data || []) as Array<{ work_name: string | null; mastered_at: string | null }>) {
      if (!p.work_name || !p.mastered_at) continue;
      events.push({ type: 'milestone', date: p.mastered_at, text: `${p.work_name} — ${childName} has made it their own` });
    }

    // Milestone memories Ivy has saved from conversations.
    for (const mem of memories) {
      if (mem.memory_type !== 'milestone') continue;
      if (!mem.content || !mem.created_at) continue;
      events.push({ type: 'milestone', date: mem.created_at, text: mem.content });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Ivy's insight line — the freshest interest she's been holding onto.
    const interests = memories.filter((m) => m.memory_type === 'interest' && m.content);
    const insight = interests.length > 0 ? interests[0].content : null;

    // no-store, always (rule #185: session-scoped endpoints don't cache) — a
    // max-age here serves the tab-open refresh a stale body and the moment the
    // parent just captured never appears (the Session-119 photo-audit lesson).
    return NextResponse.json(
      { success: true, child_name: childName, insight, events: events.slice(0, 40) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    console.error('[companion/journey] error:', err);
    return NextResponse.json({ error: 'Could not load the journey right now.' }, { status: 500 });
  }
}
