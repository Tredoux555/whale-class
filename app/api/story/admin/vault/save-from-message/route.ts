// API to save a message image/video to the vault
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import crypto from 'crypto';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

function encryptFile(fileBuffer: Buffer, password: string): Buffer {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(fileBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, mediaUrl, filename } = await req.json();
    
    if (!mediaUrl) {
      return NextResponse.json({ error: 'No media URL provided' }, { status: 400 });
    }


    // Fetch the file from the URL
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Determine filename
    const finalFilename = filename || `saved-${Date.now()}${getExtension(contentType)}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    // Encrypt the file
    const vaultPassword = process.env.VAULT_PASSWORD || 'change-this-in-env';
    const encrypted = encryptFile(fileBuffer, vaultPassword);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Upload to vault
    const supabase = createClient(supabaseUrl, supabaseKey);
    const storageName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;

    const { error: uploadError } = await supabase.storage
      .from('vault-secure')
      .upload(`vault/${storageName}`, encrypted, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('[Vault Save] Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }


    const { data: urlData } = supabase.storage
      .from('vault-secure')
      .getPublicUrl(`vault/${storageName}`);

    // Save to database
    const result = await dbQuery(
      `INSERT INTO vault_files (filename, file_size, file_url, encrypted_key, file_hash, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, uploaded_at`,
      [finalFilename, fileBuffer.length, urlData.publicUrl, 'from-message', fileHash, adminUsername]
    );

    // Audit log
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await dbQuery(
      `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
       VALUES ($1, $2, $3, $4, TRUE)`,
      ['save_from_message', adminUsername, ipAddress, `Saved: ${finalFilename} from message ${messageId || 'unknown'}`]
    );

    return NextResponse.json({
      success: true,
      file: result.rows[0]
    });

  } catch (error) {
    console.error('[Vault Save From Message] Error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  return map[contentType] || '';
}
