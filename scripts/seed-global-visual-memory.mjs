// scripts/seed-global-visual-memory.mjs
//
// Seeds montree_global_visual_memory (migration 281) — the read-only global
// baseline moat ("master brain" v1) that kills photo-ID cold starts.
//
// Sources, in order:
//   1. WHALE SEED — Whale Class's teacher-validated STANDARD-work entries
//      (source IN teacher_setup/correction, confidence >= 0.80, real standard
//      work_key). Descriptions are scrubbed (roster names removed defensively,
//      whitespace normalized, capped at a fingerprint/sentence boundary).
//      Classroom photo URLs / media ids are deliberately NOT copied —
//      provenance is recorded via source_classroom_id only.
//   2. CURATED — hand-authored canonical entries for confusion-critical
//      standard works Whale doesn't cover, plus curated negative_descriptions
//      (discriminators) merged onto the confusion-pair works.
//
// Idempotent: upserts ON CONFLICT (work_key). Re-run any time.
// Curated negatives are deduped by 60-char prefix (same rule as
// appendNegativeExample in corrections/route.ts).
//
// Usage:
//   node scripts/seed-global-visual-memory.mjs            # seed
//   node scripts/seed-global-visual-memory.mjs --dry-run  # report only
//
// 🚨 v1 CONTRACT: this script is the ONLY writer of the global table.
// No runtime code path writes to it. See migration 281 header.

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

const WHALE_CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

// Whale Class roster (defensive scrub — audit found zero hits, but the global
// pool must never carry a child's name under any circumstances).
const ROSTER = [
  'Amy', 'Austin', 'Eric', 'Gengerlyn', 'Hayden', 'Henry', 'Jimmy', 'Joey',
  'Kayla', 'Kevin', 'KK', 'Leo', 'Lucky', 'MaoMao', 'MingXi', 'NiuNiu',
  'Rachel', 'Segina', 'Stella', 'YueZe',
];
const ROSTER_RE = new RegExp(`\\b(${ROSTER.join('|')})(?:'s)?\\b`, 'gi');

const DESC_CAP = 900; // seed-side cap; the context loader caps again at prompt time
const FINGERPRINT_SEP = ' || ';

// ---------------------------------------------------------------------------
// Canonical work_key → { name, area } from the static curriculum JSONs
// (lib/curriculum/data/*.json — the source of truth every classroom is
// seeded from). Global entries MUST carry canonical names so Pass 2b
// candidate names resolve at matchScore 1.0 against the static curriculum.
// ---------------------------------------------------------------------------
function loadCanonicalMap() {
  const map = new Map();
  const files = ['practical-life', 'sensorial', 'math', 'language', 'cultural'];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(REPO, 'lib', 'curriculum', 'data', `${f}.json`), 'utf8'));
    // math.json's top-level id is 'math' but the pipeline's canonical area key
    // is 'mathematics' (VALID_AREAS in two-pass.ts / montree_visual_memory.area).
    const areaKey = j.id === 'math' ? 'mathematics' : j.id;
    for (const cat of j.categories || []) {
      for (const w of cat.works || []) {
        map.set(w.id, { name: w.name, area: areaKey });
      }
    }
  }
  return map;
}

function scrub(text) {
  if (!text) return '';
  let t = String(text)
    .replace(ROSTER_RE, 'the child')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > DESC_CAP) {
    // Prefer cutting at a fingerprint boundary, else the last sentence end.
    const sepIdx = t.lastIndexOf(FINGERPRINT_SEP, DESC_CAP);
    if (sepIdx > 200) {
      t = t.slice(0, sepIdx).trim();
    } else {
      const dotIdx = t.lastIndexOf('. ', DESC_CAP);
      t = dotIdx > 200 ? t.slice(0, dotIdx + 1).trim() : t.slice(0, DESC_CAP).trim();
    }
  }
  return t;
}

// Merge negatives with 60-char-prefix dedupe (mirrors appendNegativeExample).
function mergeNegatives(existing, additions) {
  const out = Array.isArray(existing) ? existing.filter((n) => typeof n === 'string') : [];
  for (const add of additions) {
    const prefix = add.slice(0, 60).toLowerCase();
    if (!out.some((n) => n.slice(0, 60).toLowerCase() === prefix)) out.push(add);
  }
  return out.slice(0, 50);
}

// ---------------------------------------------------------------------------
// Curated discriminator negatives, keyed by work_key. Merged onto BOTH the
// Whale-seeded rows and the curated rows. These mirror (and extend) the
// CROSS_AREA_CONFUSION pairs in lib/montree/work-matching.ts — when a new
// pair is registered there, add its discriminators here too.
// ---------------------------------------------------------------------------
const NEG_SPINDLE_VS_CYLINDER =
  'NOT Spindle Boxes: Spindle Boxes show printed numerals 0-9 above open compartments holding BUNDLES of thin identical sticks; Cylinder Blocks are a solid wooden block where each round socket holds a single KNOBBED cylinder of graduated size.';
const NEG_CYLINDER_VS_SPINDLE =
  'NOT Cylinder Blocks: if the material is a SOLID wooden block/board with round recessed sockets where each socket holds ONE cylinder with a small KNOB (no printed numerals, no loose stick bundles), it is a Cylinder Block (Sensorial). Spindle Boxes always show printed numerals 0-9 and many thin identical loose spindles.';

const CURATED_NEGATIVES = {
  ma_spindle_box: [NEG_CYLINDER_VS_SPINDLE],
  se_cylinder_block_1: [NEG_SPINDLE_VS_CYLINDER],
  se_cylinder_block_2: [NEG_SPINDLE_VS_CYLINDER],
  se_cylinder_block_3: [NEG_SPINDLE_VS_CYLINDER],
  se_cylinder_block_4: [NEG_SPINDLE_VS_CYLINDER],
  se_cylinder_blocks_combined: [NEG_SPINDLE_VS_CYLINDER],
  se_red_rods: [
    'NOT Number Rods: Number Rods alternate RED AND BLUE painted segments; Red Rods are entirely red with no blue.',
  ],
  ma_number_rods: [
    'NOT Red Rods: Red Rods are ALL red with no blue segments; Number Rods alternate red and blue segments.',
  ],
  la_metal_insets: [
    'NOT Geometric Cabinet: the Geometric Cabinet is a WIDE cabinet of pull-out drawers with several flat shape insets per drawer; Metal Insets are individual square frames (one shape each) held in a vertical rack, used with colored pencils for tracing.',
  ],
  se_geometric_cabinet: [
    'NOT Metal Insets: Metal Insets are square frames with one shape each in a vertical rack, used with pencils for tracing; the Geometric Cabinet is a wide multi-drawer cabinet of flat shape insets.',
  ],
  se_color_box_3: [
    'NOT Fabric Matching: color tablets are rigid painted wood/plastic matched by LOOKING; fabric swatches are soft foldable cloth matched by TOUCH.',
  ],
  se_fabric_matching: [
    'NOT Color Box: Color Box pieces are rigid painted tablets matched visually; Fabric Matching uses soft cloth swatches matched by texture, often with eyes closed.',
  ],
  la_sandpaper_letters: [
    'NOT Moveable Alphabet: Moveable Alphabet letters are many LOOSE cut-out letters arranged on a mat to build words; Sandpaper Letters are single textured letters mounted one-per-board on pink or blue boards for finger tracing.',
    'NOT Sandpaper Numbers: Sandpaper Numbers show DIGITS 0-9 on GREEN boards; Sandpaper Letters show alphabet characters on pink (vowel) or blue (consonant) boards.',
  ],
  la_moveable_alphabet: [
    'NOT Sandpaper Letters: Sandpaper Letters are single rough letters fixed on pink/blue boards and traced with fingers; the Moveable Alphabet is a compartmented box of many loose smooth letters used to BUILD words on a mat.',
  ],
};

// ---------------------------------------------------------------------------
// Curated canonical entries for confusion-critical standard works that
// Whale's moat does not cover with teacher-validated entries.
// ---------------------------------------------------------------------------
const CURATED_ENTRIES = [
  {
    work_key: 'se_knobless_cylinders',
    visual_description:
      'Four flat wooden boxes with colored lids (yellow, green, red, blue), each holding ten smooth cylinders of a single bright color with NO knobs. The cylinders stand free on the table or mat — they do not sit in holes in a block. Children grade them by size, build towers, or match them alongside the knobbed cylinder blocks.',
    key_materials: ['four colored-lid wooden boxes', 'ten same-color smooth cylinders per box', 'no knobs', 'no base block — cylinders stand free'],
    negative_descriptions: [
      'NOT Cylinder Blocks: Cylinder Blocks are a single natural-wood block with round sockets where each cylinder has a small KNOB and fits into a matching hole; Knobless Cylinders are loose, brightly colored (one color per set), knob-free, and free-standing.',
    ],
  },
  {
    work_key: 'ma_sandpaper_numerals',
    visual_description:
      'Individual numerals 0-9 cut from fine sandpaper, each mounted on its own GREEN-painted rectangular wooden board. The child traces the rough numeral with two fingers. Boards are a uniform size and often stored upright in a wooden box.',
    key_materials: ['green wooden boards', 'sandpaper numerals 0-9', 'wooden storage box'],
    negative_descriptions: [
      'NOT Sandpaper Letters: letters appear on PINK (vowel) or BLUE (consonant) boards and show alphabet characters; Sandpaper Numbers are on GREEN boards and show digits 0-9.',
    ],
  },
  {
    work_key: 'se_color_box_1',
    visual_description:
      'A small wooden box holding six rigid color tablets — three matched pairs of red, yellow, and blue. Each tablet is a hard rectangle with a painted center strip and lighter holding edges. The child pairs identical colors by sight on a table or mat.',
    key_materials: ['small wooden box', 'six rigid color tablets', 'three primary-color pairs'],
    negative_descriptions: [
      'NOT Fabric Matching: color tablets are rigid painted wood/plastic matched by LOOKING; fabric swatches are soft foldable cloth matched by TOUCH.',
    ],
  },
  {
    work_key: 'se_color_box_2',
    visual_description:
      'A wooden box holding twenty-two rigid color tablets — eleven matched pairs spanning primary and secondary colors (red, yellow, blue, orange, green, purple, pink, brown, grey, black, white). The child pairs identical colors, often laying them out in two columns on a mat.',
    key_materials: ['wooden box', 'twenty-two rigid color tablets', 'eleven color pairs'],
    negative_descriptions: [
      'NOT Fabric Matching: color tablets are rigid painted wood/plastic matched by LOOKING; fabric swatches are soft foldable cloth matched by TOUCH.',
    ],
  },
  {
    work_key: 'ma_golden_beads_intro',
    visual_description:
      'Uniformly GOLD-colored beads presented as loose unit beads, ten-bead bars, hundred squares (flat 10×10 bead squares), and thousand cubes (10×10×10 bead blocks), usually arranged on trays or in wooden boxes. Used for decimal-system quantity work — building, exchanging, and combining quantities.',
    key_materials: ['gold unit beads', 'ten-bars', 'hundred squares', 'thousand cubes', 'wooden trays'],
    negative_descriptions: [
      'NOT Short Bead Stair: bead-stair bars are each a DIFFERENT color (1 red, 2 green, 3 pink...); golden bead material is uniformly gold.',
    ],
  },
  {
    work_key: 'se_sound_boxes',
    visual_description:
      'Two wooden boxes each holding six sealed wooden cylinders — one set with red lids, one with blue lids. The child shakes a cylinder beside the ear and pairs it with the matching sound from the other set. The cylinders are opaque with nothing visible inside.',
    key_materials: ['two wooden boxes', 'six red-lid cylinders', 'six blue-lid cylinders', 'sealed shaker cylinders'],
    negative_descriptions: [
      'NOT Spindle Boxes or Cylinder Blocks: sound cylinders are sealed shakers with colored LIDS held to the ear — no knobs, no numbered compartments.',
      'NOT Smelling Bottles: sound cylinders are shaken next to the ear; smelling bottles are opened and sniffed.',
    ],
  },
  {
    work_key: 'se_touch_tablets',
    visual_description:
      'A wooden box of small rectangular tablets, each surfaced with a different grade of sandpaper roughness. The child feels each tablet with the fingertips (often blindfolded or with eyes closed) and pairs or grades them from roughest to smoothest.',
    key_materials: ['wooden box', 'small paired sandpaper tablets', 'graded roughness'],
    negative_descriptions: [
      'NOT Touch Boards: Touch Boards are larger flat boards with alternating rough/smooth strips; Touch Tablets are small loose paired tablets stored in a box.',
      'NOT Sandpaper Letters or Numbers: touch tablets have plain sandpaper surfaces with NO letter or numeral shapes.',
    ],
  },
  {
    work_key: 'ma_cards_counters',
    visual_description:
      'Wooden or card numerals 1-10 laid in a row on a mat, with fifty-five small identical red counters (flat discs) placed in pairs beneath each numeral to show its quantity — odd numbers end with a single centered counter. The layout emphasizes odd/even visually.',
    key_materials: ['numeral cards 1-10', 'fifty-five red disc counters', 'work mat'],
    negative_descriptions: [
      'NOT Spindle Boxes: Cards and Counters uses flat numeral cards plus loose red discs arranged on a mat; Spindle Boxes is a wooden box with numbered compartments holding bundles of sticks.',
    ],
  },
];

// ---------------------------------------------------------------------------

async function main() {
  const client = new Client({
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.dmfncjjtsoxrnvcdnvjq',
    password: process.env.SUPABASE_DB_PASSWORD || readDbPasswordFromEnvLocal(),
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const canonical = loadCanonicalMap();
  console.log(`Canonical curriculum map: ${canonical.size} standard works`);

  // ---- 1. Whale extraction ----
  const { rows: whaleRows } = await client.query(
    `SELECT work_key, work_name, area, visual_description, key_materials,
            negative_descriptions, description_confidence
     FROM montree_visual_memory
     WHERE classroom_id = $1
       AND is_custom = false
       AND source IN ('teacher_setup', 'correction')
       AND description_confidence >= 0.80
       AND work_key IS NOT NULL
       AND work_key NOT LIKE 'custom_%'`,
    [WHALE_CLASSROOM_ID],
  );
  console.log(`Whale seed candidates: ${whaleRows.length}`);

  const upserts = new Map(); // work_key → row

  let skippedNonCanonical = 0;
  for (const r of whaleRows) {
    const canon = canonical.get(r.work_key);
    if (!canon) {
      // work_key not in the static curriculum (renamed/retired key) — a
      // global entry nothing can look up is dead weight; skip.
      skippedNonCanonical++;
      continue;
    }
    const desc = scrub(r.visual_description);
    if (!desc || desc.length < 40) continue; // too thin to be useful
    upserts.set(r.work_key, {
      work_key: r.work_key,
      work_name: canon.name, // canonical name, NOT Whale's local name
      area: canon.area,
      visual_description: desc,
      key_materials: Array.isArray(r.key_materials) ? r.key_materials.slice(0, 20) : null,
      negative_descriptions: mergeNegatives(
        (r.negative_descriptions || []).map((n) => scrub(n)).filter(Boolean),
        CURATED_NEGATIVES[r.work_key] || [],
      ),
      source: 'whale_seed',
      source_classroom_id: WHALE_CLASSROOM_ID,
      description_confidence: Math.min(Number(r.description_confidence) || 0.85, 0.95),
    });
  }
  if (skippedNonCanonical > 0) console.log(`Skipped ${skippedNonCanonical} rows with non-canonical work_keys`);

  // ---- 2. Curated entries (fill gaps only — Whale's real-classroom entries win) ----
  let curatedAdded = 0;
  for (const e of CURATED_ENTRIES) {
    if (upserts.has(e.work_key)) continue;
    const canon = canonical.get(e.work_key);
    if (!canon) {
      console.warn(`⚠ curated entry ${e.work_key} not in static curriculum — skipped`);
      continue;
    }
    upserts.set(e.work_key, {
      work_key: e.work_key,
      work_name: canon.name,
      area: canon.area,
      visual_description: e.visual_description,
      key_materials: e.key_materials,
      negative_descriptions: e.negative_descriptions,
      source: 'curated',
      source_classroom_id: null,
      description_confidence: 0.9,
    });
    curatedAdded++;
  }
  console.log(`Curated gap-fill entries: ${curatedAdded}`);
  console.log(`Total upserts: ${upserts.size}`);

  if (DRY_RUN) {
    for (const [k, v] of upserts) {
      console.log(`- ${k} (${v.source}, conf ${v.description_confidence}, negs ${v.negative_descriptions?.length || 0}) "${v.work_name}"`);
    }
    await client.end();
    console.log('DRY RUN — nothing written.');
    return;
  }

  // ---- 3. Upsert (chunked multi-row batches — one-by-one round-trips over
  // the pooler take ~200ms each and time out shells) ----
  let written = 0;
  const rows = [...upserts.values()];
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params = [];
    const tuples = [];
    for (let j = 0; j < chunk.length; j++) {
      const r = chunk[j];
      const base = j * 9;
      tuples.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, TRUE, NOW())`);
      params.push(
        r.work_key, r.work_name, r.area, r.visual_description,
        r.key_materials, r.negative_descriptions, r.source,
        r.source_classroom_id, r.description_confidence,
      );
    }
    await client.query(
      `INSERT INTO montree_global_visual_memory
         (work_key, work_name, area, visual_description, key_materials,
          negative_descriptions, source, source_classroom_id,
          description_confidence, is_active, updated_at)
       VALUES ${tuples.join(', ')}
       ON CONFLICT (work_key) DO UPDATE SET
         work_name = EXCLUDED.work_name,
         area = EXCLUDED.area,
         visual_description = EXCLUDED.visual_description,
         key_materials = EXCLUDED.key_materials,
         negative_descriptions = EXCLUDED.negative_descriptions,
         source = EXCLUDED.source,
         source_classroom_id = EXCLUDED.source_classroom_id,
         description_confidence = EXCLUDED.description_confidence,
         updated_at = NOW()`,
      params,
    );
    written += chunk.length;
  }

  const { rows: [{ count }] } = await client.query(
    'SELECT count(*) FROM montree_global_visual_memory WHERE is_active',
  );
  console.log(`✅ Wrote ${written} rows. Active global entries: ${count}`);

  // Post-check: the confusion cluster that triggered this build
  const { rows: check } = await client.query(
    `SELECT work_key, work_name, array_length(negative_descriptions, 1) AS negs
     FROM montree_global_visual_memory
     WHERE work_key IN ('ma_spindle_box','se_cylinder_block_1','se_knobless_cylinders')`,
  );
  check.forEach((r) => console.log(`   check: ${r.work_key} → "${r.work_name}" (negs: ${r.negs})`));

  await client.end();
}

function readDbPasswordFromEnvLocal() {
  const env = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8');
  const m = env.match(/DATABASE_URL=postgres:\/\/postgres:([^@]+)@/);
  if (!m) throw new Error('Could not read DB password from .env.local DATABASE_URL');
  return m[1];
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exit(1);
});
