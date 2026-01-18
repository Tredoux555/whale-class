// app/api/montree/parent/view/[token]/route.ts
// Public endpoint - Validate token and return report for parent viewing
// Phase 6 - Session 57
// NO AUTHENTICATION REQUIRED - This is accessed via magic link

import { NextRequest, NextResponse } from 'next/server';
import { validateTokenAndGetReport } from '@/lib/montree/reports/token-service';

// ============================================
// GET - Validate token and get report
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token format (should be 64-char hex)
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { 
          success: false, 
          valid: false,
          reason: 'invalid',
          error: 'Invalid link format' 
        },
        { status: 400 }
      );
    }

    // Validate token and get report data
    const result = await validateTokenAndGetReport(token);

    if (!result.success || !result.valid) {
      // Return different status codes based on reason
      const statusCode = result.reason === 'expired' ? 410 : // Gone
                        result.reason === 'revoked' ? 403 :  // Forbidden
                        result.reason === 'not_found' ? 404 : // Not Found
                        400; // Bad Request

      return NextResponse.json(
        {
          success: false,
          valid: false,
          reason: result.reason,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    // Success - return report data
    return NextResponse.json({
      success: true,
      valid: true,
      report: result.report,
      child: result.child,
      media_urls: result.media_urls,
    });

  } catch (error) {
    console.error('Parent view error:', error);
    return NextResponse.json(
      { 
        success: false, 
        valid: false,
        error: 'Failed to load report' 
      },
      { status: 500 }
    );
  }
}
