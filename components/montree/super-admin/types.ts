export interface School {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  owner_name: string | null;
  subscription_status: string;
  subscription_tier: string;
  plan_type: string;
  account_type?: string;
  is_active: boolean;
  created_at: string;
  trial_ends_at: string | null;
  classroom_count?: number;
  teacher_count?: number;
  student_count?: number;
}

export interface Feedback {
  id: string;
  school_id: string | null;
  user_type: string;
  user_id: string | null;
  user_name: string | null;
  page_url: string | null;
  feedback_type: string;
  message: string;
  screenshot_url: string | null;
  is_read: boolean;
  created_at: string;
  school?: { id: string; name: string } | null;
}

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  school_name: string | null;
  role: string | null;
  interest_type: 'try' | 'info';
  message: string | null;
  status: string;
  notes: string | null;
  provisioned_school_id: string | null;
  created_at: string;
  updated_at: string;
}
