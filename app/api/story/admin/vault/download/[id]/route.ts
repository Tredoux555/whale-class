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

function decryptFile(encryptedBuffer: Buffer, password: string): Buffer {
  try {
    const salt = encryptedBuffer.slice(0, 32);
    const iv = encryptedBuffer.slice(32, 48);
    const authTag = encryptedBuffer.slice(48, 64);
    const encrypted = encryptedBuffer.slice(64);

    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  } catch (error) {
    console.error('[Vault Decrypt] Error:', error);
    throw new Error('Decryption failed');
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const fileResult = await dbQuery(
      'SELECT filename, file_url FROM vault_files WHERE id = $1 AND deleted_at IS NULL',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = fileResult.rows[0];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const filePathMatch = file.file_url.match(/vault\/[^?]+/);
    if (!filePathMatch) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const filePath = filePathMatch[0];

    const { data: encryptedData, error: downloadError } = await supabase.storage
      .from('vault-secure')
      .download(filePath);

    if (downloadError || !encryptedData) {
      console.error('[Vault Download] Error:', downloadError);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const vaultPassword = process.env.VAULT_PASSWORD || 'change-this-in-env';
    const encryptedBuffer = Buffer.from(await encryptedData.arrayBuffer());
    
    let decryptedBuffer: Buffer;
    try {
      decryptedBuffer = decryptFile(encryptedBuffer, vaultPassword);
    } catch (decryptError) {
      console.error('[Vault Download] Decryption error:', decryptError);
      return NextResponse.json({ error: 'Failed to decrypt file' }, { status: 500 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await dbQuery(
      `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
       VALUES ($1, $2, $3, $4, TRUE)`,
      ['file_download', adminUsername, ipAddress, `Downloaded: ${file.filename}`]
    ).catch(() => {});

    return new NextResponse(decryptedBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': decryptedBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('[Vault Download] Error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}

