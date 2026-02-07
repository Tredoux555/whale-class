// app/api/montree/notify/route.ts
// Session 118: Send email notifications to parents

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { notifyParentsOfReport, sendReportReadyEmail } from '@/lib/montree/email';

// POST - Notify parents of a report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childId, reportId, weekNumber, year } = body;

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const childName = child.nickname || child.name;

    // Get linked parents
    const { data: links, error: linkError } = await supabase
      .from('montree_parent_children')
      .select(`
        parent_id,
        montree_parents!inner ( id, email, name )
      `)
      .eq('child_id', childId);

    if (linkError) {
      console.error('Get parents error:', linkError);
      return NextResponse.json({ error: 'Failed to get parents' }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No parents linked to this child',
        sent: 0,
        failed: 0
      });
    }

    // Extract parent info
    const parentEmails = links.map((link: any) => ({
      email: link.montree_parents.email,
      name: link.montree_parents.name
    }));

    // Send notifications
    const result = await notifyParentsOfReport(
      childId,
      childName,
      weekNumber || getCurrentWeek(),
      year || new Date().getFullYear(),
      reportId || '',
      parentEmails
    );

    return NextResponse.json({
      success: true,
      message: `Notified ${result.sent} parent(s)`,
      sent: result.sent,
      failed: result.failed
    });

  } catch (error: unknown) {
    console.error('Notify error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}

// Helper to get current week number
function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}
