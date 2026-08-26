// lib/lens/types.ts
// The shapes Montree Lens works in, and the small closed vocabularies the
// database CHECKs enforce. Pure data — no imports, no server-only code — so a
// client component may import it directly rather than duplicating the lists.
//
// Every union here has a matching CHECK constraint in migrations/339_lens_v1.sql.
// Change one and you must change the other.

// ------------------------------------------------------------------ levels --

/** The Montessori plane / community. Not a grade. */
export const CLASSROOM_LEVELS = [
  'nido',
  'toddler',
  'casa',
  'lower_el',
  'upper_el',
  'adolescent',
] as const;
export type ClassroomLevel = (typeof CLASSROOM_LEVELS)[number];

export const LEVEL_LABELS: Record<ClassroomLevel, string> = {
  nido: 'Nido (0–18m)',
  toddler: 'Toddler (18m–3)',
  casa: 'Casa dei Bambini (3–6)',
  lower_el: 'Lower Elementary (6–9)',
  upper_el: 'Upper Elementary (9–12)',
  adolescent: 'Adolescent (12–18)',
};

export function isClassroomLevel(value: unknown): value is ClassroomLevel {
  return typeof value === 'string' && (CLASSROOM_LEVELS as readonly string[]).includes(value);
}

// ------------------------------------------------------------------- staff --

export const STAFF_ROLES = ['lead_guide', 'assistant', 'trainee', 'other'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  lead_guide: 'Lead guide',
  assistant: 'Assistant',
  trainee: 'Trainee',
  other: 'Other',
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

// -------------------------------------------------------------- engagement --

/**
 * What kind of visit this is. It sets the tone of the whole report and decides
 * whether section 9 (Required actions) appears at all — required actions are a
 * compliance instrument and belong only to a consultation.
 */
export const ENGAGEMENT_TYPES = ['consultation', 'mentoring', 'internal_review'] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  consultation: 'Consultation visit',
  mentoring: 'Mentoring visit',
  internal_review: 'Internal review',
};

export const ENGAGEMENT_BLURBS: Record<EngagementType, string> = {
  consultation:
    'External and formal. Findings are stated plainly, commendations lead, and compliance-critical items are separated out as required actions.',
  mentoring:
    'Developmental, written for the guide. Warm, forward-looking, coaching in tone. No required actions.',
  internal_review:
    'Written inside the organisation by its pedagogical lead. Direct and practical, oriented to the next term. No required actions.',
};

export function isEngagementType(value: unknown): value is EngagementType {
  return typeof value === 'string' && (ENGAGEMENT_TYPES as readonly string[]).includes(value);
}

// ------------------------------------------------------------------ status --

export const VISIT_STATUSES = ['capturing', 'drafting', 'review', 'final'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export function isVisitStatus(value: unknown): value is VisitStatus {
  return typeof value === 'string' && (VISIT_STATUSES as readonly string[]).includes(value);
}

// ----------------------------------------------------------------- moments --

export const MOMENT_KINDS = ['photo', 'voice', 'text', 'chip'] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

/** The five Montessori areas, plus an escape hatch. */
export const MOMENT_AREAS = [
  'practical_life',
  'sensorial',
  'language',
  'mathematics',
  'culture',
  'other',
] as const;
export type MomentArea = (typeof MOMENT_AREAS)[number];

export const AREA_LABELS: Record<MomentArea, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  language: 'Language',
  mathematics: 'Mathematics',
  culture: 'Culture',
  other: 'Other',
};

/** The three things always observed, in Montessori order of priority. */
export const MOMENT_SUBJECTS = ['children', 'environment', 'adult'] as const;
export type MomentSubject = (typeof MOMENT_SUBJECTS)[number];

export const SUBJECT_LABELS: Record<MomentSubject, string> = {
  children: 'The children',
  environment: 'The environment',
  adult: 'The adult',
};

export function isMomentKind(v: unknown): v is MomentKind {
  return typeof v === 'string' && (MOMENT_KINDS as readonly string[]).includes(v);
}
export function isMomentArea(v: unknown): v is MomentArea {
  return typeof v === 'string' && (MOMENT_AREAS as readonly string[]).includes(v);
}
export function isMomentSubject(v: unknown): v is MomentSubject {
  return typeof v === 'string' && (MOMENT_SUBJECTS as readonly string[]).includes(v);
}

// ----------------------------------------------------------------- ratings --

/**
 * The light 4-level scale. Stored as a SMALLINT 1–4 on a moment and as one of
 * these strings in a report's ratings block — the number is what a thumb taps
 * on a pip in a silent classroom, the word is what a school reads.
 */
export const RATING_LEVELS = ['not_yet', 'emerging', 'established', 'exemplary'] as const;
export type RatingLevel = (typeof RATING_LEVELS)[number];

export const RATING_LABELS: Record<RatingLevel, string> = {
  exemplary: 'Exemplary',
  established: 'Established',
  emerging: 'Emerging',
  not_yet: 'Not yet',
};

/** 1 → not_yet … 4 → exemplary. Out of range returns null rather than guessing. */
export function ratingFromPip(pip: number | null | undefined): RatingLevel | null {
  if (pip == null || !Number.isInteger(pip) || pip < 1 || pip > 4) return null;
  return RATING_LEVELS[pip - 1];
}

export function pipFromRating(level: RatingLevel): number {
  return RATING_LEVELS.indexOf(level) + 1;
}

export function isRatingLevel(v: unknown): v is RatingLevel {
  return typeof v === 'string' && (RATING_LEVELS as readonly string[]).includes(v);
}

/** The three domains a ratings table scores. Mirrors MOMENT_SUBJECTS on purpose. */
export const RATING_DOMAINS = ['children', 'environment', 'adult'] as const;
export type RatingDomain = (typeof RATING_DOMAINS)[number];

export function isRatingDomain(v: unknown): v is RatingDomain {
  return typeof v === 'string' && (RATING_DOMAINS as readonly string[]).includes(v);
}

// --------------------------------------------------------------- languages --

export const LENS_LANGUAGES = ['en', 'zh'] as const;
export type LensLanguage = (typeof LENS_LANGUAGES)[number];

export function isLensLanguage(v: unknown): v is LensLanguage {
  return typeof v === 'string' && (LENS_LANGUAGES as readonly string[]).includes(v);
}

// ------------------------------------------------------------- action items --

export const ACTION_ITEM_STATUSES = [
  'open',
  'in_progress',
  'done',
  'carried',
  'dropped',
] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  carried: 'Carried forward',
  dropped: 'Dropped',
};

export function isActionItemStatus(v: unknown): v is ActionItemStatus {
  return typeof v === 'string' && (ACTION_ITEM_STATUSES as readonly string[]).includes(v);
}

// -------------------------------------------------------------- row shapes --

export interface LensObserver {
  id: string;
  name: string;
  title: string | null;
  credentials: string | null;
  organisation: string | null;
  letterhead_name: string | null;
  letterhead_line1: string | null;
  letterhead_line2: string | null;
  letterhead_email: string | null;
  letterhead_phone: string | null;
  signature_text: string | null;
  default_languages: string[];
  style_profile: LensStyleProfile;
  invite_code?: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Her voice, as the Guru is told to imitate it. Every field is optional: an
 * empty profile means "no instruction", which is very different from a default
 * instruction — the model must not be told she likes short sentences until she
 * has said so.
 */
export interface LensStyleProfile {
  sentence_length?: 'short' | 'medium' | 'long';
  formality?: 'warm' | 'neutral' | 'formal';
  directness?: 'gentle' | 'balanced' | 'blunt';
  favourite_phrases?: string[];
  avoid_phrases?: string[];
  notes?: string;
}

export interface LensSchool {
  id: string;
  observer_id: string;
  name: string;
  city: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  logo_path: string | null;
  affiliation: string | null;
  age_bands: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LensClassroom {
  id: string;
  school_id: string;
  name: string;
  level: ClassroomLevel;
  age_range: string | null;
  child_count: number | null;
  ratio: string | null;
  room_notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LensStaff {
  id: string;
  classroom_id: string;
  name: string;
  role: StaffRole;
  training: string | null;
  training_level: string | null;
  years_experience: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LensVisit {
  id: string;
  observer_id: string;
  school_id: string;
  visit_date: string;
  engagement_type: EngagementType;
  purpose: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: VisitStatus;
  created_at: string;
}

export interface LensMoment {
  id: string;
  visit_id: string;
  classroom_id: string | null;
  ts: string;
  kind: MomentKind;
  media_path: string | null;
  transcript: string | null;
  body: string | null;
  caption: string | null;
  area: MomentArea | null;
  subject: MomentSubject | null;
  staff_id: string | null;
  child_alias: string | null;
  rating: number | null;
  client_id: string | null;
  created_at: string;
}

export interface LensActionItem {
  id: string;
  report_id: string;
  classroom_id: string | null;
  text: string;
  owner: string | null;
  due_date: string | null;
  status: ActionItemStatus;
  carried_from_id: string | null;
  sort_order: number;
  created_at: string;
}
