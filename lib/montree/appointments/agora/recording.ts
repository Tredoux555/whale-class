// lib/montree/appointments/agora/recording.ts
//
// Agora Cloud Recording REST API client. Three calls in the lifecycle:
//   1. ACQUIRE  — reserve a recording slot (Agora returns a resource_id).
//   2. START    — kick off the actual recording into our Supabase Storage.
//   3. STOP     — end the recording. Agora finalises + uploads to storage.
//   (QUERY is also available for status polling but we use webhooks instead.)
//
// HEALTH MODEL:
//   Each helper returns { ok, data, error } — never throws on HTTP failure.
//   The caller decides how to translate failures into user-visible state
//   (e.g. flip recording row to status='failed' with reason captured).
//
// COST AT REST:
//   Audio-only recording mode (`audio` profile). Skips video re-encode for
//   ~50% cost saving vs full video composite. We don't need the video —
//   the recording exists to feed Whisper for transcription + Sonnet for
//   summary, both of which work on audio. Visual context isn't retained.
//
// STORAGE:
//   Recording vendor code 1 = AWS S3 / S3-compatible (Supabase Storage
//   exposes an S3-compatible endpoint). Vendor 2 = Aliyun, 3 = QCloud, etc.
//   We use vendor 1 with the Supabase S3 endpoint configured in env.
//
// PRIVACY:
//   The recording is stored in OUR Supabase bucket — Agora never retains
//   the audio on their infra beyond the upload step. Their region (US/EU/
//   APAC) only matters for the pipeline edge node, not for data residency.
//
// AGORA DOCS:
//   https://docs.agora.io/en/cloud-recording/develop/restful-api

import { getAgoraRecordingConfig } from './config';

const AGORA_API_BASE = 'https://api.agora.io/v1/apps';

interface AcquireArgs {
  channel: string;
  recordingBotUid: number;
}

interface AcquireResult {
  ok: boolean;
  data?: { resourceId: string };
  error?: string;
}

/**
 * STEP 1 — Reserve recording capacity. Cheap (no charge until start).
 * Returns a resource_id that the start call references.
 */
export async function acquireRecording(args: AcquireArgs): Promise<AcquireResult> {
  const cfg = getAgoraRecordingConfig();
  if (!cfg) return { ok: false, error: 'agora_recording_not_configured' };

  const body = {
    cname: args.channel,
    uid: String(args.recordingBotUid),
    clientRequest: {
      // resourceExpiredHour: how long Agora keeps the slot reserved. Past
      // this we'd have to re-acquire. 24h is well past any meeting.
      resourceExpiredHour: 24,
      // scene 0 = composite recording (what we want — single mixed file).
      scene: 0,
    },
  };

  try {
    const res = await fetch(`${AGORA_API_BASE}/${cfg.appId}/cloud_recording/acquire`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth(cfg.customerKey, cfg.customerSecret),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await safeText(res);
      return { ok: false, error: `acquire_http_${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const resourceId = data?.resourceId;
    if (!resourceId || typeof resourceId !== 'string') {
      return { ok: false, error: 'acquire_no_resource_id' };
    }
    return { ok: true, data: { resourceId } };
  } catch (err) {
    return { ok: false, error: `acquire_network: ${(err as Error).message}` };
  }
}

interface StartArgs {
  channel: string;
  channelToken: string;
  recordingBotUid: number;
  resourceId: string;
  storageBucket: string;
  /** Storage subdir under the bucket. e.g. 'recordings/<appointment_id>'. */
  storagePathPrefix: string;
  /** Supabase Storage S3 credentials. Different from Agora customer key/secret. */
  storageAccessKey: string;
  storageSecretKey: string;
  /** S3 region. Supabase Storage default is 'us-east-1'. */
  storageRegion: string;
  /** S3 endpoint URL (without trailing slash). e.g. https://<project>.supabase.co/storage/v1/s3 */
  storageEndpoint: string;
}

interface StartResult {
  ok: boolean;
  data?: { resourceId: string; sid: string };
  error?: string;
}

/**
 * STEP 2 — Start the actual recording. Agora begins capturing the channel's
 * audio mix and uploading to our Supabase Storage bucket.
 *
 * The returned `sid` is the session id Agora uses to identify THIS recording
 * run (different from resourceId which identifies the slot). Both are needed
 * for the stop call.
 */
export async function startRecording(args: StartArgs): Promise<StartResult> {
  const cfg = getAgoraRecordingConfig();
  if (!cfg) return { ok: false, error: 'agora_recording_not_configured' };

  // Storage vendor 1 = AWS S3 / S3-compatible. Supabase exposes S3-compatible
  // endpoints — vendor 1 with custom endpoint works.
  // accessKey/secretKey are the Supabase project's S3 credentials, NOT the
  // Agora customer credentials.
  const storageConfig = {
    vendor: 1, // AWS S3 / S3-compatible
    region: 0, // Agora's region code; we'll override via endpoint
    bucket: args.storageBucket,
    accessKey: args.storageAccessKey,
    secretKey: args.storageSecretKey,
    fileNamePrefix: args.storagePathPrefix.split('/').filter(Boolean),
    extensionParams: {
      // Custom S3 endpoint for non-AWS providers. Required for Supabase.
      endpoint: args.storageEndpoint,
      regionStr: args.storageRegion,
    },
  };

  const body = {
    cname: args.channel,
    uid: String(args.recordingBotUid),
    clientRequest: {
      token: args.channelToken,
      recordingConfig: {
        // 1 = audio-only profile. Skips video mixing — cheaper + smaller
        // file + everything we need for Whisper transcription.
        channelType: 0, // 0 = communication, 1 = live broadcast
        streamTypes: 0, // 0 = audio only, 1 = video only, 2 = both
        audioProfile: 1, // 1 = standard music quality
        // Max idle time before recording auto-stops. 30s catches the
        // "everyone left" case without paying for an empty room forever.
        maxIdleTime: 30,
      },
      storageConfig,
    },
  };

  try {
    const res = await fetch(
      `${AGORA_API_BASE}/${cfg.appId}/cloud_recording/resourceid/${encodeURIComponent(args.resourceId)}/mode/mix/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: basicAuth(cfg.customerKey, cfg.customerSecret),
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await safeText(res);
      return { ok: false, error: `start_http_${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const resourceId = data?.resourceId;
    const sid = data?.sid;
    if (!resourceId || !sid) {
      return { ok: false, error: 'start_no_sid' };
    }
    return { ok: true, data: { resourceId, sid } };
  } catch (err) {
    return { ok: false, error: `start_network: ${(err as Error).message}` };
  }
}

interface StopArgs {
  channel: string;
  recordingBotUid: number;
  resourceId: string;
  sid: string;
}

interface StopResult {
  ok: boolean;
  data?: {
    resourceId: string;
    sid: string;
    /** Files uploaded to storage. Each entry has fileName, sliceStartTime, etc. */
    files: Array<{ fileName: string; sliceStartTime: number }>;
    fileListMode?: string;
  };
  error?: string;
}

/**
 * STEP 3 — End the recording. Agora flushes the buffer + finalises upload.
 * Response includes the list of files uploaded to our bucket. Caller
 * persists the list so transcription can find them.
 */
export async function stopRecording(args: StopArgs): Promise<StopResult> {
  const cfg = getAgoraRecordingConfig();
  if (!cfg) return { ok: false, error: 'agora_recording_not_configured' };

  const body = {
    cname: args.channel,
    uid: String(args.recordingBotUid),
    clientRequest: {},
  };

  try {
    const res = await fetch(
      `${AGORA_API_BASE}/${cfg.appId}/cloud_recording/resourceid/${encodeURIComponent(args.resourceId)}/sid/${encodeURIComponent(args.sid)}/mode/mix/stop`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: basicAuth(cfg.customerKey, cfg.customerSecret),
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await safeText(res);
      return { ok: false, error: `stop_http_${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const serverResponse = data?.serverResponse || {};
    const files = Array.isArray(serverResponse.fileList) ? serverResponse.fileList : [];

    return {
      ok: true,
      data: {
        resourceId: data?.resourceId,
        sid: data?.sid,
        files,
        fileListMode: serverResponse.fileListMode,
      },
    };
  } catch (err) {
    return { ok: false, error: `stop_network: ${(err as Error).message}` };
  }
}

// ── Utils ────────────────────────────────────────────────────────────

function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
