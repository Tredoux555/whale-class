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

function encryptFile(fileBuffer: Buffer, password: string): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(fileBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return {
    encrypted: combined,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 500MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const vaultPassword = process.env.VAULT_PASSWORD || 'change-this-in-env';
    const { encrypted, iv, authTag } = encryptFile(fileBuffer, vaultPassword);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;

    const { error: uploadError } = await supabase.storage
      .from('vault-secure')
      .upload(`vault/${filename}`, encrypted, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('[Vault Upload] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('vault-secure')
      .getPublicUrl(`vault/${filename}`);

    const fileUrl = urlData.publicUrl;

    const result = await dbQuery(
      `INSERT INTO vault_files (filename, file_size, file_url, encrypted_key, file_hash, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, uploaded_at`,
      [file.name, file.size, fileUrl, `${iv}:${authTag}`, fileHash, adminUsername]
    );

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await dbQuery(
      `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
       VALUES ($1, $2, $3, $4, TRUE)`,
      ['file_upload', adminUsername, ipAddress, `File: ${file.name} (${file.size} bytes)`]
    );

    return NextResponse.json({
      success: true,
      file: {
        id: result.rows[0].id,
        filename: result.rows[0].filename,
        uploaded_at: result.rows[0].uploaded_at
      }
    });
  } catch (error) {
    console.error('[Vault Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

