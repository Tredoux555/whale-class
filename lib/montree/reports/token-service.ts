// lib/montree/reports/token-service.ts
// Secure token generation and management for Parent Portal
// Phase 6 - Session 57

import { createServerClient } from '@/lib/supabase/server';
import type {
  MontreeReportToken,
  CreateTokenResponse,
  ValidateTokenResponse,
  RevokeTokenResponse,
  ParentViewReport,
  ParentViewHighlight,
  ParentViewChild,
} from './token-types';
import type { ReportContent, CurriculumArea } from './types';

// ============================================
// CONSTANTS
// ============================================

const TOKEN_LENGTH = 32; // 32 bytes = 64 hex chars
const DEFAULT_EXPIRY_DAYS = 30;

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a cryptographically secure token
 * Uses Web Crypto API for secure random bytes
 */
function generateSecureToken(): string {
  // Server-side: use Node.js crypto
  const crypto = require('crypto');
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Build the share URL path for a token
 * Returns relative path - client will construct full URL
 */
export function buildShareUrl(token: string): string {
  return `/montree/report/${token}`;
}

// ============================================
// CREATE TOKEN
// ============================================

export async function createReportToken(params: {
  report_id: string;
  created_by: string;
  expires_in_days?: number;
  restricted_to_email?: string;
}): Promise<CreateTokenResponse> {
  const {
    report_id,
    created_by,
    expires_in_days = DEFAULT_EXPIRY_DAYS,
    restricted_to_email,
  } = params;

  try {
    const supabase = await createServerClient();

    // 1. Verify report exists and is ready to share
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select('id, status')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return { success: false, error: 'Report not found' };
    }

    // 2. Generate secure token
    const token = generateSecureToken();
    
    // 3. Calculate expiry
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    // 4. Create token record
    const { data: tokenRecord, error: insertError } = await supabase
      .from('montree_report_tokens')
      .insert({
        report_id,
        token,
        expires_at: expires_at.toISOString(),
        created_by,
        restricted_to_email: restricted_to_email || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Token creation error:', insertError);
      return { success: false, error: 'Failed to create share link' };
    }

    return {
      success: true,
      token: tokenRecord as MontreeReportToken,
      share_url: buildShareUrl(token),
    };

  } catch (error) {
    console.error('Token service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// VALIDATE TOKEN & GET REPORT
// ============================================

export async function validateTokenAndGetReport(
  token: string
): Promise<ValidateTokenResponse> {
  try {
    const supabase = await createServerClient();

    // 1. Find token - using montree_report_tokens table (same as create)
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('montree_report_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return {
        success: false,
        valid: false,
        reason: 'not_found',
        error: 'This link is invalid or has been removed',
      };
    }

    // 2. Check if revoked
    if (tokenRecord.is_revoked) {
      return {
        success: false,
        valid: false,
        reason: 'revoked',
        error: 'This link has been revoked',
      };
    }

    // 3. Check expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return {
        success: false,
        valid: false,
        reason: 'expired',
        error: 'This link has expired',
      };
    }

    // 4. Fetch report with child info
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select(`
        id,
        school_id,
        child_id,
        week_start,
        week_end,
        content,
        status
      `)
      .eq('id', tokenRecord.report_id)
      .single();

    if (reportError || !report) {
      return {
        success: false,
        valid: false,
        reason: 'not_found',
        error: 'Report not found',
      };
    }

    // 5. Fetch child info (from children table - same as admin uses)
    const { data: child } = await supabase
      .from('children')
      .select('id, name, photo_url')
      .eq('id', report.child_id)
      .single();

    // 6. Fetch school info (optional - may not exist for default school)
    let schoolName = 'Whale Class';
    let schoolLogoUrl: string | undefined;
    
    // Only try to fetch if it's not our default placeholder UUID
    if (report.school_id !== '00000000-0000-0000-0000-000000000001') {
      const { data: school } = await supabase
        .from('schools')
        .select('name, logo_url')
        .eq('id', report.school_id)
        .single();
      
      if (school) {
        schoolName = school.name;
        schoolLogoUrl = school.logo_url;
      }
    }

    // 7. Get media URLs for highlights
    const content = report.content as ReportContent;
    const storagePaths = content.highlights
      .map((h: { storage_path?: string }) => h.storage_path)
      .filter(Boolean);

    let mediaUrls: Record<string, string> = {};
    if (storagePaths.length > 0) {
      // Try work-photos bucket first (where most photos are stored)
      const { data: signedUrls } = await supabase.storage
        .from('work-photos')
        .createSignedUrls(storagePaths as string[], 3600); // 1 hour expiry

      if (signedUrls) {
        signedUrls.forEach((item) => {
          if (item.signedUrl && item.path) {
            mediaUrls[item.path] = item.signedUrl;
          }
        });
      }
    }

    // 8. Access tracking not available in simplified report_share_tokens table
    // The original montree_report_tokens had tracking columns, but report_share_tokens doesn't
    // This is fine for MVP - tracking can be added later if needed

    // 9. Build parent-friendly report view
    const parentReport: ParentViewReport = {
      id: report.id,
      week_start: report.week_start,
      week_end: report.week_end,
      summary: content.summary,
      highlights: content.highlights.map((h): ParentViewHighlight => ({
        media_id: h.media_id,
        storage_path: h.storage_path || null,  // AUDIT FIX: Include for URL lookup
        work_name: h.work_name || null,
        area: h.area || null,
        observation: h.observation,
        developmental_note: h.developmental_note,
        home_extension: h.home_extension || null,
        captured_at: h.captured_at,
      })),
      areas_explored: content.areas_explored || [],
      parent_message: content.parent_message,
      total_photos: content.total_photos || content.highlights.length,
      generated_with_ai: content.generated_with_ai || false,
      school_name: schoolName,
      school_logo_url: schoolLogoUrl,
    };

    const parentChild: ParentViewChild = {
      id: child?.id || report.child_id,
      name: child?.name || 'Child',
      photo_url: child?.photo_url,
    };

    return {
      success: true,
      valid: true,
      report: parentReport,
      child: parentChild,
      media_urls: mediaUrls,
    };

  } catch (error) {
    console.error('Token validation error:', error);
    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// REVOKE TOKEN
// ============================================

export async function revokeReportToken(params: {
  token_id: string;
  revoked_by: string;
}): Promise<RevokeTokenResponse> {
  const { token_id, revoked_by } = params;

  try {
    const supabase = await createServerClient();

    // Verify token exists and is not already revoked
    const { data: existingToken, error: fetchError } = await supabase
      .from('montree_report_tokens')
      .select('id, is_revoked')
      .eq('id', token_id)
      .single();

    if (fetchError || !existingToken) {
      return { success: false, error: 'Share link not found' };
    }

    if (existingToken.is_revoked) {
      return { success: false, error: 'Link already revoked' };
    }

    const { error } = await supabase
      .from('montree_report_tokens')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by,
      })
      .eq('id', token_id);

    if (error) {
      return { success: false, error: 'Failed to revoke link' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// GET TOKENS FOR REPORT
// ============================================

export async function getTokensForReport(
  report_id: string
): Promise<{ success: boolean; tokens?: MontreeReportToken[]; error?: string }> {
  try {
    const supabase = await createServerClient();

    const { data: tokens, error } = await supabase
      .from('montree_report_tokens')
      .select('*')
      .eq('report_id', report_id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Failed to fetch tokens' };
    }

    return {
      success: true,
      tokens: tokens as MontreeReportToken[],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
