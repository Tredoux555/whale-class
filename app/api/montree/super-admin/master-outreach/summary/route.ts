// /api/montree/super-admin/master-outreach/summary/route.ts
// Super Admin — JSON summary of the master outreach file (pre-baked by the verification pipeline)
import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'master-outreach-summary.json');
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    console.error('[master-outreach/summary] failed:', e);
    return NextResponse.json({ error: 'Summary not available', detail: e?.message }, { status: 500 });
  }
}
