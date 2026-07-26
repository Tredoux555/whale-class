/**
 * Rule tests for deriveWord() against REAL filenames from phonics-images/.
 * Run: node scripts/curriculum/lib/image-manifest.test.mjs
 */
import assert from 'assert';
import { deriveWord } from './image-manifest.mjs';

let pass = 0, fail = 0;
function check(rel, expected) {
  const got = deriveWord(rel);
  const actual = got === null ? null : (got.coloring ? `${got.word}|coloring` : got.word);
  try { assert.deepStrictEqual(actual, expected); pass++; }
  catch { fail++; console.error(`  ✗ ${rel}\n      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

// ── Dialect 1: flat phase banks — the easy majority ───────────────────────
for (const [rel, w] of [
  ['pink1/cat.jpg', 'cat'], ['pink1/mat.jpg', 'mat'], ['pink2_short_u/sun.jpg', 'sun'],
  ['pink2_short_a/hat.jpg', 'hat'], ['blue1_blends/frog.jpg', 'frog'],
  ['blue2_final_blends/nest.jpg', 'nest'], ['blue3_doubles_ck/sock.jpg', 'sock'],
  ['green1_digraphs/fish.jpg', 'fish'], ['green2_vowel_teams/moon.jpg', 'moon'],
  ['green3_advanced/star.jpg', 'star'], ['satpin-v2/vocab-iso/ax.png', 'ax'],
  ['satpin-v2/vocab-iso/sock.png', 'sock'],
]) check(rel, w);

// ── Dialect 2: alphabet plates carry the grapheme they illustrate ─────────
// Without the prefix rule the engine reads these as "b banana", "ck sock"…
for (const [rel, w] of [
  ['alphabet-v1/plates/b-banana.jpg', 'banana'], ['alphabet-v1/plates/b-bee.jpg', 'bee'],
  ['alphabet-v1/plates/b-boat.jpg', 'boat'], ['alphabet-v1/plates/c-car.jpg', 'car'],
  ['alphabet-v1/plates/c-cookie.jpg', 'cookie'], ['alphabet-v1/plates/c-cow.jpg', 'cow'],
  ['alphabet-v1/plates/ck-duck.jpg', 'duck'], ['alphabet-v1/plates/ck-sock.jpg', 'sock'],
  ['alphabet-v1/plates/ck-truck.jpg', 'truck'], ['alphabet-v1/plates/d-dog.jpg', 'dog'],
  ['alphabet-v1/plates/d-drum.jpg', 'drum'], ['alphabet-v1/plates/e-egg.jpg', 'egg'],
  ['alphabet-v1/plates/e-elephant.jpg', 'elephant'], ['alphabet-v1/plates/e-hen.jpg', 'hen'],
  ['alphabet-v1/plates/f-fish.jpg', 'fish'], ['alphabet-v1/plates/f-flower.jpg', 'flower'],
  ['alphabet-v1/plates/f-fox.jpg', 'fox'], ['alphabet-v1/plates/g-goat.jpg', 'goat'],
  ['alphabet-v1/plates/g-grapes.jpg', 'grapes'], ['alphabet-v1/plates/g-guitar.jpg', 'guitar'],
  ['alphabet-v1/plates/h-hat.jpg', 'hat'], ['alphabet-v1/plates/h-hippo.jpg', 'hippo'],
  ['alphabet-v1/plates/h-horse.jpg', 'horse'], ['alphabet-v1/plates/j-jar.jpg', 'jar'],
  ['alphabet-v1/plates/j-jet.jpg', 'jet'], ['alphabet-v1/plates/j-juice.jpg', 'juice'],
  ['alphabet-v1/plates/k-key.jpg', 'key'], ['alphabet-v1/plates/k-king.jpg', 'king'],
  ['alphabet-v1/plates/k-kitten.jpg', 'kitten'], ['alphabet-v1/plates/l-leaf.jpg', 'leaf'],
  ['alphabet-v1/plates/l-lemon.jpg', 'lemon'], ['alphabet-v1/plates/l-lion.jpg', 'lion'],
  ['alphabet-v1/plates/m-mop.jpg', 'mop'], ['alphabet-v1/plates/m-mouse.jpg', 'mouse'],
  ['alphabet-v1/plates/o-octopus.jpg', 'octopus'], ['alphabet-v1/plates/o-orange.jpg', 'orange'],
  ['alphabet-v1/plates/o-ostrich.jpg', 'ostrich'], ['alphabet-v1/plates/qu-quill.jpg', 'quill'],
  ['alphabet-v1/plates/qu-quilt.jpg', 'quilt'], ['alphabet-v1/plates/r-rainbow.jpg', 'rainbow'],
  ['alphabet-v1/plates/r-robot.jpg', 'robot'], ['alphabet-v1/plates/r-rocket.jpg', 'rocket'],
  ['alphabet-v1/plates/u-bug.jpg', 'bug'], ['alphabet-v1/plates/u-tub.jpg', 'tub'],
  ['alphabet-v1/plates/u-umbrella.jpg', 'umbrella'], ['alphabet-v1/plates/v-vase.jpg', 'vase'],
  ['alphabet-v1/plates/v-violin.jpg', 'violin'], ['alphabet-v1/plates/w-watch.jpg', 'watch'],
  ['alphabet-v1/plates/w-wolf.jpg', 'wolf'], ['alphabet-v1/plates/w-worm.jpg', 'worm'],
  ['alphabet-v1/plates/x-box.jpg', 'box'], ['alphabet-v1/plates/x-ox.jpg', 'ox'],
  ['alphabet-v1/plates/x-wax.jpg', 'wax'], ['alphabet-v1/plates/y-yarn.jpg', 'yarn'],
  ['alphabet-v1/plates/y-yo-yo.jpg', 'yo yo'], ['alphabet-v1/plates/y-yogurt.jpg', 'yogurt'],
  ['alphabet-v1/plates/z-zebra.jpg', 'zebra'], ['alphabet-v1/plates/z-zucchini.jpg', 'zucchini'],
]) check(rel, w);

// ── Dialect 3: cast portraits ────────────────────────────────────────────
for (const [rel, w] of [
  ['satpin-v2/cast/cast-ant.png', 'ant'],
  ['satpin-v2/cast/cast-cat.png', 'cat'],
  ['satpin-v2/cast/cast-potato-teacher.png', 'potato'],
  ['satpin-v2/cast/cast-sam-sig-scrubbed.png', 'sam'],
  ['satpin-v2/cast/cast-segina.png', 'segina'],
]) check(rel, w);

// ── Not vocabulary pictures: must be excluded, not mis-indexed ───────────
for (const rel of [
  'satpin-v2/books/apple/apple-p1.png',
  'satpin-v2/books/monkey/sam-and-the-monkey-p1-monkey-on-mat.png',
  'satpin-v2/books/monkey/_v1-square-superseded/sam-and-the-monkey-p2-sam-on-mat.png',
  'satpin-v2/books/sit/sit-sit-sit-p9-webres.jpg',
  'satpin-v2/books/spat/spat-p4-sig-patched-webres.jpg',
  'satpin-v2/posters/poster-letter-s.png',
  'satpin-v2/letters/L13-S2-goat-gate-patched.png',
  'dark-phonics-song-cards/lesson-05.png',
  'pink1/notes.txt',
]) check(rel, null);

// ── Engine-shared conventions still honoured ─────────────────────────────
check('assets/04-cup.png', 'cup');            // numeric order prefix
check('assets/cup-coloring.png', 'cup|coloring');
check('assets/moon-on-mat.png', 'moon on mat'); // compound key normalisation

console.log(`\n${fail === 0 ? '✅' : '❌'} deriveWord: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
