// lib/montree/media/types.ts
// TypeScript types for Whale Media Capture System
// Phase 2 - Session 53

// ============================================
// DATABASE TYPES (match Supabase schema)
// ============================================

export interface MontreeMedia {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;  // NULL for group photos
  
  // Media info
  media_type: 'photo' | 'video';
  storage_path: string;
  thumbnail_path: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;  // For videos only
  width: number | null;
  height: number | null;
  
  // Metadata
  captured_by: string;  // Teacher name
  captured_at: string;  // ISO timestamp
  uploaded_at: string;  // ISO timestamp
  
  // Content
  tags: string[];  // ["practical_life", "concentration"]
  work_id: string | null;  // Link to curriculum work
  caption: string | null;
  
  // Processing
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  processing_status: 'pending' | 'processing' | 'complete' | 'failed';
  
  created_at: string;
  updated_at: string;
}

export interface MontreeMediaChild {
  id: string;
  media_id: string;
  child_id: string;
  created_at: string;
}

export interface MontreeChild {
  id: string;
  name: string;
  gender?: 'he' | 'she' | 'they';
  display_order?: number;
  date_of_birth?: string;
  enrollment_date?: string;
  active_status?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MontreeWorkTranslation {
  work_id: string;
  display_name: string;
  developmental_context: string;
  home_extension: string | null;
  photo_caption_template: string | null;
  area: 'practical_life' | 'sensorial' | 'language' | 'mathematics' | 'cultural';
  category: string | null;
}

// ============================================
// CLIENT-SIDE TYPES
// ============================================

export interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
}

export interface CompressedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export interface ThumbnailResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export interface UploadProgress {
  status: 'preparing' | 'compressing' | 'uploading' | 'creating-record' | 'complete' | 'error';
  progress: number;  // 0-100
  message: string;
  error?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface UploadMediaRequest {
  school_id: string;
  classroom_id?: string;
  child_id?: string;  // Optional for group photos
  child_ids?: string[];  // For group photos, multiple children
  media_type: 'photo' | 'video';
  captured_by: string;
  captured_at: string;
  work_id?: string;
  caption?: string;
  tags?: string[];
}

export interface UploadMediaResponse {
  success: boolean;
  media?: MontreeMedia;
  error?: string;
}

export interface MediaListResponse {
  success: boolean;
  media: MontreeMedia[];
  total: number;
  page: number;
  limit: number;
}

export interface MediaFilters {
  child_id?: string;
  classroom_id?: string;
  work_id?: string;
  area?: string;
  date_from?: string;
  date_to?: string;
  untagged_only?: boolean;
}

// ============================================
// COMPONENT PROPS TYPES
// ============================================

export interface CameraCaptureProps {
  onCapture: (photo: CapturedPhoto) => void;
  onCancel: () => void;
}

export interface ChildSelectorProps {
  children: MontreeChild[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  multiSelect?: boolean;
  loading?: boolean;
}

export interface MediaCardProps {
  media: MontreeMedia;
  childName?: string;
  onClick?: () => void;
  showActions?: boolean;
}

export interface MediaGalleryProps {
  media: MontreeMedia[];
  loading?: boolean;
  onMediaClick?: (media: MontreeMedia) => void;
  emptyMessage?: string;
}

export interface TaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string;
  currentChildIds: string[];
  currentWorkId?: string;
  onSave: (childIds: string[], workId?: string) => Promise<void>;
}

// ============================================
// STORAGE PATH UTILITIES
// ============================================

export interface StoragePathParams {
  schoolId: string;
  childId?: string;  // 'group' if multiple children
  year: number;
  month: number;
  filename: string;
}

/**
 * Generate storage path for media file
 * Pattern: /{school_id}/{child_id}/{YYYY}/{MM}/{uuid}.{ext}
 */
export function generateStoragePath(params: StoragePathParams): string {
  const { schoolId, childId, year, month, filename } = params;
  const childFolder = childId || 'group';
  const monthPadded = month.toString().padStart(2, '0');
  return `${schoolId}/${childFolder}/${year}/${monthPadded}/${filename}`;
}

/**
 * Generate thumbnail path from main media path
 */
export function generateThumbnailPath(mediaPath: string): string {
  const parts = mediaPath.split('.');
  const ext = parts.pop();
  return `${parts.join('.')}-thumb.${ext}`;
}
