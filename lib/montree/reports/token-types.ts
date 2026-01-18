// lib/montree/reports/token-types.ts
// TypeScript types for Parent Portal Magic Links
// Phase 6 - Session 57
// AUDITED: Added storage_path to ParentViewHighlight

// ============================================
// DATABASE TYPES
// ============================================

export interface MontreeReportToken {
  id: string;
  report_id: string;
  token: string;
  
  // Lifecycle
  expires_at: string;
  created_at: string;
  created_by: string | null;
  
  // Access tracking
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  
  // Optional restrictions
  restricted_to_email: string | null;
  
  // Revocation
  is_revoked: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
}

// ============================================
// API TYPES
// ============================================

export interface CreateTokenRequest {
  report_id: string;
  expires_in_days?: number;  // Default 30
  restricted_to_email?: string;
}

export interface CreateTokenResponse {
  success: boolean;
  token?: MontreeReportToken;
  share_url?: string;
  error?: string;
}

export interface ValidateTokenResponse {
  success: boolean;
  valid?: boolean;
  report?: ParentViewReport;
  child?: ParentViewChild;
  media_urls?: Record<string, string>;
  error?: string;
  reason?: 'expired' | 'revoked' | 'not_found' | 'invalid';
}

export interface RevokeTokenResponse {
  success: boolean;
  error?: string;
}

// ============================================
// PARENT VIEW TYPES
// ============================================

// Simplified report for parent viewing (no sensitive data)
export interface ParentViewReport {
  id: string;
  week_start: string;
  week_end: string;
  
  // Content
  summary: string;
  highlights: ParentViewHighlight[];
  areas_explored: string[];
  parent_message?: string;
  
  // Metadata
  total_photos: number;
  generated_with_ai: boolean;
  
  // School branding
  school_name: string;
  school_logo_url?: string;
}

export interface ParentViewHighlight {
  media_id: string;
  storage_path: string | null;  // ADDED: For image URL lookup
  work_name: string | null;
  area: string | null;
  observation: string;
  developmental_note: string;
  home_extension: string | null;
  captured_at: string;
}

export interface ParentViewChild {
  id: string;
  name: string;
  photo_url?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface TokenStats {
  total_tokens: number;
  active_tokens: number;
  expired_tokens: number;
  total_views: number;
}
