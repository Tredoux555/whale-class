// lib/montree/guru/work-sequencer.ts
// Pure function: takes child data + curriculum → returns ranked next-work proposals per area
// Zero AI calls — pure prerequisite graph traversal + scoring
// Used by Shelf Autopilot API + Guru propose_next_works tool
//
// V3 Enhancement (Sprint 2): When optional V3ScoringData is provided,
// uses 8-factor scoring (6 bonuses + 2 penalties) with cross-area bridge
// detection, note analysis, and age-appropriateness filtering.
// Gracefully degrades to legacy 3-factor scoring when V3 data is absent.

import { loadAllCurriculumWorks, loadWorksForArea, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import {
  type ScoringTier,
  type AgeFit,
  type BridgeRecommendation,
  type ChildProgressEntry,
  type SkillClue,
  SKILL_EXERCISE_MAP,
  getAgeFit,
  getSkillStrength,
  findBridgeExercises,
  analyzeNotes,
  hasSkillData,
  getExerciseSkills,
  getAreaFromWorkKey,
  assignTier,
} from './skill-graph';

// ---- Types ----

export interface ShelfProposal {
  area: string;
  current_work: string | null;
  current_work_status: string | null;
  proposed_work: string;
  proposed_work_key: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  prerequisites_met: string[];
  category: string;
  // V3 additive fields — present only when V3 scoring is active
  v3_score?: number;
  tier?: ScoringTier;
  reasons?: string[];
  bridge_from_area?: string;
}

export interface SequencerResult {
  child_id: string;
  child_name: string;
  proposals: ShelfProposal[];
  areas_stable: string[];
  summary: string;
  // V3 additive fields
  v3_active?: boolean;
  bridge_proposals?: ShelfProposal[];
}

/**
 * Optional V3 scoring data. When provided, enables the 8-factor scoring
 * engine with cross-area bridge detection and note analysis.
 * When absent, the sequencer gracefully degrades to legacy 3-factor scoring.
 */
export interface V3ScoringData {
  /** Child's age in years (e.g. 4.2). Required for age-appropriateness scoring. */
  childAgeYears?: number;
  /** Teacher observation notes (free text). Analyzed for skill weakness clues. */
  observations?: string[];
  /** Works the child is struggling with (work_keys). Used for unblocking detection. */
  strugglingWorkKeys?: string[];
  /** Last observation date per area (area → ISO date string). Used for stale area detection. */
  lastObservationByArea?: Record<string, string>;
}

export interface ChildProgress {
  work_name: string;
  work_key?: string;
  area: string;
  status: string; // mastered | practicing | presented
}

export interface FocusWork {
  area: string;
  work_name: string;
  work_id?: string;
  status?: string;
}

// ---- Constants ----

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Science & Culture',
};

// Legacy scoring weights (3-factor)
const SCORE_SEQUENCE_PROXIMITY = 40;
const SCORE_AREA_BALANCE = 20;
const SCORE_MASTERY_BONUS = 10;

// V3 scoring weights (8-factor: 6 bonuses + 2 penalties)
const V3_UNBLOCKING = 50;        // Exercise develops skills needed by a stuck child
const V3_BRIDGE = 40;            // Cross-area bridge — develops needed skills from different area
const V3_AREA_GAP = 30;          // Child has very few observations in this area
const V3_SKILL_REINFORCEMENT_BASE = 10; // Strengthens a weak skill (+ 5 per additional weak skill, capped at 35)
const V3_AGE_IDEAL = 15;         // Falls in child's typical age range
const V3_AGE_SLIGHTLY_YOUNG = 5; // Slightly below age range (still appropriate)
const V3_CURRICULUM_FLOW = 10;   // Natural next in prerequisite chain
const V3_AGE_SLIGHTLY_OLD = -10; // Slightly above age range
const V3_AGE_TOO_YOUNG = -30;    // Hard block — >1 year below age range

// Area gap threshold: fewer than this many observations = gap
const V3_AREA_GAP_THRESHOLD = 3;

// ---- Core Algorithm ----

/**
 * Generate shelf proposals for a single child.
 * Pure function — no DB calls, no AI. Caller provides all data.
 *
 * When v3Data is provided, uses V3's 8-factor scoring with cross-area
 * bridge detection, note analysis, and age-appropriateness filtering.
 * When v3Data is absent, uses legacy 3-factor scoring unchanged.
 */
export function generateShelfProposals(
  childId: string,
  childName: string,
  progress: ChildProgress[],
  focusWorks: FocusWork[],
  v3Data?: V3ScoringData,
): SequencerResult {
  const proposals: ShelfProposal[] = [];
  const areasStable: string[] = [];

  // Determine if V3 scoring is active
  // V3 is active when v3Data is provided AND at least some progress has work_keys
  const v3Active = !!v3Data && progress.some(p => p.work_key && hasSkillData(p.work_key));

  if (v3Active) {
    console.log(`[V3] Active for ${childName} — 8-factor scoring enabled`);
  } else if (v3Data) {
    console.log(`[V3] No skill data for ${childName}, using legacy scoring`);
  }

  // Build lookup sets (name-based, used by legacy scoring + prerequisite checks)
  const masteredSet = new Set<string>();
  const practicingSet = new Set<string>();
  const presentedSet = new Set<string>();
  const allProgressKeys = new Set<string>();

  for (const p of progress) {
    const key = p.work_name.toLowerCase().trim();
    allProgressKeys.add(key);
    if (p.status === 'mastered') masteredSet.add(key);
    else if (p.status === 'practicing') practicingSet.add(key);
    else if (p.status === 'presented') presentedSet.add(key);
  }

  // Build work_key-based lookup (for V3 scoring)
  const masteredKeySet = new Set<string>();
  const practicingKeySet = new Set<string>();
  const strugglingKeySet = new Set<string>();
  const progressByKey = new Map<string, string>();

  for (const p of progress) {
    if (p.work_key) {
      progressByKey.set(p.work_key, p.status);
      if (p.status === 'mastered') masteredKeySet.add(p.work_key);
      else if (p.status === 'practicing') practicingKeySet.add(p.work_key);
    }
  }

  // Populate struggling set from V3 data
  if (v3Data?.strugglingWorkKeys) {
    for (const key of v3Data.strugglingWorkKeys) {
      strugglingKeySet.add(key);
    }
  }

  // Build V3 scoring context (only when V3 is active)
  let v3Context: V3ScoringContext | null = null;
  if (v3Active && v3Data) {
    v3Context = buildV3ScoringContext(
      progress,
      masteredKeySet,
      practicingKeySet,
      strugglingKeySet,
      v3Data,
    );
  }

  // Build focus works lookup: area → work_name
  const focusMap = new Map<string, FocusWork>();
  for (const fw of focusWorks) {
    focusMap.set(fw.area, fw);
  }

  // Count mastered works per area for balance scoring
  const masteredByArea: Record<string, number> = {};
  for (const p of progress) {
    if (p.status === 'mastered') {
      masteredByArea[p.area] = (masteredByArea[p.area] || 0) + 1;
    }
  }
  const totalMastered = Object.values(masteredByArea).reduce((a, b) => a + b, 0);

  // Process each area
  for (const area of AREAS) {
    const currentFocus = focusMap.get(area);
    const areaWorks = loadWorksForArea(area);

    if (areaWorks.length === 0) {
      areasStable.push(area);
      continue;
    }

    // Check if current focus work is mastered → needs replacement
    const currentWorkName = currentFocus?.work_name?.toLowerCase().trim();
    const currentIsMastered = currentWorkName ? masteredSet.has(currentWorkName) : false;
    const currentIsPracticing = currentWorkName ? practicingSet.has(currentWorkName) : false;

    // If child is still practicing/presented on current focus, shelf is stable
    if (currentFocus && !currentIsMastered && (currentIsPracticing || (currentWorkName && presentedSet.has(currentWorkName)))) {
      areasStable.push(area);
      continue;
    }

    // No current focus OR current is mastered → find next candidate
    let candidate: ScoredCandidate | null;

    if (v3Active && v3Context) {
      candidate = findBestCandidateV3(
        areaWorks,
        masteredSet,
        masteredKeySet,
        currentWorkName || null,
        area,
        v3Context,
      );
    } else {
      candidate = findBestCandidate(
        areaWorks,
        masteredSet,
        currentWorkName || null,
        masteredByArea[area] || 0,
        totalMastered,
      );
    }

    if (!candidate) {
      areasStable.push(area);
      continue;
    }

    // Determine confidence based on score
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (v3Active) {
      // V3 uses tier-based confidence
      const tier = assignTier(candidate.score);
      if (tier === 'urgent') confidence = 'high';
      else if (tier === 'recommended') confidence = 'high';
      else if (tier === 'available') confidence = 'medium';
    } else {
      if (candidate.score >= 60) confidence = 'high';
      else if (candidate.score >= 35) confidence = 'medium';
    }

    // Build reason string
    const reason = v3Active && candidate.reasons && candidate.reasons.length > 0
      ? candidate.reasons[0]
      : buildReason(currentFocus, currentIsMastered, candidate.work, area);

    const proposal: ShelfProposal = {
      area,
      current_work: currentFocus?.work_name || null,
      current_work_status: currentIsMastered ? 'mastered' : currentFocus ? 'assigned' : null,
      proposed_work: candidate.work.name,
      proposed_work_key: candidate.work.work_key,
      reason,
      confidence,
      score: candidate.score,
      prerequisites_met: candidate.prereqsMet,
      category: candidate.work.category_name || '',
    };

    // Add V3 fields when active
    if (v3Active) {
      proposal.v3_score = candidate.score;
      proposal.tier = assignTier(candidate.score);
      proposal.reasons = candidate.reasons || [];
    }

    proposals.push(proposal);
  }

  // V3: Generate cross-area bridge proposals
  let bridgeProposals: ShelfProposal[] = [];
  if (v3Active && v3Context && v3Context.weakSkills.size > 0) {
    bridgeProposals = generateBridgeProposals(
      v3Context,
      masteredSet,
      masteredKeySet,
      focusMap,
      progress,
    );
  }

  // Build summary
  const proposalCount = proposals.length;
  const bridgeCount = bridgeProposals.length;
  let summary: string;
  if (proposalCount === 0 && bridgeCount === 0) {
    summary = `${childName}'s shelf looks good — no changes needed`;
  } else {
    const areaNames = proposals.map(p => AREA_LABELS[p.area] || p.area).join(', ');
    summary = `${proposalCount} shelf move${proposalCount > 1 ? 's' : ''} suggested: ${areaNames}`;
    if (bridgeCount > 0) {
      summary += ` + ${bridgeCount} cross-area bridge${bridgeCount > 1 ? 's' : ''}`;
    }
  }

  return {
    child_id: childId,
    child_name: childName,
    proposals,
    areas_stable: areasStable,
    summary,
    v3_active: v3Active,
    bridge_proposals: bridgeProposals.length > 0 ? bridgeProposals : undefined,
  };
}

// ---- V3 Scoring Context ----

interface V3ScoringContext {
  childAgeYears: number | null;
  /** work_keys that are unmet prerequisites of struggling exercises */
  unblockingTargets: Set<string>;
  /** work_keys identified as cross-area bridges for struggling skills */
  bridgeKeySet: Set<string>;
  /** Areas with fewer than V3_AREA_GAP_THRESHOLD observations */
  gapAreas: Set<string>;
  /** Skills identified as weak (from note analysis + struggling works) */
  weakSkills: Set<string>;
  /** All bridge recommendations (for generating bridge proposals) */
  bridgeRecommendations: BridgeRecommendation[];
  /** Skill clues from note analysis */
  skillClues: SkillClue[];
  /** ChildProgressEntry array for skill-graph functions */
  progressEntries: ChildProgressEntry[];
}

function buildV3ScoringContext(
  progress: ChildProgress[],
  masteredKeySet: Set<string>,
  practicingKeySet: Set<string>,
  strugglingKeySet: Set<string>,
  v3Data: V3ScoringData,
): V3ScoringContext {
  // Build ChildProgressEntry array for skill-graph functions
  const progressEntries: ChildProgressEntry[] = [];
  for (const p of progress) {
    if (p.work_key) {
      progressEntries.push({ work_key: p.work_key, status: p.status });
    }
  }

  // 1. Find unblocking targets: prerequisites of struggling exercises that aren't mastered
  const unblockingTargets = new Set<string>();
  for (const sKey of strugglingKeySet) {
    const skillData = getExerciseSkills(sKey);
    if (!skillData) continue;
    for (const reqSkill of skillData.skills_required) {
      // Find exercises that develop this required skill and aren't mastered
      const developers = SKILL_EXERCISE_MAP[reqSkill];
      if (!developers) continue;
      for (const devKey of developers) {
        if (!masteredKeySet.has(devKey)) {
          unblockingTargets.add(devKey);
        }
      }
    }
  }

  // 2. Analyze notes for weak skills
  const skillClues = v3Data.observations ? analyzeNotes(v3Data.observations) : [];
  const weakSkills = new Set<string>();
  for (const clue of skillClues) {
    weakSkills.add(clue.skill);
  }

  // Also add skills required by struggling works as weak
  for (const sKey of strugglingKeySet) {
    const skillData = getExerciseSkills(sKey);
    if (!skillData) continue;
    for (const req of skillData.skills_required) {
      const strength = getSkillStrength(progressEntries, req);
      if (strength.strength < 0.5) {
        weakSkills.add(req);
      }
    }
  }

  // 3. Find cross-area bridges
  const weakSkillArray = Array.from(weakSkills);
  // Get bridges from all areas where child is struggling
  const allBridges: BridgeRecommendation[] = [];
  const bridgeKeySet = new Set<string>();

  // Get unique struggling areas
  const strugglingAreas = new Set<string>();
  for (const sKey of strugglingKeySet) {
    const area = getAreaFromWorkKey(sKey);
    if (area) strugglingAreas.add(area);
  }

  for (const area of strugglingAreas) {
    const bridges = findBridgeExercises(weakSkillArray, area, progressEntries, 10);
    for (const b of bridges) {
      allBridges.push(b);
      bridgeKeySet.add(b.work_key);
    }
  }

  // 4. Detect area gaps (proportional + absolute hybrid)
  // Uses proportional check when total observations are sufficient,
  // falls back to absolute threshold for young children with sparse data.
  const gapAreas = new Set<string>();
  const obsByArea: Record<string, number> = {};
  for (const p of progress) {
    obsByArea[p.area] = (obsByArea[p.area] || 0) + 1;
  }
  const totalObs = progress.length;
  for (const area of AREAS) {
    const count = obsByArea[area] || 0;
    if (totalObs >= 5) {
      // Proportional: area has <10% of total observations
      if (count / totalObs < 0.10) {
        gapAreas.add(area);
      }
    } else {
      // Sparse data: absolute threshold (fewer than 1 observation)
      if (count < 1) {
        gapAreas.add(area);
      }
    }
  }

  // 4b. Detect stale areas (no observation in >21 days)
  if (v3Data.lastObservationByArea) {
    const now = Date.now();
    const STALE_THRESHOLD_MS = 21 * 24 * 60 * 60 * 1000; // 21 days
    for (const area of AREAS) {
      const lastObs = v3Data.lastObservationByArea[area];
      if (lastObs) {
        const lastObsTime = new Date(lastObs).getTime();
        if (isNaN(lastObsTime)) {
          console.warn(`[V3] Invalid date for area ${area}: "${lastObs}" — treating as stale`);
          gapAreas.add(area);
        } else {
          const daysSince = now - lastObsTime;
          if (daysSince > STALE_THRESHOLD_MS) {
            gapAreas.add(area);
          }
        }
      }
    }
  }

  return {
    childAgeYears: v3Data.childAgeYears ?? null,
    unblockingTargets,
    bridgeKeySet,
    gapAreas,
    weakSkills,
    bridgeRecommendations: allBridges,
    skillClues,
    progressEntries,
  };
}

// ---- Candidate Finder ----

interface ScoredCandidate {
  work: CurriculumWork;
  score: number;
  prereqsMet: string[];
  reasons?: string[];
  ageFit?: AgeFit;
}

function findBestCandidate(
  areaWorks: CurriculumWork[],
  masteredSet: Set<string>,
  currentWorkName: string | null,
  areaMasteredCount: number,
  totalMastered: number,
): ScoredCandidate | null {
  const candidates: ScoredCandidate[] = [];

  // Find the sequence of the current focus work (for proximity scoring)
  let currentSequence = 0;
  if (currentWorkName) {
    const currentWork = areaWorks.find(w => w.name.toLowerCase().trim() === currentWorkName);
    if (currentWork) currentSequence = currentWork.sequence;
  }

  for (const work of areaWorks) {
    const workNameLower = work.name.toLowerCase().trim();

    // Skip if already mastered
    if (masteredSet.has(workNameLower)) continue;

    // Skip if it's the current focus work
    if (currentWorkName && workNameLower === currentWorkName) continue;

    // Check prerequisites: ALL must be mastered (or empty = no prereqs needed)
    const prereqs = work.prerequisites || [];
    const prereqsMet: string[] = [];
    let allPrereqsMet = true;

    for (const prereqKey of prereqs) {
      // Prerequisites are stored as work_key (e.g., "ma_number_rods")
      // We need to check if the child has mastered the work with that key
      const prereqWork = findWorkByKey(prereqKey);
      if (prereqWork) {
        const prereqName = prereqWork.name.toLowerCase().trim();
        if (masteredSet.has(prereqName)) {
          prereqsMet.push(prereqWork.name);
        } else {
          allPrereqsMet = false;
          break;
        }
      }
      // If prereq work not found in curriculum, treat as met (stale reference)
    }

    if (!allPrereqsMet) continue;

    // --- Score this candidate ---
    let score = 0;

    // 1. Sequence proximity (closer to current position = higher score)
    if (currentSequence > 0) {
      const distance = Math.abs(work.sequence - currentSequence);
      if (distance === 0) score += SCORE_SEQUENCE_PROXIMITY;
      else if (distance <= 100) score += SCORE_SEQUENCE_PROXIMITY; // same category
      else if (distance <= 200) score += Math.round(SCORE_SEQUENCE_PROXIMITY * 0.75);
      else if (distance <= 500) score += Math.round(SCORE_SEQUENCE_PROXIMITY * 0.5);
      else score += Math.round(SCORE_SEQUENCE_PROXIMITY * 0.25);
    } else {
      // No current focus — prefer earliest works in sequence
      // Invert: lower sequence number → higher score
      const maxSeq = areaWorks[areaWorks.length - 1]?.sequence || 99999;
      const normalized = 1 - (work.sequence / maxSeq);
      score += Math.round(SCORE_SEQUENCE_PROXIMITY * normalized);
    }

    // 2. Area balance (if child has few works in this area vs others, boost)
    if (totalMastered > 0 && areaMasteredCount < 3) {
      score += SCORE_AREA_BALANCE;
    } else if (totalMastered > 5 && areaMasteredCount < totalMastered / 5) {
      score += Math.round(SCORE_AREA_BALANCE * 0.5);
    }

    // 3. Current work mastered bonus (proposing ANY change when current is mastered)
    if (currentWorkName && masteredSet.has(currentWorkName)) {
      score += SCORE_MASTERY_BONUS;
    }

    candidates.push({ work, score, prereqsMet });
  }

  if (candidates.length === 0) return null;

  // Sort by score descending, then by sequence ascending (tiebreaker: curriculum order)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.work.sequence - b.work.sequence;
  });

  return candidates[0];
}

// ---- V3 Candidate Finder ----

/**
 * V3 8-factor scoring candidate finder. Used when V3ScoringData is provided.
 * Factors: +50 unblocking, +40 bridge, +30 area gap, +10-35 skill reinforcement,
 * +15/+5 age ideal/slightly_young, +10 curriculum flow, -10/-30 age penalties
 */
function findBestCandidateV3(
  areaWorks: CurriculumWork[],
  masteredSet: Set<string>,
  masteredKeySet: Set<string>,
  currentWorkName: string | null,
  area: string,
  ctx: V3ScoringContext,
): ScoredCandidate | null {
  const candidates: ScoredCandidate[] = [];

  for (const work of areaWorks) {
    const workNameLower = work.name.toLowerCase().trim();

    // Skip if already mastered
    if (masteredSet.has(workNameLower)) continue;

    // Skip if it's the current focus work
    if (currentWorkName && workNameLower === currentWorkName) continue;

    // Check prerequisites: ALL must be mastered (or empty = no prereqs needed)
    const prereqs = work.prerequisites || [];
    const prereqsMet: string[] = [];
    let allPrereqsMet = true;

    for (const prereqKey of prereqs) {
      const prereqWork = findWorkByKey(prereqKey);
      if (prereqWork) {
        const prereqName = prereqWork.name.toLowerCase().trim();
        if (masteredSet.has(prereqName)) {
          prereqsMet.push(prereqWork.name);
        } else {
          allPrereqsMet = false;
          break;
        }
      }
    }

    if (!allPrereqsMet) continue;

    // --- V3 8-Factor Scoring ---
    let score = 0;
    const reasons: string[] = [];
    const workKey = work.work_key;

    // Factor 1: UNBLOCKING (+50)
    // This exercise is an unmet prerequisite of something the child is stuck on
    if (ctx.unblockingTargets.has(workKey)) {
      score += V3_UNBLOCKING;
      reasons.push(`Unblocking: develops skills needed for a struggling exercise (+${V3_UNBLOCKING})`);
    }

    // Factor 2: CROSS-AREA BRIDGE (+40)
    // This exercise was identified as a bridge from another area
    if (ctx.bridgeKeySet.has(workKey)) {
      score += V3_BRIDGE;
      reasons.push(`Cross-area bridge: develops needed skills from ${AREA_LABELS[area] || area} (+${V3_BRIDGE})`);
    }

    // Factor 3: AREA GAP (+30)
    // Child has very few observations in this area
    if (ctx.gapAreas.has(area)) {
      score += V3_AREA_GAP;
      reasons.push(`Area gap: fewer than ${V3_AREA_GAP_THRESHOLD} observations in ${AREA_LABELS[area] || area} (+${V3_AREA_GAP})`);
    }

    // Factor 4: SKILL REINFORCEMENT (+10 to +35)
    // Exercise develops skills that the child is weak in
    if (ctx.weakSkills.size > 0) {
      const exerciseSkills = getExerciseSkills(workKey);
      if (exerciseSkills) {
        let weakCount = 0;
        for (const skillDev of exerciseSkills.skills_developed) {
          if (ctx.weakSkills.has(skillDev)) weakCount++;
        }
        if (weakCount > 0) {
          const reinforceScore = Math.min(V3_SKILL_REINFORCEMENT_BASE + weakCount * 5, 35);
          score += reinforceScore;
          reasons.push(`Skill reinforcement: strengthens ${weakCount} weak skill${weakCount > 1 ? 's' : ''} (+${reinforceScore})`);
        }
      }
    }

    // Factor 5: AGE APPROPRIATENESS (+15, +5, -10, or -30)
    let ageFit: AgeFit = 'ideal';
    if (ctx.childAgeYears !== null) {
      ageFit = getAgeFit(workKey, ctx.childAgeYears);
      switch (ageFit) {
        case 'ideal':
          score += V3_AGE_IDEAL;
          reasons.push(`Age-appropriate: ideal for ${ctx.childAgeYears.toFixed(1)} years (+${V3_AGE_IDEAL})`);
          break;
        case 'slightly_young':
          score += V3_AGE_SLIGHTLY_YOUNG;
          reasons.push(`Age: slightly below typical range (+${V3_AGE_SLIGHTLY_YOUNG})`);
          break;
        case 'slightly_old':
          score += V3_AGE_SLIGHTLY_OLD;
          reasons.push(`Age: slightly above typical range (${V3_AGE_SLIGHTLY_OLD})`);
          break;
        case 'too_young':
          score += V3_AGE_TOO_YOUNG;
          reasons.push(`Age: well below typical range — hard penalty (${V3_AGE_TOO_YOUNG})`);
          break;
        case 'too_old':
          score += V3_AGE_SLIGHTLY_OLD; // Same as slightly_old — don't punish advanced children hard
          reasons.push(`Age: above typical range (${V3_AGE_SLIGHTLY_OLD})`);
          break;
      }
    }

    // Factor 6: CURRICULUM FLOW (+10)
    // Natural next in prerequisite chain — has prerequisites and they're all met
    if (prereqs.length > 0 && allPrereqsMet) {
      score += V3_CURRICULUM_FLOW;
      reasons.push(`Curriculum flow: natural next in prerequisite chain (+${V3_CURRICULUM_FLOW})`);
    }

    // Hard filter: too_young exercises are excluded entirely
    if (ageFit === 'too_young') {
      continue;
    }

    candidates.push({ work, score, prereqsMet, reasons, ageFit });
  }

  if (candidates.length === 0) return null;

  // Sort by V3 score descending, then sequence ascending (tiebreaker)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.work.sequence - b.work.sequence;
  });

  return candidates[0];
}

// ---- V3 Bridge Proposal Generator ----

/**
 * Generate cross-area bridge proposals. These are additional proposals
 * (beyond the per-area proposals) that recommend exercises in OTHER areas
 * to develop skills needed in a struggling area.
 */
function generateBridgeProposals(
  ctx: V3ScoringContext,
  masteredSet: Set<string>,
  masteredKeySet: Set<string>,
  focusMap: Map<string, FocusWork>,
  progress: ChildProgress[],
): ShelfProposal[] {
  const bridges: ShelfProposal[] = [];
  const seen = new Set<string>();

  for (const rec of ctx.bridgeRecommendations) {
    if (seen.has(rec.work_key)) continue;
    seen.add(rec.work_key);

    // Look up the curriculum work
    const curriculumWork = findWorkByKey(rec.work_key);
    if (!curriculumWork) continue;

    // Skip if already mastered
    if (masteredKeySet.has(rec.work_key)) continue;

    // Skip if already on focus shelf for this area
    const bridgeArea = rec.from_area;
    const currentFocus = focusMap.get(bridgeArea);
    if (currentFocus?.work_name?.toLowerCase().trim() === curriculumWork.name.toLowerCase().trim()) continue;

    // Score the bridge: base V3_BRIDGE score + age fit + skill reinforcement
    let score = V3_BRIDGE;
    const reasons: string[] = [rec.reason];

    // Skill reinforcement bonus for bridges
    if (ctx.weakSkills.size > 0) {
      const exerciseSkills = getExerciseSkills(rec.work_key);
      if (exerciseSkills) {
        let weakCount = 0;
        for (const skillDev of exerciseSkills.skills_developed) {
          if (ctx.weakSkills.has(skillDev)) weakCount++;
        }
        if (weakCount > 0) {
          const reinforceScore = Math.min(V3_SKILL_REINFORCEMENT_BASE + weakCount * 5, 35);
          score += reinforceScore;
          reasons.push(`Skill reinforcement: strengthens ${weakCount} weak skill${weakCount > 1 ? 's' : ''} (+${reinforceScore})`);
        }
      }
    }

    if (ctx.childAgeYears !== null) {
      const ageFit = getAgeFit(rec.work_key, ctx.childAgeYears);
      if (ageFit === 'too_young') continue; // Hard filter
      if (ageFit === 'ideal') score += V3_AGE_IDEAL;
      else if (ageFit === 'slightly_young') score += V3_AGE_SLIGHTLY_YOUNG;
      else if (ageFit === 'slightly_old' || ageFit === 'too_old') score += V3_AGE_SLIGHTLY_OLD;
    }

    bridges.push({
      area: bridgeArea,
      current_work: null,
      current_work_status: null,
      proposed_work: curriculumWork.name,
      proposed_work_key: rec.work_key,
      reason: rec.reason,
      confidence: score >= 40 ? 'high' : 'medium',
      score,
      prerequisites_met: [],
      category: curriculumWork.category_name || '',
      v3_score: score,
      tier: assignTier(score),
      reasons,
      bridge_from_area: bridgeArea,
    });
  }

  // Sort by score descending, cap at 5
  bridges.sort((a, b) => b.score - a.score);
  return bridges.slice(0, 5);
}

// ---- Helpers ----

// Cache work_key → CurriculumWork lookup
let _workKeyMap: Map<string, CurriculumWork> | null = null;

function findWorkByKey(workKey: string): CurriculumWork | undefined {
  if (!_workKeyMap) {
    _workKeyMap = new Map();
    const allWorks = loadAllCurriculumWorks();
    for (const w of allWorks) {
      _workKeyMap.set(w.work_key, w);
    }
  }
  return _workKeyMap.get(workKey);
}

function buildReason(
  currentFocus: FocusWork | undefined,
  currentIsMastered: boolean,
  proposedWork: CurriculumWork,
  area: string,
): string {
  const areaLabel = AREA_LABELS[area] || area;

  if (!currentFocus) {
    return `No ${areaLabel} work on shelf — ${proposedWork.name} is a good starting point`;
  }

  if (currentIsMastered) {
    return `Mastered ${currentFocus.work_name} — ${proposedWork.name} is next in sequence`;
  }

  return `${proposedWork.name} suggested for ${areaLabel}`;
}
