// lib/montree/ai/sensitive-periods.ts
// Detect active sensitive periods based on age, work patterns, and teacher notes
// Maria Montessori identified specific developmental windows for optimal learning

import { parseNotes } from './note-parser';

// ============================================
// TYPES
// ============================================

export interface SensitivePeriod {
  id: string;
  name: string;
  age_start: number; // years
  age_end: number;
  peak_age: number;
  description: string;
  work_indicators: string[]; // work names/keywords that indicate this period
  note_keywords: string[]; // keywords in teacher notes
  behavioral_signs: string[];
}

export interface DetectedPeriod {
  period: SensitivePeriod;
  status: 'emerging' | 'active' | 'waning' | 'passed';
  confidence: number; // 0-100
  evidence: {
    age_alignment: boolean;
    work_matches: string[];
    note_matches: string[];
    repetition_signal: boolean;
  };
}

export interface WorkPattern {
  work_name: string;
  area: string;
  count: number; // times chosen
  total_duration?: number; // minutes
  avg_repetitions?: number;
}

// ============================================
// SENSITIVE PERIOD DEFINITIONS
// ============================================

export const SENSITIVE_PERIODS: SensitivePeriod[] = [
  {
    id: 'order',
    name: 'Order',
    age_start: 0,
    age_end: 5,
    peak_age: 2,
    description: 'Need for consistency, routine, and environmental order',
    work_indicators: [
      'sorting', 'sequencing', 'matching', 'grading', 'ordering',
      'pink tower', 'brown stair', 'red rods', 'cylinder blocks',
      'knobbed cylinders', 'color tablets', 'geometric cabinet'
    ],
    note_keywords: [
      'routine', 'sequence', 'order', 'same way', 'upset when changed',
      'noticed when moved', 'insists on', 'has to be'
    ],
    behavioral_signs: [
      'Tantrums over routine changes',
      'Notices tiny environmental changes',
      'Insists on specific sequences',
      'Corrects adults about placement'
    ]
  },
  {
    id: 'language',
    name: 'Language',
    age_start: 0,
    age_end: 6,
    peak_age: 3.5,
    description: 'Acquisition of spoken and written language',
    work_indicators: [
      'sandpaper letters', 'movable alphabet', 'nomenclature',
      'sound games', 'i spy', 'rhyming', 'vocabulary', 'storytelling',
      'language cards', 'phonics', 'reading', 'writing'
    ],
    note_keywords: [
      'vocabulary', 'new words', 'asking what', 'fascinated by letters',
      'talking constantly', 'loves stories', 'wants to read', 'explosion'
    ],
    behavioral_signs: [
      'Vocabulary explosion',
      'Asks "what\'s that?" constantly',
      'Fascinated by letters/text',
      'Attempts to decode words'
    ]
  },
  {
    id: 'movement',
    name: 'Movement',
    age_start: 0,
    age_end: 4.5,
    peak_age: 2.5,
    description: 'Development of gross and fine motor control',
    work_indicators: [
      'walking', 'carrying', 'pouring', 'spooning', 'tonging',
      'tweezing', 'cutting', 'folding', 'buttoning', 'lacing',
      'practical life', 'dressing frames', 'polishing', 'scrubbing'
    ],
    note_keywords: [
      'active', 'moving', 'practicing', 'coordination', 'balance',
      'careful movements', 'precise', 'control', 'motor'
    ],
    behavioral_signs: [
      'Constant physical activity',
      'Practices same movement repeatedly',
      'Watches others\' movements intently',
      'Wants to walk and carry things'
    ]
  },
  {
    id: 'sensory',
    name: 'Sensory Refinement',
    age_start: 0,
    age_end: 6,
    peak_age: 3,
    description: 'Exploration and discrimination through the senses',
    work_indicators: [
      'sensorial', 'pink tower', 'brown stair', 'color tablets',
      'sound cylinders', 'touch boards', 'fabric matching',
      'smelling bottles', 'tasting', 'thermic tablets', 'baric tablets',
      'geometric solids', 'mystery bag', 'stereognostic'
    ],
    note_keywords: [
      'touches', 'feels', 'sorting', 'matching', 'comparing',
      'sensory', 'texture', 'color', 'sound', 'smell', 'fascinated by'
    ],
    behavioral_signs: [
      'Touches everything',
      'Sorts by sensory attribute',
      'Describes sensory qualities',
      'Notices subtle differences'
    ]
  },
  {
    id: 'small_objects',
    name: 'Small Objects',
    age_start: 1,
    age_end: 4,
    peak_age: 2.5,
    description: 'Fascination with tiny details and small items',
    work_indicators: [
      'tweezers', 'small objects', 'beads', 'transfer',
      'sorting small', 'tiny', 'miniature', 'detailed'
    ],
    note_keywords: [
      'tiny', 'small', 'detail', 'noticed', 'collected',
      'fascinated by small', 'pincer', 'picking up'
    ],
    behavioral_signs: [
      'Collects tiny treasures',
      'Points out minute details',
      'Developed pincer grasp',
      'Fascinated by insects/small things'
    ]
  },
  {
    id: 'social',
    name: 'Social Behavior',
    age_start: 2.5,
    age_end: 6,
    peak_age: 4,
    description: 'Interest in social norms, grace, and courtesy',
    work_indicators: [
      'grace and courtesy', 'role play', 'group work',
      'collaborative', 'social', 'manners', 'greeting'
    ],
    note_keywords: [
      'helped', 'shared', 'friend', 'together', 'group',
      'manners', 'greeting', 'please', 'thank you', 'social'
    ],
    behavioral_signs: [
      'Mimics adult social behaviors',
      'Practices greetings spontaneously',
      'Watches peer interactions intently',
      'Interested in rules and norms'
    ]
  },
  {
    id: 'writing',
    name: 'Writing',
    age_start: 3,
    age_end: 5,
    peak_age: 3.5,
    description: 'Explosion into writing (often precedes reading)',
    work_indicators: [
      'sandpaper letters', 'metal insets', 'movable alphabet',
      'sand tray', 'chalkboard', 'writing', 'tracing'
    ],
    note_keywords: [
      'writing', 'tracing', 'letters', 'marks', 'wants to write',
      'asks how to spell', 'explosion', 'forming letters'
    ],
    behavioral_signs: [
      'Makes marks purposefully',
      'Traces letters',
      'Asks how to write words',
      'Writing explosion'
    ]
  },
  {
    id: 'reading',
    name: 'Reading',
    age_start: 3,
    age_end: 5.5,
    peak_age: 4.5,
    description: 'Interest in decoding written language',
    work_indicators: [
      'pink series', 'blue series', 'green series', 'reading',
      'phonetic', 'object box', 'word cards', 'sentences', 'books'
    ],
    note_keywords: [
      'reading', 'decoding', 'sounding out', 'blending',
      'what does that say', 'points to words', 'recognizes'
    ],
    behavioral_signs: [
      'Points to letters in environment',
      'Asks "what does that say?"',
      'Attempts to decode',
      'Interest in books'
    ]
  },
  {
    id: 'math',
    name: 'Mathematics',
    age_start: 4,
    age_end: 6,
    peak_age: 5,
    description: 'Strong interest in numbers, quantity, and patterns',
    work_indicators: [
      'number rods', 'sandpaper numbers', 'spindle box',
      'cards and counters', 'golden beads', 'teen board',
      'ten board', 'operations', 'stamp game', 'bead frame',
      'counting', 'quantity', 'math'
    ],
    note_keywords: [
      'counting', 'numbers', 'how many', 'math', 'quantity',
      'pattern', 'addition', 'more', 'less', 'equal'
    ],
    behavioral_signs: [
      'Counts spontaneously',
      'Asks "how many?"',
      'Notices numerical patterns',
      'Interest in operations'
    ]
  }
];

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Calculate age in years from date of birth
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  // Return with one decimal for precision
  const months = (today.getMonth() - birth.getMonth() + 12) % 12;
  return age + (months / 12);
}

/**
 * Check if child's age is within a sensitive period's window
 */
function isInAgeWindow(age: number, period: SensitivePeriod): boolean {
  return age >= period.age_start && age <= period.age_end;
}

/**
 * Calculate how close the child is to the peak age
 */
function getAgePeakScore(age: number, period: SensitivePeriod): number {
  if (!isInAgeWindow(age, period)) return 0;
  
  const distanceFromPeak = Math.abs(age - period.peak_age);
  const maxDistance = Math.max(
    period.peak_age - period.age_start,
    period.age_end - period.peak_age
  );
  
  // Score 100 at peak, decreasing linearly
  return Math.max(0, 100 - (distanceFromPeak / maxDistance) * 50);
}

/**
 * Check if work patterns indicate a sensitive period
 */
function matchWorkPatterns(
  patterns: WorkPattern[],
  period: SensitivePeriod
): string[] {
  const matches: string[] = [];
  
  for (const pattern of patterns) {
    const workLower = pattern.work_name.toLowerCase();
    const areaLower = pattern.area.toLowerCase();
    
    for (const indicator of period.work_indicators) {
      if (workLower.includes(indicator) || indicator.includes(workLower) ||
          areaLower.includes(indicator)) {
        // Only count if significant engagement
        if (pattern.count >= 2 || (pattern.avg_repetitions && pattern.avg_repetitions >= 3)) {
          matches.push(pattern.work_name);
        }
        break;
      }
    }
  }
  
  return [...new Set(matches)]; // Dedupe
}

/**
 * Check if teacher notes indicate a sensitive period
 */
function matchNoteKeywords(
  notes: string[],
  period: SensitivePeriod
): string[] {
  const matches: string[] = [];
  
  for (const note of notes) {
    if (!note) continue;
    const noteLower = note.toLowerCase();
    
    for (const keyword of period.note_keywords) {
      if (noteLower.includes(keyword)) {
        matches.push(keyword);
      }
    }
  }
  
  return [...new Set(matches)]; // Dedupe
}

/**
 * Detect all active sensitive periods for a child
 */
export function detectSensitivePeriods(
  dateOfBirth: string | Date,
  workPatterns: WorkPattern[],
  teacherNotes: string[]
): DetectedPeriod[] {
  const age = calculateAge(dateOfBirth);
  const detected: DetectedPeriod[] = [];

  for (const period of SENSITIVE_PERIODS) {
    // Skip if outside age window entirely
    if (age < period.age_start - 0.5 || age > period.age_end + 0.5) {
      continue;
    }

    const ageAligned = isInAgeWindow(age, period);
    const agePeakScore = getAgePeakScore(age, period);
    const workMatches = matchWorkPatterns(workPatterns, period);
    const noteMatches = matchNoteKeywords(teacherNotes, period);

    // Check for high repetition (strong signal)
    const highRepetition = workPatterns.some(p => 
      (p.avg_repetitions && p.avg_repetitions >= 5) ||
      p.count >= 5
    );

    // Calculate confidence score
    let confidence = 0;
    
    // Age alignment: up to 30 points
    if (ageAligned) {
      confidence += 15 + (agePeakScore / 100) * 15;
    }
    
    // Work pattern matches: up to 40 points
    confidence += Math.min(40, workMatches.length * 15);
    
    // Note keyword matches: up to 20 points
    confidence += Math.min(20, noteMatches.length * 5);
    
    // High repetition bonus: up to 10 points
    if (highRepetition) {
      confidence += 10;
    }

    // Determine status
    let status: DetectedPeriod['status'];
    if (!ageAligned) {
      status = age < period.age_start ? 'emerging' : 'passed';
      confidence *= 0.5; // Reduce confidence for out-of-window
    } else if (age > period.peak_age + 1) {
      status = 'waning';
    } else if (age < period.peak_age - 0.5 && confidence < 40) {
      status = 'emerging';
    } else {
      status = 'active';
    }

    // Only include if there's some evidence
    if (confidence >= 20 || (ageAligned && (workMatches.length > 0 || noteMatches.length > 0))) {
      detected.push({
        period,
        status,
        confidence: Math.round(Math.min(100, confidence)),
        evidence: {
          age_alignment: ageAligned,
          work_matches: workMatches,
          note_matches: noteMatches,
          repetition_signal: highRepetition,
        },
      });
    }
  }

  // Sort by confidence
  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the most likely active sensitive periods (top N)
 */
export function getTopSensitivePeriods(
  detected: DetectedPeriod[],
  maxResults = 3
): DetectedPeriod[] {
  return detected
    .filter(d => d.status === 'active' || d.status === 'emerging')
    .slice(0, maxResults);
}

/**
 * Get age-appropriate sensitive periods even without evidence
 */
export function getExpectedPeriods(dateOfBirth: string | Date): SensitivePeriod[] {
  const age = calculateAge(dateOfBirth);
  return SENSITIVE_PERIODS.filter(p => isInAgeWindow(age, p));
}
