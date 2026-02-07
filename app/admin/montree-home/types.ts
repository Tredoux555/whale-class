export interface Family {
  id: string;
  email: string;
  name: string;
  timezone: string;
  onboarding_completed: boolean;
  created_at: string;
  children?: HomeChild[];
}

export interface HomeChild {
  id: string;
  family_id: string;
  name: string;
  birth_date: string;
  color: string;
  start_date: string;
  created_at: string;
}

export interface HomeCurriculumWork {
  id: string;
  family_id: string;
  area: string;
  category: string;
  name: string;
  description: string;
  age_range: string;
  sequence: number;
  video_url: string | null;
  materials: { name: string; price?: number; essential?: boolean }[];
  is_active: boolean;
  created_at: string;
}

export interface ChildProgress {
  id: string;
  child_id: string;
  curriculum_work_id: string;
  status: number;
  presented_date: string | null;
  practicing_date: string | null;
  mastered_date: string | null;
  times_practiced: number;
}

export interface TodayActivity {
  id: string;
  name: string;
  area: string;
  category: string;
  description: string;
  video_url: string | null;
  status: number;
}

export interface ProgressSummary {
  total_works: number;
  mastered: number;
  practicing: number;
  presented: number;
  overall_percent: number;
  by_area: Record<string, { total: number; mastered: number; percent: number }>;
}
