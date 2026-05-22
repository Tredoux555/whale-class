// lib/story/push.ts
//
// Server-side Web Push for the Story system. Opt-in by env, exactly like
// Agora / Stripe / Resend — if the VAPID env vars aren't set, every helper
// degrades to a no-op and the feature simply doesn't exist.
//
// REQUIRED ENV (Railway):
//   STORY_VAPID_PUBLIC_KEY   — VAPID public key (also served to the client)
//   STORY_VAPID_PRIVATE_KEY  — VAPID private key (server only — a credential)
//   STORY_VAPID_SUBJECT      — optional; a mailto: contact. Defaults below.

import webpush from 'web-push';
import { getSupabase } from '@/lib/story-db';

const SUBJECT_DEFAULT = 'mailto:tredoux555@gmail.com';

// Memoised — setVapidDetails only needs to run once per process.
let configuredState: boolean | null = null;

function ensureConfigured(): boolean {
  if (configuredState !== null) return configuredState;
  const publicKey = process.env.STORY_VAPID_PUBLIC_KEY;
  const privateKey = process.env.STORY_VAPID_PRIVATE_KEY;
  const subject = process.env.STORY_VAPID_SUBJECT || SUBJECT_DEFAULT;
  if (!publicKey || !privateKey) {
    configuredState = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configuredState = true;
  } catch (e) {
    console.error('[story-push] VAPID setup failed:', e instanceof Error ? e.message : e);
    configuredState = false;
  }
  return configuredState;
}

/** True when the VAPID env is set and Web Push can be sent. */
export function isPushConfigured(): boolean {
  return ensureConfigured();
}

/** The VAPID public key — handed to the browser so it can subscribe. */
export function getVapidPublicKey(): string | null {
  return process.env.STORY_VAPID_PUBLIC_KEY || null;
}

/**
 * Send a "you have an incoming call" push to every device a Story user has
 * subscribed. Fire-and-forget at the call site — failures never block the
 * call. Dead subscriptions (404/410 from the push service) are pruned.
 */
export async function sendCallPush(
  username: string,
  callId: string,
  fromName: string
): Promise<void> {
  if (!ensureConfigured()) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('username', username);
  if (error || !data || data.length === 0) return;

  const payload = JSON.stringify({
    title: `${fromName} is calling you`,
    body: 'Tap to join the voice call.',
    callId,
  });

  await Promise.allSettled(
    data.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        await supabase
          .from('story_push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404 / 410 — the browser dropped this subscription. Prune it.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('story_push_subscriptions').delete().eq('id', sub.id);
          console.log(`[story-push] pruned dead subscription ${sub.id}`);
        } else {
          console.error(
            '[story-push] send failed:',
            statusCode,
            err instanceof Error ? err.message : err
          );
        }
      }
    })
  );
}
