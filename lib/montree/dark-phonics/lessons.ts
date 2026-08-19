// lib/montree/dark-phonics/lessons.ts
// The Dark Phonics curriculum data, hoisted out of the library page so that
// BOTH the public library page and the Online Classes live classroom read the
// same 49 lessons from one place. Data is byte-for-byte the array that lived
// in app/montree/library/dark-phonics/page.tsx until Phase 2.
//
// NUMBERING: `n` is the curriculum's own lesson number (5-53) and drives every
// media key (lesson-05 ... lesson-53). The DISPLAY number is n - 4, i.e. 1-49.
// Use displayN() for anything a human reads; never for a media key.
//
// Pure data + two pure helpers: no React, no imports, no side effects, so it
// is safe in server components, client components and route handlers alike.

/** Zero-padded lesson number — every media object is named lesson-NN.<ext>. */
export const nn = (n: number) => String(n).padStart(2, '0');

/**
 * The number the PAGE shows. The curriculum's internal numbering runs 5–53
 * (and every bucket object is named lesson-05 … lesson-53), but Dark Phonics
 * is taught as lessons 1–49, so everything a parent reads is n − 4. Use this
 * for EVERY rendered lesson number; never for a media key or a bucket path.
 */
export const displayN = (n: number) => n - 4;

export type Book = {
  slug: string;
  title: string;
  /** Row description under the title. Defaults to the standard initial-sound-book blurb. */
  description?: string;
  /** Cover image override — a local /public path. All four letter books set it
   *  (/dark-phonics-books/covers/<slug>.png). Absent falls back to the
   *  dark-phonics bucket at books/covers/<slug>.png. */
  cover?: string;
  /** Set false for books that don't have the paperwork/tracing/three-part-card
   *  pack built yet. Defaults to true — every letter book (incl. the-sat and
   *  the-tall) now has a full pack in public/dark-phonics-materials/<slug>/. */
  materials?: boolean;
  /** Set true for books that have the 4 printable book-works (picture match,
   *  sentence + picture, sentence builder guided/free) built at
   *  public/dark-phonics-books/works/<slug>/. Defaults to false. */
  works?: boolean;
};
export type Reader = {
  slug: string;
  title: string;
  /** Same as Book.works, above — set true where the reader's works pack exists. */
  works?: boolean;
  /** Same as Book.materials, but opt-in: set true where the reader's full
   *  paperwork/tracing/three-part pack exists at
   *  public/dark-phonics-materials/<materialsSlug ?? slug>/. */
  materials?: boolean;
  /** Override for the materials directory name — only needed where the reader's
   *  slug collides with a retired pattern-storybook's pack (fox-in-a-box: the
   *  reader's pack lives at dark-phonics-materials/fox-in-a-box-reader/ so the
   *  old book's untouched pack keeps its directory). */
  materialsSlug?: string;
};

export type RawLesson = {
  n: number;
  /** Letter, digraph or teaching label shown on the tile ('s', 'ck', 'short A'). */
  sound: string;
  title: string;
  catchphrase: string;
  /** Hard-card vocab. Absent for the three review/abstract lessons (33, 34, 46). */
  words?: string[];
  /** Letter books. The 27 old initial-sound pattern storybooks were retired from
   *  this page on 2026-08-03 (assets untouched); the only books here now are the
   *  four "THE ___" letter books — n=7 the-sat + the-tall, n=8 the-spat,
   *  n=9 the-pit. A lesson can carry more than one; up to ~5 is the target. */
  books?: Book[];
  /** Easy Reader gated at this lesson — 11 of the 49 carry one. */
  reader?: Reader;
  /** Decodable words INTRODUCED by this lesson's reader — mirrors the NEW list
   *  at the back of the book (books_def.py weeks 3–6, book07–27.py weeks
   *  7–27; book/week N = lesson N + 4). The cumulative "so far" list a child
   *  can actually read at this point is computed at render from every earlier
   *  lesson's entry. Lessons 5–6 have none — sounds only; lessons 32–53 add
   *  none, so they carry the full 61-word ledger forward unchanged. */
  decodable?: string[];
  /** Heart words introduced this lesson (read by sight, not decoded). */
  heartWords?: string[];
};


/** The 49 lessons, in teaching order. `n` is the curriculum's own number (5–53)
 *  and drives every media key; the page shows displayN(n) = n − 4, i.e. 1–49. */
export const RAW: RawLesson[] = [
  { n: 5, sound: 's', title: 'The Snake Says Ssss', catchphrase: '“snake in my sock!”', words: ['snake', 'sock'], books: [
    { slug: 'snake-in-my-sock', title: 'Snake in My Sock', description: 'Initial-sound pattern book — the child shouts the picture word. The potato sits this one out, chilling in his deck chair.', cover: '/dark-phonics-books/covers/snake-in-my-sock.png', materials: true },
  ] },
  { n: 6, sound: 'a', title: 'A Is for Apple', catchphrase: '“ant on my apple!”', words: ['ant', 'apple'], books: [
    { slug: 'ant-on-my-apple', title: 'Ant on My Apple', description: 'Initial-sound pattern book — the child shouts the picture word. Cast: ant, alligator, anteater, ambulance.', cover: '/dark-phonics-books/covers/ant-on-my-apple.png', materials: true },
  ] },
  { n: 7, sound: 't', title: 'Tick-Tock, T!', catchphrase: '“tick-tock, stinky sock!”', decodable: ['sat', 'at'], heartWords: ['a'], words: ['clock', 'sock'], books: [
    { slug: 'the-sat', title: 'The ___ Sat!', description: 'Hybrid decodable — teacher reads the set-up, the child shouts “Sat!” on every page.', cover: '/dark-phonics-books/covers/the-sat.png', materials: true, works: true },
    { slug: 'the-tall', title: 'The Tall ___!', description: 'Companion pattern book, same cast — the child shouts the picture word.', cover: '/dark-phonics-books/covers/the-tall.png', materials: true, works: true },
  ] },
  { n: 8, sound: 'p', title: 'Pop, Pop, P!', catchphrase: '“pop, pop, puppy poop!”', decodable: ['sap', 'pat', 'tap', 'spat'], words: ['pup'], books: [
    { slug: 'the-spat', title: 'The ___ Spat!', description: 'Letter P initial-sound book — cast: basin, penguin, pig, pelican, potato.', cover: '/dark-phonics-books/covers/the-spat.png', works: true },
    { slug: 'the-pat', title: 'The ___ Can Pat!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat, potato.', cover: '/dark-phonics-books/covers/the-pat.png', materials: true, works: true },
  ] },
  { n: 9, sound: 'i', title: 'I, I, Itsy I', catchphrase: '“icky, sticky pig!”', decodable: ['sit', 'it', 'is', 'sip', 'pit', 'spit'], words: ['pig'], books: [
    { slug: 'the-pit', title: 'The ___ Sat in the Pit!', description: 'Letter Book Three — the-sat cast returns: pit, ant, apple, sun, star, snake, cat, potato.', cover: '/dark-phonics-books/covers/the-pit.png', materials: true, works: true },
  ] },
  { n: 10, sound: 'n', title: 'N for the Nose', catchphrase: '“no-no, nanny goat!”', decodable: ['an', 'ant', 'in', 'nap', 'naps', 'pan', 'tin', 'nip', 'snap'], heartWords: ['I'], words: ['goat'], books: [
    { slug: 'the-nap', title: 'The ___ Naps!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — plus the potato, who doesn’t.', cover: '/dark-phonics-books/covers/the-nap.png', materials: true, works: true },
  ] },
  { n: 11, sound: 'm', title: 'Mmm, That\'s Good!', catchphrase: '“mmm, muddy monkey!”', decodable: ['mat', 'Sam'], words: ['monkey'], books: [
    { slug: 'the-mat', title: 'The ___ Sat on the Mat!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — plus the potato, who didn’t.', cover: '/dark-phonics-books/covers/the-mat.png', materials: true, works: true },
  ] },
  { n: 12, sound: 'd', title: 'D for the Dog', catchphrase: '“dirty dog, dig dig dig!”', decodable: ['pad', 'sad'], words: ['dog'], books: [
    { slug: 'the-sad', title: 'The ___ Is Sad!', description: 'The-sat cast returns — sad for once, until the potato cheers everyone up.', cover: '/dark-phonics-books/covers/the-sad.png', materials: true, works: true },
  ] },
  { n: 13, sound: 'g', title: 'G for the Goat', catchphrase: '“goat got my gum!”', decodable: ['pig', 'dig'], words: ['goat', 'gum'], books: [
    { slug: 'the-dig', title: 'The ___ Digs!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — plus the potato, who doesn’t.', cover: '/dark-phonics-books/covers/the-dig.png', materials: true, works: true },
  ] },
  { n: 14, sound: 'o', title: 'O for the Octopus', catchphrase: '“hot dog on a log!”', decodable: ['pot', 'dog'], words: ['hotdog', 'log'], books: [
    { slug: 'the-dog', title: 'The ___ Has a Dog!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — each walking a different dog. The potato has five.', cover: '/dark-phonics-books/covers/the-dog.png', materials: true, works: true },
  ] },
  { n: 15, sound: 'c', title: 'C for the Cat', catchphrase: '“cat ate my cookie!”', decodable: ['cot', 'cat'], words: ['cat', 'cookie'], books: [
    { slug: 'the-cot', title: 'The ___ Sat in a Cot!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — each sat in a cot. The potato didn’t — just a nap in a deck chair.', cover: '/dark-phonics-books/covers/the-cot.png', materials: true, works: true },
  ] },
  { n: 16, sound: 'k', title: 'K Says It Too', catchphrase: '“kooky king kicks!”', decodable: ['kit', 'Kim'], words: ['king'], books: [
    { slug: 'the-kit', title: 'The ___ Has a Kit!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — each with a first-aid kit. The potato has none — until a grazed knee brings the whole crew running to help.', cover: '/dark-phonics-books/covers/the-kit.png', materials: true, works: true },
  ] },
  { n: 17, sound: 'ck', title: 'Two Letters, One Kick', catchphrase: '“kick the stinky sock!”', decodable: ['sock', 'sick'], heartWords: ['ate'], words: ['sock'], reader: { slug: 'the-cat-sat', title: 'The Cat Sat', works: true, materials: true } },
  { n: 18, sound: 'e', title: 'Crack the Egg, E!', catchphrase: '“ten messy hens!”', decodable: ['egg'], words: ['hen'], books: [
    { slug: 'the-egg', title: 'The ___ Has an Egg!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — each with an egg. The potato had one too — until he cracked it.', cover: '/dark-phonics-books/covers/the-egg.png', materials: true, works: true },
  ] },
  { n: 19, sound: 'u', title: 'Up Goes the Umbrella', catchphrase: '“yummy bug in my cup!”', decodable: ['duck', 'mud', 'stuck'], words: ['bug', 'cup'], reader: { slug: 'mud-pup', title: 'Mud Pup', works: true, materials: true }, books: [
    { slug: 'the-mud', title: 'The ___ Is in the Mud!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — each splashing in the mud. The potato isn’t — he’s chilling in his deck chair.', cover: '/dark-phonics-books/covers/the-mud.png', materials: true, works: true },
  ] },
  { n: 20, sound: 'r', title: 'Rrr Goes the Engine', catchphrase: '“run, run, red rat!”', decodable: ['rug', 'rat', 'under'], words: ['rat'], books: [
    { slug: 'the-rat', title: 'The ___ Chased the Rat!', description: 'The-sat cast is off after a new friend: a rat! Ant, apple, sun, star, snake, cat — all mid-chase. The potato skips the chase — he’s chilling in his deck chair, and the rat joins him for a cold drink.', cover: '/dark-phonics-books/covers/the-rat.png', materials: true, works: true },
  ] },
  { n: 21, sound: 'h', title: 'H, the Panting Pup', catchphrase: '“ha-ha, hairy hippo!”', decodable: ['hat', 'hen'], words: ['hippo'], books: [
    { slug: 'the-hot', title: 'The ___ Is Hot!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — all fanning themselves under a blazing sun. The potato isn’t hot — he’s in the shade of his umbrella, cold drink in hand.', cover: '/dark-phonics-books/covers/the-hot.png', materials: true, works: true },
  ] },
  { n: 22, sound: 'b', title: 'B for the Bobbing Boat', catchphrase: '“big baby burp!”', decodable: ['bed', 'bug'], words: ['baby'], reader: { slug: 'hen-in-bed', title: 'Hen in Bed', works: true, materials: true }, books: [
    { slug: 'the-bug', title: 'The ___ Saw a Bug!', description: 'The-sat cast returns: ant, apple, sun, star, snake, cat — each spots a bug. The bug then spots the potato, relaxing in his deck chair with an ice-cold drink, and the two are happy to meet.', cover: '/dark-phonics-books/covers/the-bug.png', materials: true, works: true },
  ] },
  { n: 23, sound: 'f', title: 'Ffff Like a Fan', catchphrase: '“funny fox in my fan!”', decodable: ['fan', 'off'], words: ['fox', 'fan'] },
  { n: 24, sound: 'l', title: 'La-La-La Goes L', catchphrase: '“lazy lion licks!”', decodable: ['log', 'run', 'croc'], words: ['lion'] },
  { n: 25, sound: 'j', title: 'Jump for J', catchphrase: '“jump in the jelly jam!”', decodable: ['jug', 'jam'], words: ['jam'] },
  { n: 26, sound: 'v', title: 'Vvvv Goes the Van', catchphrase: '“vroom-vroom van!”', decodable: ['van'], words: ['van'] },
  { n: 27, sound: 'w', title: 'W for the Windy Day', catchphrase: '“wiggly wet worm!”', decodable: ['wig'], words: ['worm'] },
  { n: 28, sound: 'x', title: 'X Marks the Box', catchphrase: '“six fox in a box!”', decodable: ['box', 'fox'], words: ['fox', 'box'], reader: { slug: 'fox-in-a-box', title: 'Fox in a Box', works: true, materials: true, materialsSlug: 'fox-in-a-box-reader' } },
  { n: 29, sound: 'y', title: 'Yes! Yum! Y!', catchphrase: '“yummy yellow yo-yo!”', decodable: ['yam', 'big'], words: ['yoyo'] },
  { n: 30, sound: 'z', title: 'Zzz Like a Buzzing Bee', catchphrase: '“zippy zebra, zzz!”', decodable: ['zip', 'bag'], words: ['zebra'] },
  { n: 31, sound: 'qu', title: 'The Queen Says Qu', catchphrase: '“quick quacky duck!”', decodable: ['quilt', 'squid'], words: ['duck'] },
  { n: 32, sound: 'review', title: 'All Our Sounds', catchphrase: '“cat, pig, dog - woof!”', words: ['cat', 'pig', 'dog'] },
  { n: 33, sound: 'review', title: 'The Five Little Vowels', catchphrase: '“a, e, i, o, u... achoo!”' },
  { n: 34, sound: 'review', title: 'We Know the Alphabet', catchphrase: '“a to z, easy-peasy!”' },
  { n: 35, sound: 'short A', title: 'Fast A!', catchphrase: '“fat cat in a hat!”', words: ['cat', 'hat'] },
  { n: 36, sound: 'short I', title: 'Quick Little I', catchphrase: '“big pig did a jig!”', words: ['pig'] },
  { n: 37, sound: 'short O', title: 'Round and Fast, O!', catchphrase: '“hop on a hot log!”', words: ['log'] },
  { n: 38, sound: 'short E', title: 'Steady E', catchphrase: '“wet pet in my bed!”', words: ['pet', 'bed'] },
  { n: 39, sound: 'short U', title: 'Sunny Fast U', catchphrase: '“big bug hug!”', words: ['bug'] },
  { n: 40, sound: 'minimal pairs', title: 'Cat? Cot? Cut?', catchphrase: '“cat? cot? cut? - which one!”', words: ['cat', 'cot', 'cut'], reader: { slug: 'cat-cot-cut', title: 'Cat? Cot? Cut?', works: true, materials: true } },
  { n: 41, sound: 'FLSZ doubling', title: 'Two at the End', catchphrase: '“buzz off, fuzzy bee!”', words: ['bee'], reader: { slug: 'the-bell-fell', title: 'The Bell Fell', works: true, materials: true } },
  { n: 42, sound: 'sh', title: 'Sh! Be Still', catchphrase: '“sheep go baba!”', words: ['sheep'] },
  { n: 43, sound: 'ch', title: 'Ch-Ch Goes the Train', catchphrase: '“cheeky little chick!”', words: ['chick'], reader: { slug: 'fish-and-chick', title: 'Fish and Chick', works: true, materials: true } },
  { n: 44, sound: 'th (voiceless)', title: 'Tongue Peeks Out', catchphrase: '“moth in my bath!”', words: ['moth', 'bath'] },
  { n: 45, sound: 'wh', title: 'the Asking Sound', catchphrase: '“wheee, big fat whale!”', words: ['whale'] },
  { n: 46, sound: 'th (voiced)', title: 'Now It Buzzes', catchphrase: '“this, that, this, that, BOO!”', reader: { slug: 'this-and-that', title: 'This and That', works: true, materials: true } },
  { n: 47, sound: 'ending blends', title: 'Snap It at the End', catchphrase: '“jump, jump, fast hands!”', words: ['hand'] },
  { n: 48, sound: 'ending blends', title: 'Pink, Tent, Belt', catchphrase: '“pink sock in the sink!”', words: ['sock', 'sink'], reader: { slug: 'jump-in-the-sand', title: 'Jump in the Sand', works: true, materials: true } },
  { n: 49, sound: 's-blends', title: 'S Blends Off We Go', catchphrase: '“slip, slip, slimy snail!”', words: ['snail'] },
  { n: 50, sound: 'l-blends', title: 'L Blends Hold On', catchphrase: '“clap, clap, silly clown!”', words: ['clown'] },
  { n: 51, sound: 'r-blends', title: 'R Blends, Strong and True', catchphrase: '“green frog on a drum!”', words: ['frog', 'drum'], reader: { slug: 'frog-and-crab', title: 'Frog and Crab', works: true, materials: true } },
  { n: 52, sound: 'tw / dw blends', title: 'Twist and Twirl', catchphrase: '“two twins twist!”', words: ['twins'] },
  { n: 53, sound: 'triple blends', title: 'Three Sounds Strong', catchphrase: '“big splash, scrub-a-dub!”', words: ['splash'], reader: { slug: 'big-splash', title: 'Big Splash', works: true, materials: true } },
];
