// tests/tracking/resolve-burnin.test.ts
//
// RULE 6, AGAINST REAL DATA. Every name below came out of the live Whale class
// on 2026-09-06 (docs/tracking/burnin-whale-2026-09-06.json: 1,145 journal events
// with no work_key, 388 distinct legacy work names, against the classroom's 651
// curriculum works). The fixtures in resolve.test.ts are hand-made and kind; this
// file is what teachers actually typed for a year.
//
// Two things are tested here:
//
//   1. THE TABLE — a legacy name → the work_key it must resolve to, plus every
//      name that must stay UNKNOWN and why (rule 5: a tie is unknown).
//   2. NO TWO RESOLVERS DISAGREE — the same inputs through every public entry
//      point that turns a name into a work. Before the burn-in there were five
//      independent implementations; there is now one reader with four adapters,
//      and this test is what keeps it that way.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  resolveWorkName,
  resolveWorkKeyFromCurriculum,
  resolveWorkInAreas,
  resolveCurriculumRow,
  type ResolvableWork,
} from '@/lib/montree/tracking/resolve';
import { matchToCurriculumV2 } from '@/lib/montree/work-matching';
import type { CurriculumWork as CatalogWork } from '@/lib/montree/curriculum-loader';

const BURNIN = fileURLToPath(
  new URL('../../docs/tracking/burnin-whale-2026-09-06.json', import.meta.url),
);

interface Burnin {
  noKeyNames: [string, number][];
  works: [string, string, number, string][];
}

const burnin: Burnin = JSON.parse(readFileSync(BURNIN, 'utf8'));

/**
 * The classroom's own curriculum rows. The export carries no area column (the
 * table keys area through area_id), so the area is read off the work_key prefix
 * the seed uses — pl_/se_/ma_/la_/cu_ — which is exactly the disambiguation a
 * caller has in hand when it passes opts.area.
 */
const AREA_BY_PREFIX: Record<string, string> = {
  pl: 'practical_life',
  se: 'sensorial',
  ma: 'mathematics',
  la: 'language',
  cu: 'cultural',
};
function areaOfKey(key: string): string {
  if (key.startsWith('dp:') || key.startsWith('phonics')) return 'language';
  if (key.startsWith('ws:')) return 'language';
  return AREA_BY_PREFIX[key.slice(0, 2)] ?? 'other';
}

interface Row extends ResolvableWork {
  work_key: string;
  name: string;
  area: string;
  sequence: number;
}

const works: Row[] = burnin.works.map(([work_key, name, sequence]) => ({
  work_key,
  name,
  sequence,
  area: areaOfKey(work_key),
}));

const key = (input: string, area?: string | null): string | null => {
  const r = resolveWorkName(input, works, { area });
  return r.kind === 'resolved' ? r.key : null;
};

/* ---------------------------------------------------------------------- */
/* 1. THE TABLE                                                            */
/* ---------------------------------------------------------------------- */

/** Legacy name → the work_key it must land on. */
const RESOLVES: [string, string][] = [
  ["Farm", "custom_farm_1773931138372"],
  ["Number Rods", "ma_number_rods"],
  ["Cutting", "custom_cutting_1775556256928"],
  ["Cylinder Block 1", "se_cylinder_block_1"],
  ["Globe - Land and Water", "cu_globe_land_water"],
  ["Carrying a Mat", "pl_carrying_mat"],
  ["Pink Tower", "se_pink_tower"],
  ["Sandpaper Letters", "la_sandpaper_letters"],
  ["Short Bead Stair", "ma_short_bead_stair"],
  ["Cylinder Block 3", "se_cylinder_block_3"],
  ["Opposite Matching Cards", "custom_opposite_matching_cards_1775806278731"],
  ["Tweezers Transfer", "pl_tweezers"],
  ["Cylinder Block 2", "se_cylinder_block_2"],
  ["Cylinder Block 4", "se_cylinder_block_4"],
  ["Knobless Cylinders", "se_knobless_cylinders"],
  ["Sound Games (I Spy)", "la_sound_games"],
  ["Brown Stair (Broad Stair)", "se_brown_stair"],
  ["Carrying a Tray", "pl_carrying_tray"],
  ["Chalk Color Sand Work", "custom_chalk_color_sand_work_1775662103552"],
  ["Folding Cloths", "pl_folding_cloth"],
  ["Formation of Symbol", "ma_formation_symbol"],
  ["Geometric Solids", "se_geometric_solids"],
  ["Introduction to Golden Beads", "ma_golden_beads_intro"],
  ["Moveable Alphabet", "la_moveable_alphabet"],
  ["Paper Work", "custom_paper_work_1775391658354"],
  ["Pink Series (CVC Words)", "la_pink_series"],
  ["Pouring Water", "pl_pouring_water"],
  ["Red Rods (Long Rods)", "se_red_rods"],
  ["Sponging", "pl_sponging"],
  ["Spooning", "pl_spooning"],
  ["Tonging", "pl_tonging"],
  ["Walking on the Line", "pl_walking_line"],
  ["Animal Life Cycles", "cu_life_cycles"],
  ["Association of Quantity and Symbol", "ma_association_quantity_symbol"],
  ["Basting (Turkey Baster)", "pl_basting"],
  ["Carrying a Chair", "pl_carrying_chair"],
  ["Carrying a Table", "pl_carrying_table"],
  ["Chopsticks Transfer", "pl_chopsticks"],
  ["Dry Transfer - Hands", "pl_dry_transfer_hand"],
  ["Formation of Quantity", "ma_formation_quantity"],
  ["Golden Bead Tray Exercises", "ma_golden_beads_tray"],
  ["Land and Water Form Trays", "cu_land_water_trays"],
  ["Nuts and Bolts Board", "pl_nuts_and_bolts"],
  ["Opening and Closing Containers", "pl_opening_closing_containers"],
  ["Opening and Closing a Door", "pl_opening_closing_door"],
  ["Pouring Dry Materials", "pl_pouring_dry"],
  ["Sand Tray Writing", "la_sand_tray"],
  ["Sitting and Standing at a Table", "pl_sitting_standing"],
  ["The Silence Game", "pl_silence_game"],
  ["Turning Pages of a Book", "pl_turning_pages"],
  ["Addition Snake Game", "ma_addition_snake_game"],
  ["Birthday Celebration", "cu_birthday_celebration"],
  ["Cards and Counters", "ma_cards_counters"],
  ["Classified Cards (Nomenclature Cards)", "la_classified_cards"],
  ["Color Box 1 (Primary Colors)", "se_color_box_1"],
  ["Constructive Triangles - Rectangular Box", "se_constructive_triangles_rect"],
  ["Continent Study Folders", "cu_continent_folders"],
  ["Cycle of the Chicken", "custom_cultural_1772934587189"],
  ["Cylinder Blocks Combined", "se_cylinder_blocks_combined"],
  ["Dark Phonics Work 3 - Sentence Building", "custom_dark_phonics_work_3_sentence_building_8a7af7a5"],
  ["Eye Dropper", "pl_dropper"],
  ["Flags of the World", "cu_flags"],
  ["Globe - Continents", "cu_globe_continents"],
  ["Hammering", "pl_hammering"],
  ["Land and Water Forms", "cu_land_water_forms"],
  ["Large Numeral Cards", "ma_large_numeral_cards"],
  // Legacy spellings the burn-in provoked, verified by hand against the 651-row
  // Whale curriculum. These are the ones the pre-burn-in reader got wrong.
  ["Command Cards", "la_command_cards"],
  ["Color Box 2", "se_color_box_2"],
  ["command cards", "la_command_cards"],
  ["Movable Alphabet", "la_moveable_alphabet"],
  ["Sandpaper Letter", "la_sandpaper_letters"],
  ["Cylinder Block 1 ", "se_cylinder_block_1"],
  ["red rods", "se_red_rods"],
  ["Long Rods", "se_red_rods"],
  ["Broad Stair", "se_brown_stair"],
  ["Pink Series", "la_pink_series"],
  ["Colour Box 2", "se_color_box_2"],
  ["Sound Games", "la_sound_games"],
  ["I Spy", "la_sound_games"],
  ["Cards & Counters", "ma_cards_counters"],
  ["Folding Cloth", "pl_folding_cloth"],
  ["Spindle Box", "ma_spindle_box"],
];

describe('burn-in: real Whale-class names resolve to real keys', () => {
  it('has a table of at least 60 real names', () => {
    expect(RESOLVES.length).toBeGreaterThanOrEqual(60);
  });

  for (const [name, expected] of RESOLVES) {
    it(`${JSON.stringify(name)} → ${expected}`, () => {
      expect(key(name)).toBe(expected);
    });
  }
});

/**
 * The names that must NOT resolve, and the reason each one is refused.
 * 'ambiguous' — two or more curriculum rows answer to the name (rule 5's tie;
 * invariant 'duplicate-work-name' asks a human to rename one).
 * 'no-match'  — the work is simply not in this classroom's curriculum.
 */
const REFUSES: [string, 'no-match' | 'ambiguous'][] = [
  ["Clock Work", "ambiguous"],
  ["Calendar Work", "ambiguous"],
  ["Linear Counting 6", "no-match"],
  ["Frog Life Cycle", "no-match"],
  ["Puzzle of the Flower", "no-match"],
  ["Cylinder Block", "ambiguous"],
  ["Number and Quantity Correspondence", "no-match"],
  ["Map of China", "no-match"],
  ["Cylinder Blocks", "ambiguous"],
  ["Peeling Practice", "no-match"],
  ["Pink Series Sentence Strips", "no-match"],
  ["Montessori Bells", "ambiguous"],
];

describe('burn-in: names that must stay unknown (rule 5)', () => {
  for (const [name, reason] of REFUSES) {
    it(`${JSON.stringify(name)} → ${reason}`, () => {
      const r = resolveWorkName(name, works);
      expect(r.kind).toBe('unknown');
      if (r.kind === 'unknown') expect(r.reason).toBe(reason);
    });
  }

  it('an area hint settles a duplicate name, and only the right one', () => {
    // "Clock Work" is ma_clock AND cu_clock in this classroom.
    expect(key('Clock Work')).toBeNull();
    expect(key('Clock Work', 'mathematics')).toBe('ma_clock');
    expect(key('Clock Work', 'cultural')).toBe('cu_clock');
    // An area that neither row is in does not pick one at random.
    expect(key('Clock Work', 'practical_life')).toBeNull();
  });

  it('three works sharing a name are still a tie with no hint', () => {
    const r = resolveWorkName('Montessori Bells', works);
    expect(r.kind).toBe('unknown');
    if (r.kind === 'unknown') {
      expect(r.reason).toBe('ambiguous');
      expect(r.candidates.length).toBe(3);
    }
  });

  it('a plural that covers four numbered works is a tie, never work 1', () => {
    for (const name of ['Cylinder Block', 'Cylinder Blocks']) {
      const r = resolveWorkName(name, works);
      expect(r.kind).toBe('unknown');
      if (r.kind === 'unknown') expect(r.reason).toBe('ambiguous');
    }
  });
});

/* ---------------------------------------------------------------------- */
/* 2. NO TWO RESOLVERS DISAGREE                                            */
/* ---------------------------------------------------------------------- */

/** The catalog shape matchToCurriculumV2 reads. */
const catalog: CatalogWork[] = works.map((w) => ({
  work_key: w.work_key,
  name: w.name,
  area_key: w.area,
  sequence: w.sequence,
}));

/** The area-grouped shape the photo-audit screen holds. */
const byArea: Record<string, Row[]> = {};
for (const w of works) (byArea[w.area] ??= []).push(w);

/** Every distinct name the burn-in produced, plus the canonical shapes. */
const ALL_INPUTS: string[] = [
  ...burnin.noKeyNames.map(([n]) => n),
  't Dark Phonics work 3',
  'T-Work-3',
  't w3',
  's Dark Phonics work 1',
  'Writing Shelf tray 3',
  'ws3',
  'tray 8',
  ...RESOLVES.map(([n]) => n),
];

describe('no two resolvers disagree', () => {
  it('every public entry point gives the reader\'s answer, for all 400+ real inputs', () => {
    const disagreements: string[] = [];

    for (const input of ALL_INPUTS) {
      const reader = resolveWorkName(input, works);
      const expected = reader.kind === 'resolved' ? reader.key : null;

      // (1) the door — write-progress resolveWorkKey
      const door = resolveWorkKeyFromCurriculum(input, works);
      if (door !== expected) disagreements.push(`door: ${input} → ${door} (reader ${expected})`);

      // (2) the photo-audit screen — findWorkByName
      const screen = resolveWorkInAreas(input, byArea)?.work.work_key ?? null;
      if (screen !== expected) disagreements.push(`screen: ${input} → ${screen} (reader ${expected})`);

      // (3) guru/corrections — by-name lookup
      const correction = resolveCurriculumRow(input, works)?.work_key ?? null;
      if (correction !== expected) {
        disagreements.push(`corrections: ${input} → ${correction} (reader ${expected})`);
      }

      // (4) the AI vision matcher. Its extra scoring is a PRE-RANKING: when the
      //     reader has an answer it must be that answer, and when the reader sees
      //     a TIE nothing may be picked. Only 'no-match' — a name this classroom
      //     genuinely does not carry — may still surface a candidate, because the
      //     image pipeline has evidence the string does not and its own
      //     confidence gate downstream.
      const vision = matchToCurriculumV2(input, null, catalog);
      if (reader.kind === 'resolved' && vision.bestMatch?.work_key !== expected) {
        disagreements.push(`vision: ${input} → ${vision.bestMatch?.work_key} (reader ${expected})`);
      }
      if (reader.kind === 'unknown' && reader.reason === 'ambiguous' && vision.bestMatch) {
        disagreements.push(`vision resolved a tie: ${input} → ${vision.bestMatch.work_key}`);
      }
    }

    expect(disagreements).toEqual([]);
  });

  it('the area hint reaches every entry point the same way', () => {
    expect(resolveWorkKeyFromCurriculum('Clock Work', works, 'cultural')).toBe('cu_clock');
    expect(resolveWorkInAreas('Clock Work', byArea, 'cultural')?.work.work_key).toBe('cu_clock');
    expect(resolveCurriculumRow('Clock Work', works, 'cultural')?.work_key).toBe('cu_clock');
    expect(matchToCurriculumV2('Clock Work', 'cultural', catalog).bestMatch?.work_key).toBe('cu_clock');
  });

  it('is pure — the same input, the same answer, whatever the row order', () => {
    const shuffled = [...works].reverse();
    for (const [name] of RESOLVES) {
      expect(key(name)).toBe(resolveWorkName(name, shuffled).kind === 'resolved'
        ? (resolveWorkName(name, shuffled) as { key: string }).key
        : null);
    }
  });
});
