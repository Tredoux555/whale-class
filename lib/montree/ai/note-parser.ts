// lib/montree/ai/note-parser.ts
// Extract meaningful signals from teacher observation notes
// Used by weekly-analyzer to detect patterns

// ============================================
// TYPES
// ============================================

export interface ParsedNote {
  raw: string;
  signals: NoteSignal[];
  duration_mentioned?: number; // minutes if mentioned
  repetition_mentioned?: number; // count if mentioned
  keywords: string[];
}

export interface NoteSignal {
  type: 'concentration' | 'emotion' | 'social' | 'breakthrough' | 'concern';
  sentiment: 'positive' | 'negative' | 'neutral';
  keyword: string;
  context: string;
}

// ============================================
// KEYWORD PATTERNS
// ============================================

const PATTERNS = {
  // Concentration indicators
  concentration_positive: [
    /repeated?\s*(\d+)\s*times?/i,
    /deep(ly)?\s*(engaged?|focus|concentration)/i,
    /uninterrupted\s*for\s*(\d+)/i,
    /absorbed\s*in/i,
    /wouldn'?t\s*stop/i,
    /very\s*focused/i,
    /sustained\s*attention/i,
    /complete(d)?\s*work\s*cycle/i,
    /returned\s*to\s*(work|activity)/i,
    /chose\s*(again|repeatedly)/i,
  ],
  concentration_negative: [
    /distracted/i,
    /wandered/i,
    /couldn'?t\s*focus/i,
    /left\s*work\s*incomplete/i,
    /abandoned/i,
    /gave\s*up/i,
    /lost\s*interest/i,
    /short\s*attention/i,
    /needed\s*redirection/i,
    /wouldn'?t\s*settle/i,
  ],

  // Emotional indicators
  emotion_positive: [
    /joyful/i,
    /proud/i,
    /satisfied/i,
    /peaceful/i,
    /calm/i,
    /happy/i,
    /excited/i,
    /delighted/i,
    /smiled/i,
    /laughed/i,
    /enjoyed/i,
    /loved\s*(it|this|the)/i,
  ],
  emotion_negative: [
    /frustrated/i,
    /upset/i,
    /anxious/i,
    /cried/i,
    /tantrum/i,
    /angry/i,
    /sad/i,
    /worried/i,
    /stressed/i,
    /overwhelmed/i,
    /refused/i,
    /reluctant/i,
  ],

  // Social indicators
  social_positive: [
    /helped\s*(a\s*)?(peer|friend|classmate)/i,
    /taught\s*(younger|another)/i,
    /collaborative/i,
    /shared/i,
    /worked\s*together/i,
    /played\s*with/i,
    /kind\s*to/i,
    /inclusive/i,
    /leader/i,
  ],
  social_negative: [
    /conflict\s*with/i,
    /hit|pushed|kicked/i,
    /refused\s*to\s*share/i,
    /isolated/i,
    /avoided\s*peers/i,
    /difficulty\s*with\s*peers/i,
    /aggressive/i,
    /bossy/i,
  ],

  // Breakthrough indicators
  breakthrough: [
    /first\s*time/i,
    /finally/i,
    /explosion/i,
    /mastered/i,
    /self[- ]?correct/i,
    /breakthrough/i,
    /clicked/i,
    /got\s*it/i,
    /understood/i,
    /independent(ly)?/i,
    /without\s*help/i,
    /showed\s*(others|everyone)/i,
    /taught\s*a\s*friend/i,
  ],

  // Concern indicators
  concern: [
    /regress/i,
    /lost\s*(skill|ability)/i,
    /forgot\s*how/i,
    /unusual/i,
    /concerning/i,
    /watch\s*(for|closely)/i,
    /monitor/i,
    /struggling/i,
    /difficulty/i,
    /can'?t\s*seem\s*to/i,
    /avoids/i,
    /refuses/i,
  ],

  // Duration extraction
  duration: [
    /(\d+)\s*min(ute)?s?/i,
    /for\s*(\d+)\s*min/i,
    /(\d+)\s*minutes?\s*(of\s*)?(focus|work|concentration)/i,
  ],

  // Repetition extraction
  repetition: [
    /(\d+)\s*times?/i,
    /repeated?\s*(\d+)/i,
    /did\s*(it\s*)?(\d+)\s*times?/i,
    /(\d+)\s*repetitions?/i,
  ],
};

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * Parse a single teacher note and extract signals
 */
export function parseNote(note: string): ParsedNote {
  if (!note || typeof note !== 'string') {
    return { raw: '', signals: [], keywords: [] };
  }

  const signals: NoteSignal[] = [];
  const keywords: string[] = [];
  let duration_mentioned: number | undefined;
  let repetition_mentioned: number | undefined;

  // Extract duration
  for (const pattern of PATTERNS.duration) {
    const match = note.match(pattern);
    if (match) {
      const num = parseInt(match[1] || match[2] || '0');
      if (num > 0 && num < 120) { // Reasonable range
        duration_mentioned = num;
        break;
      }
    }
  }

  // Extract repetition count
  for (const pattern of PATTERNS.repetition) {
    const match = note.match(pattern);
    if (match) {
      const num = parseInt(match[1] || match[2] || '0');
      if (num > 0 && num < 50) { // Reasonable range
        repetition_mentioned = num;
        break;
      }
    }
  }

  // Check concentration patterns
  for (const pattern of PATTERNS.concentration_positive) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'concentration',
        sentiment: 'positive',
        keyword: match?.[0] || 'concentration',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('concentration_positive');
    }
  }

  for (const pattern of PATTERNS.concentration_negative) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'concentration',
        sentiment: 'negative',
        keyword: match?.[0] || 'distracted',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('concentration_negative');
    }
  }

  // Check emotion patterns
  for (const pattern of PATTERNS.emotion_positive) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'emotion',
        sentiment: 'positive',
        keyword: match?.[0] || 'positive',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('emotion_positive');
    }
  }

  for (const pattern of PATTERNS.emotion_negative) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'emotion',
        sentiment: 'negative',
        keyword: match?.[0] || 'negative',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('emotion_negative');
    }
  }

  // Check social patterns
  for (const pattern of PATTERNS.social_positive) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'social',
        sentiment: 'positive',
        keyword: match?.[0] || 'social',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('social_positive');
    }
  }

  for (const pattern of PATTERNS.social_negative) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'social',
        sentiment: 'negative',
        keyword: match?.[0] || 'conflict',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('social_negative');
    }
  }

  // Check breakthrough patterns
  for (const pattern of PATTERNS.breakthrough) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'breakthrough',
        sentiment: 'positive',
        keyword: match?.[0] || 'breakthrough',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('breakthrough');
    }
  }

  // Check concern patterns
  for (const pattern of PATTERNS.concern) {
    if (pattern.test(note)) {
      const match = note.match(pattern);
      signals.push({
        type: 'concern',
        sentiment: 'negative',
        keyword: match?.[0] || 'concern',
        context: extractContext(note, match?.[0] || ''),
      });
      keywords.push('concern');
    }
  }

  return {
    raw: note,
    signals,
    duration_mentioned,
    repetition_mentioned,
    keywords: [...new Set(keywords)], // Dedupe
  };
}

/**
 * Parse multiple notes and aggregate signals
 */
export function parseNotes(notes: string[]): {
  parsed: ParsedNote[];
  summary: {
    total_notes: number;
    concentration_positive: number;
    concentration_negative: number;
    emotion_positive: number;
    emotion_negative: number;
    social_positive: number;
    social_negative: number;
    breakthroughs: number;
    concerns: number;
    avg_duration?: number;
    total_repetitions?: number;
  };
} {
  const parsed = notes.filter(n => n).map(parseNote);
  
  let durations: number[] = [];
  let repetitions: number[] = [];
  
  const summary = {
    total_notes: parsed.length,
    concentration_positive: 0,
    concentration_negative: 0,
    emotion_positive: 0,
    emotion_negative: 0,
    social_positive: 0,
    social_negative: 0,
    breakthroughs: 0,
    concerns: 0,
    avg_duration: undefined as number | undefined,
    total_repetitions: undefined as number | undefined,
  };

  for (const p of parsed) {
    if (p.duration_mentioned) durations.push(p.duration_mentioned);
    if (p.repetition_mentioned) repetitions.push(p.repetition_mentioned);
    
    for (const kw of p.keywords) {
      if (kw === 'concentration_positive') summary.concentration_positive++;
      if (kw === 'concentration_negative') summary.concentration_negative++;
      if (kw === 'emotion_positive') summary.emotion_positive++;
      if (kw === 'emotion_negative') summary.emotion_negative++;
      if (kw === 'social_positive') summary.social_positive++;
      if (kw === 'social_negative') summary.social_negative++;
      if (kw === 'breakthrough') summary.breakthroughs++;
      if (kw === 'concern') summary.concerns++;
    }
  }

  if (durations.length > 0) {
    summary.avg_duration = durations.reduce((a, b) => a + b, 0) / durations.length;
  }
  if (repetitions.length > 0) {
    summary.total_repetitions = repetitions.reduce((a, b) => a + b, 0);
  }

  return { parsed, summary };
}

/**
 * Extract context around a keyword (for display)
 */
function extractContext(text: string, keyword: string, windowSize = 30): string {
  if (!keyword) return text.slice(0, 60);
  
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return text.slice(0, 60);
  
  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + keyword.length + windowSize);
  
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

/**
 * Get overall sentiment from parsed notes
 */
export function getOverallSentiment(summary: ReturnType<typeof parseNotes>['summary']): {
  concentration: 'strong' | 'moderate' | 'weak' | 'unknown';
  emotional: 'positive' | 'mixed' | 'negative' | 'unknown';
  social: 'thriving' | 'developing' | 'struggling' | 'unknown';
} {
  // Concentration
  let concentration: 'strong' | 'moderate' | 'weak' | 'unknown' = 'unknown';
  const concTotal = summary.concentration_positive + summary.concentration_negative;
  if (concTotal > 0) {
    const ratio = summary.concentration_positive / concTotal;
    if (ratio >= 0.7) concentration = 'strong';
    else if (ratio >= 0.4) concentration = 'moderate';
    else concentration = 'weak';
  }

  // Emotional
  let emotional: 'positive' | 'mixed' | 'negative' | 'unknown' = 'unknown';
  const emoTotal = summary.emotion_positive + summary.emotion_negative;
  if (emoTotal > 0) {
    const ratio = summary.emotion_positive / emoTotal;
    if (ratio >= 0.7) emotional = 'positive';
    else if (ratio >= 0.3) emotional = 'mixed';
    else emotional = 'negative';
  }

  // Social
  let social: 'thriving' | 'developing' | 'struggling' | 'unknown' = 'unknown';
  const socTotal = summary.social_positive + summary.social_negative;
  if (socTotal > 0) {
    const ratio = summary.social_positive / socTotal;
    if (ratio >= 0.7) social = 'thriving';
    else if (ratio >= 0.4) social = 'developing';
    else social = 'struggling';
  }

  return { concentration, emotional, social };
}
