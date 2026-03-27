// lib/montree/guru/work-sequencer.ts
// Pure function: takes child data + curriculum → returns ranked next-work proposals per area
// Zero AI calls — pure prerequisite graph traversal + scoring
// Used by Shelf Autopilot API + (future) Guru propose_next_works tool

import { loadAllCurriculumWorks, loadWorksForArea, type CurriculumWork } from '@/lib/montree/curriculum-loader';

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
}

export interface SequencerResult {
  child_id: string;
  child_name: string;
  proposals: ShelfProposal[];
  areas_stable: string[];
  summary: string;
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

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Science & Culture',
};

// Scoring weights
const SCORE_SEQUENCE_PROXIMITY = 40;
const SCORE_AREA_BALANCE = 20;
const SCORE_MASTERY_BONUS = 10;

// ---- Core Algorithm ----

/**
 * Generate shelf proposals for a single child.
 * Pure function — no DB calls, no AI. Caller provides all data.
 */
export function generateShelfProposals(
  childId: string,
  childName: string,
  progress: ChildProgress[],
  focusWorks: FocusWork[],
): SequencerResult {
  const proposals: ShelfProposal[] = [];
  const areasStable: string[] = [];

  // Build lookup sets
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
    const candidate = findBestCandidate(
      areaWorks,
      masteredSet,
      currentWorkName || null,
      masteredByArea[area] || 0,
      totalMastered,
    );

    if (!candidate) {
      // No eligible candidate found — either all mastered or prerequisites not met
      areasStable.push(area);
      continue;
    }

    // Determine confidence based on score
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (candidate.score >= 60) confidence = 'high';
    else if (candidate.score >= 35) confidence = 'medium';

    // Build reason string
    const reason = buildReason(currentFocus, currentIsMastered, candidate.work, area);

    proposals.push({
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
    });
  }

  // Build summary
  const proposalCount = proposals.length;
  const stableCount = areasStable.length;
  let summary: string;
  if (proposalCount === 0) {
    summary = `${childName}'s shelf looks good — no changes needed`;
  } else {
    const areaNames = proposals.map(p => AREA_LABELS[p.area] || p.area).join(', ');
    summary = `${proposalCount} shelf move${proposalCount > 1 ? 's' : ''} suggested: ${areaNames}`;
  }

  return {
    child_id: childId,
    child_name: childName,
    proposals,
    areas_stable: areasStable,
    summary,
  };
}

// ---- Candidate Finder ----

interface ScoredCandidate {
  work: CurriculumWork;
  score: number;
  prereqsMet: string[];
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
