/**
 * Montree Milestones — types.
 *
 * Two halves:
 *   1. The item-bank shape (ARCHITECTURE.md §5) — hand-written, kept in sync with
 *      `item-bank.json`. `scripts/curriculum/validate-item-bank.mjs` is the real gate.
 *   2. The database row shapes from `migrations/314_montree_evaluation_system.sql`,
 *      plus the tablet-export payload contract.
 *
 * Vocabulary rule (ARCHITECTURE.md §0): no type, field or literal in this module may
 * introduce the words test / exam / quiz / score-as-a-noun / grade / pass / fail /
 * percentile / rank into a user-facing string. Internal identifiers like `points` and
 * `rubricScore` are fine — they never reach a child, parent or teacher surface.
 */

/* ────────────────────────────────────────────────────────────── shared scalars */

export type AgeBand = 'A3' | 'A4' | 'A5';
export type FormCode = 'A' | 'B';
/** 'P' = practice (never scored, never exported), 'O' = observation checklist. */
export type BankFormCode = FormCode | 'P' | 'O';
export type WindowCode = 'autumn' | 'winter' | 'spring';
export type Track = 'core' | 'efl';
export type Band = 'emerging' | 'developing' | 'secure';
export type BandOrUnassessed = Band | 'unassessed';
export type BandSource = 'direct' | 'observation' | 'teacher_override';
export type Expectation = 'expected' | 'emerging_edge' | 'extension';
export type ItemType = 'tap_choice' | 'listen_do' | 'teacher_scored_oral' | 'observation_checklist';
export type ScoringMethod = 'auto_key' | 'teacher_rubric' | 'teacher_band';
export type DeliveryMode = 'tablet' | 'paper' | 'observation_only';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type AdministeredByRole = 'teacher' | 'principal' | 'system';
export type ModuleId = 'M-LIT' | 'M-MATH' | 'M-EFL' | 'M-FOCUS' | 'M-OBS';

/** Every child-facing string in the bank is a locale map. `en` is always present. */
export interface LocalizedText {
  en: string;
  [locale: string]: string | undefined;
}

/* ─────────────────────────────────────────────────────────────── the item bank */

export interface BankAttribution {
  elof: string;
  eyfs: string;
  chinaMoe: string;
  note: string;
  [k: string]: string;
}

export interface BankScoringConfig {
  bands: Band[];
  /** ratio ≥ secure → secure; ≥ developing → developing; else emerging. */
  milestoneThresholds: { secure: number; developing: number };
  /** administered evidence / declared evidence, below which a milestone is unassessed. */
  minCoverage: number;
  /** MAP% is suppressed when the expected-assessed denominator is below this. */
  mapSuppressionMinN: number;
  /** A per-domain figure is never rendered below this n; a band chip is shown instead. */
  domainBandMinN: number;
  /** MAP% is rounded to the nearest multiple of this. */
  mapRounding: number;
  note?: string;
}

export interface Domain {
  id: string;
  name: LocalizedText;
  track: Track;
  /** Reuses the Montree curriculum-area palette token where one applies. */
  colorToken: string;
  sequence: number;
}

export interface StopRule {
  type: 'consecutive_incorrect';
  n: number;
  scope: 'strand' | 'module';
}

/** The construct each band's items probe, e.g. `{ A4: ['initial_sound_match', …] }`. */
export type ConstructTagsByBand = Partial<Record<AgeBand, string[]>>;

export interface Strand {
  id: string;
  domainId: string;
  name: LocalizedText;
  method: 'direct' | 'observation';
  sequence: number;
  constructSpec: string;
  stopRule?: StopRule | null;
  /**
   * TRUE on strands whose evidence only makes sense under English-medium instruction —
   * LCL-C (phonological awareness) and LCL-D (print & alphabet), whose rhymes, letters and
   * printed words are English in the Roman alphabet. These strands deliberately carry NO
   * China-MoE crosswalk code: 语言.阅读与书写准备 describes Chinese literacy readiness and this
   * evidence does not speak to it. A school teaching in another language reports LCL-A/B/E for
   * core language and uses the EFL track (E3/E4/E5) for English letters and sounds, leaving
   * LCL-C and LCL-D unassessed rather than administering them in translation.
   */
  englishMedium?: boolean;
  constructTags?: ConstructTagsByBand;
}

export interface CrosswalkEyfs {
  area: string | null;
  band: string | null;
  elg: string | null;
}

export interface MilestoneCrosswalk {
  elof: string[];
  eyfs: CrosswalkEyfs;
  chinaMoe?: string[] | null;
  montessori?: { areaKeys: string[]; workKeys: string[] } | null;
  montreeEnglish?: { phase: string; lessonRange: [number, number] } | null;
}

export interface MilestoneEvidence {
  /** Direct milestones: the items across all forms that can evidence this milestone. */
  itemIds?: string[];
  /** The subset per form — this is the denominator for a session on that form. */
  byForm?: Partial<Record<FormCode, string[]>>;
  /** Observation milestones: the single 1:1 checklist item. */
  observationItemId?: string;
  minCoverage: number;
  /** Band the evidence items live in — differs from the milestone band for extensions. */
  evidenceBand?: AgeBand;
  extensionEvidence?: boolean;
}

export interface Milestone {
  id: string;
  strandId: string;
  domainId: string;
  ageBand: AgeBand;
  expectation: Expectation;
  /**
   * What this milestone actually probes. A milestone's evidence is the set of items in its
   * `evidenceBand` whose `constructTag` equals this one — never a positional slice of the
   * authoring order. The bank validator fails the build on any mismatch.
   */
  constructTag?: string;
  statement: LocalizedText;
  bandDescriptors: Record<Band, LocalizedText> | null;
  evidence: MilestoneEvidence;
  crosswalk: MilestoneCrosswalk;
}

export interface StimulusRender {
  svgSymbolId: string;
  viewBox: string;
  /** Inline SVG body (no <svg> wrapper) — the app builds the sprite from these. */
  svg?: string;
  printMinMm: number;
  monochromeSafe: boolean;
}

export interface Stimulus {
  id: string;
  kind: 'picture' | 'letter' | 'word' | 'numeral' | 'quantity' | 'shape' | 'scene';
  label: LocalizedText;
  altText: LocalizedText;
  render: StimulusRender;
  tags: string[];
}

export interface RubricLevel {
  score: number;
  descriptor: LocalizedText;
}

export interface Rubric {
  scale: number[];
  levels: RubricLevel[];
}

export interface ItemOption {
  id: string;
  stimulusId: string;
}

/**
 * Why each wrong option is there. The bank lists `items[].distractors[].rationale` in its own
 * `internalFields`, and every entry carries `internalOnly: true` — this text is for item review
 * and the D1 methodology appendix. It must never be rendered to a child, a parent or a teacher
 * mid-sitting: telling an adult what a distractor is designed to catch invites coaching.
 */
export interface ItemDistractor {
  optionId: string;
  stimulusId: string;
  role: string;
  rationale: string;
  internalOnly?: boolean;
}

export interface ItemScoring {
  method: ScoringMethod;
  correctOptionIds?: string[] | null;
  /** `listen_do` only — full credit requires this exact order. */
  correctSequence?: string[] | null;
  maxPoints: number | null;
  rubric?: Rubric | null;
  rubricKey?: string;
  /** Observation items only. */
  bands?: Band[];
  note?: string;
}

export interface ItemPrompt {
  audio?: LocalizedText;
  audioLocaleFixed?: string | null;
  onScreen?: LocalizedText;
  teacherScript: LocalizedText;
}

export interface ItemStopFlags {
  countsTowardStrandStop: boolean;
  countsTowardModuleStop: boolean;
  scored: boolean;
}

export interface BankItem {
  id: string;
  strandId: string;
  domainId?: string;
  ageBand: AgeBand;
  form: BankFormCode;
  moduleId: ModuleId;
  sequence?: number;
  type: ItemType;
  promptLang?: 'assessment' | 'en';
  prompt: ItemPrompt;
  stimulusIds?: string[];
  options?: ItemOption[] | null;
  scoring: ItemScoring;
  distractors?: ItemDistractor[] | null;
  timing?: { maxSeconds: number | null; advanceOn: string };
  repeatAllowed?: boolean;
  repeatMax?: number;
  requiresColor?: boolean;
  paper: { cardsPerRow: number; responseMode: string };
  stop?: ItemStopFlags;
  feedback?: Record<string, LocalizedText>;
  /** false for practice items. Observation items omit it. */
  scored?: boolean;
  /** Direct items: the milestones this item can evidence. Focus items carry []. */
  milestoneIds?: string[];
  vocabCategory?: string;
  /** Matches the milestone this item evidences (see Milestone.constructTag). */
  constructTag?: string;
  /**
   * For word-reading and letter-sound items: the word or letter on screen, so a consumer can
   * check it against what the phonics sequence has actually taught. Null where not applicable.
   */
  decodableWord?: string | null;
  /** M-FOCUS only: which executive-function task this is ('inhibition' | 'memory'). */
  taskFamily?: string;
  /* observation_checklist only */
  milestoneId?: string;
  expectation?: Expectation;
  statement?: LocalizedText;
  bandDescriptors?: Record<Band, LocalizedText>;
  evidenceNote?: { maxChars: number; optional: boolean };
  evidenceMedia?: { field: string; optional: boolean };
}

export interface BankModule {
  id: ModuleId;
  name: LocalizedText;
  strandIds?: string[];
  practiceItemIds?: Partial<Record<AgeBand, string[]>>;
  targetMinutes?: number;
  optional?: boolean;
  stopRule?: StopRule;
  extensionRule?: { trigger: string; administerBandUp: boolean; maxItems: number };
  neutralFeedback?: LocalizedText;
  practiceFeedbackAllowed?: boolean;
  promptLang?: 'assessment' | 'en';
  note?: string;
  deliveredIn?: string[];
  ratedOver?: string;
}

export interface ObservationChecklist {
  id: string;
  domainId: string;
  strandIds: string[];
  ageBand: AgeBand;
  milestoneIds: string[];
  itemIds: string[];
  guidance: LocalizedText;
}

export interface ItemBank {
  schemaVersion: string;
  bankVersion: string;
  bankChecksum: string;
  generatedAt: string;
  mergedAt?: string;
  assessmentLocales: string[];
  attribution: BankAttribution;
  scoring: BankScoringConfig;
  domains: Domain[];
  strands: Strand[];
  milestones: Milestone[];
  stimuli: Stimulus[];
  modules: BankModule[];
  rubrics: Record<string, Rubric>;
  observationChecklists: ObservationChecklist[];
  items: BankItem[];
  counts?: Record<string, number>;
  /**
   * Authoring and provenance metadata. Present in the five AUTHORED source files; the merge
   * script deliberately does not carry these into the single merged bank, because adding one
   * changes `bankChecksum` and every stored session row references that value. Typed as
   * optional so a future bankVersion may promote any of them without a type change.
   * See scripts/evaluation/merge-item-bank.mjs → KNOWN_TOP_LEVEL.
   */
  notes?: BankNotes;
  internalFields?: string[];
  taughtLetters?: TaughtLetters;
  heartWords?: string[];
  constructTags?: Record<string, ConstructTagsByBand>;
}

/** Letters the phonics sequence has taught by each band, in the house SATPIN order. */
export type TaughtLetters = Partial<Record<AgeBand, string[]>>;

export interface BankNotes {
  /** Why LCL-C and LCL-D assume English-medium instruction and carry no China-MoE code. */
  englishMediumScope?: string;
  evidenceLinking?: string;
  sharedEvidence?: string;
  [key: string]: string | undefined;
}

/** Prebuilt lookups so nothing scans 426 items in a request path. */
export interface BankIndex {
  bank: ItemBank;
  domainById: Map<string, Domain>;
  strandById: Map<string, Strand>;
  milestoneById: Map<string, Milestone>;
  itemById: Map<string, BankItem>;
  stimulusById: Map<string, Stimulus>;
  moduleById: Map<string, BankModule>;
  /** milestoneId → the observation item that rates it 1:1. */
  observationItemByMilestoneId: Map<string, BankItem>;
  milestonesByBandAndTrack: Map<string, Milestone[]>;
  trackByDomainId: Map<string, Track>;
}

/* ─────────────────────────────────────────────── scoring inputs and outputs */

/** What a child (or teacher, for oral/observation items) actually did on one item. */
export interface RawItemResponse {
  itemId: string;
  /** tap_choice: the tapped option(s). listen_do: the tap order. */
  optionIds?: string[];
  sequence?: string[];
  /** teacher_scored_oral: the rubric level the teacher chose (0/1/2). */
  rubricScore?: number;
  /** observation_checklist: the band the teacher chose. */
  band?: Band;
  note?: string;
  evidenceMediaId?: string | null;
  attempts?: number;
  replayCount?: number;
  latencyMs?: number | null;
  /** false = never put in front of the child (stop rule, or teacher ended early). */
  administered?: boolean;
  skippedReason?: string | null;
  /** What the client thought the points were. Stored for audit; NEVER trusted. */
  clientPointsAwarded?: number | null;
  answeredAt?: string;
}

export interface ScoredItemResponse {
  itemId: string;
  strandId: string;
  moduleId: ModuleId;
  ageBand: AgeBand;
  formCode: BankFormCode;
  itemType: ItemType;
  pointsAwarded: number;
  pointsPossible: number;
  isCorrect: boolean | null;
  administered: boolean;
  band?: Band;
  /** Set when the client's own arithmetic disagreed with the server re-score. */
  clientDisagreement?: { clientPointsAwarded: number; serverPointsAwarded: number } | null;
  raw: RawItemResponse;
}

export interface TeacherOverride {
  milestoneId: string;
  band: BandOrUnassessed;
  reason: string;
}

export interface MilestoneResult {
  milestoneId: string;
  strandId: string;
  domainId: string;
  track: Track;
  ageBand: AgeBand;
  expectation: Expectation;
  bandComputed: BandOrUnassessed | null;
  bandFinal: BandOrUnassessed;
  bandSource: BandSource;
  overrideReason: string | null;
  coverage: number | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
  evidenceNote: string | null;
  evidenceMediaId: string | null;
  /** The evidence items that were actually administered, for the audit trail. */
  evidenceItemIds: string[];
}

export interface MapResult {
  track: Track;
  /** null whenever `suppressed` is true. */
  mapPercent: number | null;
  /** expected + at-band + assessed. Always printed alongside any percentage. */
  denominator: number;
  met: number;
  exceeded: number;
  unassessed: number;
  suppressed: boolean;
  suppressionReason: string | null;
  counts: Record<BandOrUnassessed, number>;
}

export interface DomainSummary {
  domainId: string;
  track: Track;
  n: number;
  counts: Record<BandOrUnassessed, number>;
  /** Best-fit chip. null when n < domainBandMinN — never invent a figure. */
  band: Band | null;
  suppressed: boolean;
}

export interface StrandSummary {
  strandId: string;
  domainId: string;
  n: number;
  counts: Record<BandOrUnassessed, number>;
  band: Band | null;
  /** Surfaced so a report can label a strand that assumes English-medium instruction. */
  englishMedium: boolean;
}

export type GrowthDirection = 'moved_up' | 'steady' | 'watching' | 'new' | 'no_longer_assessed';

/** The minimal shape growth comparison needs — DB rows adapt onto this. */
export interface GrowthInputResult {
  milestoneId: string;
  domainId: string;
  track: Track;
  bandFinal: BandOrUnassessed;
}

export interface GrowthDelta {
  milestoneId: string;
  domainId: string;
  track: Track;
  from: BandOrUnassessed | null;
  to: BandOrUnassessed | null;
  direction: GrowthDirection;
}

export interface GrowthSummary {
  fromWindow: WindowCode | null;
  toWindow: WindowCode | null;
  comparable: number;
  movedUp: number;
  steady: number;
  watching: number;
  newlyAssessed: number;
  noLongerAssessed: number;
  deltas: GrowthDelta[];
}

export interface SessionSummary {
  bankVersion: string;
  bankChecksum: string;
  ageBand: AgeBand;
  formCode: FormCode;
  modules: string[];
  itemsAdministered: number;
  itemsSkipped: number;
  core: MapResult;
  efl: MapResult;
  domains: DomainSummary[];
  strands: StrandSummary[];
  counts: Record<BandOrUnassessed, number>;
  overrideCount: number;
  /** Populated by the report routes when a prior window exists. */
  growth?: GrowthSummary | null;
}

/* ───────────────────────────────────────────────────────────── database rows */

export interface EvaluationSessionRow {
  id: string;
  school_id: string;
  classroom_id: string;
  child_id: string;
  administered_by_role: AdministeredByRole | null;
  administered_by_id: string | null;
  school_year: string;
  window_code: WindowCode;
  term_id: string | null;
  age_months: number;
  age_band: AgeBand;
  form_code: FormCode;
  modules: string[];
  delivery_mode: DeliveryMode;
  assessment_locale: string;
  bank_version: string;
  bank_checksum: string;
  client_bank_version: string | null;
  client_bank_checksum: string | null;
  source: string;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  map_percent: number | null;
  map_denominator: number | null;
  map_suppressed: boolean;
  milestones_secure: number | null;
  milestones_developing: number | null;
  milestones_emerging: number | null;
  milestones_unassessed: number | null;
  milestones_exceeded: number | null;
  override_count: number | null;
  efl_map_percent: number | null;
  efl_map_denominator: number | null;
  efl_map_suppressed: boolean;
  summary_json: SessionSummary | Record<string, never>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationItemResponseRow {
  id: string;
  session_id: string;
  school_id: string;
  classroom_id: string;
  child_id: string;
  item_id: string;
  milestone_id: string | null;
  strand_id: string;
  module_id: string;
  age_band: AgeBand;
  form_code: BankFormCode;
  item_type: ItemType;
  response: RawItemResponse | Record<string, unknown>;
  points_awarded: number;
  points_possible: number;
  is_correct: boolean | null;
  observed_band: Band | null;
  attempts: number;
  replay_count: number;
  latency_ms: number | null;
  administered: boolean;
  skipped_reason: string | null;
  client_points_awarded: number | null;
  evidence_note: string | null;
  evidence_media_id: string | null;
  answered_at: string;
  created_at: string;
}

export interface EvaluationMilestoneResultRow {
  id: string;
  session_id: string;
  school_id: string;
  classroom_id: string;
  child_id: string;
  school_year: string;
  window_code: WindowCode;
  milestone_id: string;
  strand_id: string;
  domain_id: string;
  track: Track;
  age_band: AgeBand;
  expectation: Expectation;
  band_computed: BandOrUnassessed | null;
  band_final: BandOrUnassessed;
  band_source: BandSource;
  override_reason: string | null;
  override_by_role: AdministeredByRole | null;
  override_by_id: string | null;
  coverage: number | null;
  points_earned: number | null;
  points_possible: number | null;
  evidence_note: string | null;
  evidence_media_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationBankVersionRow {
  bank_version: string;
  bank_checksum: string;
  item_count: number;
  milestone_count: number;
  notes: string | null;
  created_at: string;
}

/* ──────────────────────────────────────────── tablet export → import contract */

/** ARCHITECTURE.md §6, "Session payload contract". Produced by montree-milestones.html. */
export interface TabletExportPayload {
  bankVersion: string;
  bankChecksum: string;
  demo?: boolean;
  session: {
    childRef?: string;
    schoolYear: string;
    windowCode: WindowCode;
    ageMonths: number;
    ageBand: AgeBand;
    formCode: FormCode;
    modules: string[];
    deliveryMode: DeliveryMode;
    assessmentLocale: string;
    startedAt?: string;
    completedAt?: string;
    durationSeconds?: number;
  };
  responses: Array<{
    itemId: string;
    response?: { optionIds?: string[]; sequence?: string[]; rubricScore?: number };
    optionIds?: string[];
    sequence?: string[];
    rubricScore?: number;
    pointsAwarded?: number;
    pointsPossible?: number;
    latencyMs?: number;
    replayCount?: number;
    attempts?: number;
    administered?: boolean;
    skippedReason?: string;
    answeredAt?: string;
  }>;
  observations?: Array<{
    milestoneId: string;
    band: Band;
    note?: string;
    evidenceMediaId?: string;
  }>;
  overrides?: TeacherOverride[];
}

/* ─────────────────────────────────────────────────────── report payload shapes */

export interface ChildPositionSnapshot {
  /** Read-only from montree_child_progress — never written by this module. */
  montessori: Array<{ area: string; not_started: number; presented: number; practicing: number; mastered: number }>;
  /** Read-only from montree_child_english_progress. */
  english: { current_phase: string; current_lesson: number; mastered_lessons: number[] } | null;
}

export interface GrowthStoryPayload {
  available: true;
  child: { id: string; name: string | null; ageMonths: number | null; ageBand: AgeBand | null };
  schoolYear: string;
  window: WindowCode;
  session: Pick<EvaluationSessionRow,
    'id' | 'window_code' | 'school_year' | 'age_band' | 'form_code' | 'delivery_mode' | 'completed_at' | 'status'>;
  headline: { growth: GrowthSummary | null; map: MapResult; efl: MapResult };
  domains: DomainSummary[];
  milestones: Array<MilestoneResult & { statement: LocalizedText; bandDescriptors: Record<Band, LocalizedText> | null }>;
  history: Array<{ sessionId: string; schoolYear: string; window: WindowCode; completedAt: string | null; map: MapResult }>;
  classroomPosition: ChildPositionSnapshot;
  method: MethodStatement;
}

export interface CohortReportPayload {
  available: true;
  scope: { schoolId: string; classroomId: string | null; schoolYear: string; window: WindowCode };
  cohort: { children: number; sessions: number; suppressed: boolean; suppressionReason: string | null };
  attainment: {
    mapMeanPercent: number | null;
    mapMedianPercent: number | null;
    denominatorMean: number | null;
    suppressed: boolean;
    suppressionReason: string | null;
  };
  eflAttainment: CohortReportPayload['attainment'];
  domains: Array<DomainSummary & { children: number; suppressed: boolean }>;
  growth: { comparable: number; movedUp: number; steady: number; watching: number; movedUpPercent: number | null; suppressed: boolean } | null;
  transparency: { unassessed: number; overrides: number; abandonedSessions: number; observationOnlySessions: number };
  method: MethodStatement;
}

export interface MethodStatement {
  statement: string;
  caveat: string;
  attribution: BankAttribution;
  bankVersion: string;
  bankChecksum: string;
  sayNever: { say: string[]; never: string[] };
}

/* ───────────────────────────────────────────────────────── route-level shapes */

export interface UnavailableResponse {
  available: false;
  reason: 'feature_off' | 'migration_pending';
  migration_pending?: boolean;
  message: string;
}
