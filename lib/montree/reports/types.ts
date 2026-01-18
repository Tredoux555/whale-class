// lib/montree/reports/types.ts
// TypeScript types for Weekly Report Generation System
// Phase 3 - Session 54

// ============================================
// DATABASE TYPES (match Supabase schema)
// ============================================

export type ReportType = 'teacher' | 'parent';
export type ReportStatus = 'draft' | 'pending_review' | 'approved' | 'sent';

export interface MontreeWeeklyReport {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string;
  
  // Time period
  week_start: string;  // DATE as ISO string
  week_end: string;    // DATE as ISO string
  
  // Report type and status
  report_type: ReportType;
  status: ReportStatus;
  
  // Content (structured JSON)
  content: ReportContent;
  
  // Generated files
  pdf_path: string | null;
  slideshow_path: string | null;
  
  // Audit trail
  generated_at: string | null;
  generated_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  sent_at: string | null;
  sent_to: string[] | null;  // Array of email addresses or parent IDs
  
  created_at: string;
  updated_at: string;
}

// ============================================
// REPORT CONTENT STRUCTURE
// ============================================

export interface ReportContent {
  // Overview
  summary: string;
  
  // Individual highlights (one per photo/activity)
  highlights: ReportHighlight[];
  
  // Aggregated data
  areas_explored: CurriculumArea[];
  total_activities: number;
  total_photos: number;
  
  // Optional sections
  milestones?: string[];
  teacher_notes?: string;  // Private - only in teacher report
  parent_message?: string; // Warm closing message for parents
  
  // Metadata
  generated_with_ai: boolean;
  ai_model?: string;
  generation_timestamp?: string;
}

export interface ReportHighlight {
  // Link to media
  media_id: string;
  storage_path?: string;
  thumbnail_path?: string;
  
  // Link to curriculum work (if tagged)
  work_id: string | null;
  work_name: string | null;
  area: CurriculumArea | null;
  
  // AI-generated content
  observation: string;           // What the child did
  developmental_note: string;    // Why it matters (Montessori perspective)
  home_extension: string | null; // Activity suggestion for parents
  
  // Metadata
  captured_at: string;
  caption: string | null;
}

export type CurriculumArea = 
  | 'practical_life' 
  | 'sensorial' 
  | 'language' 
  | 'mathematics' 
  | 'cultural';

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GenerateReportRequest {
  child_id: string;
  week_start: string;  // YYYY-MM-DD
  week_end: string;    // YYYY-MM-DD
  report_type: ReportType;
  include_ai_content?: boolean;  // Default true
}

export interface GenerateReportResponse {
  success: boolean;
  report?: MontreeWeeklyReport;
  error?: string;
  stats?: {
    photos_included: number;
    activities_detected: number;
    ai_generation_time_ms?: number;
  };
}

export interface UpdateReportRequest {
  content?: Partial<ReportContent>;
  status?: ReportStatus;
}

export interface SendReportRequest {
  report_id: string;
  recipient_emails: string[];
  include_pdf?: boolean;
  include_slideshow?: boolean;
  custom_message?: string;
}

export interface ReportListFilters {
  child_id?: string;
  classroom_id?: string;
  week_start?: string;
  status?: ReportStatus;
  report_type?: ReportType;
}

export interface ReportListResponse {
  success: boolean;
  reports: MontreeWeeklyReport[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// AI GENERATION TYPES
// ============================================

export interface AIGenerationInput {
  child_name: string;
  child_gender: 'he' | 'she' | 'they';
  week_start: string;
  week_end: string;
  
  activities: AIActivityInput[];
  
  // Optional context
  previous_reports?: string[];  // For continuity
  teacher_notes?: string;
}

export interface AIActivityInput {
  media_id: string;
  work_id: string | null;
  work_name: string | null;
  area: CurriculumArea | null;
  
  // From work_translations table
  developmental_context: string | null;
  home_extension_template: string | null;
  photo_caption_template: string | null;
  
  // Raw data
  captured_at: string;
  caption: string | null;
  tags: string[];
}

export interface AIGenerationOutput {
  summary: string;
  highlights: AIHighlightOutput[];
  parent_message: string;
  milestones: string[];
}

export interface AIHighlightOutput {
  media_id: string;
  observation: string;
  developmental_note: string;
  home_extension: string | null;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface ReportCardProps {
  report: MontreeWeeklyReport;
  childName: string;
  onClick?: () => void;
  showActions?: boolean;
}

export interface ReportEditorProps {
  report: MontreeWeeklyReport;
  childName: string;
  onSave: (updates: UpdateReportRequest) => Promise<void>;
  onApprove: () => Promise<void>;
  onSend: () => Promise<void>;
}

export interface ReportPreviewProps {
  report: MontreeWeeklyReport;
  childName: string;
  thumbnailUrls: Record<string, string>;
  mode: 'teacher' | 'parent';
}

export interface WeekSelectorProps {
  selectedWeek: { start: string; end: string } | null;
  onWeekChange: (week: { start: string; end: string }) => void;
  availableWeeks?: { start: string; end: string; hasReport: boolean }[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the Monday and Sunday of a given week
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: monday, end: sunday };
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format week range for display
 */
export function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}`;
  }
  
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ReportStatus): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-600';
    case 'pending_review': return 'bg-yellow-100 text-yellow-700';
    case 'approved': return 'bg-green-100 text-green-700';
    case 'sent': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Get status display text
 */
export function getStatusText(status: ReportStatus): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'pending_review': return 'Pending Review';
    case 'approved': return 'Approved';
    case 'sent': return 'Sent';
    default: return status;
  }
}

/**
 * Get area display name
 */
export function getAreaDisplayName(area: CurriculumArea): string {
  switch (area) {
    case 'practical_life': return 'Practical Life';
    case 'sensorial': return 'Sensorial';
    case 'language': return 'Language';
    case 'mathematics': return 'Mathematics';
    case 'cultural': return 'Cultural';
    default: return area;
  }
}

/**
 * Get area color
 */
export function getAreaColor(area: CurriculumArea): string {
  switch (area) {
    case 'practical_life': return 'bg-green-100 text-green-700';
    case 'sensorial': return 'bg-pink-100 text-pink-700';
    case 'language': return 'bg-blue-100 text-blue-700';
    case 'mathematics': return 'bg-red-100 text-red-700';
    case 'cultural': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}
