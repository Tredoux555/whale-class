export interface MontessoriWork {
  id: string;
  name: string;
  curriculum_area: 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'culture';
  video_url: string | null;
  status: 'completed' | 'in_progress';
  youtube_search_phrase?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMontessoriWorkInput {
  name: string;
  curriculum_area: 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'culture';
  video_url?: string;
  status?: 'completed' | 'in_progress';
}

export interface UpdateMontessoriWorkInput {
  name?: string;
  curriculum_area?: 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'culture';
  video_url?: string;
  status?: 'completed' | 'in_progress';
}

export const CURRICULUM_AREAS = [
  { value: 'practical_life', label: 'Practical Life' },
  { value: 'sensorial', label: 'Sensorial' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'language', label: 'Language' },
  { value: 'culture', label: 'Science & Culture' }
] as const;

export const WORK_STATUSES = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
] as const;

