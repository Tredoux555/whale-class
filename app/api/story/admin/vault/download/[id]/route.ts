import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';
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
function parseRange(
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
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🚨 Session 113 V2 Story audit F-2.1 — vault token mandatory.
    const vaultTokenValid = await verifyVaultToken(req.headers.get('x-vault-token'));
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
        },
      });
    }

    // 🚨 Session 154 — audit one row per download/playback START (no Range, or
    // a range from byte 0), not per mid-stream chunk: a single video viewing
    // fires dozens of Range requests and would otherwise flood the log.
    if (!range || range.start === 0) {
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
      // Private (browser-only) cache so the SAME authenticated session can
      // replay/seek without re-downloading + re-decrypting. No ETag is sent
      // (deliberate — avoids If-Range complexity; expired caches simply
      // re-request the full body, which is acceptable).
      'Cache-Control': 'private, max-age=3600',
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
