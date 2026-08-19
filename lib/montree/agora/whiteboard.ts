/**
 * Agora Interactive Whiteboard (Fastboard / Netless) room + token helper.
 *
 * Mirrors the structure of `lib/montree/appointments/agora/token-builder.ts`
 * (typed exports, explicit error class, env-var validation at call time rather
 * than module load so builds don't break when creds are absent).
 *
 * ---------------------------------------------------------------------------
 * CREDENTIALS NOTE — READ BEFORE WIRING ENV VARS
 * ---------------------------------------------------------------------------
 * The Agora Interactive Whiteboard is a *separate product* from Agora RTC. It
 * does NOT authenticate with `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` (those
 * remain in use for the RTC video token in `token-builder.ts`). The whiteboard
 * uses its own credentials issued in the Agora Console under the Whiteboard
 * product:
 *   - AGORA_WHITEBOARD_APP_IDENTIFIER : the "App Identifier" string
 *     (looks like `<orgId>/<appId>`), handed to the client SDK as `appIdentifier`.
 *   - AGORA_WHITEBOARD_SDK_TOKEN      : a long-lived server-side SDK token
 *     ("NETLESSSDK_..."), used as the `token` header on the whiteboard REST API
 *     and to sign/derive room tokens. Server-only, never sent to the browser.
 *   - AGORA_WHITEBOARD_REGION         : data-center region, e.g. `cn-hz`, `sg`,
 *     `us-sv`. Must match the region the app identifier was created in.
 *
 * The contract lists "real Agora Whiteboard org credentials" as a non-goal, so
 * these are placeholders until Tredoux provisions the Whiteboard product.
 * ---------------------------------------------------------------------------
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase-client';

export type WhiteboardRole = 'admin' | 'writer' | 'reader';

export interface WhiteboardRoom {
  roomUuid: string;
}

export interface MintWhiteboardTokenArgs {
  roomUuid: string;
  /**
   * `admin`  — teacher/staff: full control, can reset scenes, kick.
   * `writer` — parent/child: can annotate on the current scene only.
   * `reader` — observer: view-only.
   */
  role: WhiteboardRole;
  /** Token lifetime in ms. Defaults to 2h (a 25-min class + generous slack). */
  ttlMs?: number;
}

export interface MintedWhiteboardToken {
  token: string;
  roomUuid: string;
  appIdentifier: string;
  region: string;
  expiresAt: string;
}

/** Thrown for any whiteboard provisioning/minting failure. */
export class WhiteboardError extends Error {
  readonly code:
    | 'missing_credentials'
    | 'appointment_not_found'
    | 'room_create_failed'
    | 'token_create_failed'
    | 'persist_failed';

  readonly status: number;

  constructor(code: WhiteboardError['code'], message: string, status = 500) {
    super(message);
    this.name = 'WhiteboardError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface WhiteboardCredentials {
  appIdentifier: string;
  sdkToken: string;
  region: string;
}

function readCredentials(): WhiteboardCredentials {
  const appIdentifier = process.env.AGORA_WHITEBOARD_APP_IDENTIFIER;
  const sdkToken = process.env.AGORA_WHITEBOARD_SDK_TOKEN;
  const region = process.env.AGORA_WHITEBOARD_REGION ?? 'cn-hz';

  if (!appIdentifier || !sdkToken) {
    throw new WhiteboardError(
      'missing_credentials',
      'Agora Whiteboard credentials are not configured. Set AGORA_WHITEBOARD_APP_IDENTIFIER and AGORA_WHITEBOARD_SDK_TOKEN (these are distinct from AGORA_APP_ID / AGORA_APP_CERTIFICATE, which are RTC-only).',
      503
    );
  }

  return { appIdentifier, sdkToken, region };
}

function apiBase(region: string): string {
  // ASSUMPTION: Agora's whiteboard REST host. Region is passed as a header on
  // v5, and is part of the room payload; the host itself is global.
  return 'https://api.netless.link/v5';
}

/**
 * Fallback client for callers that don't pass one in. Uses the repo's shared
 * `getSupabase()` (`lib/supabase-client.ts`), which carries the documented
 * retry/timeout wrapper for real production Railway↔Supabase hangs — every
 * other route in this feature passes its own client explicitly, so this
 * fallback should rarely if ever execute, but it must not silently lose that
 * protection for a future caller that omits the second argument.
 */
function getServiceSupabase(): SupabaseClient {
  return getSupabase();
}

/**
 * Returns the whiteboard room for an appointment, creating it on first use.
 *
 * Reads/writes `montree_appointments.whiteboard_room_uuid`, added in
 * migrations/334_dark_phonics_live.sql (section 5c).
 *
 * Idempotency: the read-then-create-then-write sequence has a small race window
 * (two participants joining simultaneously could each create a room; the second
 * write wins and the first room is orphaned but harmless/free). If that matters,
 * make the UPDATE conditional (`.is('whiteboard_room_uuid', null)`) and re-read
 * — done below so the loser adopts the winner's room.
 */
export async function getOrCreateWhiteboardRoom(
  appointmentId: string,
  supabaseClient?: SupabaseClient
): Promise<WhiteboardRoom> {
  const { sdkToken, region } = readCredentials();
  const supabase = supabaseClient ?? getServiceSupabase();

  const { data: appt, error: readError } = await supabase
    .from('montree_appointments')
    .select('id, whiteboard_room_uuid')
    .eq('id', appointmentId)
    .maybeSingle();

  if (readError) {
    throw new WhiteboardError('appointment_not_found', readError.message, 500);
  }
  if (!appt) {
    throw new WhiteboardError(
      'appointment_not_found',
      `Appointment ${appointmentId} not found.`,
      404
    );
  }
  if (appt.whiteboard_room_uuid) {
    return { roomUuid: appt.whiteboard_room_uuid as string };
  }

  // --- create the room via the Whiteboard REST API -------------------------
  let created: { uuid?: string };
  try {
    const response = await fetch(`${apiBase(region)}/rooms`, {
      method: 'POST',
      headers: {
        token: sdkToken,
        region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isRecord: false,
        // Human-readable label so rooms are identifiable in the Agora console.
        // ASSUMPTION: v5 accepts an arbitrary `name`; harmless if ignored.
        name: `montree-appt-${appointmentId}`,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new WhiteboardError(
        'room_create_failed',
        `Agora whiteboard room creation failed (${response.status}): ${body}`,
        502
      );
    }
    created = (await response.json()) as { uuid?: string };
  } catch (err) {
    if (err instanceof WhiteboardError) throw err;
    throw new WhiteboardError(
      'room_create_failed',
      `Agora whiteboard room creation threw: ${(err as Error).message}`,
      502
    );
  }

  if (!created.uuid) {
    throw new WhiteboardError(
      'room_create_failed',
      'Agora whiteboard room creation returned no uuid.',
      502
    );
  }

  // Conditional write: only claim the slot if still null.
  const { error: writeError } = await supabase
    .from('montree_appointments')
    .update({ whiteboard_room_uuid: created.uuid })
    .eq('id', appointmentId)
    .is('whiteboard_room_uuid', null);

  if (writeError) {
    throw new WhiteboardError('persist_failed', writeError.message, 500);
  }

  // Re-read so a concurrent creator's uuid wins consistently for both callers.
  const { data: settled } = await supabase
    .from('montree_appointments')
    .select('whiteboard_room_uuid')
    .eq('id', appointmentId)
    .maybeSingle();

  return { roomUuid: (settled?.whiteboard_room_uuid as string) ?? created.uuid };
}

/**
 * Mints a room-scoped, role-scoped whiteboard token.
 *
 * SECURITY — READ BEFORE CHANGING: this MUST call the Agora Whiteboard REST
 * API (`POST /v5/tokens/rooms/{uuid}`) to mint a token bound to this specific
 * room and role. An earlier draft of this function returned the raw
 * `AGORA_WHITEBOARD_SDK_TOKEN` directly to callers — that token is the
 * server-side org secret; shipping it to a browser hands every parent and
 * teacher a credential that can mint tokens for, or tamper with, ANY room in
 * the org, not just their own class. Confirmed and fixed 2026-08-19 after an
 * independent audit caught it. Never return `sdkToken` itself from this
 * module again — only ever a room-and-role-scoped token from the REST call
 * below.
 */
export async function mintWhiteboardToken(
  args: MintWhiteboardTokenArgs
): Promise<MintedWhiteboardToken> {
  const { roomUuid, role, ttlMs = DEFAULT_TTL_MS } = args;
  const { appIdentifier, sdkToken, region } = readCredentials();

  if (!roomUuid) {
    throw new WhiteboardError('token_create_failed', 'roomUuid is required.', 400);
  }
  if (role !== 'admin' && role !== 'writer' && role !== 'reader') {
    throw new WhiteboardError(
      'token_create_failed',
      `Unsupported whiteboard role: ${String(role)}`,
      400
    );
  }

  let scopedToken: string;
  try {
    const response = await fetch(`${apiBase(region)}/tokens/rooms/${roomUuid}`, {
      method: 'POST',
      headers: {
        token: sdkToken, // org secret used ONLY server-side to authenticate this mint call
        region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lifespan: ttlMs,
        role, // 'admin' | 'writer' | 'reader' — the whole point of this call
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new WhiteboardError(
        'token_create_failed',
        `Agora whiteboard token mint failed (${response.status}): ${body}`,
        502
      );
    }

    // ASSUMPTION: v5 returns the token as a bare string body (matches the
    // documented pattern for this endpoint). If the real API instead wraps
    // it in JSON (e.g. `{ token: "..." }`), adjust the parse here — the
    // failure mode if this assumption is wrong is a 502 from the try/catch
    // below, not a silent leak of the wrong credential.
    scopedToken = (await response.text()).trim();
    if (!scopedToken) {
      throw new WhiteboardError('token_create_failed', 'Empty token in response.', 502);
    }
  } catch (err) {
    if (err instanceof WhiteboardError) throw err;
    throw new WhiteboardError(
      'token_create_failed',
      `Agora whiteboard token mint threw: ${(err as Error).message}`,
      502
    );
  }

  return {
    token: scopedToken,
    roomUuid,
    appIdentifier,
    region,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
}

/** Maps Montree actor kind → whiteboard permission role. */
export function whiteboardRoleFor(actor: 'staff' | 'teacher' | 'parent'): WhiteboardRole {
  return actor === 'parent' ? 'writer' : 'admin';
}
