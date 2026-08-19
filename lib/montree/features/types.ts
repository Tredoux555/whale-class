// lib/montree/features/types.ts
// Feature flag type definitions

export type FeatureKey =
  // Paper Scan (Cellphoneless Classrooms) — teachers handwrite observations on a
  // paper record sheet during class, then photograph the sheet in the PWA after
  // class. Claude vision extracts per-child records, the teacher reviews every
  // read, and only approved rows reach the children's profiles. Migration 308.
  // Default OFF — enable per school via montree_school_features until Phase-0 accuracy is proven.
  | 'paper_scan'
  // Photo Onboarding — the teacher uploads whatever class list the school
  // already has (photo / PDF / DOCX / XLSX). Claude reads the students,
  // birthdays and notes, we reconcile against the classroom's active roster,
  // and the teacher reviews every proposed create / update / archive before
  // anything is written. Migration 325. Default ON — nothing is saved without
  // an explicit review + Apply.
  | 'photo_onboarding'
  // Child Onboarding — the family's enrollment intake. Parents fill in the full
  // form on their existing parent login (guardians, emergency contacts,
  // authorized pickup adults with photos, allergies, documents, per-purpose
  // consents, and a getting-to-know-your-child section); the teacher reviews and
  // commits it; the school then prints cubby / toothbrush / bed / table labels
  // and the pickup + sign-in sheets, all carrying the child's face. Committed
  // intake also feeds the child's Guru context. Migration 326. No AI anywhere.
  // Default ON — nothing reaches a child's record without an explicit Commit.
  | 'child_onboarding'
  // Give Control: school manages its own features from the dashboard
  // (/montree/dashboard/school-features + three-dot menu row).
  // No migration — montree_school_features override row only, default OFF.
  | 'feature_self_serve'
  // Work Rhythm: per-child, per-area time distribution over a week or a month
  // (/montree/dashboard/work-rhythm). Reads approved Paper Scan rows + confirmed
  // photos; writes nothing. Migration 327 inserts the definition row (it was
  // originally hand-inserted in production only, so a fresh database came up
  // without it and the flag could never be turned on). Default OFF.
  | 'work_rhythm'
  | 'voice_observations'
  | 'raz_reading_tracker'
  | 'weekly_plan_upload'
  | 'daily_reports'
  | 'parent_portal'
  | 'games'
  | 'weekly_admin_docs'
  // Optional Wrap Up tabs — Discussion (flag photos for team review) + Get Advice
  // (Guru next-steps per child). Migration 283. Both default OFF; schools opt in.
  | 'wrap_discussion'
  | 'wrap_get_advice'
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
  // Dark Phonics works pack — exposes the 49 Pink phonics lessons as Language-area
  // works (tag + track like any work). Virtual/flag-gated in /api/montree/works.
  // Default OFF; schools opt in. See lib/montree/phonics/phonics-works.ts.
  | 'phonics_works'
  // English Program (58-Week Curriculum) — gates the new `english` curriculum
  // area. The 58 weeks are seeded as ordinary works (source='english_program')
  // per school AFTER this flag is enabled, via scripts/curriculum/seed-english-program.mjs.
  // Migration 293. Default OFF; schools opt in.
  | 'english_program'
  // 🌱 Montree Milestones — the three-times-a-year developmental check-in
  // (per-child tab + the class-level index at /montree/dashboard/milestones +
  // the principal's school-wide view). Migration 314 inserts the definition row
  // (category 'assessment'). Default OFF; schools opt in.
  | 'child_evaluation'
  // 🌿 Montree Canopy — the Grade 1 (G1) TIER of Montree Milestones, for children of 6–7
  // who have outgrown the kindergarten bands. Requires `child_evaluation` as well: this
  // flag opens the extra tier, it does not open the instrument. Migration 322 inserts the
  // definition row (category 'assessment', premium). Default OFF; schools opt in.
  // Deliberately NOT in FEATURE_MENU_MAP — Canopy lives inside the existing Milestones
  // surfaces and owns no menu row of its own.
  | 'child_evaluation_g1'
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
  // Parent-night slideshow ("Present" button on the dashboard student grid).
  // Full-bleed photo slideshow at /montree/dashboard/present. Migration 284.
  // Default OFF — a brand-new school shouldn't see it; schools opt in via
  // super-admin → ⚙️ Features.
  | 'parent_night_present'
  // Capture page tools
  | 'daily_language_6'
  // Onboarding
  | 'tell_guru_onboarding'
  // Onboarding Copilot ("The Guide") — a floating guide dock that walks new
  // principals (Astra voice) + teachers (Guru voice) through first setup,
  // deriving completion from real DB state. Migration 297. Default ON —
  // established schools complete instantly and the dock retires itself.
  | 'onboarding_copilot'
  // Child week view
  | 'weekly_activity_summary'
  // Weekly report AI tier (free = no AI, haiku = cheap, sonnet = premium)
  | 'ai_tier_haiku'
  | 'ai_tier_sonnet'
  // Photo audit UX
  | 'unified_photo_tagger'
  // ✨ Group Lesson Suggester (Jun 10, 2026) — cross-child readiness grouping
  // on the teacher dashboard ("Amy, Leo and Kayla are all ready for the Teen
  // Board"). Deterministic, no AI cost. Default ON via migration 247.
  | 'group_lesson_suggester'
  // ✨ Curriculum Gap Radar (Jun 10, 2026) — flags areas gone quiet relative
  // to the rest of the classroom, or with many never-presented works.
  // Deterministic, no AI cost. Default ON via migration 248.
  | 'curriculum_gap_radar'
  // ✨ Home Practice Cards (Jun 10, 2026) — a tiny weekly "try this at home"
  // activity on the parent report, matched to the child's current work. One
  // Haiku call/child/week, tier-gated. Default ON via migration 249.
  | 'home_practice_cards'
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
  | 'menu_classroom_setup'
  // Dark Phonics Live — 1-on-1 online phonics classroom (Agora video +
  // interactive whiteboard, credits-based booking). Migration 334.
  // Default OFF — enable per school once Whiteboard credentials are provisioned.
  | 'dark_phonics_live';

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
