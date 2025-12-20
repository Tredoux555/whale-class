// lib/games/letter-strokes.ts
// Stroke data for lowercase letters - points normalized to 0-100 scale

export interface StrokePoint {
  x: number;
  y: number;
}

export interface LetterStrokeData {
  letter: string;
  strokes: StrokePoint[][];
}

// How close user must be to the path (% of canvas)
export const STROKE_TOLERANCE = 18;
// Minimum points needed per stroke
export const MIN_POINTS_PER_STROKE = 5;

export const LETTER_STROKES: Record<string, LetterStrokeData> = {
  // ============ VOWELS ============
  a: {
    letter: 'a',
    strokes: [
      // Circle counter-clockwise from right
      [
        {x:70,y:35},{x:60,y:28},{x:50,y:25},{x:40,y:28},{x:32,y:38},
        {x:30,y:50},{x:32,y:62},{x:40,y:72},{x:50,y:75},{x:60,y:72},{x:70,y:62}
      ],
      // Down stroke
      [{x:70,y:30},{x:70,y:50},{x:70,y:75},{x:70,y:90}]
    ],
  },
  e: {
    letter: 'e',
    strokes: [
      // Start middle, curve around
      [
        {x:30,y:50},{x:45,y:50},{x:60,y:50},{x:68,y:42},{x:68,y:32},
        {x:60,y:25},{x:50,y:22},{x:38,y:25},{x:30,y:35},{x:28,y:50},
        {x:30,y:65},{x:40,y:75},{x:55,y:78},{x:68,y:72}
      ]
    ],
  },
  i: {
    letter: 'i',
    strokes: [
      // Down stroke
      [{x:50,y:35},{x:50,y:50},{x:50,y:65},{x:50,y:80}],
      // Dot
      [{x:50,y:18},{x:50,y:22}]
    ],
  },
  o: {
    letter: 'o',
    strokes: [
      // Circle counter-clockwise from top
      [
        {x:50,y:22},{x:38,y:25},{x:28,y:38},{x:25,y:52},{x:28,y:66},
        {x:38,y:78},{x:50,y:82},{x:62,y:78},{x:72,y:66},{x:75,y:52},
        {x:72,y:38},{x:62,y:25},{x:50,y:22}
      ]
    ],
  },
  u: {
    letter: 'u',
    strokes: [
      // Down, curve, up
      [
        {x:30,y:30},{x:30,y:45},{x:30,y:60},{x:35,y:72},{x:45,y:78},
        {x:55,y:78},{x:65,y:72},{x:70,y:60}
      ],
      // Down stroke right
      [{x:70,y:30},{x:70,y:50},{x:70,y:70},{x:70,y:88}]
    ],
  },

  // ============ EASY CONSONANTS ============
  s: {
    letter: 's',
    strokes: [
      // S curve
      [
        {x:65,y:28},{x:55,y:22},{x:42,y:22},{x:32,y:30},{x:32,y:40},
        {x:40,y:48},{x:55,y:52},{x:65,y:58},{x:68,y:68},{x:62,y:78},
        {x:48,y:82},{x:35,y:78}
      ]
    ],
  },
  m: {
    letter: 'm',
    strokes: [
      // Down stroke
      [{x:20,y:30},{x:20,y:50},{x:20,y:70},{x:20,y:88}],
      // First hump
      [{x:20,y:35},{x:28,y:28},{x:38,y:28},{x:45,y:35},{x:48,y:50},{x:48,y:70},{x:48,y:88}],
      // Second hump
      [{x:48,y:35},{x:56,y:28},{x:66,y:28},{x:75,y:35},{x:78,y:50},{x:78,y:70},{x:78,y:88}]
    ],
  },
  t: {
    letter: 't',
    strokes: [
      // Down stroke
      [{x:50,y:15},{x:50,y:35},{x:50,y:55},{x:50,y:75},{x:55,y:85},{x:65,y:88}],
      // Cross
      [{x:35,y:38},{x:50,y:38},{x:65,y:38}]
    ],
  },
  p: {
    letter: 'p',
    strokes: [
      // Down stroke (goes below line)
      [{x:30,y:30},{x:30,y:50},{x:30,y:70},{x:30,y:90},{x:30,y:110}],
      // Bump
      [{x:30,y:32},{x:42,y:25},{x:58,y:25},{x:68,y:35},{x:68,y:50},{x:58,y:62},{x:42,y:65},{x:30,y:58}]
    ],
  },
  n: {
    letter: 'n',
    strokes: [
      // Down stroke
      [{x:30,y:30},{x:30,y:50},{x:30,y:70},{x:30,y:88}],
      // Hump
      [{x:30,y:35},{x:40,y:28},{x:52,y:28},{x:62,y:35},{x:68,y:50},{x:68,y:70},{x:68,y:88}]
    ],
  },

  // ============ NEXT CONSONANTS ============
  c: {
    letter: 'c',
    strokes: [
      // C curve
      [
        {x:68,y:32},{x:58,y:24},{x:45,y:22},{x:32,y:30},{x:25,y:45},
        {x:25,y:58},{x:32,y:72},{x:45,y:80},{x:58,y:78},{x:68,y:70}
      ]
    ],
  },
  r: {
    letter: 'r',
    strokes: [
      // Down stroke
      [{x:35,y:30},{x:35,y:50},{x:35,y:70},{x:35,y:88}],
      // Small curve up
      [{x:35,y:38},{x:42,y:30},{x:55,y:28},{x:65,y:32}]
    ],
  },
  d: {
    letter: 'd',
    strokes: [
      // Circle
      [
        {x:60,y:55},{x:55,y:45},{x:45,y:40},{x:35,y:45},{x:30,y:58},
        {x:35,y:72},{x:45,y:78},{x:55,y:75},{x:62,y:65}
      ],
      // Tall down stroke
      [{x:62,y:12},{x:62,y:35},{x:62,y:58},{x:62,y:78},{x:62,y:90}]
    ],
  },
  g: {
    letter: 'g',
    strokes: [
      // Circle
      [
        {x:62,y:55},{x:55,y:45},{x:45,y:42},{x:35,y:48},{x:32,y:60},
        {x:35,y:72},{x:48,y:78},{x:58,y:75},{x:65,y:65}
      ],
      // Down stroke with hook (below line)
      [{x:65,y:40},{x:65,y:60},{x:65,y:80},{x:65,y:100},{x:58,y:110},{x:42,y:112}]
    ],
  },
  b: {
    letter: 'b',
    strokes: [
      // Tall down stroke
      [{x:35,y:12},{x:35,y:35},{x:35,y:58},{x:35,y:78},{x:35,y:90}],
      // Bump
      [{x:35,y:45},{x:48,y:38},{x:62,y:42},{x:68,y:55},{x:68,y:68},{x:58,y:80},{x:45,y:82},{x:35,y:75}]
    ],
  },

  // ============ MORE CONSONANTS ============
  h: {
    letter: 'h',
    strokes: [
      // Tall down stroke
      [{x:32,y:12},{x:32,y:35},{x:32,y:58},{x:32,y:78},{x:32,y:90}],
      // Hump
      [{x:32,y:45},{x:42,y:35},{x:55,y:35},{x:65,y:45},{x:68,y:60},{x:68,y:75},{x:68,y:90}]
    ],
  },
  l: {
    letter: 'l',
    strokes: [
      // Tall down stroke
      [{x:50,y:12},{x:50,y:35},{x:50,y:58},{x:50,y:78},{x:50,y:90}]
    ],
  },
  f: {
    letter: 'f',
    strokes: [
      // Curve and down
      [{x:65,y:18},{x:55,y:12},{x:45,y:15},{x:40,y:28},{x:40,y:50},{x:40,y:72},{x:40,y:90}],
      // Cross
      [{x:28,y:42},{x:40,y:42},{x:55,y:42}]
    ],
  },
  j: {
    letter: 'j',
    strokes: [
      // Down and hook (below line)
      [{x:55,y:35},{x:55,y:55},{x:55,y:75},{x:55,y:95},{x:48,y:108},{x:35,y:110}],
      // Dot
      [{x:55,y:18},{x:55,y:22}]
    ],
  },
  k: {
    letter: 'k',
    strokes: [
      // Tall down stroke
      [{x:32,y:12},{x:32,y:35},{x:32,y:58},{x:32,y:78},{x:32,y:90}],
      // Diagonal in
      [{x:68,y:35},{x:55,y:48},{x:42,y:58},{x:32,y:58}],
      // Diagonal out
      [{x:40,y:58},{x:52,y:72},{x:65,y:88}]
    ],
  },

  // ============ ADVANCED CONSONANTS ============
  w: {
    letter: 'w',
    strokes: [
      // W shape
      [
        {x:18,y:30},{x:25,y:55},{x:32,y:78},
        {x:42,y:55},{x:50,y:35},
        {x:58,y:55},{x:68,y:78},
        {x:75,y:55},{x:82,y:30}
      ]
    ],
  },
  v: {
    letter: 'v',
    strokes: [
      // V shape
      [{x:25,y:30},{x:38,y:55},{x:50,y:82},{x:62,y:55},{x:75,y:30}]
    ],
  },
  y: {
    letter: 'y',
    strokes: [
      // Left diagonal
      [{x:28,y:30},{x:38,y:48},{x:50,y:65}],
      // Right diagonal with tail (below line)
      [{x:72,y:30},{x:62,y:48},{x:50,y:65},{x:42,y:85},{x:35,y:105},{x:28,y:112}]
    ],
  },
  z: {
    letter: 'z',
    strokes: [
      // Z shape
      [{x:30,y:30},{x:50,y:30},{x:70,y:30},{x:30,y:85},{x:50,y:85},{x:70,y:85}]
    ],
  },
  x: {
    letter: 'x',
    strokes: [
      // Diagonal down-right
      [{x:28,y:30},{x:42,y:48},{x:50,y:58},{x:58,y:68},{x:72,y:85}],
      // Diagonal down-left
      [{x:72,y:30},{x:58,y:48},{x:50,y:58},{x:42,y:68},{x:28,y:85}]
    ],
  },
  q: {
    letter: 'q',
    strokes: [
      // Circle
      [
        {x:55,y:55},{x:48,y:42},{x:38,y:40},{x:30,y:50},{x:30,y:65},
        {x:38,y:78},{x:50,y:80},{x:60,y:72},{x:65,y:58}
      ],
      // Down stroke with tail (below line)
      [{x:65,y:42},{x:65,y:62},{x:65,y:82},{x:65,y:102},{x:72,y:112},{x:82,y:108}]
    ],
  },
};

// Get stroke data for a letter
export function getLetterStrokes(letter: string): LetterStrokeData | null {
  return LETTER_STROKES[letter.toLowerCase()] || null;
}

// Calculate distance between two points
export function distance(p1: StrokePoint, p2: StrokePoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Check if a point is near a path
export function isPointNearPath(
  point: StrokePoint, 
  path: StrokePoint[], 
  tolerance: number
): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const dist = pointToSegmentDistance(point, path[i], path[i + 1]);
    if (dist <= tolerance) return true;
  }
  return false;
}

// Distance from point to line segment
function pointToSegmentDistance(
  p: StrokePoint, 
  v: StrokePoint, 
  w: StrokePoint
): number {
  const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
  if (l2 === 0) return distance(p, v);
  
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  return distance(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  });
}

// Validate user stroke against expected path
export function validateStroke(
  userPoints: StrokePoint[],
  expectedPath: StrokePoint[],
  tolerance: number
): { valid: boolean; accuracy: number } {
  if (userPoints.length < MIN_POINTS_PER_STROKE) {
    return { valid: false, accuracy: 0 };
  }
  
  let matchedPoints = 0;
  
  for (const point of userPoints) {
    if (isPointNearPath(point, expectedPath, tolerance)) {
      matchedPoints++;
    }
  }
  
  const accuracy = matchedPoints / userPoints.length;
  return {
    valid: accuracy >= 0.7, // 70% of points must be on path
    accuracy
  };
}

// Check stroke direction (start near beginning of expected path)
export function checkStrokeDirection(
  userStart: StrokePoint,
  expectedPath: StrokePoint[],
  tolerance: number
): boolean {
  const expectedStart = expectedPath[0];
  return distance(userStart, expectedStart) <= tolerance * 2;
}

