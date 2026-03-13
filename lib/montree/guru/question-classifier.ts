// lib/montree/guru/question-classifier.ts
// Lightweight in-process question classifier for selective knowledge injection.
// Zero latency, zero cost — pure regex pattern matching.
// Used to reduce Guru system prompt tokens by ~30-50% by only injecting
// knowledge modules relevant to the question category.

export type QuestionCategory = 'curriculum' | 'psychology' | 'development' | 'general';

// --- Pattern definitions ---
// Priority: psychology > development > curriculum > general
// (Behavioral questions need the most focused context)

const PSYCHOLOGY_PATTERNS = [
  // Behavior
  /tantrum|meltdown|hit(ting)?|bit(ing|e)|kick(ing)?|scream(ing)?|throw(ing)?|destroy/i,
  // Emotions
  /cry(ing)?|anxious|anxiety|afraid|fear(ful)?|anger|angry|aggressive|frustrat/i,
  // Social
  /won'?t share|sharing|jealous|sibling|bully|conflict|friend/i,
  // Attachment
  /separation|clingy|attach(ment)?|withdraw|regress(ion)?|reject/i,
  // Parenting approach
  /punish|reward|praise|guilt|shame|boundar(y|ies)|discipline|consequence/i,
  // Emotional state
  /overwhelm|stressed|confidence|self.?esteem|motivat|stubborn|defian/i,
  // Life events
  /divorce|moving|new baby|loss|death|trauma|transition/i,
  // Specific behavioral patterns
  /won'?t (eat|sleep|listen|stop)|refuse|oppositional|attention.?seek/i,
];

const DEVELOPMENT_PATTERNS = [
  // Milestones
  /\bnormal\b|milestone|should.*(able|be doing)|expected|typical/i,
  // Sensitive periods
  /sensitive period|critical period|window/i,
  // Readiness
  /ready (for|to)|behind|advanced|gifted|delay(ed)?|precoci/i,
  // Age-appropriate
  /age.?appropriate|developmental(ly)?|growth|stage|phase/i,
  // Specific developmental questions
  /potty|toilet train|reading readi|writing readi|number sense/i,
];

const CURRICULUM_PATTERNS = [
  // Shelf and works
  /shelf|focus work|material(s)?|present(ation)?|curriculum/i,
  // Specific recommendations
  /what.*(work|do next|teach|learn)|recommend.*work|suggest.*work/i,
  // Named materials
  /pink tower|golden bead|sandpaper letter|moveable alphabet|stamp game/i,
  /brown stair|red rod|100 board|bead stair|trinomial|binomial|knobbed/i,
  /cylinder|colour tablet|geometric|metal inset|phonogram|phonics/i,
  // Area-specific
  /language.*work|math.*work|sensorial.*work|practical life|cultural.*work/i,
  // Teaching actions
  /rotate.*shelf|browse.*curriculum|how.*present|teach.*how|demonstrate/i,
  // Specific work operations
  /set.*focus|change.*work|replace.*work|put.*on.*shelf|update.*progress/i,
];

// Language-related keywords (used for conditional AMI injection in development mode)
const LANGUAGE_KEYWORDS = /\bread(ing)?\b|\bwrit(e|ing)\b|\bletter|\bphonics?\b|\bspell|\bvocab|\bliteracy|\bword|\bspeak|\btalk|\blanguage/i;

/**
 * Classify a user question to determine which knowledge modules to inject.
 * Pure function — zero latency, zero API calls.
 *
 * Priority: psychology > development > curriculum > general
 * This ensures behavioral questions always get full psychological context.
 */
export function classifyQuestion(question: string): QuestionCategory {
  // Check patterns in priority order
  for (const pattern of PSYCHOLOGY_PATTERNS) {
    if (pattern.test(question)) return 'psychology';
  }
  for (const pattern of DEVELOPMENT_PATTERNS) {
    if (pattern.test(question)) return 'development';
  }
  for (const pattern of CURRICULUM_PATTERNS) {
    if (pattern.test(question)) return 'curriculum';
  }
  return 'general';
}

/**
 * Check if a question mentions language/reading/writing topics.
 * Used to conditionally inject AMI Language Progression for development questions.
 */
export function hasLanguageKeywords(question: string): boolean {
  return LANGUAGE_KEYWORDS.test(question);
}
