import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';
import crypto from 'crypto';

// 🚨 Session 154 streaming fix — module-level memo of PBKDF2-derived keys.
// The password is a process-constant env var and the KDF params are fixed
// (100k iters / sha256 / 32 bytes), so the derived key is fully determined by
// the per-file salt. Re-deriving costs 100–200ms on EVERY request, which adds
// up fast once video playback issues repeated Range requests for the same
// file. The derived key never leaves the process (it's exactly what
// pbkdf2Sync would recompute anyway), so this does NOT weaken at-rest
// encryption. Bounded LRU-ish eviction keeps memory flat.
const KEY_CACHE_MAX = 64;
const keyCache = new Map<string, Buffer>();

function deriveKey(password: string, salt: Buffer): Buffer {
  const cacheId = salt.toString('hex');
  const cached = keyCache.get(cacheId);
  if (cached) return cached;
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  if (keyCache.size >= KEY_CACHE_MAX) {
    const oldest = keyCache.keys().next().value;
    if (oldest !== undefined) keyCache.delete(oldest);
  }
  keyCache.set(cacheId, key);
  return key;
}

// AES-256-GCM is authenticated over the WHOLE ciphertext — it cannot be
// random-access decrypted, so a Range request still requires a full
// download + decrypt server-side; we then slice the requested window out of
// the decrypted buffer (subarray = zero-copy view, never a second copy).
function decryptFile(encryptedBuffer: Buffer, password: string): Buffer {
  const salt = encryptedBuffer.subarray(0, 32);
  const iv = encryptedBuffer.subarray(32, 48);
  const authTag = encryptedBuffer.subarray(48, 64);
  const encrypted = encryptedBuffer.subarray(64);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const head = decipher.update(encrypted);
  const tail = decipher.final();
  // For GCM, final() is almost always empty — skip the concat copy then.
  return tail.length === 0 ? head : Buffer.concat([head, tail]);
}

// Minimal mime map so decrypted media plays/displays inline instead of being
// labelled application/octet-stream (Safari refuses to stream octet-stream
// video). Anything unknown keeps the old attachment/octet-stream behaviour.
const MEDIA_MIME: Record<string, string> = {
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo', '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2', wmv: 'video/x-ms-wmv',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', avif: 'image/avif',
};

// Parse a single-range `Range: bytes=...` header against a body of `size`
// bytes. Returns the inclusive window, null to IGNORE the header (malformed
// or multi-range — RFC 9110 allows serving 200 instead), or 'unsatisfiable'
// (→ 416) when the syntax is fine but the window falls outside the body.
// Exported for tests (tests/vault-range.test.ts) — not imported by other routes.
export function parseRange(
  header: string,
  size: number
): { start: number; end: number } | 'unsatisfiable' | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, startStr, endStr] = m;
  if (startStr === '' && endStr === '') return null;
  if (startStr === '') {
    // Suffix range bytes=-N → last N bytes.
    const n = parseInt(endStr, 10);
    if (n === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(size - n, 0), end: size - 1 };
  }
  const start = parseInt(startStr, 10);
  if (start >= size) return 'unsatisfiable';
  const end = endStr === '' ? size - 1 : Math.min(parseInt(endStr, 10), size - 1);
  if (end < start) return 'unsatisfiable';
  return { start, end };
}

// 🚨 Session 154 audit fix — time-based audit flood control. Video playback
// fires dozens of Range requests per viewing, so logging every request would
// flood vault_audit_log; but the previous heuristic (log only when no Range
// or range.start === 0) let `Range: bytes=1-` fetch the whole file minus one
// byte with ZERO audit rows. Instead: log at most once per admin+file per
// 10-minute window — every playback/download session logs at least once
// regardless of Range games, while seek-chunk flooding stays suppressed.
// Bounded Map with FIFO eviction, same pattern as the key memo above.
const AUDIT_WINDOW_MS = 10 * 60 * 1000;
const AUDIT_MEMO_MAX = 500;
const auditLastLogged = new Map<string, number>();

function shouldAuditLog(adminUsername: string, fileId: number): boolean {
  const key = `${adminUsername}:${fileId}`;
  const now = Date.now();
  const last = auditLastLogged.get(key);
  if (last !== undefined && now - last < AUDIT_WINDOW_MS) return false;
  // Delete-then-set so a refreshed entry moves to the back of the FIFO order.
  auditLastLogged.delete(key);
  if (auditLastLogged.size >= AUDIT_MEMO_MAX) {
    const oldest = auditLastLogged.keys().next().value;
    if (oldest !== undefined) auditLastLogged.delete(oldest);
  }
  auditLastLogged.set(key, now);
  return true;
}

// Each request buffers ciphertext + plaintext in memory (~2× file size while
// decrypting). Cap concurrent decrypts so a burst of playback Range requests
// can't stack heap allocations; surplus requests get a quick 503 + Retry-After
// and the browser/player simply retries.
const MAX_CONCURRENT_DECRYPTS = 4;
let inFlightDecrypts = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // fix/story-vault-mobile-jun13 — accept the admin + vault tokens from query
    // params as a fallback to the Authorization / x-vault-token headers. A bare
    // <video src> (used to stream EXISTING encrypted videos via this route's
    // 206/Range support, instead of downloading a full blob) cannot set custom
    // headers, so the client passes ?at=<adminJWT>&vt=<vaultJWT>. Both are
    // verified through the exact same jose/exp checks as the header path — this
    // does NOT add a new trust path, only a new carrier for the same tokens.
    // (Trade-off: a vault-token-bearing URL may land in server access logs; the
    // token is a short-lived ≤1h JWT, same posture as the signed-download URLs.)
    const url = new URL(req.url);
    const authHeader =
      req.headers.get('authorization') ||
      (url.searchParams.get('at') ? `Bearer ${url.searchParams.get('at')}` : null);
    const vaultTokenHeader =
      req.headers.get('x-vault-token') || url.searchParams.get('vt');

    const adminUsername = await verifyAdminToken(authHeader);
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Owner-space gate (defense-in-depth on top of the unlock choke point).
    // Uses authHeader so the ?at= query-param token path is gated too.
    if (!(await isVaultOwner(authHeader))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 🚨 Session 113 V2 Story audit F-2.1 — vault token mandatory.
    const vaultTokenValid = await verifyVaultToken(vaultTokenHeader);
    if (!vaultTokenValid) {
      return NextResponse.json(
        { error: 'Vault not unlocked', vault_locked: true },
        { status: 401 }
      );
    }

    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: file } = await supabase
      .from('vault_files')
      .select('filename, file_url')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filePathMatch = file.file_url.match(/vault\/[^?]+/);
    if (!filePathMatch) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const vaultPassword = process.env.VAULT_PASSWORD;
    if (!vaultPassword) {
      return NextResponse.json({ error: 'Vault not configured' }, { status: 500 });
    }

    if (inFlightDecrypts >= MAX_CONCURRENT_DECRYPTS) {
      return NextResponse.json(
        { error: 'Busy — retry shortly' },
        { status: 503, headers: { 'Retry-After': '2' } }
      );
    }

    let decryptedBuffer: Buffer;
    inFlightDecrypts++;
    try {
      const { data: encryptedData, error: downloadError } = await supabase.storage
        .from('vault-secure')
        .download(filePathMatch[0]);

      if (downloadError || !encryptedData) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Buffer.from(ArrayBuffer) wraps the bytes without copying.
      const encryptedBuffer = Buffer.from(await encryptedData.arrayBuffer());
      try {
        decryptedBuffer = decryptFile(encryptedBuffer, vaultPassword);
      } catch {
        return NextResponse.json({ error: 'Failed to decrypt file' }, { status: 500 });
      }
    } finally {
      inFlightDecrypts--;
    }

    const size = decryptedBuffer.length;
    const rangeHeader = req.headers.get('range');
    const range = rangeHeader ? parseRange(rangeHeader, size) : null;

    if (range === 'unsatisfiable') {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`,
          'Accept-Ranges': 'bytes',
          // no-store on every response from this route — see headers below.
          'Cache-Control': 'no-store',
        },
      });
    }

    // 🚨 Session 154 — audit at most one row per admin+file per 10-minute
    // window (see shouldAuditLog): every session logs at least once, no
    // matter how the Range header is shaped, without per-chunk flooding.
    if (shouldAuditLog(adminUsername, fileId)) {
      const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
      supabase.from('vault_audit_log').insert({
        action: 'file_download',
        admin_username: adminUsername,
        ip_address: ipAddress,
        details: `Downloaded: ${file.filename}`,
        success: true
      }).then(() => {});
    }

    // 🚨 Security audit L1 (Jun 2026) — sanitize the filename before reflecting
    // it into the Content-Disposition header. Strip CR/LF (header-injection) and
    // quotes/backslashes that would break the quoted-string; also provide an
    // RFC 5987 filename* with a percent-encoded copy for non-ASCII names.
    const safeAscii = file.filename.replace(/[\r\n"\\]/g, '_').replace(/[^\x20-\x7e]/g, '_');
    const rfc5987 = encodeURIComponent(file.filename).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16));
    const ext = file.filename.split('.').pop()?.toLowerCase() || '';
    const mediaMime = MEDIA_MIME[ext];
    const headers: Record<string, string> = {
      // Media gets its real mime + inline so <video>/<img> can stream it;
      // everything else keeps the legacy attachment/octet-stream download.
      'Content-Type': mediaMime || 'application/octet-stream',
      'Content-Disposition': `${mediaMime ? 'inline' : 'attachment'}; filename="${safeAscii}"; filename*=UTF-8''${rfc5987}`,
      'Accept-Ranges': 'bytes',
      // no-store: vault lock must not leave decrypted plaintext in the
      // browser's disk cache on a shared machine (private+max-age did).
      'Cache-Control': 'no-store',
    };

    if (range) {
      // subarray = view over the decrypted buffer, NOT a second copy.
      const body = decryptedBuffer.subarray(range.start, range.end + 1);
      return new NextResponse(body as unknown as BodyInit, {
        status: 206,
        headers: {
          ...headers,
          'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
          'Content-Length': body.length.toString(),
        },
      });
    }

    return new NextResponse(decryptedBuffer as unknown as BodyInit, {
      headers: {
        ...headers,
        'Content-Length': size.toString(),
      },
    });
  } catch (error) {
    console.error('[Vault Download] Error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
