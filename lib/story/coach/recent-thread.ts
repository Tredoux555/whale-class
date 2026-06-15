// lib/story/coach/recent-thread.ts
//
// The Coach's WORKING MEMORY — the still-running thread.
//
// story_coach_log keeps the full encrypted archive of every turn. The recent,
// NOT-YET-CONSOLIDATED turns are the "thread that's still running": we replay
// them into context each request so the Coach resumes exactly where Tredoux left
// off — even after a tab reload or on a different device. Once the nightly
// consolidation pass folds a day into long-term memory (story_coach_memory +
// diary) it stamps consolidated_at, and those turns drop out of this window.
//
// Mirrors the type posture of memory.ts (single user, encrypted at rest).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { readDiaryField } from '@/lib/story/diary-crypto';

const MSG_CAP = 16000;

export interface RecentThreadOpts {
  /** Max number of past turns (a turn = one user + one assistant message). */
  maxTurns?: number;
  /** Only include turns newer than this many hours (keeps the thread "recent"). */
  withinHours?: number;
}

/**
 * Load the running thread as Anthropic messages, oldest-first, ready to prepend
 * to the new user turn. Returns [] on any error (the Coach still works, just
 * without server-side continuity — the client history is the fallback).
 */
export async function loadRecentThread(
  supabase: SupabaseClient,
  space: string,
  opts: RecentThreadOpts = {},
): Promise<MessageParam[]> {
  const maxTurns = Math.max(1, Math.min(opts.maxTurns ?? 12, 40));
  const withinHours = Math.max(1, Math.min(opts.withinHours ?? 72, 24 * 30));
  const sinceIso = new Date(Date.now() - withinHours * 3600_000).toISOString();

  const { data, error } = await supabase
    .from('story_coach_log')
    .select('question_enc, answer_enc, cipher_version, created_at')
    .eq('space', space)
    .is('consolidated_at', null)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(maxTurns);

  if (error || !data) {
    if (error) console.warn('[coach/recent-thread] load error:', error.message);
    return [];
  }

  // DB gave newest-first; flip to chronological so the conversation reads forward.
  const turns = data.slice().reverse();
  const messages: MessageParam[] = [];
  for (const r of turns) {
    let q = '';
    let a = '';
    try {
      q = readDiaryField(r.question_enc, r.cipher_version) || '';
      a = r.answer_enc ? readDiaryField(r.answer_enc, r.cipher_version) || '' : '';
    } catch {
      continue; // skip a row we can't decrypt rather than break the thread
    }
    if (q.trim()) messages.push({ role: 'user', content: q.trim().slice(0, MSG_CAP) });
    if (a.trim()) messages.push({ role: 'assistant', content: a.trim().slice(0, MSG_CAP) });
  }
  return messages;
}
