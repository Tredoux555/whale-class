// /api/montree/super-admin/master-outreach/download/route.ts
// Super Admin — download the master outreach xlsx
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
    const filePath = path.join(process.cwd(), 'Montree_Master_Outreach.xlsx');
    const buf = await readFile(filePath);
    // Convert Node Buffer to ArrayBuffer slice for NextResponse
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return new NextResponse(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Montree_Master_Outreach_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[master-outreach/download] failed:', e);
    return NextResponse.json({ error: 'File not found', detail: e?.message }, { status: 500 });
  }
}
