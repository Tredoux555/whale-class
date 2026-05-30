// lib/montree/english-sequence/lesson-materials.ts
//
// The JOIN between the two sources of truth:
//   • english-sequence/lesson-map.ts  — the 128 numbered lessons (the tracker
//     spine: a child's current_lesson / mastered_lessons).
//   • phonics/phonics-data.ts          — the word-bank groups the Library
//     material generators (three-part cards, object boxes, bingo, …) draw from.
//
// Each PhonicsWordGroup now carries `lessonNums` (the lessons whose skill it
// teaches). These helpers resolve in both directions so a generator — or the
// English Progression tracker — can scope materials to the EXACT lesson a
// child is on, not just the phase. This is the "make materials hand-in-hand
// with the classroom curriculum" wiring.
//
// Pure data/derivation, no React — safe to import on server or client.

import { ALL_PHASES, type PhonicsPhase, type PhonicsWordGroup } from '@/lib/montree/phonics/phonics-data';
import { TOTAL_LESSONS, getLesson, type EnglishLesson } from './lesson-map';

/** A group paired with the phonics-data phase it lives in. */
export interface PhaseGroup {
  /** Phonics-data phase id, e.g. 'beginning' | 'pink1' | 'blue2' | 'green3'.
   *  This is what the material generators take as their `?phase=` param. */
  phaseId: string;
  phaseName: string;
  group: PhonicsWordGroup;
}

/** Everything you can resolve about a single lesson's materials. */
export interface LessonMaterials {
  lessonNum: number;
  lesson: EnglishLesson | null;
  /** Groups whose skill this lesson teaches (may span multiple phases). */
  groups: PhaseGroup[];
  /** Distinct phonics-data phase ids covering this lesson (for `?phase=`). */
  phaseIds: string[];
  /** True when at least one generatable word-bank group exists for the lesson. */
  hasMaterials: boolean;
}

// Flat index built once at module load: every (phase, group) pair.
const ALL_GROUPS: PhaseGroup[] = ALL_PHASES.flatMap((p: PhonicsPhase) =>
  p.groups.map((group) => ({ phaseId: p.id, phaseName: p.name, group }))
);

// lessonNum -> PhaseGroup[] (lazy-built reverse index).
const LESSON_INDEX: Map<number, PhaseGroup[]> = (() => {
  const m = new Map<number, PhaseGroup[]>();
  for (const pg of ALL_GROUPS) {
    for (const n of pg.group.lessonNums ?? []) {
      const arr = m.get(n);
      if (arr) arr.push(pg);
      else m.set(n, [pg]);
    }
  }
  return m;
})();

/** Groups whose skill the given lesson (1..128) teaches. */
export function getGroupsForLesson(lessonNum: number): PhaseGroup[] {
  return LESSON_INDEX.get(lessonNum) ?? [];
}

/** Distinct phonics-data phase ids that cover a lesson (for generator `?phase=`). */
export function getPhaseIdsForLesson(lessonNum: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pg of getGroupsForLesson(lessonNum)) {
    if (!seen.has(pg.phaseId)) {
      seen.add(pg.phaseId);
      out.push(pg.phaseId);
    }
  }
  return out;
}

/** Full resolution for one lesson — what the tracker would deep-link to. */
export function getLessonMaterials(lessonNum: number): LessonMaterials {
  const groups = getGroupsForLesson(lessonNum);
  return {
    lessonNum,
    lesson: getLesson(lessonNum),
    groups,
    phaseIds: getPhaseIdsForLesson(lessonNum),
    hasMaterials: groups.length > 0,
  };
}

/** The lesson numbers a given group teaches (forward direction). */
export function getLessonsForGroup(group: PhonicsWordGroup): number[] {
  return [...(group.lessonNums ?? [])].sort((a, b) => a - b);
}

/** Lowest lesson a group teaches — handy for ordering/labeling a group. */
export function firstLessonForGroup(group: PhonicsWordGroup): number | null {
  const ls = group.lessonNums;
  if (!ls || ls.length === 0) return null;
  return Math.min(...ls);
}

/** Coverage audit: which of the 128 lessons have ≥1 generatable group, and
 *  which don't (the latter are oral-only or advanced skills with no word-bank
 *  group yet — a known, intentional gap, not an error). */
export function lessonCoverage(): { covered: number[]; uncovered: number[] } {
  const covered: number[] = [];
  const uncovered: number[] = [];
  for (let n = 1; n <= TOTAL_LESSONS; n += 1) {
    (LESSON_INDEX.has(n) ? covered : uncovered).push(n);
  }
  return { covered, uncovered };
}
