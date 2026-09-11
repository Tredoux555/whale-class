// lib/montree/dark-phonics/talking-shelf-curriculum.ts
//
// THE FOUR TALKING SHELF TRAYS, as curriculum content — one record per work,
// ts:1..ts:4. This file is the SINGLE SOURCE, and it is the sibling of
// writing-shelf-curriculum.ts: same interface shape, same two-names-one-key
// rule, same discipline about what may go in `description`.
//
// PROVENANCE. Every sentence below is EXTRACTED, not invented, from the owner's
// own shelf page public/dark-phonics-talking-shelf.html — the Quick / Go deeper
// / Explain More / Build it tabs of each tray — plus the research handoff
// docs/handoffs/HANDOFF_TALKING_SHELF_RESEARCH_2026-09-11.md, which is where the
// citations in why_it_matters come from. Nothing here is a paraphrase of a line
// the director wrote: frame-card text, say-it exchanges, story-card lines,
// teacher-card rules and the "you say once" lines are quoted verbatim.
//
// TWO NAMES, ONE KEY (rule 1). `name` is the DISPLAY name — 'Talking Shelf tray
// 1 · Behind the screen' — and lib/montree/tracking/resolve.ts is expected to
// accept it, the bare 'Talking Shelf tray 1', and the typed forms ('talking
// shelf 1', 'ts tray 1', 'tray 1 behind the screen'). `description` stays the
// tray's MATERIAL and nothing else, because the parent summary interpolates it
// as "worked on Talking Shelf tray 1, Behind the screen". The long prose lives
// in parent_description / why_it_matters / quick_guide instead.
//
// TRAY 4 IS A ROUTINE, NOT A SHELF WORK. It is kept in this file because a
// child does it and a teacher tracks it, but every record that touches it says
// so plainly — exactly as Writing Shelf Tray 7, the author's chair, does.

/** One step of a presentation, in the JSONB shape migration 099 documents. */
export interface TalkingShelfPresentationStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

/** One tray, with every column montree_classroom_curriculum_works carries. */
export interface TalkingShelfWork {
  /** Rule 1's permanent key. */
  work_key: string;
  /** 1..4 — the tray number a teacher says out loud. */
  tray: number;
  /** The display name. Carries the material after a ' · '. */
  name: string;
  /** The material alone. NEVER a sentence — the parent summary interpolates it. */
  description: string;
  name_chinese: string;
  age_range: string;
  /** 'pair' | 'solo' | 'pair-or-solo' | 'routine' — how the work is worked. */
  how_worked: 'pair' | 'solo' | 'pair-or-solo' | 'routine';
  /** The non-verbal way in, which every work on this shelf must have. */
  silent_entry: string;
  /** The sentence the frame card hands him. Tray 4's is what YOU say. */
  frame_card: string[];
  direct_aims: string[];
  indirect_aims: string[];
  materials: string[];
  control_of_error: string;
  prerequisites: string[];
  quick_guide: string;
  presentation_steps: TalkingShelfPresentationStep[];
  presentation_notes: string;
  parent_description: string;
  why_it_matters: string;
  /** The one line you say, and then stop talking. */
  you_say_once: string;
  move_on_when: string;
  video_search_terms: string;
  /** 911..914 — above the Dark Phonics blocks and beside the 901..908 shelf. */
  sequence: number;
}

const step = (
  n: number,
  title: string,
  description: string,
  tip?: string
): TalkingShelfPresentationStep => (tip ? { step: n, title, description, tip } : { step: n, title, description });

export const TALKING_SHELF_WORKS: readonly TalkingShelfWork[] = [
  // ── Tray 1 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ts:1',
    tray: 1,
    name: 'Talking Shelf tray 1 · Behind the screen',
    description: 'Behind the screen',
    name_chinese: '屏风后面',
    age_range: '4-6',
    sequence: 911,
    how_worked: 'pair',
    silent_entry: 'Copy an arrangement card onto the mat without saying anything. Pointing at the card and placing the object is a legitimate first pass through this work.',
    frame_card: [
      'The ___ is ON the ___.',
      'The ___ is IN the ___.',
      'The ___ is NEXT TO the ___.',
    ],
    direct_aims: [
      'Tell another child where an object is, one sentence per object, when he cannot see it',
      'Build what he hears on his own mat, without pointing',
      'Lift the screen and compare the two mats himself',
    ],
    indirect_aims: [
      'A control of error for SPEAKING — the barrier, not the adult, says whether the sentence worked',
      'The prepositions on / in / next to, in the only situation where getting them wrong costs something',
      'Reusing words he already owns from the Writing Shelf: the object boxes, the word tin, the current letter',
    ],
    materials: [
      '2 identical felt mats, about 30 × 20 cm',
      '2 identical sets of 8 miniatures — actors cat, pig, dog, nut; places bed, pot, tin, hat (the first set comes off the object boxes, the second is bought)',
      '1 folding card screen, about 30 × 25 cm (buy one, or fold an A4 card)',
      '1 frame card at the back — sheet T01',
      '8 arrangement cards in a box — sheet T02, 80 × 120 mm printed, 100 × 140 mounted',
    ],
    control_of_error:
      'The two mats match or they do not — and both children see which object is wrong. Nobody marks his speaking; the mat does.',
    prerequisites: [
      'Knows the eight object names as spoken words',
      'Will sit opposite another child for four minutes',
    ],
    quick_guide:
      'He cannot see. Tell him. A sets two to four objects behind the screen and tells B one sentence per object; B builds what he hears; the screen comes down and they compare.',
    presentation_steps: [
      step(1, 'Two mats, one screen', 'Put the two mats down facing each other and stand the screen between them.'),
      step(2, 'Two identical sets', 'Give each child the same eight objects. Say nothing about which to use.'),
      step(3, 'A sets his mat', 'A hides his mat behind the screen and puts two objects on it. Two, not four, the first time.'),
      step(4, 'One sentence per object', 'A tells B where each object is, one sentence at a time, from the frame card.', 'The frame card stands at the back of the tray. He reads the sentence and fills the gap — he is not generating from nothing.'),
      step(5, 'B builds it', 'B puts his own objects where he hears them go. He may ask A to say it again. He may not look.'),
      step(6, 'Lift the screen', 'Lift the screen together. They compare the two mats themselves.'),
      step(7, 'Say nothing', 'If a mat is wrong, say nothing at all. They will find the object that moved.'),
      step(8, 'Swap', 'They swap roles. The teller becomes the builder.'),
      step(9, 'The solo way in', 'A child on his own copies an arrangement card onto his mat, then says it to the card.'),
      step(10, 'Four objects, later', 'Only once a pair can do two objects with no pointing does a four-object card come out of the box.'),
    ],
    presentation_notes:
      'The screen is not optional and "sit together" is not a screen: without a real barrier the stronger talker does all the work and the material stops checking anything. The second set of eight miniatures is bought, not shared — one set between two children is one mat with nothing to compare. The eight arrangement cards carry LEVEL DOTS and not numbers: one dot on cards 1–4, two on 5–6, three on 7–8, so a child may take any one-dot card in any order and nobody takes a four-object card in week one. The card fronts are photographs of the REAL miniatures on the REAL mat, taken by the teacher; a stock photograph of a different cat on a different bed is a different work. Until they are taken the fronts print as a pale-grey placeholder that says nothing, on purpose — a card that names its own picture does the child\'s naming for him.',
    parent_description:
      'Two children sit either side of a screen with the same eight small objects. One arranges his and tells the other where each one goes; the other builds what he hears; then the screen comes down and they see whether the two mats match. It matters because it is the first time his talking has to actually work — and the screen, not a grown-up, is what tells him whether it did.',
    why_it_matters:
      'Information-gap and barrier games are the best-evidenced self-checking structure for spoken output: two people each hold what the other lacks, a physical barrier prevents peeking, and the task can only be finished by talking (Bell Foundation, information gap activities and barrier games). The barrier IS the control of error — nothing has to be marked right or wrong by an adult. For a Mandarin-L1 child the frame card matters as much as the screen: Wray on formulaic language, and the sentence-frame guidance at Colorín Colorado, both hold that a fixed frame to fill is how young low-proficiency speakers actually start producing, not a crutch to be taken away. Move him on when a pair completes a four-object round with no pointing, twice.',
    you_say_once: 'He can’t see. Tell him.',
    move_on_when: 'A pair completes a four-object round with no pointing, twice.',
    video_search_terms: 'barrier game information gap activity preschool EAL two mats screen speaking',
  },

  // ── Tray 2 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ts:2',
    tray: 2,
    name: 'Talking Shelf tray 2 · Tell it, order it',
    description: 'Tell it, order it',
    name_chinese: '讲故事·排顺序',
    age_range: '4-6',
    sequence: 912,
    how_worked: 'pair',
    silent_entry: 'Lay one set out in order and say nothing. Ordering four pictures is a legitimate first pass; the telling comes when it comes.',
    frame_card: ['FIRST…', 'THEN…', 'NEXT…', 'LAST…'],
    direct_aims: [
      'Tell a four-part story one picture at a time, out loud, from behind his own hands',
      'Lay a matching set in the order he hears it',
      'Use First and Last without reading them off the card',
    ],
    indirect_aims: [
      'Narrative sequence carried in speech rather than in a row of pictures',
      'The ordering words, which are the joints of every story he will tell after this',
      'A second use for material the shelf already owns — Writing Shelf Tray 6, printed twice',
    ],
    materials: [
      'The three Tray-6 picture-sequence sets printed TWICE — six envelopes, A A B B C C (Writing Shelf sheet 06; link to it, do not rebuild it)',
      '1 frame card — sheet T01',
      '3 story cards, one per set, 70 × 70 mm printed and 90 × 90 mounted, text only — sheet T03',
    ],
    control_of_error:
      'The two rows match. He told it; she laid it out; they open both and look.',
    prerequisites: [
      'Has worked the Writing Shelf Tray 6 sequences at least once',
      'Has completed a two-object round on Tray 1',
    ],
    quick_guide:
      'Tell it — don’t show it. A takes an envelope and tells the story one picture at a time; B lays his copy of the same set in the order he hears; then they open both and compare.',
    presentation_steps: [
      step(1, 'The same set, twice', 'Give A one envelope and B the second copy of the SAME set. That is why sheet 06 is printed twice.'),
      step(2, 'A looks, B does not', 'A tips his four pictures out where B cannot see them.'),
      step(3, 'One picture at a time', 'A tells the story one picture at a time: First… Then… Next… Last…', 'The frame card is standing right there. He does not have to remember the four words, only use them.'),
      step(4, 'He must not show', 'If A turns a picture round, stop him once: "Tell it — don’t show it." Then stop talking.'),
      step(5, 'B lays it out', 'B lays his own copy in the order he hears. He may ask for a line again.'),
      step(6, 'Open both', 'Both rows go side by side, face up. They compare them themselves.'),
      step(7, 'Say nothing', 'A picture out of order is not a mistake to correct; it is the whole information of the work.'),
      step(8, 'Swap', 'Swap the envelopes and swap the roles.'),
      step(9, 'The story card', 'Afterwards, turn the story card over and read the four lines together. That is the check, not the telling.'),
      step(10, 'The solo way in', 'Alone: order a set, then tell it to the puppet from Tray 3.'),
    ],
    presentation_notes:
      'Six envelopes, A A B B C C, and they must be the SAME sets — two different stories cannot be compared. The story card is TEXT ONLY and it is not what the story is told from: the child tells it off the pictures, and the card is the check afterwards and the thing a solo child says it to. Set letter big on the front so it can be found in a box from across a mat; the four lines on the back. Nothing about Writing Shelf sheet 06 is rebuilt on this shelf, and nothing should be — it is already made, already cut, already 70 × 70, and a story card drops into the same 10 × 10 cm envelope as its pictures.',
    parent_description:
      'One child tells a four-picture story out loud, one picture at a time, while the other child lays out his own copy of the same pictures in the order he hears. Then they open both rows and compare. It matters because he cannot show — the story has to survive the trip through his mouth, and the two rows tell him whether it did.',
    why_it_matters:
      'This is the barrier game again (Bell Foundation, information gap activities), applied to narrative instead of position, so it carries the same adult-free control of error. The four ordering words are the formulaic frame Wray describes and the sentence-starter practice Colorín Colorado documents: repeated use of First / Then / Next / Last is exactly how the frame stops being scaffolding and becomes grammar he owns. Move him on when B orders all four from A’s telling alone, and A uses First and Last without the card.',
    you_say_once: 'Tell it — don’t show it.',
    move_on_when: 'B orders all four from A’s telling alone, and A uses First and Last without the card.',
    video_search_terms: 'picture sequence retell barrier game preschool narrative first then next last',
  },

  // ── Tray 3 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ts:3',
    tray: 3,
    name: 'Talking Shelf tray 3 · Puppet talk',
    description: 'Puppet talk',
    name_chinese: '木偶对话',
    age_range: '4-6',
    sequence: 913,
    how_worked: 'pair-or-solo',
    silent_entry: 'Hold the puppet and act the answer. Acting it counts as doing the work.',
    frame_card: ['WHO is it?', 'WHAT can it do?', 'WHERE is it?', 'IS it ___?'],
    direct_aims: [
      'Say a two-line exchange — a question and its answer — in two voices',
      'Check himself against the printed lines, which he can read',
      'Add one line of his own to a card',
    ],
    indirect_aims: [
      'The four question words, met as things a puppet asks rather than as grammar',
      'Reading and speaking the same sentence in the same minute',
      'A voice that is not his own to be wrong in, which is the whole point of a puppet',
    ],
    materials: [
      '2 stick puppets — the cat and the potato — printed from sheet T05, 180 mm tall with a 20 mm tab for a lolly stick',
      '8 say-it cards — sheet T04, 80 × 120 mm printed and 100 × 140 mounted; picture front, exchange back',
      '1 frame card — sheet T01',
    ],
    control_of_error:
      'The printed lines. Every word on the back is a word he has already read in a Dark Phonics reader, so he can read them and check himself — nobody has to judge his accent.',
    prerequisites: [
      'Reads a short sentence of reader words off a card',
      'Has done at least one round of Tray 1 or Tray 2',
    ],
    quick_guide:
      'The puppet says what the card says. He picks a card and a puppet; the cat asks the question and the potato answers; he turns the card over to check.',
    presentation_steps: [
      step(1, 'Two puppets', 'Put the cat in one of his hands and the potato in the other, or give one to each of two children.'),
      step(2, 'He picks a card', 'He takes one say-it card off the stand. Picture up.'),
      step(3, 'Look at the picture first', 'Look at the picture and say nothing. He knows it — every one is a page out of a reader he has already read.'),
      step(4, 'The cat asks', 'The cat asks the question. Make it a cat’s voice; that is what the puppet is for.'),
      step(5, 'The potato answers', 'The potato answers. Same child, other hand, or the second child.'),
      step(6, 'Turn it over', 'He turns the card over and reads both lines. That is the check, and he does it.'),
      step(7, 'Say nothing about the accent', 'Never correct the sound of a word on this tray. The card already said what the card says.'),
      step(8, 'The silent way in', 'A child who will not speak holds the puppet and ACTS the answer. That is a legitimate pass through the work.'),
      step(9, 'One of his own', 'When he can say a line without looking, ask for one more the card does not have.'),
      step(10, 'Everything back', 'Cards square on the stand, puppets flat on the tray, before he chooses another work.'),
    ],
    presentation_notes:
      'The cat and the potato are not arbitrary: they are the Dark Phonics cast the children already know off the readers and the song cards, so a child picking up the cat is picking up somebody. The eight exchanges are LOCKED and they ladder: who (cards 1–2), what it can do (3–4), where (5–6), then a yes/no question with a yes answer and a no answer (7–8). Every picture on a front is EXISTING art from a reader, so the child spends his attention on the sentence and not on the picture. Do not laminate the puppet sheet — a laminated puppet will not take tape. Do not cut round the puppet’s outline either; a silhouette-cut puppet loses an ear inside a fortnight, and the rectangle with a tab survives a term.',
    parent_description:
      'The child takes a card and two stick puppets — a cat and a potato. The cat asks the question printed on the card and the potato answers it; the child does both voices, or two children take one each; then he turns the card over and reads the two lines to check. It matters because a puppet is somebody else to be wrong in, and because every word on the card is one he can already read, so the card corrects him instead of you.',
    why_it_matters:
      'Recasts, not overt correction, are the right adult move at this age — an adult repeating the utterance back in corrected form rather than announcing an error, because overt correction shuts production down. A printed line does the same job with no adult in the loop: he says it, then reads what it should have been, a second later. The scripted exchange is the formulaic frame again (Wray), and the acted, wordless entry is there because the silent period is real: Krashen’s claim, examined by Gibbons (1985), is that a newly immersed young child may produce almost nothing for weeks, and that forcing speech backfires. Move him on when he says a line without looking at the card, and adds one of his own.',
    you_say_once: 'The puppet says what the card says.',
    move_on_when: 'He says a line without looking at the card, and adds one of his own.',
    video_search_terms: 'stick puppet script cards preschool ESL question answer two voices',
  },

  // ── Tray 4 ─────────────────────────────────────────────────────────────
  {
    work_key: 'ts:4',
    tray: 4,
    name: 'Talking Shelf tray 4 · Tell me about it',
    description: 'Tell me about it',
    name_chinese: '说给我听',
    age_range: '4-6',
    sequence: 914,
    how_worked: 'routine',
    silent_entry: 'He picks a photo and points at what he wants to talk about. A pointed finger starts the routine; you say the sentence, and he hears it.',
    frame_card: ['Tell me about it.', 'What else?'],
    direct_aims: [
      'Tell an adult about a picture he chose',
      'Hear his own sentence said back to him, correct, as if you agree',
      'Add a second sentence before he is asked',
    ],
    indirect_aims: [
      'The bridge from a scripted exchange to actual conversation',
      'Recast rather than correction, so production never shuts down',
      'A routine that survives a supply teacher, because the four rules are printed',
    ],
    materials: [
      '1 card stand with one photo prompt — the Tray-4 dictation photos, Writing Shelf sheet 03',
      '1 teacher card, A5 2-up — sheet T06',
    ],
    control_of_error:
      'None, by design. This is the bridge to conversation, and it needs you. Every other work on this shelf checks itself; this one does not, and the tray says so.',
    prerequisites: [
      'Has worked Tray 3 at least twice',
      'Will sit with you for two minutes',
    ],
    quick_guide:
      'Tell me about it. He picks a photo, tells you about it, and hears it said back to him correct — and you ask one thing only: What else?',
    presentation_steps: [
      step(1, 'He comes to you', 'He chooses this the way Tray 7 works on the Writing Shelf: he walks up with a card. You do not summon him.'),
      step(2, 'One photo', 'One photo in the stand. Not a stack — a stack is a test.'),
      step(3, 'Say it once', 'Say: "Tell me about it." Once.'),
      step(4, 'Then wait', 'Then wait. However long it takes. The waiting is the routine.'),
      step(5, 'Ask one thing only', 'When he stops, ask one thing and only one: "What else?"'),
      step(6, 'Say it back, correct', 'Say his sentence back to him, correct, as if you agree with it. Never say no.', 'A recast keeps the conversation going and still supplies the right form. An announced error ends the conversation and, with a silent-period child, sometimes ends the talking.'),
      step(7, 'Do not improve it twice', 'Say it back once. Do not drill it, do not ask him to repeat it.'),
      step(8, 'Stop when he stops', 'Stop when he stops. Two sentences is a whole session.'),
      step(9, 'No book, no mark', 'Nothing is written down and nothing is scored. He picked the photo; he keeps the photo out until he is done.'),
      step(10, 'Every child, not the loud ones', 'Keep the same tick list the author’s chair keeps, so no child is quietly skipped.'),
    ],
    presentation_notes:
      'This is a ROUTINE, not a shelf work, and the page says so plainly in the same place the Writing Shelf says it about Tray 7. It has no control of error on purpose — the other three trays all check themselves, and this one is the bridge to a conversation, which needs a person. The four rules are printed on the teacher card so the routine survives a supply teacher and a bad morning: say it once then wait; ask one thing only, "What else?"; say his sentence back to him, correct, as if you agree, never say no; stop when he stops. The photo prompts are the Tray-4 dictation photos off Writing Shelf sheet 03, so nothing new is printed for this tray but the card.',
    parent_description:
      'The child picks a photograph, tells you about it, and hears his own sentence said back to him correctly, as though you were agreeing with him rather than fixing him. You ask one thing only: what else? It matters because every other work on this shelf checks itself, and this is the one that is simply a conversation — the place a scripted exchange turns into talking.',
    why_it_matters:
      'Dialogic reading — the adult prompt-evaluate-expand-repeat sequence — is the best-tested oral-language booster for young children and has been trialled with additional-language learners specifically (2024 pragmatic randomized trial in preschool; What Works Clearinghouse intervention report). It is adult-led, so it is not a shelf work, but it is the mechanism this routine borrows: an open question, then an expansion of what the child said, rather than a correction of it. The recast literature is the other half: repeating the utterance back in corrected form without announcing an error is what keeps a young second-language speaker producing. Move him on when he adds a second sentence before you ask.',
    you_say_once: 'Tell me about it.',
    move_on_when: 'He adds a second sentence before you ask.',
    video_search_terms: 'dialogic reading PEER prompt expand recast preschool ELL photo prompt conversation',
  },
] as const;

/** ts:N → the record. */
export const TALKING_SHELF_BY_KEY: ReadonlyMap<string, TalkingShelfWork> = new Map(
  TALKING_SHELF_WORKS.map((w) => [w.work_key, w])
);

/** The tray materials in tray order — what `description` holds, and nothing else. */
export const TALKING_SHELF_MATERIALS: readonly string[] = TALKING_SHELF_WORKS.map((w) => w.description);

/** The display names in tray order. */
export const TALKING_SHELF_NAMES: readonly string[] = TALKING_SHELF_WORKS.map((w) => w.name);

/** 'Talking Shelf tray 3' — the bare name a teacher is most likely to type. */
export function talkingShelfBareName(tray: number): string {
  return `Talking Shelf tray ${tray}`;
}

/** The one tray that is a routine and not a shelf work. Say so wherever it shows. */
export const TALKING_SHELF_ROUTINE_KEYS: readonly string[] = TALKING_SHELF_WORKS
  .filter((w) => w.how_worked === 'routine')
  .map((w) => w.work_key);

/** The six printables, in the order the print guide lists them. */
export const TALKING_SHELF_PRINTABLES: readonly {
  sheet: string;
  file: string;
  trays: readonly number[];
}[] = [
  { sheet: 'T01', file: 'T01-frame-cards.pdf', trays: [1, 2, 3, 4] },
  { sheet: 'T02', file: 'T02-arrangement-cards.pdf', trays: [1] },
  { sheet: 'T03', file: 'T03-story-cards.pdf', trays: [2] },
  { sheet: 'T04', file: 'T04-say-it-cards.pdf', trays: [3] },
  { sheet: 'T05', file: 'T05-puppets.pdf', trays: [3] },
  { sheet: 'T06', file: 'T06-teacher-card.pdf', trays: [4] },
];

/**
 * Tray 2 borrows a Writing Shelf sheet whole and prints it TWICE — six
 * envelopes, A A B B C C, because both children need their own copy of the same
 * set. Nothing about it is rebuilt on this shelf.
 */
export const TALKING_SHELF_BORROWED = {
  file: '06-picture-sequences.pdf',
  href: '/dark-phonics-shelf/v2/06-picture-sequences.pdf',
  tray: 2,
  printTimes: 2,
} as const;
