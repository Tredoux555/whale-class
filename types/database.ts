// types/database.ts
export type AgeGroup = '2-3' | '3-4' | '4-5' | '5-6';
export type CurriculumArea = 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'english' | 'cultural';
export type StatusLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const STATUS_LEVELS = {
  0: 'Not Introduced',
  1: 'Observed',
  2: 'Guided Practice',
  3: 'Independent',
  4: 'Mastery',
  5: 'Transcended'
} as const;

export interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  enrollment_date: string;
  age_group: AgeGroup;
  active_status: boolean;
  photo_url?: string;
  parent_email?: string;
  parent_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChildInput {
  name: string;
  date_of_birth: string;
  enrollment_date?: string;
  age_group: AgeGroup;
  photo_url?: string;
  parent_email?: string;
  parent_name?: string;
  notes?: string;
}

export interface UpdateChildInput {
  name?: string;
  date_of_birth?: string;
  age_group?: AgeGroup;
  active_status?: boolean;
  photo_url?: string;
  parent_email?: string;
  parent_name?: string;
  notes?: string;
}

export interface SkillCategory {
  id: string;
  area: CurriculumArea;
  category: string;
  subcategory?: string;
  display_order: number;
  created_at: string;
}

export interface Skill {
  id: string;
  category_id: string;
  skill_name: string;
  description?: string;
  age_min: number;
  age_max: number;
  prerequisites: string[];
  order_sequence: number;
  created_at: string;
}

export interface ChildProgress {
  id: string;
  child_id: string;
  skill_id: string;
  status_level: StatusLevel;
  date_updated: string;
  notes?: string;
  teacher_initials?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProgressInput {
  child_id: string;
  skill_id: string;
  status_level: StatusLevel;
  notes?: string;
  teacher_initials?: string;
}

export interface ChildProgressWithSkill extends ChildProgress {
  skill: Skill;
  category: SkillCategory;
}

export interface Activity {
  id: string;
  name: string;
  area: CurriculumArea;
  age_min: number;
  age_max: number;
  skill_level: number;
  duration_minutes?: number;
  materials: string[];
  instructions: string;
  learning_goals: string[];
  prerequisites: string[];
  image_url?: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityInput {
  name: string;
  area: CurriculumArea;
  age_min: number;
  age_max: number;
  skill_level: number;
  duration_minutes?: number;
  materials: string[];
  instructions: string;
  learning_goals: string[];
  prerequisites?: string[];
  image_url?: string;
  video_url?: string;
}

export interface ActivityLog {
  id: string;
  child_id: string;
  activity_id?: string;
  activity_date: string;
  duration_minutes?: number;
  engagement_level?: number;
  completed: boolean;
  notes?: string;
  teacher_initials?: string;
  created_at: string;
}

export interface DailyActivityAssignment {
  id: string;
  child_id: string;
  activity_id: string;
  assigned_date: string;
  completed: boolean;
  completed_date?: string;
  notes?: string;
  created_at: string;
}

export interface DailyActivityAssignmentWithDetails extends DailyActivityAssignment {
  activity: Activity;
  child: Child;
}

export interface ProgressSummaryByArea {
  area: CurriculumArea;
  total_skills: number;
  not_introduced: number;
  observed: number;
  guided_practice: number;
  independent: number;
  mastery: number;
  transcended: number;
  average_status: number;
}

export interface ActivitySelectionCriteria {
  childId: string;
  childAge: number;
  ageGroup: AgeGroup;
  currentSkillLevels: Record<string, StatusLevel>;
  previousActivities: string[];
  preferredAreas?: CurriculumArea[];
  excludeAreas?: CurriculumArea[];
}

export interface ScoredActivity extends Activity {
  score: number;
  reasons: string[];
}
