// lib/montree/features/types.ts
// Feature flag type definitions

export type FeatureKey =
  | 'voice_observations'
  | 'raz_reading_tracker'
  | 'weekly_plan_upload'
  | 'daily_reports'
  | 'parent_portal'
  | 'games'
  | 'weekly_admin_docs'
  // Teacher-only Teaching Notes view on the Weekly Admin tab — the week's
  // planned works, each with what-it-is + how-to-teach. Migration 227. Default OFF.
  | 'weekly_teaching_notes'
  | 'teacher_notes'
  | 'multi_teacher_mgmt'
  | 'class_events'
  | 'bulk_student_import'
  | 'multi_child_tagging'
  | 'smart_capture'
  | 'classroom_setup_ai'
  | 'photo_audit'
  | 'guru_advisor'
  | 'parent_reports'
  | 'batch_reports'
  | 'phonics_tools'
  | 'curriculum_browser'
  | 'community_library'
  | 'picture_bank'
  | 'english_corner'
  | 'educational_games'
  | 'tts_voice'
  | 'photo_crop'
  // Dashboard sections (gated for minimalist default)
  | 'daily_brief'
  | 'intelligence_panels'
  | 'teacher_tools'
  | 'shelf_autopilot'
  | 'paperwork_tracker'
  // Capture page tools
  | 'daily_language_6'
  // Onboarding
  | 'tell_guru_onboarding'
  // Child week view
  | 'weekly_activity_summary'
  // Weekly report AI tier (free = no AI, haiku = cheap, sonnet = premium)
  | 'ai_tier_haiku'
  | 'ai_tier_sonnet'
  // Photo audit UX
  | 'unified_photo_tagger'
  // Photo pipeline v2 (Session 117+ regression fix bundle) — confidence-gated
  // is_curriculum_work routing + reduced moat budget + top_candidates on
  // sonnet_drafted + age-decayed visual memory ordering. Default ON via
  // migration 224. Flip per-school to roll back to v1 if quality drops.
  | 'photo_pipeline_v2'
  // 🚨 Session 121 — application-layer AES-256-GCM encryption on parent-school
  // message bodies + meeting note summaries/transcripts/notes + call transcripts.
  // Default OFF; flip on (globally OR per-school) once MONTREE_ENCRYPTION_KEY is
  // set in Railway. Migration 226. See lib/montree/messaging-crypto.ts +
  // docs/handoffs/MONTREE_ENCRYPTION_RUNBOOK.md.
  | 'encryption_v1'
  // ── Astra/Mira voice + co-pilot + home-learning arc (branch
  // astra-voice-copilot). All default OFF. ──────────────────────────────
  | 'voice_astra' // hands-free Astra voice agent (Agora Conversational AI)
  | 'live_copilot' // live meeting co-pilot suggestions panel
  | 'home_learning' // home oral-reading tutor surface
  // Language presentation (semester presentation tool — once/twice per year)
  | 'language_presentation'
  // Parent messaging — Session 98 threaded surface at /montree/parent/messages.
  // OFF by default; when ON, parents can initiate parent_teacher / parent_principal
  // threads that flow into the same Communication system from migration 190.
  | 'parent_messaging'
  // ── School Ecosystem (Session 115+) ────────────────────────────────────
  // Phase 2 — appointment booking. Parents book meetings with teachers + the
  // principal. Migration 216. Default OFF, schools opt in.
  | 'appointments'
  // Phase 3 — principal newsletter + announcements. Migration 217. Default OFF.
  | 'principal_newsletter'
  // Phase 4 — school events with RSVP + signup conversion. Migration 218.
  | 'school_events'
  // Phase 6 — birthday + holiday calendar surfacing. Migration 220.
  | 'school_calendar'
  // Phase 116.2 — Jitsi video calls on parent appointments. Migration 222.
  // When ON: parents can opt into a video call at booking time; URL is
  // deterministic from the appointment's ical_token. Default OFF —
  // schools opt in once they're comfortable with the parent-messaging
  // + appointments stack.
  | 'video_calls'
  // Menu items — all gated so schools can customise their menu
  | 'menu_notes'
  | 'menu_focus_list'
  | 'menu_photo_audit'
  | 'menu_guru'
  | 'menu_curriculum'
  | 'menu_classroom_overview'
  | 'menu_photo_albums'
  | 'menu_library'
  | 'menu_earnings'
  | 'menu_manage_students'
  | 'menu_class_progress'
  | 'menu_language_semester'
  | 'menu_classroom_setup';

export interface MontreeFeature {
  feature_key: FeatureKey;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_premium: boolean;
  default_enabled: boolean;
  enabled: boolean;
  school_enabled: boolean | null;
  classroom_enabled: boolean | null;
}

export interface FeaturesState {
  features: MontreeFeature[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}
