// lib/montree/tracking/phrase-bank.ts
//
// 2026-09-15 — THE QUIET-WEEK NOTE. A weekly summary must never read
// "No observations were recorded for Joey this week." The Director's rule is
// still "no invented progress"; this bank is the deliberate, owner-approved
// exception for a week with nothing ticked. It writes what a Montessori
// teacher writes in a quiet week: two warm, general, observational sentences,
// age-appropriate, from two DIFFERENT developmental domains.
//
// Rules this file keeps (and tests/tracking/phrase-bank.test.ts checks):
//   * Pure. No I/O, no clock, no Math.random — seeded by hash(childId|week).
//   * Generic and honest: "showed interest", "is developing", "is beginning
//     to", "enjoys". Never a named work completed, never mastery, never a plan
//     for next week.
//   * One rule, two languages: every phrase carries its English and Chinese
//     side by side, so the two notes can never disagree.
//   * Never the same phrase two weeks running for the same child.
//   * <= 40 words (English), counted here.
//
// Templates: {Sub} = sentence subject (the child's name in sentence one, the
// pronoun in sentence two — or the name again when no pronoun was stated),
// {is} is/are, {s} third-person verb ending (enjoy{s}), {his}/{him}.

export type AgeBand = 'toddler' | 'young' | 'middle' | 'older' | 'unknown';
export type Domain = 'circle' | 'speaking' | 'fine-motor' | 'focus' | 'social' | 'independence';
export type FallbackLang = 'en' | 'zh';

export interface Phrase {
  domain: Domain;
  en: string;
  zh: string;
}

/** The slice of a tracking Child this module needs. */
export interface FallbackChild {
  id: string;
  name: string;
  pronoun?: 'he' | 'she' | 'they';
  pronounSet?: boolean;
  /** 'YYYY-MM-DD' (montree_children.date_of_birth). Absent → the 'unknown' band. */
  dateOfBirth?: string | null;
}

export const FALLBACK_WORD_CAP = 40;

const P = (domain: Domain, en: string, zh: string): Phrase => ({ domain, en, zh });

// Shared across bands (same text → same phrase for the no-repeat rule).
const CIRCLE_INTEREST = P('circle', '{Sub} showed great interest in circle time this week.', '{Sub}本周对圆圈活动表现出浓厚的兴趣。');
const PINCER = P('fine-motor', '{Sub} {is} developing {his} pincer grip.', '{Sub}的三指抓握能力正在逐步发展。');
const SPEAKING_PROGRESS = P('speaking', '{Sub} {is} making excellent progress with {his} speaking.', '{Sub}在口语表达方面进步很大。');
const CHOSE_WORK = P('focus', '{Sub} chose work independently and stayed with it.', '{Sub}能自己选择工作，并专注地坚持下去。');

// ── Toddler: under 3 ─────────────────────────────────────────────────────
const TODDLER: readonly Phrase[] = [
  CIRCLE_INTEREST,
  P('circle', '{Sub} {is} learning to sit with the group for a short story.', '{Sub}正在学习和大家一起坐下来听一个小故事。'),
  P('circle', '{Sub} enjoy{s} the action songs at circle time and join{s} in with the movements.', '{Sub}喜欢圆圈时间的律动儿歌，会跟着一起做动作。'),
  P('circle', '{Sub} watched the group activities with bright, curious eyes.', '{Sub}在集体活动中看得很专注，充满好奇。'),
  P('speaking', '{Sub} {is} beginning to use single English words to name familiar objects.', '{Sub}开始用简单的英文单词说出熟悉物品的名称。'),
  P('speaking', '{Sub} enjoy{s} listening to simple English songs and rhymes.', '{Sub}喜欢听简单的英文儿歌和童谣。'),
  P('speaking', '{Sub} {is} becoming more willing to use words to ask for help.', '{Sub}越来越愿意用语言来寻求帮助了。'),
  P('speaking', '{Sub} responded warmly to simple English greetings this week.', '{Sub}本周对简单的英文问候回应得很积极。'),
  PINCER,
  P('fine-motor', '{Sub} {is} practising spooning and handle{s} the materials with lovely care.', '{Sub}正在练习舀的动作，使用教具时非常细心。'),
  P('fine-motor', '{Sub} enjoy{s} transferring objects from one bowl to another.', '{Sub}喜欢把物品从一个碗转移到另一个碗里。'),
  P('fine-motor', '{Sub} {is} building strength in {his} small hands through posting and threading.', '{Sub}通过投放和穿珠活动，小手的力量在不断增强。'),
  P('focus', '{Sub} showed curiosity when exploring the sensorial materials.', '{Sub}在探索感官教具时表现出好奇心。'),
  P('focus', '{Sub} {is} learning to choose a piece of work and carry it carefully to the mat.', '{Sub}正在学习自己选择工作，并小心地把它拿到工作毯上。'),
  P('focus', '{Sub} enjoy{s} exploring the different textures and sounds in the classroom.', '{Sub}喜欢探索教室里不同的质感和声音。'),
  P('focus', '{Sub} {is} learning to stay with one activity for a little longer.', '{Sub}正在学习在一项活动上多停留一会儿。'),
  P('social', '{Sub} {is} learning to wait for a turn with support from the teachers.', '{Sub}正在老师的帮助下学习等待轮流。'),
  P('social', '{Sub} enjoy{s} being near {his} friends during play.', '{Sub}喜欢在玩耍时待在小伙伴身边。'),
  P('social', '{Sub} {is} beginning to wave and say hello to the teachers in the morning.', '{Sub}早上开始会向老师挥手问好了。'),
  P('social', '{Sub} show{s} gentle kindness towards the other children.', '{Sub}对其他小朋友表现得温柔友善。'),
  P('independence', '{Sub} {is} becoming more independent at snack time.', '{Sub}在点心时间变得越来越独立。'),
  P('independence', '{Sub} {is} learning to put on {his} own shoes with a little help.', '{Sub}正在学习在少许帮助下自己穿鞋。'),
  P('independence', '{Sub} {is} practising washing {his} hands by {himself}.', '{Sub}正在练习自己洗手。'),
  P('independence', '{Sub} {is} settling into the classroom routine with growing confidence.', '{Sub}越来越自信地适应教室的日常作息。'),
];

// ── Young: 3 to 4 ────────────────────────────────────────────────────────
const YOUNG: readonly Phrase[] = [
  CIRCLE_INTEREST,
  P('circle', '{Sub} join{s} in with the songs and rhymes at circle time.', '{Sub}在圆圈时间会跟着一起唱儿歌、念童谣。'),
  P('circle', '{Sub} listened attentively to the stories shared with the group.', '{Sub}在集体故事时间听得很认真。'),
  P('circle', '{Sub} enjoy{s} the group games and follow{s} the actions with enthusiasm.', '{Sub}喜欢集体游戏，会积极地跟着做动作。'),
  SPEAKING_PROGRESS,
  P('speaking', '{Sub} {is} using more English words to talk about {his} work.', '{Sub}开始用更多的英文单词来介绍自己的工作。'),
  P('speaking', '{Sub} {is} beginning to put English words together into short phrases.', '{Sub}开始把英文单词连成简短的词组。'),
  P('speaking', '{Sub} enjoy{s} naming the objects and pictures in the language area.', '{Sub}喜欢在语言区说出物品和图片的名称。'),
  PINCER,
  P('fine-motor', '{Sub} {is} practising pouring and take{s} great care over it.', '{Sub}正在练习倒水，做得非常细心。'),
  P('fine-motor', '{Sub} enjoy{s} using the tweezers to move small objects.', '{Sub}喜欢用小镊子夹取小物品。'),
  P('fine-motor', '{Sub} {is} working on buttoning with the dressing frames.', '{Sub}正在用衣饰框练习扣纽扣。'),
  CHOSE_WORK,
  P('focus', '{Sub} showed curiosity exploring the colours and shapes of the sensorial materials.', '{Sub}在感官教具中探索颜色和形状，表现出浓厚的好奇心。'),
  P('focus', '{Sub} {is} developing {his} concentration during individual work time.', '{Sub}在个人工作时间里的专注力正在逐步提高。'),
  P('focus', '{Sub} enjoy{s} watching a presentation closely before trying it.', '{Sub}喜欢先仔细观看老师的示范，再自己尝试。'),
  P('social', '{Sub} waited {his} turn patiently this week.', '{Sub}本周能耐心地等待轮到自己。'),
  P('social', '{Sub} {is} greeting the teachers more confidently in the mornings.', '{Sub}早上和老师打招呼越来越自信了。'),
  P('social', '{Sub} {is} learning to say please and thank you in English.', '{Sub}正在学习用英文说“请”和“谢谢”。'),
  P('social', '{Sub} enjoy{s} playing alongside {his} friends and sharing the space kindly.', '{Sub}喜欢和小伙伴们一起玩，并友好地分享空间。'),
  P('independence', '{Sub} enjoy{s} putting materials back on the shelf, ready for the next friend.', '{Sub}喜欢把教具放回架子上，留给下一位小朋友使用。'),
  P('independence', '{Sub} {is} becoming more independent with dressing and undressing.', '{Sub}在穿脱衣物方面越来越独立。'),
  P('independence', '{Sub} {is} learning to tidy {his} work mat after using it.', '{Sub}正在学习用完工作毯后自己收拾好。'),
  P('independence', '{Sub} show{s} interest in caring for the classroom plants.', '{Sub}对照顾教室里的植物很感兴趣。'),
];

// ── Middle: 4 to 5 ───────────────────────────────────────────────────────
const MIDDLE: readonly Phrase[] = [
  P('circle', '{Sub} took part in circle time with enthusiasm this week.', '{Sub}本周积极参与圆圈活动。'),
  P('circle', '{Sub} {is} beginning to share {his} own ideas with the group.', '{Sub}开始在集体中分享自己的想法。'),
  P('circle', '{Sub} join{s} in confidently with the songs and rhymes.', '{Sub}能自信地跟着大家一起唱儿歌、念童谣。'),
  P('circle', '{Sub} listened carefully and answered questions during group stories.', '{Sub}在集体故事时间认真倾听，并积极回答问题。'),
  P('speaking', '{Sub} {is} beginning to use full English sentences.', '{Sub}开始使用完整的英文句子表达。'),
  SPEAKING_PROGRESS,
  P('speaking', '{Sub} enjoy{s} learning new English vocabulary and trying it out in conversation.', '{Sub}喜欢学习新的英文词汇，并尝试在对话中使用。'),
  P('speaking', '{Sub} {is} showing interest in the sounds that letters make.', '{Sub}对字母的发音表现出浓厚兴趣。'),
  P('fine-motor', '{Sub} {is} refining {his} pencil grip and hand control.', '{Sub}的握笔姿势和手部控制能力正在不断完善。'),
  P('fine-motor', '{Sub} enjoy{s} cutting and pasting and work{s} with care.', '{Sub}喜欢剪贴活动，做得非常细心。'),
  P('fine-motor', '{Sub} {is} practising pouring with increasing accuracy.', '{Sub}正在练习倒水，动作越来越准确。'),
  P('fine-motor', '{Sub} show{s} patience with threading and sewing work.', '{Sub}在穿线和缝纫工作中表现出很好的耐心。'),
  CHOSE_WORK,
  P('focus', '{Sub} {is} developing longer periods of concentration.', '{Sub}的专注时间正在逐渐延长。'),
  P('focus', '{Sub} showed curiosity when comparing sizes and shapes with the sensorial materials.', '{Sub}在用感官教具比较大小和形状时表现出好奇心。'),
  P('focus', '{Sub} enjoy{s} repeating a favourite activity to get it just right.', '{Sub}喜欢反复练习喜爱的工作，力求做得更好。'),
  P('social', '{Sub} {is} learning to take turns and share materials with friends.', '{Sub}正在学习与小伙伴轮流使用和分享教具。'),
  P('social', '{Sub} greet{s} the teachers and friends confidently each morning.', '{Sub}每天早上都能自信地和老师、小伙伴打招呼。'),
  P('social', '{Sub} show{s} kindness and care towards {his} classmates.', '{Sub}对同学表现出友善和关心。'),
  P('social', '{Sub} {is} learning to use kind words to solve small disagreements.', '{Sub}正在学习用友善的语言解决小矛盾。'),
  P('independence', '{Sub} {is} becoming more independent in caring for {his} belongings.', '{Sub}在整理自己的物品方面越来越独立。'),
  P('independence', '{Sub} take{s} pride in keeping the classroom tidy.', '{Sub}乐于保持教室整洁，并为此感到自豪。'),
  P('independence', '{Sub} {is} learning to prepare {his} own snack with care.', '{Sub}正在学习细心地准备自己的点心。'),
  P('independence', '{Sub} manage{s} {his} own coat and shoes with growing confidence.', '{Sub}越来越自信地自己穿脱外套和鞋子。'),
];

// ── Older: 5 and up ──────────────────────────────────────────────────────
const OLDER: readonly Phrase[] = [
  P('circle', '{Sub} {is} sharing thoughtful ideas during circle time.', '{Sub}在圆圈时间能分享自己有想法的见解。'),
  P('circle', '{Sub} showed great interest in the group discussions this week.', '{Sub}本周对集体讨论表现出浓厚的兴趣。'),
  P('circle', '{Sub} listen{s} well to others and wait{s} for a turn to speak.', '{Sub}能认真倾听他人，并等待轮到自己发言。'),
  P('circle', '{Sub} join{s} in with songs and group games with confidence.', '{Sub}能自信地参与唱歌和集体游戏。'),
  P('speaking', '{Sub} {is} using longer English sentences to explain {his} ideas.', '{Sub}能用更长的英文句子来表达自己的想法。'),
  P('speaking', '{Sub} {is} developing {his} ability to blend sounds into words.', '{Sub}把字母发音拼读成单词的能力正在逐步发展。'),
  P('speaking', '{Sub} enjoy{s} retelling favourite stories in English.', '{Sub}喜欢用英文复述自己喜爱的故事。'),
  P('speaking', '{Sub} {is} growing in confidence when speaking English with the teachers.', '{Sub}和老师用英文交流时越来越自信。'),
  P('fine-motor', '{Sub} {is} developing good pencil control when forming letters.', '{Sub}书写字母时的控笔能力正在不断提高。'),
  P('fine-motor', '{Sub} work{s} carefully on detailed hand work such as sewing and cutting.', '{Sub}在缝纫、剪纸等精细手工中非常细心。'),
  P('fine-motor', '{Sub} {is} strengthening {his} pencil grip through drawing and tracing.', '{Sub}通过绘画和描写练习，握笔能力在不断加强。'),
  P('fine-motor', '{Sub} enjoy{s} practical life work that needs a steady hand.', '{Sub}喜欢需要稳定双手的日常生活工作。'),
  CHOSE_WORK,
  P('focus', '{Sub} {is} showing longer cycles of concentration.', '{Sub}的专注周期越来越长。'),
  P('focus', '{Sub} enjoy{s} challenging work and keep{s} trying with patience.', '{Sub}喜欢有挑战性的工作，并能耐心地坚持尝试。'),
  P('focus', '{Sub} show{s} curiosity about how things work and ask{s} thoughtful questions.', '{Sub}对事物的原理充满好奇，常常提出有想法的问题。'),
  P('social', '{Sub} {is} kind and helpful towards the younger children.', '{Sub}对年幼的小朋友友善又乐于帮助。'),
  P('social', '{Sub} greet{s} the teachers and visitors confidently.', '{Sub}能自信地向老师和来访者问好。'),
  P('social', '{Sub} {is} learning to work together with friends on shared tasks.', '{Sub}正在学习和小伙伴合作完成共同的任务。'),
  P('social', '{Sub} show{s} lovely grace and courtesy in the classroom.', '{Sub}在教室里表现出良好的礼仪和礼貌。'),
  P('independence', '{Sub} {is} taking more responsibility for {his} own work and belongings.', '{Sub}越来越能为自己的工作和物品负责。'),
  P('independence', '{Sub} take{s} good care of the classroom environment.', '{Sub}很爱护教室环境。'),
  P('independence', '{Sub} {is} planning {his} work time with growing independence.', '{Sub}安排自己工作时间的能力越来越独立。'),
  P('independence', '{Sub} set{s} a lovely example for the younger children.', '{Sub}为年幼的小朋友树立了很好的榜样。'),
];

/** No date of birth: the general 3–6 pool (young ∪ middle, de-duplicated). */
const UNKNOWN: readonly Phrase[] = (() => {
  const seen = new Set<string>();
  const out: Phrase[] = [];
  for (const p of [...YOUNG, ...MIDDLE]) {
    if (seen.has(p.en)) continue;
    seen.add(p.en);
    out.push(p);
  }
  return out;
})();

export const PHRASE_BANK: Readonly<Record<AgeBand, readonly Phrase[]>> = {
  toddler: TODDLER,
  young: YOUNG,
  middle: MIDDLE,
  older: OLDER,
  unknown: UNKNOWN,
};

// ── Age ──────────────────────────────────────────────────────────────────

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

function parseDay(s: string | null | undefined): { y: number; m: number; d: number; t: number } | null {
  const m = ISO_DAY.exec(String(s ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  if (!Number.isFinite(t) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d, t };
}

/** Whole months from `dob` to `weekStart`, or null when either is unreadable. */
export function ageInMonths(dob: string | null | undefined, weekStart: string): number | null {
  const a = parseDay(dob);
  const b = parseDay(weekStart);
  if (!a || !b) return null;
  const months = (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0);
  return months < 0 ? null : months;
}

/** toddler <36 mo · young 36–47 · middle 48–59 · older 60+ · unknown (no/bad DOB). */
export function ageBandFor(dob: string | null | undefined, weekStart: string): AgeBand {
  const months = ageInMonths(dob, weekStart);
  if (months === null) return 'unknown';
  if (months < 36) return 'toddler';
  if (months < 48) return 'young';
  if (months < 60) return 'middle';
  return 'older';
}

// ── Deterministic choice ─────────────────────────────────────────────────

/** FNV-1a, 32-bit. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny seeded PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86_400_000;
/**
 * The no-repeat chain starts here. Week w excludes what week w-1 ACTUALLY said,
 * which excluded w-2, and so on — so the picks are replayed forward from a
 * fixed anchor. That keeps every week consistent with the week before it
 * (~52 cheap steps a year).
 */
const CHAIN_EPOCH = Date.UTC(2024, 0, 1); // a Monday

function isoOf(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

function pickOnce(child: FallbackChild, week: string, exclude: readonly Phrase[]): [Phrase, Phrase] {
  const pool = PHRASE_BANK[ageBandFor(child.dateOfBirth, week)];
  const banned = new Set(exclude.map((p) => p.en));
  const next = rng(hash(`${child.id}|${week}`));
  const firstPool = pool.filter((p) => !banned.has(p.en));
  const first = firstPool[Math.floor(next() * firstPool.length)];
  const secondPool = firstPool.filter((p) => p.domain !== first.domain);
  const second = secondPool[Math.floor(next() * secondPool.length)];
  return [first, second];
}

/**
 * The two phrases for one child and one week: two different domains, and
 * neither one said to this child the week before.
 */
export function fallbackPicks(child: FallbackChild, weekStart: string): [Phrase, Phrase] {
  const day = parseDay(weekStart);
  const week = day ? isoOf(day.t) : String(weekStart);
  const steps = day && day.t > CHAIN_EPOCH ? Math.floor((day.t - CHAIN_EPOCH) / (7 * DAY_MS)) : 0;
  let picks: [Phrase, Phrase] | null = null;
  for (let i = steps; i >= 0; i--) {
    const w = i === 0 || !day ? week : isoOf(day.t - i * 7 * DAY_MS);
    picks = pickOnce(child, w, picks ?? []);
  }
  return picks!;
}

// ── Rendering ────────────────────────────────────────────────────────────

const EN_FORMS = {
  he: { Sub: 'He', his: 'his', him: 'him', himself: 'himself', is: 'is', s: 's' },
  she: { Sub: 'She', his: 'her', him: 'her', himself: 'herself', is: 'is', s: 's' },
  they: { Sub: 'They', his: 'their', him: 'them', himself: 'themselves', is: 'are', s: '' },
} as const;

function fillEn(template: string, child: FallbackChild, useName: boolean): string {
  const f = EN_FORMS[child.pronoun ?? 'they'];
  const sub = useName ? child.name : f.Sub;
  // A name takes the singular verb even when the pronoun is 'they'.
  const is = useName ? 'is' : f.is;
  const s = useName ? 's' : f.s;
  return template
    .replace(/\{Sub\}/g, sub)
    .replace(/\{is\}/g, is)
    .replace(/\{s\}/g, s)
    .replace(/\{himself\}/g, f.himself)
    .replace(/\{his\}/g, f.his)
    .replace(/\{him\}/g, f.him);
}

function fillZh(template: string, child: FallbackChild, useName: boolean): string {
  // 他们 is plural in Chinese — a child with no stated he/she is named instead.
  const sub = useName || !(child.pronoun === 'he' || child.pronoun === 'she')
    ? child.name
    : child.pronoun === 'he' ? '他' : '她';
  return template.replace(/\{Sub\}/g, sub);
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The quiet-week note: two warm, age-appropriate sentences for a child with no
 * observation this week. Never empty for a named child; <= 40 words.
 *
 *   "Joey showed great interest in circle time this week. He is developing his pincer grip."
 */
export function fallbackSummary(child: FallbackChild, weekStart: string, lang: FallbackLang = 'en'): string {
  const name = String(child.name ?? '').trim();
  if (!name) return '';
  const who: FallbackChild = { ...child, name };
  const [first, second] = fallbackPicks(who, weekStart);
  // Only an explicit `false` (the loader's "nobody stated it") repeats the name.
  const nameTwice = who.pronounSet === false;
  if (lang === 'zh') {
    return fillZh(first.zh, who, true) + fillZh(second.zh, who, nameTwice);
  }
  const one = fillEn(first.en, who, true);
  const both = `${one} ${fillEn(second.en, who, nameTwice)}`;
  if (words(both) <= FALLBACK_WORD_CAP) return both;
  if (words(one) <= FALLBACK_WORD_CAP) return one;
  return `${one.split(/\s+/).slice(0, FALLBACK_WORD_CAP).join(' ').replace(/[.,;:]$/, '')}.`;
}

/**
 * 2026-09-15 (monthly summary) — ONE sentence from a chosen set of domains,
 * for a note that is about one subject. The Monthly Summary is about English,
 * so a child with no language work that month gets a SPEAKING phrase, not a
 * pincer-grip one. Deterministic: seeded by hash(childId|periodKey). Additive —
 * fallbackSummary() above is unchanged.
 *
 *   "Joey is beginning to use full English sentences."
 */
export function fallbackSentence(
  child: FallbackChild,
  periodKey: string,
  lang: FallbackLang = 'en',
  domains: readonly Domain[] = ['speaking'],
): string {
  const name = String(child.name ?? '').trim();
  if (!name) return '';
  const who: FallbackChild = { ...child, name };
  const band = PHRASE_BANK[ageBandFor(who.dateOfBirth, periodKey)];
  const pool = band.filter((p) => domains.includes(p.domain));
  const from = pool.length > 0 ? pool : band;
  const phrase = from[Math.floor(rng(hash(`${who.id}|${periodKey}|${domains.join(',')}`))() * from.length)];
  return lang === 'zh' ? fillZh(phrase.zh, who, true) : fillEn(phrase.en, who, true);
}
