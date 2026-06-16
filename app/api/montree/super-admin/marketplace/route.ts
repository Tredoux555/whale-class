// app/api/montree/super-admin/marketplace/route.ts
// Curate the home shop — super-admin only. This is the admin system the products
// live under: create, edit, activate/deactivate, delete. The parent side
// (/api/montree/marketplace) is read-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

const MISSING_TABLE = '42P01';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'private, no-store' };

// Columns a curator may set. Anything else in the body is ignored.
const EDITABLE = new Set([
  'title', 'description', 'image_url', 'seller_name', 'product_url',
  'price_cents', 'sale_price_cents', 'currency', 'discount_code',
  'category', 'age_min', 'age_max', 'is_active', 'sort',
]);

function pick(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (EDITABLE.has(k)) out[k] = v;
  return out;
}

function validUrl(u: unknown): boolean {
  if (typeof u !== 'string') return false;
  try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:'; } catch { return false; }
}

export async function GET(request: NextRequest) {
  const ok = await verifySuperAdminAuth(request.headers);
  if (!ok.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await getSupabase()
    .from('montree_marketplace_products')
    .select('*')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    if (error.code === MISSING_TABLE) return NextResponse.json({ products: [], migration_pending: true }, { headers: NO_STORE });
    return NextResponse.json({ error: 'Could not load products' }, { status: 500 });
  }
  return NextResponse.json({ products: data || [] }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const ok = await verifySuperAdminAuth(request.headers);
  if (!ok.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const fields = pick(body);
  if (!fields.title || typeof fields.title !== 'string') return NextResponse.json({ error: 'title required' }, { status: 400 });
  if (!validUrl(fields.product_url)) return NextResponse.json({ error: 'product_url must be a valid http(s) URL' }, { status: 400 });
  if (fields.image_url != null && !validUrl(fields.image_url)) return NextResponse.json({ error: 'image_url must be a valid URL' }, { status: 400 });

  const { data, error } = await getSupabase().from('montree_marketplace_products').insert(fields).select('id').maybeSingle();
  if (error) {
    if (error.code === MISSING_TABLE) return NextResponse.json({ error: 'Run migration 264 first.' }, { status: 503 });
    return NextResponse.json({ error: 'Could not create product' }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id }, { headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  const ok = await verifySuperAdminAuth(request.headers);
  if (!ok.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'valid id required' }, { status: 400 });

  const fields = pick(body);
  if (fields.product_url != null && !validUrl(fields.product_url)) return NextResponse.json({ error: 'product_url must be a valid URL' }, { status: 400 });
  if (fields.image_url != null && fields.image_url !== '' && !validUrl(fields.image_url)) return NextResponse.json({ error: 'image_url must be a valid URL' }, { status: 400 });
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  fields.updated_at = new Date().toISOString();

  const { error } = await getSupabase().from('montree_marketplace_products').update(fields).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update product' }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  const ok = await verifySuperAdminAuth(request.headers);
  if (!ok.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'valid id required' }, { status: 400 });
  const { error } = await getSupabase().from('montree_marketplace_products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete product' }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
