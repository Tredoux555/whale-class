// app/api/montree/paper-scan/[scanId]/route.ts
// One scan + its extraction rows. This is the polling endpoint the scan page
// hits while status is 'pending' | 'extracting', and the read behind the
// review screen once status is 'review'.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    const { data: scan } = await supabase
      .from('montree_paper_scans')
      .select('*')
      .eq('id', scanId)
      .maybeSingle();

    if (!scan) {
      return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
    }
    if (scan.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { data: extractions } = await supabase
      .from('montree_paper_scan_extractions')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: true });

    // Names for every matched child, so the review UI never has to fetch the
    // roster separately (mirrors voice-observation's review route).
    const childIds = [...new Set(
      (extractions || []).map((e: { child_id: string | null }) => e.child_id).filter(Boolean)
    )] as string[];

    const children: Record<string, { id: string; name: string }> = {};
    if (childIds.length > 0) {
      const { data: childData } = await supabase
        .from('montree_children')
        .select('id, name')
        .in('id', childIds);

      for (const child of (childData || []) as Array<{ id: string; name: string }>) {
        children[child.id] = child;
      }
    }

    return NextResponse.json({
      success: true,
      scan,
      extractions: extractions || [],
      children,
    });
  } catch (error) {
    console.error('[PaperScan] Detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load scan' }, { status: 500 });
  }
}
