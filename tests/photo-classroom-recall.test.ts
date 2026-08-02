// tests/photo-classroom-recall.test.ts
//
// Regression tests for lib/montree/photo-identification/classroom-recall.ts.
//
// THE INCIDENT THESE PIN DOWN (2026-07-29, Whale Class, media 6070e128 / e62f796b):
// A teacher photographed a ring-tree fine-motor work. Haiku Pass 2 answered
// `is_curriculum_work: false` at 0.90 and the "Other" escape hatch — which sat
// UPSTREAM of every matching step — filed it away. The teacher taught the system
// what it was; a custom work was created and visual memory was seeded correctly.
// Twenty-two seconds later a near-identical second photo got the same verdict and
// was filed as Other again, because the freshly written memory was never consulted.
//
// The fixtures below are the REAL visual-memory descriptions from that classroom
// and the REAL Pass-1 description of the photo that failed. If someone refactors
// the recall scoring and the first assertion breaks, that is the incident coming
// back — do not "fix" the test by lowering the threshold.
//
// Pure functions, no DB, no mocks needed.

import { describe, it, expect } from 'vitest';
import {
  scoreClassroomRecall,
  hasStrongRecall,
  RECALL_OVERRIDE_SCORE,
  RECALL_CANDIDATE_SCORE,
  type RecallEntry,
} from '@/lib/montree/photo-identification/classroom-recall';

// ---- Real Pass-1 description of the photo the system failed to recognise ----
const INCIDENT_PHOTO = `No child is visible in this image. On a cream-colored fabric mat placed on a wooden floor, there is a wooden tray made of light brown wood with a recessed rectangular compartment. On the tray sit two objects: a small tree sculpture with a white ceramic or plaster base and thin metal branches extending upward, and a small woven or textured metal sphere. Both pieces are rigid and appear to be decorative or sensorial objects positioned on the wooden tray surface.`;

// ---- Real classroom visual-memory corpus (subset, verbatim) ----
const CORPUS: RecallEntry[] = [
  {
    workName: 'Ring Tree Fine Motor Work',
    visualDescription: `A rectangular wooden tray holds a small white decorative tree with many outstretched branches, resembling a bare winter tree. A circular well cut into the tray contains a collection of small gold and silver jump rings. The tray also features a rectangular recessed channel, likely for resting the tweezers when not in use.`,
    keyMaterials: ['wooden tray', 'white decorative branch tree', 'small metal jump rings (gold and silver)', 'tweezers'],
  },
  {
    workName: 'Elastic Band Pattern Work',
    visualDescription: `The child's left hand is holding a black metal bowl or container, while their right hand is touching a wooden board with multiple horizontal rows of small metal beads (in colors including red, yellow, green, and blue) threaded on metal rods. The board is made of light wood and sits inside a wooden tray. Additional materials on the same tray include colored metal rings (yellow, red, and green).`,
    keyMaterials: [],
  },
  {
    workName: 'Pink Tower',
    visualDescription: `A stack of ten solid pink wooden cubes arranged from largest to smallest, creating a pyramidal tower on a classroom mat or table. Each cube is a uniform rose pink color with smooth wooden surfaces, graduating precisely from 10cm³ at the base to 1cm³ at the top. The cubes are stacked centrally and symmetrically, with the size progression clearly visible from the side view.`,
    keyMaterials: ['10 pink wooden cubes', 'graduated sizes (1cm³ to 10cm³)', 'classroom mat or wooden table', 'smooth wooden texture', 'rose pink color'],
  },
  {
    workName: 'Brown Stair (Broad Stair)',
    visualDescription: `Ten brown wooden rectangular prisms arranged in a stair-step formation on a mat or table, each with identical length but progressively increasing width and height from the smallest (1cm) to the largest (10cm). The prisms are stacked to create a distinctive stepped profile, with the flat faces visible showing the clear graduation in thickness.`,
    keyMaterials: ['10 brown wooden prisms', 'graduated width and height (1cm-10cm)', 'constant length', 'stair-step arrangement'],
  },
  {
    workName: 'Metal Insets',
    visualDescription: `The Montessori Metal Insets material consists of a tall, narrow wooden storage frame (natural light oak finish) holding a vertical stack of five individual square frames, each approximately 5-6 inches wide. Every frame is painted in a vivid, glossy red on the front face with a dark navy painted edge visible on the sides.`,
    keyMaterials: ['glossy red-painted wooden square frames', 'cobalt blue flat wooden shape insets', 'pentagon shape', 'trapezoid shape'],
  },
  {
    workName: 'Fabric Matching',
    visualDescription: `A large cream-colored cloth mat displays a grid of fabric swatches in various colors and textures arranged in organized rows. The mat shows fabric samples including navy blue, light blue, pink, black, beige, cream, and white swatches positioned in a systematic 3x4 grid pattern. A wooden storage box with compartments sits adjacent to the mat.`,
    keyMaterials: ['cream cloth mat', 'fabric swatches in multiple colors', 'wooden storage box with compartments'],
  },
  {
    workName: 'Pom-Pom Color Sorting with Tweezers',
    visualDescription: `A young girl wearing a grey zip-up hoodie sits at a light natural wood table, both hands resting on the edges of a rectangular natural wood tray with raised sides. Inside the tray, on the left side, is a small round white ceramic bowl filled with approximately 20-25 small colorful pom-poms in bright mixed colors — red, yellow, green, orange, white, and others.`,
    keyMaterials: [],
  },
  {
    workName: 'Cutting',
    visualDescription: `A small wooden or wicker tray on a low table holds a pair of silver metal child-sized scissors with red or yellow plastic-coated handles resting on the right side. To the left sits a neat stack of white card stock strips approximately 2 cm wide, each printed with a single bold black line running horizontally across the length.`,
    keyMaterials: null,
  },
  {
    workName: 'Touch Tablets (Rough and Smooth)',
    visualDescription: `Wooden rectangular tablets arranged in a line, featuring alternating textured surfaces — smooth polished wood, rough cork, and cream-colored fabric or sandpaper panels. A natural wood compartmented tray holds additional matching texture pairs for sensorial exploration.`,
    keyMaterials: null,
  },
  {
    workName: 'Sandpaper Letters',
    visualDescription: `Bright pink/red rectangular cardstock cards with gold/yellow sandpaper letters adhered to their surfaces. Each card features a single letter character rendered in raised, textured golden-yellow sandpaper on a vivid pink-red card background.`,
    keyMaterials: ['pink/red matte cardstock cards', 'golden-yellow textured sandpaper', 'beige woven work mat'],
  },
  {
    workName: 'Outdoor Seesaw Play',
    visualDescription: `Two young children are outdoors on a natural playground, using a wooden seesaw made from a long, smooth timber plank resting across two upright log-post fulcrums set into the ground. The child in the center stands upright, gripping a metal handlebar attached to the plank with both hands, feet planted firmly on the packed earth.`,
    keyMaterials: ['long natural timber seesaw plank', 'two upright log-post fulcrums', 'packed earth/dirt ground surface'],
  },
];

describe('scoreClassroomRecall — the 2026-07-29 ring-tree incident', () => {
  it('recalls the work the classroom just taught, from a near-identical second photo', () => {
    const hits = scoreClassroomRecall(INCIDENT_PHOTO, CORPUS);

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].workName).toBe('Ring Tree Fine Motor Work');
    // This is the assertion that would have prevented the incident.
    expect(hits[0].score).toBeGreaterThanOrEqual(RECALL_OVERRIDE_SCORE);
    expect(hasStrongRecall(hits)).toBe(true);
  });

  it('separates the right answer from the runner-up by a clear margin', () => {
    const hits = scoreClassroomRecall(INCIDENT_PHOTO, CORPUS);
    expect(hits.length).toBeGreaterThan(1);
    // Not a coin flip between two similar works — the lead must be decisive.
    // NOTE ON THE NUMBER: absolute scores and margins are corpus-size
    // dependent, because IDF is computed over the classroom's own corpus.
    // Measured margins for this exact query: 1.77x against the real 322-entry
    // Whale Class corpus, 1.28x against this 11-entry fixture subset, 1.35x
    // against a 4-entry corpus. 1.2x is the floor that holds across all three.
    expect(hits[0].score).toBeGreaterThan(hits[1].score * 1.2);
  });

  it('reports the shared terms that drove the match, for telemetry', () => {
    const hits = scoreClassroomRecall(INCIDENT_PHOTO, CORPUS);
    expect(hits[0].sharedTerms.length).toBeGreaterThan(0);
    expect(hits[0].sharedTerms).toEqual(expect.arrayContaining(['tree']));
  });
});

describe('scoreClassroomRecall — correctness on known works', () => {
  it('recalls Pink Tower from a Pink Tower photo', () => {
    const hits = scoreClassroomRecall(
      'A child has stacked ten graduated pink wooden cubes into a tower on a classroom mat, largest cube at the base and smallest at the top.',
      CORPUS,
    );
    expect(hits[0].workName).toBe('Pink Tower');
    expect(hasStrongRecall(hits)).toBe(true);
  });

  it('does NOT strongly recall anything from an unrelated photo', () => {
    const hits = scoreClassroomRecall(
      'Several children sit around a low table eating lunch from lunchboxes, drinking water from bottles and talking to each other.',
      CORPUS,
    );
    // The property that matters: an unrelated photo must never clear the
    // override bar, because that is what suppresses the "Other" routing.
    // (It may still clear the lower candidate bar and be offered as a chip —
    // that is harmless, the teacher just sees one extra suggestion.)
    expect(hasStrongRecall(hits)).toBe(false);
    expect(hits[0]?.score ?? 0).toBeLessThan(RECALL_OVERRIDE_SCORE);
  });

  it('holds the override bar even for a brand-new classroom with a tiny corpus', () => {
    // IDF is computed over the classroom's own corpus, so a nearly-empty
    // classroom is the regime where spurious matches are most likely. Measured:
    // an unrelated photo peaks at 0.189 against a 2-4 entry corpus, while the
    // genuine match still scores 0.42-0.45. Guards against a new school seeing
    // false overrides on its first few photos.
    const tinyCorpus = CORPUS.slice(0, 3);

    const genuine = scoreClassroomRecall(INCIDENT_PHOTO, tinyCorpus);
    expect(genuine[0].workName).toBe('Ring Tree Fine Motor Work');
    expect(hasStrongRecall(genuine)).toBe(true);

    const unrelated = scoreClassroomRecall(
      'Several children sit around a low table eating lunch from lunchboxes, drinking water from bottles and talking to each other.',
      tinyCorpus,
    );
    expect(hasStrongRecall(unrelated)).toBe(false);
  });

  it('is not fooled by generic vocabulary alone', () => {
    // Nothing but stopwords and filler — must not match a real work.
    const hits = scoreClassroomRecall(
      'The child is working. It is placed on the surface. There are objects here.',
      CORPUS,
    );
    expect(hasStrongRecall(hits)).toBe(false);
  });
});

describe('scoreClassroomRecall — contract', () => {
  it('is deterministic across repeated calls', () => {
    const a = scoreClassroomRecall(INCIDENT_PHOTO, CORPUS);
    const b = scoreClassroomRecall(INCIDENT_PHOTO, CORPUS);
    expect(b).toEqual(a);
  });

  it('does not depend on corpus row order (ties broken by name, not insertion)', () => {
    const forward = scoreClassroomRecall(INCIDENT_PHOTO, CORPUS);
    const reversed = scoreClassroomRecall(INCIDENT_PHOTO, [...CORPUS].reverse());
    expect(reversed.map((h) => h.workName)).toEqual(forward.map((h) => h.workName));
  });

  it('returns an empty list for empty or missing input', () => {
    expect(scoreClassroomRecall('', CORPUS)).toEqual([]);
    expect(scoreClassroomRecall(null, CORPUS)).toEqual([]);
    expect(scoreClassroomRecall(undefined, CORPUS)).toEqual([]);
    expect(scoreClassroomRecall(INCIDENT_PHOTO, [])).toEqual([]);
  });

  it('tolerates entries with null descriptions and missing materials', () => {
    const ragged: RecallEntry[] = [
      { workName: 'No Description', visualDescription: null },
      { workName: 'Empty Description', visualDescription: '', keyMaterials: null },
      ...CORPUS,
    ];
    const hits = scoreClassroomRecall(INCIDENT_PHOTO, ragged);
    expect(hits[0].workName).toBe('Ring Tree Fine Motor Work');
    expect(hits.map((h) => h.workName)).not.toContain('No Description');
  });

  it('respects the requested limit', () => {
    expect(scoreClassroomRecall(INCIDENT_PHOTO, CORPUS, 2)).toHaveLength(2);
    expect(scoreClassroomRecall(INCIDENT_PHOTO, CORPUS, 1)).toHaveLength(1);
  });

  it('keeps the override bar above the candidate bar', () => {
    expect(RECALL_OVERRIDE_SCORE).toBeGreaterThan(RECALL_CANDIDATE_SCORE);
  });
});

describe('hasStrongRecall', () => {
  it('is false for an empty hit list', () => {
    expect(hasStrongRecall([])).toBe(false);
  });

  it('keys off the top hit only', () => {
    expect(hasStrongRecall([{ workName: 'W', score: RECALL_OVERRIDE_SCORE, sharedTerms: [] }])).toBe(true);
    expect(hasStrongRecall([{ workName: 'W', score: RECALL_OVERRIDE_SCORE - 0.001, sharedTerms: [] }])).toBe(false);
  });
});
