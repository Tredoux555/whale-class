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
  last_active_at?: string | null;
  estimated_monthly_cost?: number;
  interaction_count_30d?: number;
  monthly_ai_budget_usd?: number;
  ai_budget_action?: string;
  api_spent_this_month?: number;
  api_calls_this_month?: number;
  ai_tier?: 'free' | 'premium';
  signup_country?: string | null;
  signup_country_code?: string | null;
  signup_city?: string | null;
  signup_region?: string | null;
  signup_timezone?: string | null;
  login_codes?: string[];
  /**
   * Login codes labelled with the role + person they unlock. Sorted with
   * principal first, then lead teacher, teacher, assistant teacher.
   * Renders in the super-admin Schools row so each code shows whose it is.
   */
  login_codes_labelled?: Array<{
    code: string;
    // 'agent' = the referral code that signed the school up (e.g. GLORIA-ZXNF).
    // Sorted first in the chip strip. Carries optional revenue share %.
    role: 'agent' | 'principal' | 'lead_teacher' | 'teacher' | 'assistant_teacher';
    name: string;
    active: boolean;
    pct?: number | null;
  }>;
  /**
   * Agent attribution. NULL when the school signed up directly (no referral
   * code used). Populated when montree_schools.founding_teacher_id resolves
   * to a montree_teachers row.
   */
  agent?: {
    id: string;
    name: string | null;
    email: string | null;
    is_agent: boolean;
  } | null;
  // Phase 4 — Stripe billing fields. All optional because pre-Phase-4
  // schools won't have any of these populated.
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  billing_quantity?: number | null;
  monthly_charge_estimate_cents?: number | null;
  last_synced_to_stripe_at?: string | null;
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
