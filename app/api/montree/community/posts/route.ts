// /api/montree/community/posts
// GET  — the public board, newest first, paginated. No login required.
// POST — leave a message. Requires a CONFIRMED, non-banned account.
//
// Author names are resolved with a second keyed query rather than a PostgREST
// embed: the embed depends on the schema cache having picked up migration 309's
// foreign key, which it may not have done in the first minutes after the
// migration runs. Two plain queries always work.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { getCommunityUser, requireConfirmedUser } from '@/lib/montree/community/auth';
import {
  badRequest,
  isMissingTable,
  migrationPending,
  rateLimited,
  readJson,
  readPaging,
  serverError,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const MAX_BODY = 2000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface PostRow {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
}

/** id → display name, in one query. Missing names degrade to "A teacher". */
async function resolveNames(
  supabase: ReturnType<typeof getSupabase>,
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return {};
  const { data, error } = await supabase
    .from('montree_community_users')
    .select('id, display_name')
    .in('id', unique);
  if (error) {
    console.error('[community/posts] name lookup failed:', error);
    return {};
  }
  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.id as string] = (row.display_name as string) || 'A teacher';
  }
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { offset, limit } = readPaging(new URL(request.url), DEFAULT_LIMIT, MAX_LIMIT);

    const { data, error, count } = await supabase
      .from('montree_community_posts')
      .select('id, body, created_at, user_id', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('posts.GET', error);
    }

    const rows = (data || []) as PostRow[];
    const names = await resolveNames(supabase, rows.map((r) => r.user_id));

    // Anonymous readers are the common case — only look up the session when a
    // cookie is actually present-ish (getCommunityUser returns null cheaply).
    const viewer = await getCommunityUser(request);

    const total = count || 0;
    return NextResponse.json({
      posts: rows.map((r) => ({
        id: r.id,
        body: r.body,
        displayName: names[r.user_id] || 'A teacher',
        createdAt: r.created_at,
        mine: !!viewer && viewer.id === r.user_id,
      })),
      total,
      hasMore: offset + rows.length < total,
    });
  } catch (err) {
    return serverError('posts.GET', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/posts',
      10,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const gate = await requireConfirmedUser(request);
    if ('error' in gate) return gate.error;
    const user = gate.user;

    const parsed = await readJson(request);
    if (!parsed) return badRequest('Malformed request.');

    const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
    if (body.length === 0) return badRequest('Write something first.');
    if (body.length > MAX_BODY) {
      return badRequest(`Please keep it under ${MAX_BODY} characters.`);
    }

    const { data, error } = await supabase
      .from('montree_community_posts')
      .insert({ user_id: user.id, body })
      .select('id, body, created_at')
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('posts.POST', error);
    }
    if (!data) return serverError('posts.POST', new Error('insert returned no row'));

    return NextResponse.json({
      post: {
        id: data.id as string,
        body: data.body as string,
        displayName: user.displayName,
        createdAt: data.created_at as string,
        mine: true,
      },
    });
  } catch (err) {
    return serverError('posts.POST', err);
  }
}
