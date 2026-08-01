// /api/montree/community/dm
// The Teachers' Room direct line to Tredoux.
//
// POST — send him a message. GET — read the thread back, replies included.
//
// 🚨 THIS ROUTE DELIBERATELY WORKS WITHOUT A SESSION. The people who most
// need to reach the creator are the ones who cannot get in: a teacher whose
// login is broken, whose email never arrived, whose school code was mistyped.
// Requiring an account here would gate the one channel that exists for
// exactly that failure. Anonymous senders give a name (required, so a reply
// has someone to address) and optionally an email; signed-in senders skip
// both and their account name/address attach automatically.
//
// The messages land in the EXISTING montree_dm pipe, so they show up in the
// super admin next to every other conversation and are already counted by the
// existing unread summary. Only the sender card (name/email/account link)
// lives in this feature's own table, montree_community_dm_meta (migration
// 310) — montree_dm has no email column.
//
// 42P01-safe like the rest of the family: before migration 310 runs this
// answers 503 migration_pending and the modal shows a "being set up" line.
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { getCommunityUser } from '@/lib/montree/community/auth';
import {
  badRequest,
  isMissingTable,
  isValidDisplayName,
  isValidEmail,
  migrationPending,
  normalizeDisplayName,
  normalizeEmail,
  rateLimited,
  readJson,
  serverError,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const META_TABLE = 'montree_community_dm_meta';
const MAX_MESSAGE = 2000;
const MAX_THREAD = 200;

/**
 * The ONLY conversation id shape a client may ever hand us. Anything that
 * doesn't match — including the `community-<uuid>` form used by signed-in
 * accounts — is treated as if no id had been sent at all, so a stranger can
 * never post into (or read) somebody else's thread by guessing an id.
 */
const ANON_CID = /^community-anon-[a-f0-9]{32}$/;

/** Rate-limit buckets. Separate keys so reading can't exhaust sending. */
const SEND_ENDPOINT = '/api/montree/community/dm';
const READ_ENDPOINT = '/api/montree/community/dm#read';

interface DmRow {
  id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  created_at: string;
}

/** Mint a fresh anonymous conversation id. 128 bits — unguessable. */
function newAnonCid(): string {
  return `community-anon-${randomBytes(16).toString('hex')}`;
}

// ============================================
// POST — send
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      SEND_ENDPOINT,
      5,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const parsed = await readJson(request);
    if (!parsed) return badRequest('Malformed request.');

    // Honeypot — a person never sees this field, a bot fills everything it
    // finds. Answer exactly like a success so the bot has nothing to tune
    // against, and write nothing.
    if (typeof parsed.website === 'string' && parsed.website.trim().length > 0) {
      return NextResponse.json({ ok: true, cid: newAnonCid() });
    }

    const raw = typeof parsed.message === 'string' ? parsed.message.trim() : '';
    if (raw.length === 0) return badRequest('Write something first.');
    if (raw.length > MAX_MESSAGE) {
      return badRequest(`Please keep it under ${MAX_MESSAGE} characters.`);
    }
    // Strip HTML tags exactly as /api/montree/dm does on its own writes.
    // montree_dm is a SHARED pipe with several readers; every writer holding
    // the same contract means no reader has to wonder whether a given row was
    // sanitised. (Both surfaces here render messages as text anyway.)
    const message = raw.replace(/<[^>]*>/g, '').trim();
    if (message.length === 0) return badRequest('Write something first.');

    // Pre-migration the session lookup 42P01s and getCommunityUser folds that
    // into a plain null — without the ref we'd silently fall down the
    // anonymous path and try to write to a table that isn't there.
    const migrationRef = { pending: false };
    const user = await getCommunityUser(request, migrationRef);
    if (migrationRef.pending) return migrationPending();

    let conversationId: string;
    let name: string;
    let email: string | null;
    let userId: string | null;

    if (user) {
      // A banned account is answered with the same body a successful send
      // gets — no error, no different shape, nothing to probe — and nothing
      // is written. Deliberately no oracle.
      if (user.isBanned) {
        return NextResponse.json({ ok: true, cid: `community-${user.id}` });
      }
      // Note: an UNCONFIRMED account may write here on purpose. Posting to
      // the public board needs a confirmed email; reaching the creator does
      // not, because "my confirmation email never arrived" is one of the
      // things people come here to say.
      conversationId = `community-${user.id}`;
      name = user.displayName;
      email = user.email;
      userId = user.id;
    } else {
      userId = null;
      const postedName = normalizeDisplayName(parsed.name);
      const postedEmail = normalizeEmail(parsed.email);
      if (postedEmail.length > 0 && !isValidEmail(postedEmail)) {
        return badRequest('That email address doesn’t look right.');
      }

      // A returning anonymous sender hands back the id we minted for them.
      // It has to look right AND already exist: without the existence check a
      // client could invent ids at will, and without the shape check it could
      // hand us `community-<someone's uuid>` and post as that account.
      const rawCid = typeof parsed.cid === 'string' ? parsed.cid.trim() : '';
      let resumed: { conversation_id: string; name: string; email: string | null } | null = null;
      if (ANON_CID.test(rawCid)) {
        const { data, error } = await supabase
          .from(META_TABLE)
          .select('conversation_id, name, email')
          .eq('conversation_id', rawCid)
          .maybeSingle();
        if (error) {
          if (isMissingTable(error)) return migrationPending();
          return serverError('dm.POST', error);
        }
        if (data) {
          resumed = {
            conversation_id: data.conversation_id as string,
            name: data.name as string,
            email: (data.email as string | null) ?? null,
          };
        }
      }

      if (resumed) {
        // The modal hides the name/email fields once a thread exists, so a
        // follow-up message arrives with neither. Carry the card forward —
        // re-asking would be rude, and letting the upsert write NULL over an
        // address they already gave would quietly cost Tredoux the reply path.
        conversationId = resumed.conversation_id;
        name = isValidDisplayName(postedName) ? postedName : resumed.name;
        email = postedEmail.length > 0 ? postedEmail : resumed.email;
      } else {
        if (!isValidDisplayName(postedName)) {
          return badRequest('Please add your name (2–40 characters) so Tredoux knows who wrote.');
        }
        conversationId = newAnonCid();
        name = postedName;
        email = postedEmail.length > 0 ? postedEmail : null;
      }
    }

    // Upsert, not insert-or-update: two sends racing on a brand-new
    // conversation would otherwise collide on the primary key. The name and
    // email refresh on every send so the inbox shows what they last told us.
    const { error: metaError } = await supabase.from(META_TABLE).upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        name,
        email,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'conversation_id' }
    );

    if (metaError) {
      if (isMissingTable(metaError)) return migrationPending();
      return serverError('dm.POST', metaError);
    }

    // The message itself goes in the shared pipe. is_read=false is what puts
    // the red badge on the Creator inbox tab.
    const { error: dmError } = await supabase.from('montree_dm').insert({
      conversation_id: conversationId,
      sender_type: 'user',
      sender_name: name,
      message,
      is_read: false,
    });

    if (dmError) {
      if (isMissingTable(dmError)) return migrationPending();
      return serverError('dm.POST', dmError);
    }

    return NextResponse.json({ ok: true, cid: conversationId });
  } catch (err) {
    return serverError('dm.POST', err);
  }
}

// ============================================
// GET — read the thread
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      READ_ENDPOINT,
      // 60, not 30: a whole school shares one NAT'd IP, so reads pile up fast.
      60,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const migrationRef = { pending: false };
    const user = await getCommunityUser(request, migrationRef);
    if (migrationRef.pending) return migrationPending();

    let conversationId: string;

    if (user) {
      // A signed-in reader only ever gets their own thread — any ?cid= they
      // send is ignored outright rather than validated.
      conversationId = `community-${user.id}`;
      // Their thread doesn't depend on the meta row, but touching the table
      // is how we notice migration 310 is missing: without this the modal
      // would look live to a signed-in teacher and only fail on send.
      const { error: metaError } = await supabase
        .from(META_TABLE)
        .select('conversation_id')
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (metaError) {
        if (isMissingTable(metaError)) return migrationPending();
        // Any other failure is not the teacher's problem — the messages are
        // in montree_dm and we can still show them.
        console.error('[community/dm] meta probe failed:', metaError);
      }
    } else {
      const rawCid = (new URL(request.url).searchParams.get('cid') || '').trim();
      // Wrong shape and unknown id answer identically: nothing to enumerate.
      if (!ANON_CID.test(rawCid)) {
        return NextResponse.json({ error: 'No such conversation.', code: 'not_found' }, { status: 404 });
      }
      const { data, error } = await supabase
        .from(META_TABLE)
        .select('conversation_id')
        .eq('conversation_id', rawCid)
        .maybeSingle();
      if (error) {
        if (isMissingTable(error)) return migrationPending();
        return serverError('dm.GET', error);
      }
      if (!data) {
        return NextResponse.json({ error: 'No such conversation.', code: 'not_found' }, { status: 404 });
      }
      conversationId = rawCid;
    }

    const { data, error } = await supabase
      .from('montree_dm')
      .select('id, sender_type, sender_name, message, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_THREAD);

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('dm.GET', error);
    }

    const rows = (data || []) as DmRow[];

    // Opening the thread is what marks Tredoux's replies read. Awaited rather
    // than fired off unattended — a promise left running past the response is
    // not guaranteed to finish on serverless — but a failure here only means
    // a stale read flag, so it is logged and never fails the read.
    if (rows.some((r) => r.sender_type === 'admin')) {
      const { error: markError } = await supabase
        .from('montree_dm')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'admin')
        .eq('is_read', false);
      if (markError) {
        console.error('[community/dm] mark-read failed:', markError);
      }
    }

    return NextResponse.json({
      cid: conversationId,
      messages: rows.map((r) => ({
        id: r.id,
        senderType: r.sender_type,
        senderName: r.sender_name,
        message: r.message,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return serverError('dm.GET', err);
  }
}
