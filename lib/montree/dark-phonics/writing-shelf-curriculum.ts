// lib/montree/dark-phonics/writing-shelf-curriculum.ts
//
// THE EIGHT WRITING SHELF TRAYS, as curriculum content — one record per work,
// ws:1..ws:8. This file is the SINGLE SOURCE. migrations/352_writing_shelf_curriculum.sql
// is generated from it by scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts and
// must never be hand-edited; the tracker, the guides screen and the parent report
// all read the seeded rows.
//
// PROVENANCE. Every sentence below is EXTRACTED, not invented, from the owner's
// own shelf page public/dark-phonics-shelves.html — the Quick / Go deeper /
// Explain More / Build it tabs of each tray — plus the two locked specs in
// docs/handoffs/HANDOFF_WRITING_SHELF_2026-08-29.md and
// HANDOFF_SHELF_PHYSICAL_BUILD_2026-08-31.md. Where the page is thin the minimum
// is written plainly and the line is marked "(from spec)" in presentation_notes,
// so a reader can always tell what came off the page and what did not.
//
// TWO NAMES, ONE KEY (rule 1). `name` is the DISPLAY name — 'Writing Shelf tray 3 ·
// Word chains' — and lib/montree/tracking/resolve.ts accepts it, the old bare
// 'Writing Shelf tray 3', and the typed forms ('writing shelf 3', 'ws tray 3',
// 'tray 3 word chains'). `description` stays the tray's MATERIAL and nothing else:
// lib/montree/tracking/summary.ts builds the parent sentence as
// "worked on Writing Shelf tray 3, Word chains" out of the tray NUMBER plus this
// column, so a paragraph here would end up in a parent's report. The long prose
// lives in parent_description / why_it_matters / quick_guide instead.

/** One step of a presentation, in the JSONB shape migration 099 documents. */
export interface WritingShelfPresentationStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

/** One tray, with every column montree_classroom_curriculum_works carries. */
export interface WritingShelfWork {
  /** Rule 1's permanent key. */
  work_key: string;
  /** 1..8 — the tray number a teacher says out loud. */
  tray: number;
  /** The display name. Carries the material after a ' · '. */
  name: string;
  /** The material alone. NEVER a sentence — the parent summary interpolates it. */
  description: string;
  name_chinese: string;
  age_range: string;
  direct_aims: string[];
  indirect_aims: string[];
  materials: string[];
  control_of_error: string;
  prerequisites: string[];
  quick_guide: string;
  presentation_steps: WritingShelfPresentationStep[];
  presentation_notes: string;
  parent_description: string;
  why_it_matters: string;
  video_search_terms: string;
  /** 901..908 — above every Dark Phonics block, as migration 346 set it. */
  sequence: number;
}

const step = (
  n: number,
  title: string,
  description: string,
  tip?: string
): WritingShelfPresentationStep => (tip ? { step: n, title, description, tip } : { step: n, title, description });

export const WRITING_SHELF_WORKS: readonly WritingShelfWork[] = [
  // ── Tray 1 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:1',
    tray: 1,
    name: 'Writing Shelf tray 1 · Sound boxes',
    description: 'Sound boxes',
    name_chinese: '声音盒',
    age_range: '4-6',
    sequence: 901,
    direct_aims: [
      'Hear a spoken word as separate sounds and count them',
      'Push one counter into one box for each sound heard',
      'Swap every counter for the letter that spells that sound',
    ],
    indirect_aims: [
      'Orthographic mapping — sound-to-letter links, slowed down enough to watch',
      'Left-to-right order',
      'Self-checking against a leftover box instead of against an adult',
    ],
    materials: [
      '2 sound-frame mats: one resting 3-box side up, one resting 4-box side up',
      '10 glass counters, one colour, in a small dish',
      '6 object-box miniatures: pig, cat, sun, bed, mug, hat',
      '1 lidded box of 16 letters: s a t p i n m d g o c k e u b h',
    ],
    control_of_error:
      'The number of boxes matches the number of sounds. A leftover box, or a counter with nowhere to go, tells him to say the word again — you do not have to.',
    prerequisites: [
      'Knows the sounds of the sandpaper letters he will need',
      'Can hold a spoken word long enough to say it stretched',
    ],
    quick_guide:
      'Say it · push it · letter it. He takes an object, says its name slowly, pushes one counter into one box per sound, then swaps every counter for a letter.',
    presentation_steps: [
      step(1, 'Sit on his right', 'Sit on his right, so your hand does not cross in front of his eyes.'),
      step(2, 'The mat', 'Put the 3-box mat down in front of him.'),
      step(3, 'The object', 'Take the sun from the basket, stand it above the mat: "This is a sun."', 'Use sun the first time — every one of its sounds can be stretched.'),
      step(4, 'The counters', 'Slide him the counters. Take three out, line them up under the mat.'),
      step(5, 'Watch my mouth', 'Say: "Watch my mouth." Stretch it in one breath, no gaps, twice: ssss—uuuu—nnnn. Second time, tap once per sound.', 'Never "suh-uh-nuh" — an added "uh" is a fourth sound and will cost you months.'),
      step(6, 'One counter, one sound', 'Say ssss, push a counter into box one. uuuu — box two. nnnn — box three. Then normal speed: "sun."'),
      step(7, 'Your turn', 'Clear the counters, put the sun back, push the basket to him: "Your turn." Then stop talking.'),
      step(8, 'Open the letter box', 'Once he can do three objects alone, open the letter box: "What sound is in this box? Find me the s." He swaps each counter for its letter.'),
      step(9, 'Read it back', 'Read it back together, finger under each letter, then faster: s–u–n. Sun.'),
      step(10, 'Reset the tray', 'Everything goes back on the tray before he chooses another object. That part is the lesson too.'),
    ],
    presentation_notes:
      'Stretchy and stoppy sounds: you can hold /s/ /m/ /n/ /f/ /l/ and every vowel; /p/ /t/ /k/ /g/ /b/ /d/ stop — say those crisply and tap once instead. Introduce the six miniatures in this order across the weeks: sun → mug → hat → bed → pig → cat (sun leads because every one of its sounds stretches). Week 3 brings out the 4-box side with the tile-tin words naps → snap → spat → spit → stuck — naps and snap are the same four tiles rearranged, the rest change one tile at a time. The letter box is the SIXTEEN-TILE box: s a t p i n m d g o c k e u b h, and it stays shut for the first few weeks. If all three counters go in at once, cover the last two boxes with your hand. If he says letter names ("ess" for /s/), stop for today and do two minutes of sandpaper letters.',
    parent_description:
      'The child says a word slowly, pushes one counter into a box for every sound he hears, then swaps each counter for the matching letter. It matters because he can already read pig off a card — here he learns to hear that pig is really three sounds.',
    why_it_matters:
      'A counter carries no spelling — it only marks that a sound happened, so the child hears sounds apart before choosing letters for them. Joseph (2000) found at-risk kindergartners taught with word boxes gained more in phoneme awareness, letter-sound knowledge and spelling than children taught the same content without them. Move him on when he places counters for a four-sound word unprompted, spots his own leftover box, and swaps every counter for a letter on three different objects in one sitting.',
    video_search_terms: 'Montessori Elkonin sound boxes phoneme counters CVC word boxes presentation',
  },

  // ── Tray 2 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:2',
    tray: 2,
    name: 'Writing Shelf tray 2 · Movable alphabet',
    description: 'Movable alphabet',
    name_chinese: '活动字母',
    age_range: '4-6',
    sequence: 902,
    direct_aims: [
      'Spell a word he chose himself, with nothing holding his place for him',
      'Lay the letters left to right and read the word back',
      'Make a spelling choice — c or k — instead of waiting to be told',
    ],
    indirect_aims: [
      'Composition before handwriting: the motor load is removed',
      'Invented spelling kept alive, because nothing is corrected on this tray',
      'Independence — he hunts the letter box himself',
    ],
    materials: [
      '1 large movable alphabet, complete, in its own box beside the tray',
      '1 object box, 8 miniatures — Set A: cat, pig, dog, pot, pan, tin, mop, peg; Set B rotates in: sun, mug, hat, bed, nut, bin, cot, kit',
      '1 felt work mat, about 40 x 30 cm',
      'Sandpaper letters nearby, for a forgotten letter shape. No pencil.',
    ],
    control_of_error:
      'The object in his hand. He sounds out what he laid down and hears whether it matches. Spelling is not corrected on this tray — that happens on Tray 4.',
    prerequisites: [
      'Can place counters for a three-sound word on Tray 1 without help',
      'Knows the sounds of the letters in the set he is given',
    ],
    quick_guide:
      'Build the word, do not write it. He puts one object at the top of the mat, says the word slowly, lays the letters left to right, and reads it back.',
    presentation_steps: [
      step(1, 'Mostly silence', 'Sit on his right. This lesson is mostly silence — hunting through the letter box is the work.'),
      step(2, 'The mat', 'Unroll the felt mat. Open the alphabet box beside it, letters facing him.'),
      step(3, 'One object only', 'Take the cat out of the box. Stand it at the top-left of the mat. Nothing else goes on the mat.'),
      step(4, 'He names it', 'Ask: "What is it?" He says cat — the word is his, not yours.'),
      step(5, 'Say it slowly', 'Say: "Say it slowly." He stretches it: k—a—t.', 'If he cannot stretch it, stop and go back to Tray 1 for a week. No amount of this tray will fix that.'),
      step(6, 'First sound', 'Say: "What is the first sound? Find that letter." Wait. Let him search the whole box. Do not point.'),
      step(7, 'Left edge', 'He lays the letter at the left edge of the mat, next to the object.'),
      step(8, 'Across the word', 'Say: "Say it again. What comes next?" The next letter goes touching the first. Repeat for the last sound.', 'Never say a letter name and never say "no".'),
      step(9, 'Read it to me', 'When finished: "Read it to me." He touches each letter and sounds it out. If it reads back wrong he will usually hear it and fix it.'),
      step(10, 'Put it away', 'Letters back in their compartments; he takes the next object. A built word is never left out to admire.'),
    ],
    presentation_notes:
      'The thing you must not do: he builds kat — say nothing. If you cannot bear the silence, say "Yes — that says cat" and move on. He meets the c on Tray 4, on a card, in private. Correct him here and he learns to wait for you before he commits, and a child who waits cannot spell. Sets are LOCKED: Set A cat pig dog pot pan tin mop peg for weeks 1-2, Set B sun mug hat bed nut bin cot kit once Set A is fluent — mop, peg, nut and bin deliberately pre-seed Tray 3 chain starts. If he asks "is that right?", answer only "Read it to me and see." If he builds ct with no vowel, back to Tray 1 for a week with the same object.',
    parent_description:
      'The child picks an object, says its name slowly, and lays out movable letters left to right to spell it — no pencil, and no mat with boxes telling him how many letters to reach for. It matters because it is the first time the word lives only in his head, with nothing else holding his place for him.',
    why_it_matters:
      'Berninger et al. (2002) found that in young writers it is transcription — forming letters, recalling spellings — that limits how much gets written, not ideas; taking the pencil out of the loop hands his whole attention back to the spelling choice. Montessori (1912) put composing before handwriting for exactly this reason and Lillard (2017) collects the classroom evidence. Move him on when he builds a word you never named, starts at the left edge without a reminder, and builds three words in one sitting without asking whether any of them are right.',
    video_search_terms: 'Montessori movable alphabet presentation object box building CVC words',
  },

  // ── Tray 3 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:3',
    tray: 3,
    name: 'Writing Shelf tray 3 · Word chains',
    description: 'Word chains',
    name_chinese: '词链',
    age_range: '4-6',
    sequence: 903,
    direct_aims: [
      'Change exactly one sound in a word and read the new word',
      'Reach into a word and move one part without rebuilding the rest',
      'Say WHICH sound changed, not only which letter moved',
    ],
    indirect_aims: [
      'Minimal-pair listening, including the /ae/-/e/ contrast Mandarin-L1 ears find hard',
      'Orthographic mapping: a word is a row of sound-to-letter links, separately movable',
      'Self-checking against the back of the chain card',
    ],
    materials: [
      '1 chain board: a strip with 3 letter slots and a 4th spare slot, kept 4-frame side up',
      '1 tin of 30 letter tiles — doubles of all fifteen: a b c d e g h i m n o p r t u',
      '6 chain cards (front: start word + picture; back: the full chain)',
    ],
    control_of_error:
      'The back of the chain card lists the chain in order. And the rule itself is a control: if more than one tile moved, something went wrong.',
    prerequisites: [
      'Builds a three-sound word with the movable alphabet on Tray 2',
      'Reads back a word he built himself',
    ],
    quick_guide:
      'Change exactly one sound. He builds the first word on the board, hears the next word, changes one letter, and reads the new word aloud before moving on.',
    presentation_steps: [
      step(1, 'Show the card', 'Take the top chain card, show him the picture: "Mop."'),
      step(2, 'Build it yourself', 'Build mop in the slots yourself, saying each sound as it lands: /m/ /o/ /p/.'),
      step(3, 'He reads it', 'Push the board to him: "Read it." He reads mop.'),
      step(4, 'The move', 'Say: "Now make hop." Say the pair close together, twice: mop … hop. mop … hop.', 'A gap between the two words lets him forget the first, and then he rebuilds.'),
      step(5, 'Wait', 'Wait. Do not point at the slot that changes — the waiting is the whole lesson.'),
      step(6, 'Read the new word', 'When he lifts a tile, say nothing until it lands, then: "Read it." He reads hop.'),
      step(7, 'Again', 'Say: "Now make hot." Same rhythm: hop … hot. hop … hot.'),
      step(8, 'Five words', 'Work through five words. If he stalls, stretch only the differing part: mmmm–op … hhhh–op.'),
      step(9, 'He checks himself', 'Turn the card over. He checks the chain against the back himself.'),
      step(10, 'Read the whole chain', 'Every time: he reads the whole finished chain aloud, top to bottom. That is where it gets stored.'),
    ],
    presentation_notes:
      'Six chains, one 30-tile tin — doubles of all fifteen letters, so a chain never stalls for want of a second letter. A beginner only gets that one chain\'s tiles out, six or seven, never the whole tin. Week 2 changes only the first sound (cat, sat, mat, hat, pat); week 3 only the vowel (pig, peg, pug), which is harder and transfers most to spelling; week 4 mixes the positions. Two of the printed chains hinge on the vowel pair /ae/-/e/ — pan→pen and bed→bad — which is genuinely hard for a Mandarin speaker: sit those two cards side by side on their own, exaggerating the jaw drop on /ae/, before either turns up inside a longer chain. If he makes a real word that is not the target (mop to map), praise it, then: "Good word. Now make hop."',
    parent_description:
      'The child builds a word with letter tiles, then you say a new word that differs by exactly one sound, and he changes exactly one tile to make it. It matters because a child who can build mop but sweeps the whole thing away when you ask for hop is treating mop as one memorised lump, not as parts he can reach into and change.',
    why_it_matters:
      'McCandliss, Beck, Sandak & Perfetti (2003) built a whole reading intervention out of this single move — change one letter, read the new word — and struggling readers gained more from it than from ordinary phonics practice. It forces attention onto the one position that changed, the spot a child would otherwise skate over. Move him on when he changes the single tile without rebuilding on three chains running, can say which SOUND changed, and predicts a word in the chain before you say it.',
    video_search_terms: 'word building minimal pairs word chains letter tiles change one sound phonics',
  },

  // ── Tray 4 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:4',
    tray: 4,
    name: 'Writing Shelf tray 4 · Dictation',
    description: 'Dictation',
    name_chinese: '听写',
    age_range: '4-6',
    sequence: 904,
    direct_aims: [
      'Write a word on blank paper his own way, from the sounds he hears',
      'Turn the card over, compare, and correct himself once',
      'Meet the heart words that cannot be sounded out',
    ],
    indirect_aims: [
      'A control of error on blank paper, which nothing before this tray had',
      'Correction that lands in the second after writing, not a day later in a marked book',
      'Keeps invented spelling safe on Trays 2, 6 and 7 by giving correction one named home',
    ],
    materials: [
      '12 flip cards (front: photo; back: the word in the stroke font, 48 pt): pig cat hat rug bed mug cot dog bag pen jam log',
      '1 small notebook per child, in a labelled box',
      '2 sharpened pencils in a pot',
      '1 heart-word ring: a, an, I, the, ate',
    ],
    control_of_error:
      'The printed word on the back, in the same stroke font he traces. He never has to ask you, and you never have to mark a book.',
    prerequisites: [
      'Builds three-sound words with the movable alphabet on Tray 2',
      'Forms most of his letters well enough to be read back',
    ],
    quick_guide:
      'Write it · flip it · fix it yourself. He looks at the picture, says the word, writes it his own way, then turns the card over, compares, and rewrites it once underneath.',
    presentation_steps: [
      step(1, 'Sit beside him', 'Sit beside him, not opposite. Open his notebook at the next clean page.'),
      step(2, 'Picture only', 'Take the top card, show him only the picture. Do not say the word aloud.'),
      step(3, 'He names it', 'Ask: "What is it?" He says mug — the word is his, not yours.'),
      step(4, 'Say it slowly', 'Say: "Say it slowly." He stretches it. Tap once per sound, the same taps as Tray 1.'),
      step(5, 'Now write it', 'Say: "Now write it." Then say nothing — no spelling, no humming. Turn your body slightly away.'),
      step(6, 'Turn it over', 'When the pencil stops: "Turn it over."'),
      step(7, 'Silence', 'He compares to the back in silence — do not read the word out and do not point at the letter he missed.'),
      step(8, 'Once, underneath', 'Say: "Write it once more, underneath." Once — not a whole line.'),
      step(9, 'Stop at four', 'Card to the back of the stand, next card. Stop at four — that is a whole session.'),
      step(10, 'Heart words', 'For a heart word, be honest: "This one you cannot sound out. Look at it, then write it."'),
    ],
    presentation_notes:
      'The dictation deck is the twelve photo words cat pig hat mug bed dog pen bag log rug cot jam, and the heart-word ring starts at exactly five: a, I, ate, the — plus an. Add one heart word a week, never two. This is the ONLY tray on the shelf where a spelling is corrected, so shelve it visibly apart from Trays 2 and 6; a child who asks you to fix his story book is told "Not in your book. We do that on the card tray." If he peeks at the back first, turn the stand around and hand him one card at a time. If he is right on every card, add a four-sound word, then a heart word.',
    parent_description:
      'The child looks at a picture, writes the word his own way in his notebook, then flips the card over to see the real spelling and corrects himself. It matters because this is the only tray where a spelling gets corrected — and the card does the correcting, not you, in the one second after he wrote it, which is the only moment correction actually helps.',
    why_it_matters:
      'Graham & Santangelo (2014) pooled the spelling-instruction studies and found that teaching spelling explicitly improves spelling and carries over into word reading. With twenty children you cannot mark twenty notebooks a day, but a card corrects one child in the second after he wrote it. Move him on when three cards in a row match the back first time, when he turns the card over unprompted, and when he corrects one letter instead of rewriting the word from scratch.',
    video_search_terms: 'Montessori dictation self-checking flip cards heart words phonics spelling',
  },

  // ── Tray 5 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:5',
    tray: 5,
    name: 'Writing Shelf tray 5 · Sentence builder',
    description: 'Sentence builder',
    name_chinese: '造句',
    age_range: '4-6',
    sequence: 905,
    direct_aims: [
      'Lay word cards along the sentence line to build a sentence he chose',
      'End it with a punctuation tile and read it aloud, one touch per word',
      'Copy his own sentence onto a strip, with gaps and his own full stop',
    ],
    indirect_aims: [
      'Composing is finished before the pencil comes out, so nothing is lost mid-word',
      'Word spacing, arriving from the gaps between cards',
      'The first sorting of naming / doing / small words — grammar a year before Tray 8',
    ],
    materials: [
      '1 tin of about 40 word cards from the readers, in three compartments: naming words · doing words · small joining words',
      '1 heart-word ring (its own copy, same words as Tray 4)',
      '3 punctuation tiles: full stop, question mark, exclamation mark',
      '10 blank lined sentence strips and 1 pencil',
    ],
    control_of_error:
      'Reading it out loud. If it does not make sense, it is not a sentence, and he hears that himself. Every strip must end with a mark — a strip with no mark goes back.',
    prerequisites: [
      'Writes single words from Tray 4 that can be read back',
      'Reads back a word or short phrase he built himself',
    ],
    quick_guide:
      'Lay it out, then copy it down. He builds a sentence along the sentence line, ends it with a tile, reads it aloud with a finger, then copies it onto a strip and adds his own full stop.',
    presentation_steps: [
      step(1, 'The sentence line', 'Lay the sentence line in front of him, running left to right.'),
      step(2, 'Three compartments', 'Open the tin: "These are things. These are what they do. These are the little words that hold them together."'),
      step(3, 'Lay a sentence', 'Take the, pig, is, big. Lay them down one at a time, saying each word out loud as it lands.'),
      step(4, 'The gap', 'Point at the gap between two cards: "See the space? Words need room."', 'This is the sentence that fixes thepigisbig, and it has to be said at the cards, not at his writing.'),
      step(5, 'A sentence has to stop', 'Take the full-stop tile: "A sentence has to stop." Put it down firmly at the end.'),
      step(6, 'Read it together', 'Read it together, finger sliding under each card, one touch per word.'),
      step(7, 'Break it on purpose', 'Swap big for a card that does not fit — the pig is mud. Read it again: "Does that work?" Let him hear that it does not. Laugh about it.', 'The step everyone skips. Breaking a sentence on purpose is what makes reading it back worth doing.'),
      step(8, 'Make me one', 'Push the tin to him: "Make me one." Whatever he makes, read it with him.'),
      step(9, 'Now write it down', 'Give him a strip and the pencil: "Now write it down." He copies from his own cards, which are right there, so nothing has to be remembered.'),
      step(10, 'Where is your dot?', 'Last, every time, until the question stops being needed: "Where is your dot?"'),
    ],
    presentation_notes:
      'The word tin is a THREE-COMPARTMENT tin — naming words, doing words, small joining words — and that sorting is itself the first grammar lesson, done a year before the symbols on Tray 8. The three punctuation tiles are oversized on purpose, so they are objects he places rather than specks he might miss. Keep it to three cards until copying is easy: a four-card sentence a child abandons halfway teaches him that writing is something you do not finish. If there are no gaps in his handwriting, put a lolly stick on the tray as a finger-spacer for a fortnight, then take it away without comment. If he writes a sentence without building it first, that is a good problem — he is ready for Tray 6.',
    parent_description:
      'The child lays word cards along a sentence line to build a sentence, adds a punctuation tile at the end, reads it aloud, then copies it onto a strip in his own hand. It matters because a child who tries to compose and handwrite at once loses the sentence halfway through — laying it out with cards first finishes all the deciding before the pencil comes out.',
    why_it_matters:
      'Berninger et al. (2002) showed that young writers are limited by transcription — handwriting plus spelling — which eats the working memory composing needs; cards move the composing off the pencil entirely. Saddler & Graham (2005) found that working at the level of the sentence improved writing quality more than simply assigning more writing. Move him on when he adds a full stop unprompted to a sentence he invented, leaves gaps in his own handwriting, and builds and copies a three-card sentence in one sitting.',
    video_search_terms: 'Montessori sentence building word cards punctuation tiles early writing',
  },

  // ── Tray 6 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:6',
    tray: 6,
    name: 'Writing Shelf tray 6 · Story books',
    description: 'Story books',
    name_chinese: '故事书',
    age_range: '4-6',
    sequence: 906,
    direct_aims: [
      'Order four wordless pictures into a story of his own',
      'Write one line under each picture, spelling every word by ear',
      'Finish a book: draw the cover and sign his name',
    ],
    indirect_aims: [
      'Invented spelling protected — nothing on this tray is checked',
      'Narrative sequence: beginning, middle, end',
      'Writing stamina, because the possibility of being wrong has been removed',
    ],
    materials: [
      '3 wordless picture-sequence sets, 4 frames each, in lettered envelopes: seed → flower, egg → hen, apple → core',
      '6 blank fold-books (one A4 sheet folded to 8 pages)',
      '1 pot of pencils and one of coloured pencils',
      '1 small heart-word card propped at the back — the only reference on this tray',
    ],
    control_of_error:
      'Only the picture order — it either tells a story when he reads it back or it does not. There is deliberately no spelling control here.',
    prerequisites: [
      'Builds and copies a sentence on Tray 5',
      'Writes a word by ear without asking how to spell it',
    ],
    quick_guide:
      'Four pictures, one blank book, no help. He orders the pictures, writes one line under each in his own book, and draws the cover. Nothing is corrected.',
    presentation_steps: [
      step(1, 'Tip them out', 'Tip the four pictures out of an envelope, face up, in a muddle.'),
      step(2, 'Which came first?', 'Ask: "Which one happened first?" Let him decide — a different order is just a different story.'),
      step(3, 'A row', 'He lays them in a row, left to right.'),
      step(4, 'Tell me the story', 'Say: "Tell me the story." He tells it out loud, all of it.', 'Not optional — the story must exist in the air before it exists on paper.'),
      step(5, 'One page per picture', 'Give him a fold-book. Show him the four inside pages: one page per picture.'),
      step(6, 'Write what happens', 'Point at the first page: "Write what happens here."'),
      step(7, 'The rule', 'He asks how to spell something. Say, exactly: "Say it slowly and write the sounds you hear." Same words, every time, forever.'),
      step(8, 'Go away', 'Now genuinely go away — sit somewhere else in the room. A teacher standing over a child is a spelling correction that has not been said out loud yet.'),
      step(9, 'The cover', 'When he is done he draws the cover and writes his name on it.'),
      step(10, 'Read it to the class', 'Read it to the class exactly as he spelled it. Do not silently improve it as you read.'),
    ],
    presentation_notes:
      'Three photo sequences, four frames each, no words and no numbers on the fronts and a set letter on the back: seed → flower, egg → hen, apple → core (from spec). The shelf page fixes the format — four cards of about 90 mm per lettered envelope, set letter on the back, never on the cards — and the three sets themselves are named only in the handoffs (sunflower seq-A, egg→hen seq-B, apple→core seq-C), so they are written here plainly and no further detail is invented. Books are folded in advance: a child who has to make the book first never gets to the writing. The heart-word card stays at five words — if it grows to twenty he will copy instead of listen. If he asks you to fix his spelling, say "Not in your book. We do that on the card tray," which keeps the Tray 4 promise credible.',
    parent_description:
      'The child orders four wordless pictures into a story, then writes one line under each picture in his own small book, spelling every word by ear with no correction at all. It matters because a child who has learned that writing means being right freezes on a blank page — this tray removes the possibility of being wrong, so the writing can actually start.',
    why_it_matters:
      'Ouellette & Sénéchal (2017) followed kindergartners encouraged to invent their own spellings and found they read and spelled better a year later than matched children who were not. Inventing a spelling forces the child to break the word into sounds and choose letters, at speed and for his own reasons, which is when it sticks. Move him on when he fills a book to the last page without asking a single spelling, can read his own writing back a week later, and asks for a book with no picture set.',
    video_search_terms: 'wordless picture sequence story writing kindergarten invented spelling fold book',
  },

  // ── Tray 7 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:7',
    tray: 7,
    name: "Writing Shelf tray 7 · Author's chair",
    description: "Author's chair",
    name_chinese: '作者椅',
    age_range: '4-6',
    sequence: 907,
    direct_aims: [
      'Tell a story of any size, unlimited by what his hand can write',
      'Watch his own spoken words become marks on paper',
      'Cast the class and watch his story acted out from the chair',
    ],
    indirect_aims: [
      'Print awareness — the round trip from speech to marks and back to events',
      'Narrative language: one day, suddenly, the end',
      'For a second-language child, the one place his ideas are not shrunk to fit his spelling',
    ],
    materials: [
      '1 folder with 20 story sheets (ruled lines up top for your handwriting, a blank drawing box below)',
      '1 clipboard with the class list and a tick column, so no child is quietly skipped',
      '1 good pen for you, pencils for him',
      '1 chair, kept for this and nothing else',
    ],
    control_of_error:
      'The audience. If the class can act it, the story made sense. Nothing is marked, nothing is corrected, and the child\'s words are not improved on the way down.',
    prerequisites: [
      'Has made at least one story book on Tray 6',
      'Can tell a short story out loud',
    ],
    quick_guide:
      'He talks · you write · the class acts it. He tells the story, you scribe it word for word, he draws underneath, then he casts the class and watches from the chair.',
    presentation_steps: [
      step(1, 'The sheet is yours', 'Sit down with the sheet in front of you, not him, and the pen in your hand.'),
      step(2, 'The offer', 'Say: "Tell me a story. I will write down exactly what you say."'),
      step(3, 'Keep up', 'He talks, you write and keep up. If you fall behind say "wait — let me catch up", never "say that again, shorter."'),
      step(4, 'Word for word', 'Write his words, not better ones. If he says the dog he runned fast, that is what goes on the sheet.', 'Tidying it up tells him his own language was not good enough.'),
      step(5, 'Read it back', 'When he stops, read the whole thing back to him, out loud.'),
      step(6, 'One chance to add', 'Ask once: "Is that right? Anything else?" One chance to add. Then it is finished.'),
      step(7, 'He casts it', 'Cast it in the corner of the sheet — who plays what. He does the casting.'),
      step(8, 'Now draw it', 'Push the sheet across: "Now draw it." He draws in the box while you take the next child.'),
      step(9, 'The chair', 'Later, on the carpet: he sits in the chair. You read his story aloud, slowly, exactly as written, and the cast acts it out in the middle.'),
      step(10, 'Clap for the author', 'At the end, everyone claps — for the author, not for the acting. Say his name.'),
    ],
    presentation_notes:
      'The scribe pad is written WORD FOR WORD, in big print (from spec — the page specifies six wide ruled lines for an adult hand and does not name a size), and is NEVER corrected: his grammar, his word order, his invented words all go down as spoken, and the story is read to the class exactly as written. Four minutes, three actors, no props, ever — props are how story-acting turns into chaos and then gets quietly dropped from the timetable in November. If his story is one line, ask one question and only one: "And then what?" If a child never volunteers, go to him with the folder rather than waiting, and ask in private.',
    parent_description:
      'The child tells you a story, you write it down word for word while he watches, he draws his own picture underneath, and then the class acts it out while he watches from a chair. It matters because his spoken ideas are far bigger than what his hand can write, and this is the one tray where the size of the story is not limited by his spelling.',
    why_it_matters:
      'Nicolopoulou et al. (2015) ran a storytelling-and-story-acting programme in preschool classrooms and measured gains over control classrooms in narrative skill, vocabulary and print knowledge. Cooper (2005) sets out why it works: the child watches his own spoken words become marks on paper, then watches those marks turned back into events by other people. Move him on when he asks to tell a story rather than waiting to be asked, when his story has more than one event in it, and when he writes at least one line of it in his own hand.',
    video_search_terms: "Vivian Paley storytelling story acting author's chair preschool dictation",
  },

  // ── Tray 8 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ws:8',
    tray: 8,
    name: 'Writing Shelf tray 8 · Grammar symbols',
    description: 'Grammar symbols',
    name_chinese: '语法符号',
    age_range: '4-6',
    sequence: 908,
    direct_aims: [
      'Put a black triangle on the naming word of a sentence he wrote himself',
      'Put a red circle on the doing word',
      'Check his own placement against the symbol key',
    ],
    indirect_aims: [
      'Grammatical awareness, which predicts later reading comprehension',
      'A word\'s JOB given a shape he can hold in his fingers',
      'Oral obedience before written definition — the command game does the teaching',
    ],
    materials: [
      '1 dish of 12 symbols: 4 black triangles (naming, 35 mm), 4 red circles (doing, 30 mm), 4 small dark-blue triangles (describing, 25 mm)',
      '6 sentence strips the child wrote himself on Tray 5 — never a printed sentence from a book',
      '1 symbol key card, kept on the tray',
      '4 miniatures for the oral command game',
    ],
    control_of_error:
      'The symbol key card, showing which shape means what. He checks his own placement against it, not you.',
    prerequisites: [
      'Has written six of his own sentence strips on Tray 5',
      'Has played the oral fetch-and-do command game for weeks, until it is boring',
    ],
    quick_guide:
      'A game first, a material second. He reads a sentence he built himself, puts a black triangle on the naming word and a red circle on the doing word, then checks the key.',
    presentation_steps: [
      step(1, 'Weeks before the tray: fetch', 'With no tray at all: put four objects on a mat. "Bring me the pig." He fetches it. Do each object in turn. Explain nothing.'),
      step(2, 'Then: do', 'Change the game: "RUN!" Shout it, mean it. He runs. "JUMP!" "SIT!" Still explain nothing.'),
      step(3, 'Mix them', 'Mix them: "Bring me the cat — now HOP with the cat!" Play it while lining up, while tidying, for weeks, until it is boring.'),
      step(4, 'Only then, the tray', 'Put one of his own strips in front of him: the pig is big.'),
      step(5, 'Which word is the thing?', 'Ask: "Which word is the thing?" He points at pig.'),
      step(6, 'The black triangle', 'Hand him the black triangle: "This shape means a thing." He puts it above pig.'),
      step(7, 'The red circle', 'On a strip with a doing word — the dog runs — give him the red circle for runs. "Red, because it moves." That is the whole explanation.'),
      step(8, 'The blue triangle, later', 'The small dark-blue triangle, for a describing word like big, comes weeks later still: a small triangle because it belongs to the thing.'),
      step(9, 'He checks the key', 'He checks his placement against the symbol key himself.'),
      step(10, 'Two at a time, at most', 'Never more than two symbols in one session. Three shapes is the whole set for this age.'),
    ],
    presentation_notes:
      'Three shapes and no more: black triangle for naming, red circle for doing, small dark-blue triangle for describing — and the control card is the reveal, so he checks himself rather than being marked. Doing the tray presentation before the weeks of oral command game is the single most common way this material fails. Never a printed sentence from a book: his own Tray 5 strip is what makes the shapes mean anything, so on build day the strip slot stays empty until Tray 5 has made six. If he places symbols at random, shelve the tray for a fortnight and go back to fetching and running. If he has learned "the triangle goes on the second word", your sentences all share one shape — vary the word order.',
    parent_description:
      'The child reads a sentence he wrote himself, places a black triangle over the naming word and a red circle over the doing word, then checks his own work against the symbol key. It matters because he can write the pig is big yet not know which word is the thing and which is what it does — a shape gives that job a form he can hold.',
    why_it_matters:
      'Montessori (1918) taught the function of words as a physical command game long before it was ever a written exercise, on the grounds that a five-year-old learns a grammatical category by obeying it rather than by defining it. Cain (2007) found that grammatical awareness in young children predicts later reading comprehension over and above word reading. Move him on when he names a word\'s job for a word that was never on a card, finds the naming word in a sentence he has not seen, and moves a wrongly placed symbol before checking the key.',
    video_search_terms: 'Montessori grammar symbols noun triangle verb circle adjective command game',
  },
] as const;

/** ws:N → the record. */
export const WRITING_SHELF_BY_KEY: ReadonlyMap<string, WritingShelfWork> = new Map(
  WRITING_SHELF_WORKS.map((w) => [w.work_key, w])
);

/** The tray materials in tray order — what `description` holds, and nothing else. */
export const WRITING_SHELF_MATERIALS: readonly string[] = WRITING_SHELF_WORKS.map((w) => w.description);

/** The display names in tray order. */
export const WRITING_SHELF_NAMES: readonly string[] = WRITING_SHELF_WORKS.map((w) => w.name);

/** 'Writing Shelf tray 3' — the pre-2026-09-07 name, still accepted by the reader. */
export function writingShelfBareName(tray: number): string {
  return `Writing Shelf tray ${tray}`;
}
