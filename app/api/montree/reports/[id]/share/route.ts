// app/api/montree/reports/[id]/share/route.ts
// Generate share link for parent portal
// Phase 6 - Session 57

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  createReportToken, 
  getTokensForReport,
  revokeReportToken,
  buildShareUrl 
} from '@/lib/montree/reports/token-service';

// ============================================
// POST - Create new share link
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;

    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: report_id } = await params;

    // 2. Parse optional body
    let expires_in_days = 30;
    let restricted_to_email: string | undefined;

    try {
      const body = await request.json();
      if (body.expires_in_days && typeof body.expires_in_days === 'number') {
        expires_in_days = Math.min(Math.max(body.expires_in_days, 1), 90); // 1-90 days
      }
      if (body.restricted_to_email && typeof body.restricted_to_email === 'string') {
        restricted_to_email = body.restricted_to_email;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // 3. Create token
    const result = await createReportToken({
      report_id,
      created_by: teacherName,
      expires_in_days,
      restricted_to_email,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      share_url: result.share_url,
      expires_at: result.token?.expires_at,
    });

  } catch (error) {
    console.error('Share link creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// ============================================
// GET - List existing share links for report
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;

    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: report_id } = await params;

    // 2. Fetch tokens
    const result = await getTokensForReport(report_id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // 3. Add share URLs to each token
    const tokensWithUrls = result.tokens?.map(token => ({
      ...token,
      share_url: buildShareUrl(token.token),
      is_active: !token.is_revoked && new Date(token.expires_at) > new Date(),
    }));

    return NextResponse.json({
      success: true,
      tokens: tokensWithUrls,
    });

  } catch (error) {
    console.error('Share links fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Revoke a share link
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;

    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: report_id } = await params;

    // 2. Get token_id from body
    let token_id: string;
    try {
      const body = await request.json();
      token_id = body.token_id;
    } catch {
      return NextResponse.json(
        { success: false, error: 'token_id required in request body' },
        { status: 400 }
      );
    }

    if (!token_id) {
      return NextResponse.json(
        { success: false, error: 'token_id required' },
        { status: 400 }
      );
    }

    // 3. Verify token belongs to this report (security check)
    const tokensResult = await getTokensForReport(report_id);
    if (!tokensResult.success || !tokensResult.tokens) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify token ownership' },
        { status: 400 }
      );
    }

    const tokenBelongsToReport = tokensResult.tokens.some(t => t.id === token_id);
    if (!tokenBelongsToReport) {
      return NextResponse.json(
        { success: false, error: 'Token does not belong to this report' },
        { status: 403 }
      );
    }

    // 4. Revoke token
    const result = await revokeReportToken({
      token_id,
      revoked_by: teacherName,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Share link revocation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
